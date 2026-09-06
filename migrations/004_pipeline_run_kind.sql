-- Ingestion and enrichment both write to pipeline_runs, but the counter columns
-- mean different things for each: an ingest run counts sources, an enrich run
-- counts articles. Without a discriminator a reader cannot tell them apart.
ALTER TABLE pipeline_runs
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'ingest';

ALTER TABLE pipeline_runs
    DROP CONSTRAINT IF EXISTS pipeline_runs_kind_check;

ALTER TABLE pipeline_runs
    ADD CONSTRAINT pipeline_runs_kind_check CHECK (kind IN ('ingest', 'enrich'));
