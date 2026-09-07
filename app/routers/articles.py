import uuid
from collections.abc import Iterable
from datetime import datetime
from typing import Annotated, Literal

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import Row, Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import DbSession
from app.models import Article, ArticleAnalysis, ClusterMember, Source
from app.schemas import ArticleOut, ArticlePage

router = APIRouter(prefix="/articles", tags=["articles"])

SortOrder = Literal["recent", "relevant"]

# Correlated count of the article's cluster. An article with no cluster row
# counts 0 members, so floor it at 1 — it still stands for one story.
_CLUSTER_SIZE = func.greatest(
    func.coalesce(
        select(func.count(ClusterMember.article_id))
        .where(ClusterMember.cluster_id == ArticleAnalysis.cluster_id)
        .correlate(ArticleAnalysis)
        .scalar_subquery(),
        1,
    ),
    1,
).label("cluster_size")


def _base_query() -> Select:
    return (
        select(Article, ArticleAnalysis, Source, _CLUSTER_SIZE)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .join(Source, Source.id == Article.source_id)
    )


def _apply_filters(
    stmt: Select,
    category: str | None,
    since: datetime | None,
    min_score: float,
) -> Select:
    stmt = stmt.where(ArticleAnalysis.relevance_score >= min_score)
    if category:
        stmt = stmt.where(ArticleAnalysis.category == category)
    if since:
        stmt = stmt.where(Article.published_at >= since)
    return stmt


def _to_article_out(row: Row) -> ArticleOut:
    article, analysis, source, cluster_size = row
    return ArticleOut(
        id=article.id,
        title=article.title,
        url=article.url,
        published_at=article.published_at,
        summary=analysis.summary,
        category=analysis.category,
        relevance_score=float(analysis.relevance_score),
        source_name=source.name,
        cluster_size=int(cluster_size),
    )


@router.get("", response_model=ArticlePage)
async def list_articles(
    # db has no default, so it must precede the defaulted query parameters.
    db: DbSession,
    category: Annotated[str | None, Query()] = None,
    since: Annotated[datetime | None, Query()] = None,
    min_score: Annotated[float, Query(ge=0.0, le=1.0)] = 0.0,
    sort: Annotated[SortOrder, Query()] = "recent",
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    stmt = _apply_filters(_base_query(), category, since, min_score)

    # published_at is nullable; nullslast keeps undated articles from heading the feed.
    # id is a deterministic tiebreaker so paging can't repeat or skip rows.
    if sort == "relevant":
        stmt = stmt.order_by(
            ArticleAnalysis.relevance_score.desc(),
            Article.published_at.desc().nullslast(),
            Article.id.desc(),
        )
    else:
        stmt = stmt.order_by(Article.published_at.desc().nullslast(), Article.id.desc())

    result = await db.execute(stmt.offset(offset).limit(limit))
    items = [_to_article_out(row) for row in result.all()]

    count_stmt = _apply_filters(
        select(func.count())
        .select_from(Article)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .join(Source, Source.id == Article.source_id),
        category,
        since,
        min_score,
    )
    total = (await db.execute(count_stmt)).scalar_one()

    return ArticlePage(items=items, total=total)


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(article_id: uuid.UUID, db: DbSession):
    result = await db.execute(_base_query().where(Article.id == article_id))
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return _to_article_out(row)


async def fetch_articles_map(
    db: AsyncSession, ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, ArticleOut]:
    """Load many articles by id in one statement, keyed by id.

    History pages resolve citations for every entry at once; going one entry at
    a time would be a query per row.
    """
    unique = list(dict.fromkeys(ids))
    if not unique:
        return {}
    result = await db.execute(_base_query().where(Article.id.in_(unique)))
    return {row[0].id: _to_article_out(row) for row in result.all()}


async def fetch_articles_by_id(db: AsyncSession, ids: list[uuid.UUID]) -> list[ArticleOut]:
    """Load articles by id, returned in the order the ids were given.

    Used to attach an agent answer's citations to the answer itself. Ids that no
    longer resolve — the article was deleted since — are dropped.
    """
    by_id = await fetch_articles_map(db, ids)
    return [by_id[i] for i in ids if i in by_id]
