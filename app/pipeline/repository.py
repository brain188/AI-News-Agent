import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.ingestion.base import FetchedItem
from app.models import Article, PipelineRun, Source


async def get_due_sources(db: AsyncSession) -> list[Source]:
    """Return sources never fetched or older than their fetch interval."""
    result = await db.execute(select(Source).where(Source.status != "broken"))
    now = datetime.now(timezone.utc)

    due = []
    for source in result.scalars():
        if source.last_fetched_at is None:
            due.append(source)
            continue
        if now - source.last_fetched_at >= timedelta(minutes=source.fetch_interval_minutes):
            due.append(source)
    return due


async def insert_articles(db: AsyncSession, source_id: uuid.UUID, items: list[FetchedItem]) -> int:
    """Bulk-insert articles, silently skipping URLs already stored for this source."""
    if not items:
        return 0

    rows = [
        {
            "source_id": source_id,
            "url": item.url,
            "title": item.title,
            "raw_content": item.raw_content,
            "published_at": item.published_at,
        }
        for item in items
    ]

    stmt = insert(Article).values(rows).on_conflict_do_nothing(index_elements=["source_id", "url"])
    result = await db.execute(stmt)
    return result.rowcount or 0


async def mark_source_result(
    db: AsyncSession, source_id: uuid.UUID, error: str | None = None
) -> None:
    """Record the outcome of a fetch attempt against the source row."""
    values = {
        "last_fetched_at": datetime.now(timezone.utc),
        "last_error": error,
        "status": "degraded" if error else "healthy",
    }
    await db.execute(update(Source).where(Source.id == source_id).values(**values))


async def start_run(db: AsyncSession, kind: str = "ingest") -> PipelineRun:
    """Create and persist a new pipeline run record."""
    run = PipelineRun(started_at=datetime.now(timezone.utc), kind=kind)
    db.add(run)
    await db.flush()
    return run


async def finish_run(
    db: AsyncSession,
    run: PipelineRun,
    attempted: int,
    succeeded: int,
    found: int,
    after_dedup: int = 0,
    errors: list[dict] | None = None,
) -> None:
    """Close out a pipeline run with its final counters and error list."""
    run.finished_at = datetime.now(timezone.utc)
    run.sources_attempted = attempted
    run.sources_succeeded = succeeded
    run.articles_found = found
    run.articles_after_dedup = after_dedup
    run.errors = errors or []
    await db.flush()