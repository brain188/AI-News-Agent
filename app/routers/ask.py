import uuid
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response
from sqlalchemy import delete, select

from app.agent.loop import run_agent
from app.core.logging import get_logger
from app.database import DbSession
from app.models import AgentQuery
from app.routers.articles import fetch_articles_by_id, fetch_articles_map
from app.schemas import AgentQueryOut, AskRequest, AskResponse

log = get_logger(__name__)

router = APIRouter(prefix="/ask", tags=["ask"])


@router.post("", response_model=AskResponse)
async def ask_agent(payload: AskRequest, db: DbSession):
    """Answer a natural-language question using stored articles or live search."""
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question must not be empty")

    try:
        result = await run_agent(db, question)
    except Exception as exc:
        log.error("agent_failed", error=str(exc))
        raise HTTPException(status_code=502, detail="Agent failed to answer") from exc

    # Resolve citations here so the answer and its evidence arrive together.
    cited_articles = await fetch_articles_by_id(db, result.cited_article_ids)

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
        cited_articles=cited_articles,
        used_live_search=result.used_live_search,
    )


@router.get("/history", response_model=list[AgentQueryOut])
async def list_history(
    db: DbSession,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    """Return past questions and their answers, newest first."""
    stmt = (
        select(AgentQuery)
        .order_by(AgentQuery.created_at.desc(), AgentQuery.id.desc())
        .offset(offset)
        .limit(limit)
    )
    queries = list((await db.execute(stmt)).scalars())

    # Resolve every citation on the page in one statement rather than one per
    # entry, then rebuild each entry's list in its stored order.
    all_ids = [i for query in queries for i in (query.cited_article_ids or [])]
    by_id = await fetch_articles_map(db, all_ids)

    return [
        AgentQueryOut(
            id=query.id,
            question=query.question,
            answer=query.answer,
            cited_articles=[by_id[i] for i in (query.cited_article_ids or []) if i in by_id],
            used_live_search=query.used_live_search,
            created_at=query.created_at,
        )
        for query in queries
    ]


@router.delete("/history/{query_id}", status_code=204, response_class=Response)
async def delete_history_entry(query_id: uuid.UUID, db: DbSession):
    """Remove one saved question from history."""
    entry = await db.get(AgentQuery, query_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="History entry not found")

    await db.delete(entry)
    await db.commit()
    return Response(status_code=204)


@router.delete("/history", status_code=204, response_class=Response)
async def clear_history(db: DbSession):
    """Delete every saved question. The dashboard confirms before calling this."""
    await db.execute(delete(AgentQuery))
    await db.commit()
    return Response(status_code=204)
