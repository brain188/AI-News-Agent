from datetime import UTC, datetime

import feedparser
import httpx

from app.core.logging import get_logger
from app.ingestion.base import BaseFetcher, FetchedItem, fetch_bytes

log = get_logger(__name__)


def _parse_published(entry) -> datetime | None:
    """Convert a feedparser time struct into a timezone-aware datetime."""
    parsed = getattr(entry, "published_parsed", None) or getattr(entry, "updated_parsed", None)
    if not parsed:
        return None
    return datetime(*parsed[:6], tzinfo=UTC)


class RSSFetcher(BaseFetcher):
    """Fetches items from an RSS or Atom feed."""

    async def fetch(self, client: httpx.AsyncClient) -> list[FetchedItem]:
        """Download the feed and map each entry to a FetchedItem."""
        body = await fetch_bytes(client, self.source.url)
        feed = feedparser.parse(body)

        if feed.bozo and not feed.entries:
            log.warning(
                "feed_parse_failed", source=self.source.name, error=str(feed.bozo_exception)
            )
            return []

        items = []
        for entry in feed.entries:
            link = getattr(entry, "link", None)
            title = getattr(entry, "title", None)
            if not link or not title:
                continue
            items.append(
                FetchedItem(
                    url=link,
                    title=title.strip(),
                    published_at=_parse_published(entry),
                    raw_content=getattr(entry, "summary", None),
                )
            )
        return items
