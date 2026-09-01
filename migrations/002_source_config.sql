-- Adds free-form per-source configuration (CSS selectors, API params)
ALTER TABLE sources ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Example: teach a scrape source where to find articles on the page
-- UPDATE sources SET config = '{
--   "item_selector": "article.post",
--   "title_selector": "h2 a",
--   "link_selector":  "h2 a"
-- }'::jsonb WHERE name = 'VentureBeat AI';