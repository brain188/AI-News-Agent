import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ArticleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    url: str
    published_at: datetime | None
    summary: str | None = None
    category: str | None = None
    relevance_score: float | None = None
    source_name: str | None = None
    # 1 for an unclustered article; >1 when other sources covered the same story.
    cluster_size: int = 1


class ArticlePage(BaseModel):
    """A page of articles plus the total matching the same filters.

    The total is what lets the client say "showing 20 of 143" and size a
    paginator; a bare list cannot.
    """

    items: list[ArticleOut]
    total: int


class DailyCount(BaseModel):
    day: date
    count: int


class StatsOut(BaseModel):
    last_run_started_at: datetime | None
    last_run_finished_at: datetime | None
    sources_healthy: int
    sources_broken: int
    articles_last_24h: int
    # Everything below feeds the pipeline health screen.
    sources_degraded: int = 0
    sources_total: int = 0
    last_run_duration_seconds: float | None = None
    last_run_articles_found: int | None = None
    last_run_articles_after_dedup: int | None = None
    last_run_error_count: int = 0
    total_articles: int = 0
    # The model answering /ask, so the UI can name it instead of guessing.
    llm_model: str = ""
    # Oldest day first, one entry per day including days with no articles.
    daily_volume: list[DailyCount] = []


class RunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    # "ingest" counts sources in the fields below; "enrich" counts articles.
    kind: str
    started_at: datetime
    finished_at: datetime | None
    sources_attempted: int
    sources_succeeded: int
    articles_found: int
    articles_after_dedup: int
    llm_cost_usd: float
    errors: list


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    source_type: str
    url: str
    status: str
    fetch_interval_minutes: int
    authority_weight: float
    last_fetched_at: datetime | None
    last_success_at: datetime | None = None
    last_error: str | None
    articles_last_24h: int = 0


class AskRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    # A blank question would otherwise match every stored article.
    question: str = Field(min_length=3, max_length=1000)


class AskResponse(BaseModel):
    answer: str
    cited_article_ids: list[uuid.UUID]
    # The cited articles themselves, so the client renders evidence without
    # one round trip per citation. Same order as cited_article_ids.
    cited_articles: list[ArticleOut] = []
    used_live_search: bool


class AgentQueryOut(BaseModel):
    """One past question, with its answer and the evidence behind it."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question: str
    answer: str | None
    cited_articles: list[ArticleOut] = []
    used_live_search: bool
    created_at: datetime
