from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    database_url: str = "postgresql+asyncpg://news_agent:changeme@localhost:5432/ai_news"

    # LLM
    anthropic_api_key: str = ""
    embedding_model: str = "voyage-3"
    llm_model: str = "claude-sonnet-4-6"

    # Pipeline
    daily_llm_budget_usd: float = 2.00
    dedup_similarity_threshold: float = 0.90
    dedup_lookback_hours: int = 48

    # App
    api_host: str = "0.0.0.0"
    api_port: int = 8000


settings = Settings()
