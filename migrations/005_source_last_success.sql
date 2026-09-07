-- last_fetched_at advances on every attempt, success or failure, so it cannot
-- answer "when did this source last actually work?". This column can.
ALTER TABLE sources
    ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMPTZ;
