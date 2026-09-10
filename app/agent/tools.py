import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent import retrieval
from app.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

TAVILY_URL = "https://api.tavily.com/search"

SEARCH_ARTICLES = {
    "type": "function",
    "function": {
        "name": "search_articles",
        "description": "Semantic search over stored AI/ML news articles by meaning.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to search for"},
            },
            "required": ["query"],
        },
    },
}

FILTER_ARTICLES = {
    "type": "function",
    "function": {
        "name": "filter_articles",
        "description": "List recent articles by category and recency, best first.",
        "parameters": {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["research", "product", "funding", "policy", "opinion", "other"],
                },
                "days": {"type": "integer", "description": "How many days back to look"},
                "min_relevance": {"type": "number", "description": "0.0-1.0, default 0.3"},
            },
        },
    },
}

WEB_SEARCH = {
    "type": "function",
    "function": {
        "name": "web_search",
        "description": "Search the live web. Use only when the database lacks the answer.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "What to search for"},
            },
            "required": ["query"],
        },
    },
}


def available_tools() -> list[dict]:
    """Return tool schemas, including web search only when a key is configured."""
    tools = [SEARCH_ARTICLES, FILTER_ARTICLES]
    if settings.tavily_api_key:
        tools.append(WEB_SEARCH)
    return tools


async def _web_search(query: str) -> list[dict]:
    """Query Tavily and return trimmed results."""
    payload = {"api_key": settings.tavily_api_key, "query": query, "max_results": 5}
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(TAVILY_URL, json=payload)
        response.raise_for_status()

    return [
        {"title": item.get("title"), "url": item.get("url"), "snippet": item.get("content")}
        for item in response.json().get("results", [])
    ]


async def execute(db: AsyncSession, name: str, args: dict) -> list[dict]:
    """Run one tool by name and return its results."""
    log.info("tool_called", tool=name, args=args)

    if name == "search_articles":
        return await retrieval.search_articles(db, args["query"], limit=settings.agent_search_limit)

    if name == "filter_articles":
        return await retrieval.filter_articles(
            db,
            category=args.get("category"),
            days=args.get("days"),
            min_relevance=float(args.get("min_relevance", 0.3)),
            limit=settings.agent_search_limit,
        )

    if name == "web_search":
        return await _web_search(args["query"])

    raise ValueError(f"Unknown tool: {name}")
