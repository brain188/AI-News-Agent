import uuid
from datetime import datetime

from pydantic import BaseModel


class ArticleOut(BaseModel):
    id: uuid.UUID
    title: str
    url: str
    published_at: datetime | None
    summary: str | None = None
    category: str | None = None
    relevance_score: float | None = None
    source_name: str | None = None

    class Config:
        from_attributes = True


class StatsOut(BaseModel):
    last_run_started_at: datetime | None
    last_run_finished_at: datetime | None
    sources_healthy: int
    sources_broken: int
    articles_last_24h: int


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    cited_article_ids: list[uuid.UUID]
    used_live_search: bool
