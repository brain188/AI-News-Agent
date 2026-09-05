#!/bin/sh
# Runs the pipeline on an interval. Sleeps first so the DB is ready on boot.
set -e

INTERVAL="${PIPELINE_INTERVAL_SECONDS:-3600}"

echo "Scheduler started; interval ${INTERVAL}s"
sleep 15

while true; do
    echo "--- pipeline run started at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    # Never let one failed run kill the loop.
    python -m app.cli run || echo "pipeline run failed; continuing"
    echo "--- sleeping ${INTERVAL}s"
    sleep "$INTERVAL"
done