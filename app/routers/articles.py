import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import Row, select

from app.database import DbSession
from app.models import Article, ArticleAnalysis, Source
from app.schemas import ArticleOut

router = APIRouter(prefix="/articles", tags=["articles"])


def _base_query():
    return (
        select(Article, ArticleAnalysis, Source)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .join(Source, Source.id == Article.source_id)
    )


def _to_article_out(row: Row) -> ArticleOut:
    article, analysis, source = row
    return ArticleOut(
        id=article.id,
        title=article.title,
        url=article.url,
        published_at=article.published_at,
        summary=analysis.summary,
        category=analysis.category,
        relevance_score=float(analysis.relevance_score),
        source_name=source.name,
    )


@router.get("", response_model=list[ArticleOut])
async def list_articles(
    # db has no default, so it must precede the defaulted query parameters.
    db: DbSession,
    category: Annotated[str | None, Query()] = None,
    since: Annotated[datetime | None, Query()] = None,
    min_score: Annotated[float, Query(ge=0.0, le=1.0)] = 0.0,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    stmt = _base_query().where(ArticleAnalysis.relevance_score >= min_score)
    if category:
        stmt = stmt.where(ArticleAnalysis.category == category)
    if since:
        stmt = stmt.where(Article.published_at >= since)

    # published_at is nullable; nullslast keeps undated articles from heading the feed.
    # id is a deterministic tiebreaker so paging can't repeat or skip rows.
    stmt = (
        stmt.order_by(Article.published_at.desc().nullslast(), Article.id.desc())
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(stmt)
    return [_to_article_out(row) for row in result.all()]


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(article_id: uuid.UUID, db: DbSession):
    result = await db.execute(_base_query().where(Article.id == article_id))
    row = result.first()
    if row is None:
        raise HTTPException(status_code=404, detail="Article not found")
    return _to_article_out(row)
