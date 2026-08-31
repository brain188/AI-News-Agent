from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Article, ArticleAnalysis
from app.schemas import AskRequest, AskResponse

router = APIRouter(prefix="/ask", tags=["ask"])


@router.post("", response_model=AskResponse)
async def ask_agent(payload: AskRequest, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Article, ArticleAnalysis)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .where(Article.title.ilike(f"%{payload.question}%"))
        .order_by(Article.published_at.desc())
        .limit(5)
    )
    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return AskResponse(
            answer="No matching stored articles yet — this is a Phase 1 placeholder. "
                   "Phase 3 wires this up to a real agent with live search fallback.",
            cited_article_ids=[],
            used_live_search=False,
        )

    summary_lines = "\n".join(f"- {a.title}: {an.summary}" for a, an in rows)
    return AskResponse(
        answer=f"Found {len(rows)} related stored articles:\n{summary_lines}",
        cited_article_ids=[a.id for a, _ in rows],
        used_live_search=False,
    )
