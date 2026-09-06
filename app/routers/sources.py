from datetime import UTC, datetime, timedelta

from fastapi import APIRouter
from sqlalchemy import case, func, select

from app.database import DbSession
from app.models import Article, Source
from app.schemas import SourceOut

router = APIRouter(prefix="/sources", tags=["sources"])

# Sort the rows that need attention to the top.
_STATUS_RANK = case({"broken": 0, "degraded": 1}, value=Source.status, else_=2)


@router.get("", response_model=list[SourceOut])
async def list_sources(db: DbSession):
    """Every configured feed with its health and recent yield.

    Broken and degraded sources sort first — they are the rows that mean
    something needs attention.
    """
    since = datetime.now(tz=UTC) - timedelta(hours=24)
    # One aggregate join rather than a count query per source.
    recent = (
        select(Article.source_id, func.count().label("recent_count"))
        .where(Article.fetched_at >= since)
        .group_by(Article.source_id)
        .subquery()
    )

    rows = (
        await db.execute(
            select(Source, func.coalesce(recent.c.recent_count, 0))
            .outerjoin(recent, recent.c.source_id == Source.id)
            .order_by(_STATUS_RANK, Source.name)
        )
    ).all()

    return [
        SourceOut(
            id=source.id,
            name=source.name,
            source_type=source.source_type,
            url=source.url,
            status=source.status,
            fetch_interval_minutes=source.fetch_interval_minutes,
            authority_weight=float(source.authority_weight),
            last_fetched_at=source.last_fetched_at,
            last_error=source.last_error,
            articles_last_24h=int(recent_count),
        )
        for source, recent_count in rows
    ]
