from urllib.parse import urljoin

import httpx
from selectolax.parser import HTMLParser

from app.core.logging import get_logger
from app.ingestion.base import BaseFetcher, FetchedItem, fetch_bytes

log = get_logger(__name__)


class ScrapeFetcher(BaseFetcher):
    """Extracts article links from an HTML page using per-source CSS selectors."""

    async def fetch(self, client: httpx.AsyncClient) -> list[FetchedItem]:
        """Parse the listing page and pull out title/link pairs."""
        item_selector = self.config.get("item_selector")
        if not item_selector:
            log.warning("scrape_config_missing", source=self.source.name)
            return []

        body = await fetch_bytes(client, self.source.url)
        tree = HTMLParser(body.decode("utf-8", errors="replace"))

        title_selector = self.config.get("title_selector", "a")
        link_selector = self.config.get("link_selector", "a")

        items = []
        for node in tree.css(item_selector):
            title_node = node.css_first(title_selector)
            link_node = node.css_first(link_selector)
            if not title_node or not link_node:
                continue

            href = link_node.attributes.get("href")
            if not href:
                continue

            items.append(
                FetchedItem(
                    url=urljoin(self.source.url, href),
                    title=title_node.text(strip=True),
                )
            )
        return items
