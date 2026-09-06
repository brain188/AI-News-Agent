-- AI News Agent — Database Schema
-- Postgres 15+ with pgvector extension

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ============================================================
-- SOURCES: where content comes from
-- ============================================================
CREATE TABLE sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL UNIQUE,
    source_type     TEXT NOT NULL CHECK (source_type IN ('rss', 'api', 'scrape')),
    url             TEXT NOT NULL,
    fetch_interval_minutes INT NOT NULL DEFAULT 60,
    authority_weight NUMERIC(3,2) NOT NULL DEFAULT 0.50, -- 0.00-1.00, used in ranking
    status          TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'broken')),
    last_fetched_at TIMESTAMPTZ,
    last_error      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ARTICLES: raw ingested content, one row per fetched item
-- ============================================================
CREATE TABLE articles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id       UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    title           TEXT NOT NULL,
    raw_content     TEXT,               -- full text if scraped/fetched, else NULL
    published_at    TIMESTAMPTZ,
    fetched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_id, url)
);

CREATE INDEX idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX idx_articles_fetched_at ON articles (fetched_at DESC);

-- ============================================================
-- CLUSTERS: groups of near-duplicate articles (one real-world story)
-- ============================================================
CREATE TABLE clusters (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    representative_article_id UUID REFERENCES articles(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cluster_members (
    cluster_id      UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    article_id      UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    similarity      NUMERIC(4,3), -- cosine similarity to representative article
    PRIMARY KEY (cluster_id, article_id)
);

-- ============================================================
-- ARTICLE_ANALYSIS: LLM-derived enrichment, one per representative article/cluster
-- ============================================================
CREATE TABLE article_analysis (
    article_id      UUID PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
    cluster_id      UUID REFERENCES clusters(id),
    summary         TEXT NOT NULL,
    category        TEXT NOT NULL CHECK (category IN ('research', 'product', 'funding', 'policy', 'opinion', 'other')),
    relevance_score NUMERIC(4,3) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    -- IMPORTANT: this dimension must match the configured EMBEDDING_MODEL's output
    -- and app.models.EMBEDDING_DIM. 1536 suits OpenAI text-embedding-3-small;
    -- voyage-3 (the current .env.example default) emits 1024 — inserting a
    -- 1024-d vector into a vector(1536) column fails. Change all three together.
    embedding       vector(1536),
    analyzed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ANN index for similarity search (cosine distance)
CREATE INDEX idx_article_analysis_embedding ON article_analysis
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX idx_article_analysis_category ON article_analysis (category);
CREATE INDEX idx_article_analysis_relevance ON article_analysis (relevance_score DESC);

-- ============================================================
-- PIPELINE_RUNS: one row per scheduled pipeline execution (observability)
-- ============================================================
CREATE TABLE pipeline_runs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at         TIMESTAMPTZ,
    -- Ingest runs count sources in the columns below; enrich runs count articles.
    kind                TEXT NOT NULL DEFAULT 'ingest'
                        CHECK (kind IN ('ingest', 'enrich')),
    sources_attempted   INT NOT NULL DEFAULT 0,
    sources_succeeded   INT NOT NULL DEFAULT 0,
    articles_found      INT NOT NULL DEFAULT 0,
    articles_after_dedup INT NOT NULL DEFAULT 0,
    llm_cost_usd        NUMERIC(10,4) NOT NULL DEFAULT 0,
    errors              JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_pipeline_runs_started_at ON pipeline_runs (started_at DESC);

-- ============================================================
-- AGENT_QUERIES: log of natural-language questions asked via /ask
-- ============================================================
CREATE TABLE agent_queries (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question        TEXT NOT NULL,
    answer          TEXT,
    cited_article_ids UUID[],
    used_live_search BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Seed a few starter sources (edit freely)
-- ============================================================
INSERT INTO sources (name, source_type, url, fetch_interval_minutes, authority_weight) VALUES
('arXiv cs.LG', 'rss', 'http://export.arxiv.org/rss/cs.LG', 120, 0.90),
('arXiv cs.CL', 'rss', 'http://export.arxiv.org/rss/cs.CL', 120, 0.90),
('Hacker News (Algolia API, AI tag)', 'api', 'https://hn.algolia.com/api/v1/search_by_date?tags=story&query=AI', 60, 0.70),
('OpenAI Blog', 'rss', 'https://openai.com/blog/rss.xml', 180, 0.95),
('Anthropic News', 'rss', 'https://www.anthropic.com/news/rss.xml', 180, 0.95);
