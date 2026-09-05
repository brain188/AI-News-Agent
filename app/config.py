from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str

    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dimension: int = 384

    # LLM
    llm_api_key: str = ""
    llm_base_url: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    llm_model: str = "gemini-3.5-flash-lite"
    llm_input_cost_per_mtok: float = 0.30
    llm_output_cost_per_mtok: float = 2.50

    # Enrichment
    enrichment_batch_size: int = 5
    max_content_chars_for_llm: int = 3000

    # Pipeline
    daily_llm_budget_usd: float = Field(default=2.00, ge=0)
    dedup_similarity_threshold: float = Field(default=0.90, ge=0.0, le=1.0)
    dedup_lookback_hours: int = Field(default=48, ge=1)

    # App
    api_host: str = "0.0.0.0"
    api_port: int = Field(default=8000, ge=1, le=65535)
    # Comma-separated origins allowed to call the API. "*" allows any origin —
    # fine for local dev, tighten before deploying publicly.
    cors_allow_origins: str = "*"

    @field_validator("database_url")
    @classmethod
    def _must_be_async_driver(cls, v: str) -> str:
        # The app uses create_async_engine; a sync DSN fails at startup with a
        # much less obvious error than this one.
        if "+asyncpg" not in v:
            raise ValueError("database_url must use the asyncpg driver, e.g. postgresql+asyncpg://...")
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


settings = Settings()
