import asyncio
import re

from fastembed import TextEmbedding
from selectolax.parser import HTMLParser

from app.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

# bge-small truncates past ~512 tokens; this keeps inputs comfortably inside that.
MAX_EMBED_CHARS = 1000

_model: TextEmbedding | None = None


def _get_model() -> TextEmbedding:
    """Lazily load the ONNX model, downloading weights on first use."""
    global _model
    if _model is None:
        log.info("loading_embedding_model", model=settings.embedding_model)
        _model = TextEmbedding(model_name=settings.embedding_model)
    return _model


def strip_html(text: str | None) -> str:
    """Reduce HTML content from feeds to plain collapsed text."""
    if not text:
        return ""
    plain = HTMLParser(text).text(separator=" ")
    return re.sub(r"\s+", " ", plain).strip()


def build_embed_text(title: str, content: str | None) -> str:
    """Combine title and cleaned content into a single truncated embedding input."""
    combined = f"{title}. {strip_html(content)}".strip()
    return combined[:MAX_EMBED_CHARS]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts off the event loop, since fastembed is synchronous."""
    if not texts:
        return []

    def _run() -> list[list[float]]:
        model = _get_model()
        return [vector.tolist() for vector in model.embed(texts)]

    return await asyncio.to_thread(_run)