import json
from datetime import UTC, datetime

import httpx

from app.ingestion.base import BaseFetcher, FetchedItem, fetch_bytes


class HackerNewsFetcher(BaseFetcher):
    """Fetches AI-tagged stories from the Hacker News Algolia API."""

    async def fetch(self, client: httpx.AsyncClient) -> list[FetchedItem]:
        """Query Algolia and map hits to FetchedItems, skipping self-posts."""
        body = await fetch_bytes(client, self.source.url)
        payload = json.loads(body)

        items = []
        for hit in payload.get("hits", []):
            url = hit.get("url")
            title = hit.get("title")
            if not url or not title:
                continue
            items.append(
                FetchedItem(
                    url=url,
                    title=title.strip(),
                    published_at=_parse_timestamp(hit.get("created_at_i")),
                    raw_content=hit.get("story_text"),
                )
            )
        return items


def _parse_timestamp(epoch: int | None) -> datetime | None:
    """Convert a Unix timestamp into a timezone-aware datetime."""
    if epoch is None:
        return None
    return datetime.fromtimestamp(epoch, tz=UTC)