from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Article, PipelineRun, Source
from app.schemas import StatsOut

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsOut)
async def get_stats(db: AsyncSession = Depends(get_db)):
    last_run = (
        await db.execute(select(PipelineRun).order_by(PipelineRun.started_at.desc()).limit(1))
    ).scalar_one_or_none()

    healthy = (
        await db.execute(select(func.count()).select_from(Source).where(Source.status == "healthy"))
    ).scalar_one()
    broken = (
        await db.execute(select(func.count()).select_from(Source).where(Source.status == "broken"))
    ).scalar_one()

    since = datetime.datetime.now(tz = UTC) - timedelta(hours=24)
    articles_24h = (
        await db.execute(select(func.count()).select_from(Article).where(Article.fetched_at >= since))
    ).scalar_one()

    return StatsOut(
        last_run_started_at=last_run.started_at if last_run else None,
        last_run_finished_at=last_run.finished_at if last_run else None,
        sources_healthy=healthy,
        sources_broken=broken,
        articles_last_24h=articles_24h,
    )
