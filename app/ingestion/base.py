from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

DEFAULT_TIMEOUT = 20.0
USER_AGENT = "ai-news-agent/0.2 (+https://github.com/brain188/Ai-News-Agent)"


@dataclass(slots=True)
class FetchedItem:
    """One article as returned by a fetcher, before any DB or LLM work."""

    url: str
    title: str
    published_at: datetime | None = None
    raw_content: str | None = None


class FetchError(Exception):
    """Raised when a source cannot be fetched after all retries."""


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10), reraise=True)
async def fetch_bytes(client: httpx.AsyncClient, url: str) -> bytes:
    """GET a URL with retry and backoff, returning the raw response body."""
    response = await client.get(url, timeout=DEFAULT_TIMEOUT, follow_redirects=True)
    response.raise_for_status()
    return response.content


class BaseFetcher(ABC):
    """Interface every source fetcher implements."""

    def __init__(self, source) -> None:
        self.source = source
        self.config: dict = source.config or {}

    @abstractmethod
    async def fetch(self, client: httpx.AsyncClient) -> list[FetchedItem]:
        """Retrieve current items for this source."""
        raise NotImplementedError