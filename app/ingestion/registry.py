from urllib.parse import urlparse

from app.ingestion.api import HackerNewsFetcher
from app.ingestion.base import BaseFetcher
from app.ingestion.rss import RSSFetcher
from app.ingestion.scraper import ScrapeFetcher

# Fetchers selected purely by source_type.
_BY_TYPE: dict[str, type[BaseFetcher]] = {
    "rss": RSSFetcher,
    "scrape": ScrapeFetcher,
}

# API sources need per-provider handling, keyed by hostname.
_BY_API_HOST: dict[str, type[BaseFetcher]] = {
    "hn.algolia.com": HackerNewsFetcher,
}


class UnsupportedSourceError(Exception):
    """Raised when no fetcher is registered for a source."""


def get_fetcher(source) -> BaseFetcher:
    """Return the fetcher instance responsible for this source."""
    if source.source_type == "api":
        host = urlparse(source.url).hostname or ""
        fetcher_cls = _BY_API_HOST.get(host)
        if not fetcher_cls:
            raise UnsupportedSourceError(f"No API fetcher registered for host: {host}")
        return fetcher_cls(source)

    fetcher_cls = _BY_TYPE.get(source.source_type)
    if not fetcher_cls:
        raise UnsupportedSourceError(f"Unknown source_type: {source.source_type}")
    return fetcher_cls(source)
