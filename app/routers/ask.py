from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.loop import run_agent
from app.core.logging import get_logger
from app.database import get_db
from app.models import AgentQuery
from app.schemas import AskRequest, AskResponse

log = get_logger(__name__)

router = APIRouter(prefix="/ask", tags=["ask"])


@router.post("", response_model=AskResponse)
async def ask_agent(payload: AskRequest, db: AsyncSession = Depends(get_db)):
    """Answer a natural-language question using stored articles or live search."""
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question must not be empty")

    try:
        result = await run_agent(db, question)
    except Exception as exc:
        log.error("agent_failed", error=str(exc))
        raise HTTPException(status_code=502, detail="Agent failed to answer") from exc

    db.add(
        AgentQuery(
            question=question,
            answer=result.answer,
            cited_article_ids=result.cited_article_ids,
            used_live_search=result.used_live_search,
        )
    )
    await db.commit()

    log.info(
        "agent_answered",
        cited=len(result.cited_article_ids),
        live_search=result.used_live_search,
        cost_usd=round(result.cost_usd, 4),
    )

    return AskResponse(
        answer=result.answer,
        cited_article_ids=result.cited_article_ids,
        used_live_search=result.used_live_search,
    )