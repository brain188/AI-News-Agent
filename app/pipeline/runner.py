import asyncio
from datetime import datetime, timedelta, timezone

import httpx

from app.core.logging import get_logger
from app.database import AsyncSessionLocal
from app.ingestion.base import USER_AGENT
from app.ingestion.registry import get_fetcher
from app.models import Source
from app.pipeline import repository
from app.pipeline.filters import apply_prefilter

log = get_logger(__name__)

MAX_CONCURRENT_SOURCES = 5
MAX_ARTICLE_AGE_DAYS = 3
TRUSTED_AUTHORITY_THRESHOLD = 0.85


async def _fetch_source(
    source: Source, client: httpx.AsyncClient, semaphore: asyncio.Semaphore
) -> tuple[Source, list, str | None]:
    """Fetch and pre-filter one source, returning items and any error message."""
    async with semaphore:
        try:
            fetcher = get_fetcher(source)
            items = await fetcher.fetch(client)
        except httpx.HTTPError as exc:
            log.error("source_fetch_failed", source=source.name, error=str(exc))
            return source, [], str(exc)

        trusted = float(source.authority_weight) >= TRUSTED_AUTHORITY_THRESHOLD
        filtered = apply_prefilter(items, trusted=trusted)

        # Feeds like OpenAI's serve their whole archive, so drop anything stale.
        cutoff = datetime.now(timezone.utc) - timedelta(days=MAX_ARTICLE_AGE_DAYS)
        recent = [
            item for item in filtered
            if item.published_at is None or item.published_at >= cutoff
        ]

        log.info(
            "source_fetched",
            source=source.name,
            fetched=len(items),
            kept=len(recent),
        )
        return source, recent, None


async def run_ingestion() -> None:
    """Fetch every due source, store new articles, and log the run."""
    async with AsyncSessionLocal() as db:
        run = await repository.start_run(db)
        sources = await repository.get_due_sources(db)

        if not sources:
            log.info("no_sources_due")
            await repository.finish_run(db, run, 0, 0, 0, errors = [])
            await db.commit()
            return

        log.info("ingestion_started", run_id=str(run.id), sources_due=len(sources))

        semaphore = asyncio.Semaphore(MAX_CONCURRENT_SOURCES)
        headers = {"User-Agent": USER_AGENT}

        async with httpx.AsyncClient(headers=headers) as client:
            tasks = [_fetch_source(source, client, semaphore) for source in sources]
            results = await asyncio.gather(*tasks)

        succeeded = 0
        total_inserted = 0
        errors: list[dict] = []

        for source, items, error in results:
            if error:
                errors.append({"source": source.name, "error": error})
                await repository.mark_source_result(db, source.id, error=error)
                continue

            inserted = await repository.insert_articles(db, source.id, items)
            total_inserted += inserted
            succeeded += 1
            await repository.mark_source_result(db, source.id)

        await repository.finish_run(
            db, run, len(sources), succeeded, total_inserted, errors = errors
        )
        await db.commit()

        log.info(
            "ingestion_finished",
            run_id=str(run.id),
            attempted=len(sources),
            succeeded=succeeded,
            new_articles=total_inserted,
        )