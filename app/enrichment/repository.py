import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Article, ArticleAnalysis, Cluster, ClusterMember


async def get_unanalyzed_articles(db: AsyncSession, limit: int) -> list[Article]:
    """Return articles not yet assigned to any cluster, oldest first."""
    stmt = (
        select(Article)
        .outerjoin(ClusterMember, ClusterMember.article_id == Article.id)
        .where(ClusterMember.article_id.is_(None))
        .order_by(Article.fetched_at.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars())


async def add_cluster_member(
    db: AsyncSession, cluster_id: uuid.UUID, article_id: uuid.UUID, similarity: float
) -> None:
    """Record an article's membership in a cluster with its similarity score."""
    db.add(ClusterMember(cluster_id=cluster_id, article_id=article_id, similarity=similarity))
    await db.flush()


async def create_cluster(db: AsyncSession, representative_id: uuid.UUID) -> Cluster:
    """Create a cluster with the given article as its representative."""
    cluster = Cluster(representative_article_id=representative_id)
    db.add(cluster)
    await db.flush()
    return cluster


async def save_analysis(
    db: AsyncSession,
    article_id: uuid.UUID,
    cluster_id: uuid.UUID,
    summary: str,
    category: str,
    relevance_score: float,
    embedding: list[float],
) -> None:
    """Persist the LLM analysis and embedding for a cluster representative."""
    db.add(
        ArticleAnalysis(
            article_id=article_id,
            cluster_id=cluster_id,
            summary=summary,
            category=category,
            relevance_score=relevance_score,
            embedding=embedding,
            analyzed_at=datetime.now(timezone.utc),
        )
    )
    await db.flush()