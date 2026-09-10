from dataclasses import dataclass

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import PipelineRun


@dataclass(slots=True)
class Usage:
    """Token counts returned by a single LLM call."""

    input_tokens: int
    output_tokens: int

    def cost_usd(self) -> float:
        """Convert token counts to dollars using configured per-million rates."""
        return (
            self.input_tokens / 1_000_000 * settings.llm_input_cost_per_mtok
            + self.output_tokens / 1_000_000 * settings.llm_output_cost_per_mtok
        )


async def spend_today(db: AsyncSession) -> float:
    """Sum LLM costs recorded across all pipeline runs since midnight."""
    stmt = select(func.coalesce(func.sum(PipelineRun.llm_cost_usd), 0)).where(
        PipelineRun.started_at >= text("date_trunc('day', now())")
    )
    return float((await db.execute(stmt)).scalar_one())


def is_over_budget(spent: float) -> bool:
    """Check whether accumulated spend has reached the daily cap."""
    return spent >= settings.daily_llm_budget_usd
