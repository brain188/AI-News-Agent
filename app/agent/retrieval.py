from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.enrichment.embeddings import embed_texts
from app.models import Article, ArticleAnalysis, Source

log = get_logger(__name__)

# bge models are trained to embed queries with this instruction prefix.
QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


def _serialize(article: Article, analysis: ArticleAnalysis, source: Source) -> dict:
    """Flatten a joined row into the shape returned to the model."""
    return {
        "id": str(article.id),
        "title": article.title,
        "url": article.url,
        "summary": analysis.summary,
        "category": analysis.category,
        "relevance_score": float(analysis.relevance_score),
        "source": source.name,
        "published_at": article.published_at.isoformat() if article.published_at else None,
    }


async def search_articles(db: AsyncSession, query: str, limit: int) -> list[dict]:
    """Find articles semantically closest to a natural-language query."""
    vectors = await embed_texts([QUERY_PREFIX + query])
    distance = ArticleAnalysis.embedding.cosine_distance(vectors[0])

    stmt = (
        select(Article, ArticleAnalysis, Source)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .join(Source, Source.id == Article.source_id)
        .order_by(distance)
        .limit(limit)
    )
    rows = (await db.execute(stmt)).all()
    return [_serialize(*row) for row in rows]


async def filter_articles(
    db: AsyncSession,
    category: str | None,
    days: int | None,
    min_relevance: float,
    limit: int,
) -> list[dict]:
    """List recent articles by category and recency, ranked by relevance."""
    stmt = (
        select(Article, ArticleAnalysis, Source)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .join(Source, Source.id == Article.source_id)
        .where(ArticleAnalysis.relevance_score >= min_relevance)
        .order_by(ArticleAnalysis.relevance_score.desc(), Article.published_at.desc())
        .limit(limit)
    )
    if category:
        stmt = stmt.where(ArticleAnalysis.category == category)
    if days:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        stmt = stmt.where(Article.published_at >= cutoff)

    rows = (await db.execute(stmt)).all()
    return [_serialize(*row) for row in rows]
