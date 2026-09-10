import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.logging import get_logger
from app.models import ArticleAnalysis

log = get_logger(__name__)


@dataclass(slots=True)
class ClusterMatch:
    """A nearby existing cluster found by similarity search."""

    cluster_id: uuid.UUID
    similarity: float


async def find_nearest_cluster(db: AsyncSession, embedding: list[float]) -> ClusterMatch | None:
    """Search recent cluster representatives for the closest match above threshold."""
    since = datetime.now(UTC) - timedelta(hours=settings.dedup_lookback_hours)
    distance = ArticleAnalysis.embedding.cosine_distance(embedding).label("distance")

    stmt = (
        select(ArticleAnalysis.cluster_id, distance)
        .where(ArticleAnalysis.analyzed_at >= since)
        .order_by(distance)
        .limit(1)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        return None

    cluster_id, dist = row
    similarity = 1.0 - float(dist)
    if similarity < settings.dedup_similarity_threshold:
        return None

    return ClusterMatch(cluster_id=cluster_id, similarity=similarity)
