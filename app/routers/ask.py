from fastapi import APIRouter
from sqlalchemy import select

from app.database import DbSession
from app.models import Article, ArticleAnalysis
from app.schemas import AskRequest, AskResponse

router = APIRouter(prefix="/ask", tags=["ask"])

_LIKE_ESCAPE = "\\"

PLACEHOLDER_ANSWER = (
    "No matching stored articles yet — this is a Phase 1 placeholder. "
    "Phase 3 wires this up to a real agent with live search fallback."
)


def _like_pattern(question: str) -> str:
    """Escape LIKE metacharacters so a question containing % or _ matches literally."""
    escaped = question
    for ch in (_LIKE_ESCAPE, "%", "_"):
        escaped = escaped.replace(ch, _LIKE_ESCAPE + ch)
    return f"%{escaped}%"


@router.post("", response_model=AskResponse)
async def ask_agent(payload: AskRequest, db: DbSession):
    stmt = (
        select(Article, ArticleAnalysis)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .where(Article.title.ilike(_like_pattern(payload.question), escape=_LIKE_ESCAPE))
        .order_by(Article.published_at.desc().nullslast())
        .limit(5)
    )
    result = await db.execute(stmt)
    rows = result.all()

    if not rows:
        return AskResponse(answer=PLACEHOLDER_ANSWER, cited_article_ids=[], used_live_search=False)

    summary_lines = "\n".join(f"- {a.title}: {an.summary}" for a, an in rows)
    return AskResponse(
        answer=f"Found {len(rows)} related stored articles:\n{summary_lines}",
        cited_article_ids=[a.id for a, _ in rows],
        used_live_search=False,
    )
