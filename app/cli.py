import argparse
import asyncio

from app.core.logging import configure_logging, get_logger
from app.pipeline.runner import run_ingestion

log = get_logger(__name__)


def main() -> None:
    """Parse arguments and dispatch to the requested pipeline command."""
    parser = argparse.ArgumentParser(description="AI News Agent pipeline commands")
    parser.add_argument("command", choices=["ingest"], help="Command to run")
    parser.add_argument("--log-level", default="INFO", help="Logging level")
    args = parser.parse_args()

    configure_logging(args.log_level)

    if args.command == "ingest":
        asyncio.run(run_ingestion())


if __name__ == "__main__":
    main()