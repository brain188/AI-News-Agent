import json
import uuid
from dataclasses import dataclass, field

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent import citations, tools
from app.agent.prompts import SYSTEM_PROMPT
from app.config import settings
from app.core.logging import get_logger
from app.enrichment.cost import Usage

log = get_logger(__name__)

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    """Reuse a single client for the configured OpenAI-compatible endpoint."""
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)
    return _client


@dataclass(slots=True)
class AgentAnswer:
    """Final answer plus the evidence and cost behind it."""

    answer: str
    cited_article_ids: list[uuid.UUID] = field(default_factory=list)
    used_live_search: bool = False
    cost_usd: float = 0.0


def _collect_ids(results: list[dict], sink: set[uuid.UUID]) -> None:
    """Track which article ids the tools returned, to validate citations against."""
    for item in results:
        raw = item.get("id")
        if raw:
            sink.add(uuid.UUID(raw))


async def run_agent(db: AsyncSession, question: str) -> AgentAnswer:
    """Answer a question, letting the model choose and sequence its tools."""
    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": question},
    ]

    retrieved: set[uuid.UUID] = set()
    used_live_search = False
    total_cost = 0.0

    for step in range(settings.agent_max_iterations):
        response = await _get_client().chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            tools=tools.available_tools(),
            max_tokens=1500,
        )

        usage = Usage(response.usage.prompt_tokens, response.usage.completion_tokens)
        total_cost += usage.cost_usd()
        message = response.choices[0].message

        # No tool calls means the model is done reasoning and has an answer.
        if not message.tool_calls:
            body, cited = citations.extract(message.content or "", retrieved)
            if not cited and retrieved:
                log.info("no_citations_returned", retrieved=len(retrieved))

            return AgentAnswer(
                answer=body,
                cited_article_ids=cited,
                used_live_search=used_live_search,
                cost_usd=total_cost,
            )

        messages.append(message.model_dump(exclude_none=True))

        for call in message.tool_calls:
            name = call.function.name

            try:
                args = json.loads(call.function.arguments or "{}")
            except json.JSONDecodeError as exc:
                log.error("invalid_tool_arguments", tool=name, error=str(exc))
                results = [{"error": "Invalid tool arguments"}]
            else:
                results = await tools.execute(db, name, args)

            if name == "web_search":
                used_live_search = True
            else:
                _collect_ids(results, retrieved)

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": call.id,
                    "content": json.dumps(results)[:6000],
                }
            )

    log.warning("agent_max_iterations_reached", question=question[:100])
    return AgentAnswer(
        answer="I couldn't reach a conclusion within the allowed number of steps.",
        cited_article_ids=[],
        used_live_search=used_live_search,
        cost_usd=total_cost,
    )