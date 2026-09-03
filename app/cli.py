import argparse
import asyncio

from app.core.logging import configure_logging, get_logger
from app.pipeline.enrich_runner import run_enrichment
from app.pipeline.runner import run_ingestion

log = get_logger(__name__)


async def _run_all() -> None:
    """Run ingestion followed immediately by enrichment."""
    await run_ingestion()
    await run_enrichment()


def main() -> None:
    """Parse arguments and dispatch to the requested pipeline command."""
    parser = argparse.ArgumentParser(description="AI News Agent pipeline commands")
    parser.add_argument("command", choices=["ingest", "enrich", "run"], help="Command to run")
    parser.add_argument("--log-level", default="INFO", help="Logging level")
    args = parser.parse_args()

    configure_logging(args.log_level)

    handlers = {"ingest": run_ingestion, "enrich": run_enrichment, "run": _run_all}
    asyncio.run(handlers[args.command]())


if __name__ == "__main__":
    main()