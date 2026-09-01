from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_size=10,
    max_overflow=20,
    # Postgres (or a proxy) can drop idle connections; without this the first
    # query on a stale pooled connection fails instead of transparently reconnecting.
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency — yields a DB session per request."""
    async with AsyncSessionLocal() as session:
        yield session


# Annotated alias so routes declare `db: DbSession` instead of putting a
# Depends() call in an argument default (which linters flag as bugbear B008).
DbSession = Annotated[AsyncSession, Depends(get_db)]
