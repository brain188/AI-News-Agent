import re

from app.ingestion.base import FetchedItem

# Terms that mark an item as plausibly AI/ML related.
_KEYWORDS = {
    "ai", "artificial intelligence", "machine learning", "ml", "deep learning",
    "neural network", "llm", "large language model", "transformer", "gpt",
    "claude", "gemini", "llama", "diffusion", "rag", "fine-tune", "fine-tuning",
    "inference", "training run", "openai", "anthropic", "deepmind", "hugging face",
    "pytorch", "tensorflow", "agentic", "multimodal", "benchmark",
}

_PATTERN = re.compile(r"\b(" + "|".join(re.escape(k) for k in _KEYWORDS) + r")\b", re.IGNORECASE)


def is_probably_relevant(item: FetchedItem) -> bool:
    """Cheap keyword check to drop obvious noise before spending LLM calls."""
    haystack = f"{item.title} {item.raw_content or ''}"
    return bool(_PATTERN.search(haystack))


def apply_prefilter(items: list[FetchedItem], trusted: bool) -> list[FetchedItem]:
    """Filter items unless the source is trusted enough to pass everything through."""
    if trusted:
        return items
    return [item for item in items if is_probably_relevant(item)]