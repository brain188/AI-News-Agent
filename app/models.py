import uuid
from datetime import UTC, datetime
from decimal import Decimal

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    TIMESTAMP,
    Boolean,
    CheckConstraint,
    ForeignKey,
    Integer,
    Numeric,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Must match the vector(N) dimension declared in schema.sql. Changing this alone
# does not migrate the database — update both, and reindex.
EMBEDDING_DIM = 384

SOURCE_TYPES = ("rss", "api", "scrape")
SOURCE_STATUSES = ("healthy", "degraded", "broken")
CATEGORIES = ("research", "product", "funding", "policy", "opinion", "other")


def utcnow() -> datetime:
    """Timezone-aware UTC now — these columns are all TIMESTAMPTZ."""
    return datetime.now(UTC)


def _in_list(column: str, values: tuple[str, ...]) -> str:
    return "{} IN ({})".format(column, ", ".join(f"'{v}'" for v in values))


class Base(DeclarativeBase):
    pass


class Source(Base):
    __tablename__ = "sources"
    __table_args__ = (
        CheckConstraint(_in_list("source_type", SOURCE_TYPES), name="sources_source_type_check"),
        CheckConstraint(_in_list("status", SOURCE_STATUSES), name="sources_status_check"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    name: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    source_type: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    fetch_interval_minutes: Mapped[int] = mapped_column(Integer, default=60, server_default=text("60"))
    # 0.00-1.00, used in ranking.
    authority_weight: Mapped[Decimal] = mapped_column(
        Numeric(3, 2), default=Decimal("0.50"), server_default=text("0.50")
    )
    status: Mapped[str] = mapped_column(Text, default="healthy", server_default=text("'healthy'"))
    last_fetched_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    last_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=utcnow, server_default=func.now()
    )
    config: Mapped[dict] = mapped_column(JSONB, default=dict)


class Article(Base):
    __tablename__ = "articles"
    __table_args__ = (UniqueConstraint("source_id", "url", name="articles_source_id_url_key"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False
    )
    url: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    # Full text if scraped/fetched, else NULL.
    raw_content: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    fetched_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=utcnow, server_default=func.now()
    )


class Cluster(Base):
    """A group of near-duplicate articles covering one real-world story."""

    __tablename__ = "clusters"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    representative_article_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id")
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=utcnow, server_default=func.now()
    )


class ClusterMember(Base):
    __tablename__ = "cluster_members"

    cluster_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="CASCADE"), primary_key=True
    )
    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True
    )
    # Cosine similarity to the representative article.
    similarity: Mapped[Decimal | None] = mapped_column(Numeric(4, 3))


class ArticleAnalysis(Base):
    __tablename__ = "article_analysis"
    __table_args__ = (
        CheckConstraint(_in_list("category", CATEGORIES), name="article_analysis_category_check"),
        CheckConstraint(
            "relevance_score >= 0 AND relevance_score <= 1",
            name="article_analysis_relevance_score_check",
        ),
    )

    article_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("articles.id", ondelete="CASCADE"), primary_key=True
    )
    cluster_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("clusters.id"))
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    relevance_score: Mapped[Decimal] = mapped_column(Numeric(4, 3), nullable=False)
    # Nullable: a row may be written before its embedding is computed.
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))
    analyzed_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=utcnow, server_default=func.now()
    )


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    started_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=utcnow, server_default=func.now()
    )
    finished_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True))
    sources_attempted: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    sources_succeeded: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    articles_found: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    articles_after_dedup: Mapped[int] = mapped_column(Integer, default=0, server_default=text("0"))
    llm_cost_usd: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0"), server_default=text("0")
    )
    errors: Mapped[list] = mapped_column(JSONB, default=list, server_default=text("'[]'::jsonb"))


class AgentQuery(Base):
    __tablename__ = "agent_queries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, server_default=func.gen_random_uuid()
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text)
    cited_article_ids: Mapped[list[uuid.UUID] | None] = mapped_column(ARRAY(UUID(as_uuid=True)))
    used_live_search: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), default=utcnow, server_default=func.now()
    )
