import json
from dataclasses import dataclass

from anthropic import AsyncAnthropic

from app.config import settings
from app.core.logging import get_logger
from app.enrichment.cost import Usage
from app.enrichment.embeddings import strip_html

log = get_logger(__name__)

VALID_CATEGORIES = {"research", "product", "funding", "policy", "opinion", "other"}

SYSTEM_PROMPT = """You analyze AI and machine learning news articles.

For each numbered article, produce:
- summary: 2-3 sentences, factual, no marketing language
- category: exactly one of research, product, funding, policy, opinion, other
- relevance_score: 0.0-1.0 for how relevant this is to someone tracking AI/ML
  developments. Score below 0.3 if it only mentions AI incidentally.

Respond with a JSON array only. No preamble, no markdown fences.
Each element must be: {"index": <int>, "summary": <str>, "category": <str>,
"relevance_score": <float>}"""


@dataclass(slots=True)
class AnalysisResult:
    """Structured LLM output for one article."""

    summary: str
    category: str
    relevance_score: float


_client: AsyncAnthropic | None = None


def _get_client() -> AsyncAnthropic:
    """Lazily build the Anthropic client from configured credentials."""
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


def _build_prompt(articles: list) -> str:
    """Render a numbered block of articles for the model to analyze."""
    blocks = []
    for index, article in enumerate(articles):
        content = strip_html(article.raw_content)[: settings.max_content_chars_for_llm]
        blocks.append(f"[{index}] Title: {article.title}\nContent: {content or '(none)'}")
    return "\n\n".join(blocks)


def _coerce_result(item: dict) -> AnalysisResult:
    """Validate one JSON element, falling back to safe defaults on bad values."""
    category = str(item.get("category", "other")).lower()
    if category not in VALID_CATEGORIES:
        category = "other"

    score = float(item.get("relevance_score", 0.0))
    return AnalysisResult(
        summary=str(item.get("summary", "")).strip(),
        category=category,
        relevance_score=min(max(score, 0.0), 1.0),
    )


async def analyze_batch(articles: list) -> tuple[dict[int, AnalysisResult], Usage]:
    """Summarize and categorize a batch of articles in one LLM call."""
    response = await _get_client().messages.create(
        model=settings.llm_model,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_prompt(articles)}],
    )

    usage = Usage(response.usage.input_tokens, response.usage.output_tokens)
    raw = "".join(block.text for block in response.content if block.type == "text")
    cleaned = raw.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        log.error("analysis_parse_failed", preview=cleaned[:200])
        return {}, usage

    results: dict[int, AnalysisResult] = {}
    for item in parsed:
        index = item.get("index")
        if isinstance(index, int) and 0 <= index < len(articles):
            results[index] = _coerce_result(item)

    return results, usage