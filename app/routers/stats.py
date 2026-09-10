from datetime import UTC, date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import Date, cast, func, select

from app.config import settings
from app.database import DbSession
from app.models import Article, PipelineRun, Source
from app.schemas import DailyCount, RunOut, StatsOut

router = APIRouter(prefix="/stats", tags=["stats"])

# Days of history behind the ingestion-volume chart.
VOLUME_DAYS = 7


async def _daily_volume(db: DbSession, days: int) -> list[DailyCount]:
    """Article counts per day, oldest first, with empty days filled in.

    Days with no ingestion produce no rows in the GROUP BY, and a chart with
    holes in it reads as missing data rather than a quiet day.
    """
    today = datetime.now(tz=UTC).date()
    first_day = today - timedelta(days=days - 1)

    day_col = cast(Article.fetched_at, Date).label("day")
    rows = (
        await db.execute(
            select(day_col, func.count())
            .where(
                Article.fetched_at 
                >= datetime.combine(first_day, datetime.min.time(), tzinfo=UTC))
            .group_by(day_col)
        )
    ).all()
    counts: dict[date, int] = {row[0]: row[1] for row in rows}

    return [
        DailyCount(day=first_day + timedelta(days=i), 
                   count=counts.get(first_day + timedelta(days=i), 0))
        for i in range(days)
    ]


@router.get("", response_model=StatsOut)
async def get_stats(db: DbSession):
    last_run = (
        await db.execute(select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(1))
    ).scalar_one_or_none()

    status_rows = (
        await db.execute(select(Source.status, func.count()).group_by(Source.status))
    ).all()
    by_status = {row[0]: row[1] for row in status_rows}

    since = datetime.now(tz=UTC) - timedelta(hours=24)
    articles_24h = (
        await db.execute(
            select(func.count()).select_from(Article).where(Article.fetched_at >= since))
    ).scalar_one()
    total_articles = (await db.execute(select(func.count()).select_from(Article))).scalar_one()

    duration = None
    if last_run and last_run.finished_at:
        duration = (last_run.finished_at - last_run.started_at).total_seconds()

    return StatsOut(
        last_run_started_at=last_run.started_at if last_run else None,
        last_run_finished_at=last_run.finished_at if last_run else None,
        sources_healthy=by_status.get("healthy", 0),
        sources_broken=by_status.get("broken", 0),
        sources_degraded=by_status.get("degraded", 0),
        sources_total=sum(by_status.values()),
        articles_last_24h=articles_24h,
        last_run_duration_seconds=duration,
        last_run_articles_found=last_run.articles_found if last_run else None,
        last_run_articles_after_dedup=last_run.articles_after_dedup if last_run else None,
        last_run_error_count=len(last_run.errors or []) if last_run else 0,
        total_articles=total_articles,
        llm_model=settings.llm_model,
        daily_volume=await _daily_volume(db, VOLUME_DAYS),
    )


@router.get("/runs", response_model=list[RunOut])
async def list_runs(db: DbSession, limit: Annotated[int, Query(ge=1, le=100)] = 10):
    """Recent pipeline runs, newest first — the source of the execution log."""
    rows = (
        await db.execute(select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(limit))
    ).scalars().all()
    return [
        RunOut(
            id=run.id,
            kind=run.kind,
            started_at=run.started_at,
            finished_at=run.finished_at,
            sources_attempted=run.sources_attempted,
            sources_succeeded=run.sources_succeeded,
            articles_found=run.articles_found,
            articles_after_dedup=run.articles_after_dedup,
            llm_cost_usd=float(run.llm_cost_usd),
            errors=run.errors or [],
        )
        for run in rows
    ]
