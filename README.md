# AI News Agent

A production-grade agent that ingests AI and machine learning news from
multiple sources, deduplicates and summarizes it with an LLM, and serves it
through an API and a dashboard you can query in natural language.

Not a scraper with a summarizer bolted on. The ingestion pipeline and the
agent are separate systems: the pipeline runs on a schedule and builds a
curated corpus, while the agent decides at query time which tools to use and
whether it has enough evidence to answer.

---

## Project overview

Tracking AI/ML developments means checking a dozen sources, reading the same
announcement rewritten by five outlets, and still missing things. This project
automates that: it pulls from RSS feeds, APIs, and scraped pages on a
schedule, detects when several articles describe the same story, summarizes
each story once, and lets you ask questions about the result.

The design priorities, in order:

1. **Cost control.** Embeddings run locally and cost nothing. LLM calls happen
   once per deduplicated story, not once per article, and a daily budget
   guard halts enrichment before it overspends.
2. **Failure isolation.** A broken feed marks itself degraded and the run
   continues. One bad source never kills a pipeline pass.
3. **Observability.** Every run records what it attempted, what succeeded,
   what it cost, and what failed. The dashboard surfaces this.

---

## Features

**Ingestion**
- Pluggable fetchers for RSS/Atom feeds, JSON APIs, and HTML scraping
- Per-source fetch intervals, authority weights, and configuration
- Retry with exponential backoff; per-source failure isolation
- Idempotent inserts, so re-running never duplicates articles
- Recency filtering, so archive-serving feeds don't flood the corpus

**Enrichment**
- Local ONNX embeddings (no API key, no per-token cost)
- Vector similarity clustering to detect the same story across outlets
- One LLM call per cluster producing a summary, category, and relevance score
- Daily spend cap that degrades gracefully rather than failing

**Agent**
- Tool-calling loop over semantic search, structured filtering, and optional
  live web search
- Answers cite the specific articles they used, validated against what the
  tools actually returned
- Query history persisted and browsable

**Dashboard**
- Article feed with category filtering and relevance/recency sorting
- Natural-language query panel with cited sources rendered inline
- Pipeline health view showing source status and throughput

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| API | FastAPI | Async throughout, automatic OpenAPI docs |
| Database | PostgreSQL 16 + pgvector | Relational data and vector search in one store |
| ORM | SQLAlchemy 2.0 (async) | Typed models, async sessions |
| Embeddings | fastembed + BAAI/bge-small-en-v1.5 | ONNX runtime, no torch, no API cost |
| LLM | Any OpenAI-compatible endpoint | Provider-swappable via config alone |
| HTTP | httpx + tenacity | Async fetching with retry |
| Parsing | feedparser, selectolax | Feeds and HTML |
| Logging | structlog | Machine-readable JSON logs |
| Frontend | React 19 + TypeScript + Vite | Fast dev loop, typed API boundary |
| Data fetching | TanStack Query | Caching, loading and error states |
| Styling | Tailwind CSS | Utility-first, no separate stylesheet layer |
| Packaging | uv | Fast resolution, lockfile reproducibility |
| Deployment | Docker Compose | Same stack locally and in production |

---

## Architecture

![AI News Agent Architecture](docs/architecture/AI_news_agent_architecture.png)


Three processes run independently:

- **Worker** — executes ingestion then enrichment on an interval
- **API** — serves the dashboard, hosts the agent
- **Database** — the only shared state

Nothing downstream talks to the fetchers directly. Everything reads from
Postgres, which is what makes the delivery layer replaceable: the dashboard,
a Telegram bot, or an email digest would all consume the same API.

### Pipeline stages

| Stage | Input | Output | Cost |
|---|---|---|---|
| Fetch | Source config | Raw articles | Network only |
| Prefilter | Raw articles | Plausibly relevant articles | Free (regex) |
| Recency filter | Filtered articles | Recent articles | Free |
| Embed | Article text | 384-dim vectors | Free (local CPU) |
| Cluster | Vectors | Cluster assignment | One DB query per article |
| Analyze | Cluster representatives | Summary, category, score | One LLM call per batch |

The ordering is deliberate. Every stage that costs money sits behind stages
that cost nothing, so the expensive work only ever runs on content that
survived the cheap filters.

---

## Project structure

```
ai-news-agent/
├── app/
│   ├── main.py                  # FastAPI app, router mounting, CORS
│   ├── cli.py                   # ingest / enrich / run commands
│   ├── config.py                # settings loaded from environment
│   ├── database.py              # async engine and session factory
│   ├── models.py                # SQLAlchemy ORM models
│   ├── schemas.py               # Pydantic request/response models
│   │
│   ├── core/
│   │   └── logging.py           # structlog JSON configuration
│   │
│   ├── ingestion/
│   │   ├── base.py              # FetchedItem, BaseFetcher, retrying HTTP
│   │   ├── rss.py               # RSS/Atom fetcher
│   │   ├── api.py               # JSON API fetcher (Hacker News)
│   │   ├── scraper.py           # CSS-selector HTML fetcher
│   │   └── registry.py          # source_type → fetcher resolution
│   │
│   ├── enrichment/
│   │   ├── embeddings.py        # fastembed wrapper, text preparation
│   │   ├── clustering.py        # pgvector similarity search
│   │   ├── analyzer.py          # batched LLM summarization
│   │   ├── cost.py              # token pricing, budget guard
│   │   └── repository.py        # enrichment database access
│   │
│   ├── agent/
│   │   ├── loop.py              # tool-calling loop
│   │   ├── tools.py             # tool schemas and dispatch
│   │   ├── retrieval.py         # semantic and structured search
│   │   ├── citations.py         # citation parsing and validation
│   │   └── prompts.py           # system prompt
│   │
│   ├── pipeline/
│   │   ├── runner.py            # ingestion orchestration
│   │   ├── enrich_runner.py     # enrichment orchestration
│   │   ├── repository.py        # pipeline database access
│   │   └── filters.py           # keyword prefilter
│   │
│   └── routers/
│       ├── articles.py          # GET /articles
│       ├── stats.py             # GET /stats
│       └── ask.py               # POST /ask, GET /ask/history
│
├── dashboard/
│   └── src/
│       ├── api/                 # typed fetch layer
│       ├── types/               # types mirroring the API schemas
│       ├── hooks/               # TanStack Query wrappers
│       ├── components/
│       │   ├── feed/            # article list, cards, filters
│       │   ├── ask/             # query panel, answers, history
│       │   ├── health/          # pipeline status
│       │   └── ui/              # shared primitives
│       └── lib/                 # formatting, constants
│
├── migrations/                  # incremental schema changes
├── scripts/scheduler.sh         # interval loop for the worker
├── tests/
├── schema.sql                   # baseline schema and seed sources
├── docker-compose.yml
├── Dockerfile                   # API image
├── Dockerfile.worker            # pipeline image (bakes in the model)
└── pyproject.toml
```

Each package owns one stage. `ingestion` knows nothing about embeddings;
`enrichment` knows nothing about HTTP; `agent` reads the database but never
writes articles. Repository modules isolate database access so orchestration
code stays readable.

---

## Installation and setup

### Prerequisites

- Docker and Docker Compose
- An API key for any OpenAI-compatible LLM endpoint
- Node.js 20+ and uv, for local development outside containers

### 1. Configure environment

```bash
cp .env.example .env
```

Fill in:

```bash
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me
POSTGRES_DB=AI_News_Agent
DATABASE_URL=postgresql+asyncpg://postgres:change-me@127.0.0.1:5432/AI_News_Agent

# LLM — any OpenAI-compatible endpoint
LLM_API_KEY=your-key
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai/
LLM_MODEL=gemini-3.5-flash-lite
LLM_INPUT_COST_PER_MTOK=0.30
LLM_OUTPUT_COST_PER_MTOK=2.50

# Embeddings (local, no key needed)
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

# Pipeline
DAILY_LLM_BUDGET_USD=2.00
DEDUP_SIMILARITY_THRESHOLD=0.90
DEDUP_LOOKBACK_HOURS=48

# Agent
AGENT_MAX_ITERATIONS=5
AGENT_SEARCH_LIMIT=8
TAVILY_API_KEY=            # optional; enables live web search
```

`.env.docker` overrides `DATABASE_URL` to use the `db` hostname inside the
Docker network.

### 2. Start the stack

```bash
docker compose up -d --build
```

This starts Postgres with pgvector (initialized from `schema.sql`), the API on
port 8000, and the worker running the pipeline hourly.

### 3. Apply migrations

```bash
for f in migrations/*.sql; do
  docker compose exec -T db psql -U postgres -d AI_News_Agent < "$f"
done
```

### 4. Run the pipeline once

```bash
docker compose exec worker python -m app.cli run
```

### 5. Start the dashboard

```bash
cd dashboard
npm install
echo "VITE_API_BASE_URL=http://localhost:8000" > .env.local
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

### Port conflicts

If a Postgres instance already runs on 5432, either stop it or remap the
container in `docker-compose.yml` to `"5433:5432"` and update `DATABASE_URL`.
Use `127.0.0.1` rather than `localhost` to avoid IPv6 resolution picking the
wrong listener.

---

## Usage

### CLI

```bash
python -m app.cli ingest    # fetch and store new articles
python -m app.cli enrich    # embed, cluster, summarize
python -m app.cli run       # both, in order
```

Add `--log-level DEBUG` for verbose output.

### Adding a source

Sources live in the database, so adding one needs no code change:

```sql
INSERT INTO sources (name, source_type, url, fetch_interval_minutes, authority_weight)
VALUES ('DeepMind Blog', 'rss', 'https://deepmind.google/blog/feed/basic/', 180, 0.90);
```

`authority_weight` above 0.85 bypasses the keyword prefilter — use it only
for sources where everything published is on-topic.

For scraped sources, supply CSS selectors in `config`:

```sql
UPDATE sources SET config = '{
  "item_selector": "article.post",
  "title_selector": "h2 a",
  "link_selector": "h2 a"
}'::jsonb WHERE name = 'Example Blog';
```

### Inspecting pipeline runs

```sql
SELECT started_at, sources_succeeded, articles_found, llm_cost_usd, errors
FROM pipeline_runs ORDER BY started_at DESC LIMIT 10;
```

### Tuning deduplication

Check whether clusters group genuinely related stories:

```sql
SELECT c.id, COUNT(*) AS members, MIN(cm.similarity) AS weakest
FROM cluster_members cm JOIN clusters c ON c.id = cm.cluster_id
GROUP BY c.id HAVING COUNT(*) > 1 ORDER BY members DESC;
```

Raise `DEDUP_SIMILARITY_THRESHOLD` toward 0.93 if unrelated stories merge;
lower it toward 0.87 if obvious duplicates stay separate.

---

## Demo

![Video Demo](docs/demo/AI-News-Agent.mp4)

---

## API documentation

Interactive docs are generated automatically:

- Swagger UI — `http://localhost:8000/docs`
- ReDoc — `http://localhost:8000/redoc`

### `GET /health`

Liveness check. Returns `{"status": "ok"}`.

### `GET /articles`

Paginated feed of analyzed articles.

| Parameter | Type | Default | Description |
|---|---|---|---|
| `category` | string | – | One of research, product, funding, policy, opinion, other |
| `since` | datetime | – | Only articles published after this time |
| `min_score` | float | 0.0 | Minimum relevance score |
| `sort` | string | recent | `recent` or `relevant` |
| `limit` | int | 50 | Max 200 |
| `offset` | int | 0 | Pagination offset |

Only cluster representatives appear here, so the feed is deduplicated by
construction.

### `GET /articles/{id}`

Single article with its analysis. 404 if not found or not yet enriched.

### `GET /stats`

Pipeline health: last run timestamps, healthy and broken source counts,
articles ingested in the last 24 hours.

### `POST /ask`

```json
{ "question": "What has OpenAI announced recently?" }
```

Returns the answer, the articles it cited, and whether live web search was
used. Takes several seconds — the agent may run multiple tool calls.

### `GET /ask/history`

Past questions with their answers and cited articles, newest first.
Supports `limit` and `offset`.

### `DELETE /ask/history/{id}`

Removes one saved query. Returns 204.

---

## Engineering decisions

### Local embeddings instead of a hosted API

Embeddings run on every article that survives filtering; summarization runs
once per deduplicated story. The high-volume operation is the one worth making
free.

Deduplicating news headlines is also an easier task than general retrieval —
two articles about the same announcement are close under any reasonable
embedding. Paying for a frontier embedding model would buy accuracy the task
can't use, while consuming budget that summarization actually needs.

`fastembed` was chosen over `sentence-transformers` because it runs ONNX and
skips the torch dependency entirely: roughly 50MB instead of over a gigabyte.

### One LLM call per cluster, not per article

Five outlets covering the same announcement produce five articles but one
story. Clustering first and summarizing the representative cuts LLM calls
proportionally to how much duplication exists in the corpus.

Duplicates receive no `article_analysis` row at all — only a
`cluster_members` entry. This means similarity search only ever scans
representatives, and the API returns a deduplicated feed without needing a
DISTINCT clause anywhere.

### HNSW over IVFFlat

IVFFlat builds its index from training data and performs poorly when created
on an empty table, which is exactly when a fresh deployment creates it. HNSW
needs no training data, so the index is correct from the first insert.

### Cheap filters before expensive ones

Keyword matching, then recency, then embedding, then clustering, then LLM.
Each stage is more expensive than the last, so content is eliminated as early
as possible.

The recency filter exists because of a specific failure: OpenAI's feed serves
its entire archive, and a single ingestion pass pulled 1,169 articles. Without
the filter, enrichment would have spent real money summarizing years-old blog
posts as if they were news.

High-authority sources bypass the keyword filter, since everything arXiv or a
lab blog publishes is already on topic. Only noisy aggregators get filtered.

### Provider-agnostic LLM client

The analyzer and agent target an OpenAI-compatible endpoint with a
configurable base URL. Switching between Gemini, Groq, and OpenAI is three
lines in `.env` with no code change.

This was not the original design — the first implementation used the Anthropic
SDK directly. Making it swappable took one file and immediately paid off when
API quota constraints forced a provider change mid-development.

### Citations validated, not harvested

An earlier version recorded every article a tool returned as a citation, so an
answer discussing two articles reported eight sources.

The model now emits an explicit `CITED:` line, which is parsed out of the
answer and intersected with the set of ids the tools actually returned. A
hallucinated UUID cannot reach the client, and the citation list reflects what
the answer used rather than what was retrieved.

### Failure isolation and idempotency

Sources are fetched concurrently under a semaphore, with results collected
rather than awaited in sequence. A failing source records its error, marks
itself degraded, and the run continues.

Article inserts use `ON CONFLICT DO NOTHING` against a `(source_id, url)`
unique constraint, so re-running a pass is safe and the reported count of new
articles is accurate.

### Observability as a first-class table

`pipeline_runs` records every execution: sources attempted and succeeded,
articles found, deduplication outcome, LLM cost, and a JSON array of errors.
`agent_queries` records every question asked.

Retrofitting this would have been harder than building it in, and it is what
makes the dashboard's health view possible.

---

## Testing

```bash
uv run pytest
```

Current coverage focuses on pure functions where bugs are cheapest to catch:

- **Citation parsing** — that unretrieved ids are rejected, that a missing
  citation line is handled, that `CITED: none` yields no citations
- **Keyword prefilter** — that relevant titles pass and noise is dropped

CI runs lint (ruff), format checking, tests, a TypeScript type check, a
frontend build, and a Docker build for both images on every push and pull
request.

Coverage is thin and honestly stated as such. The highest-value additions
would be integration tests against a throwaway Postgres container covering
the repository layer, where several real bugs have occurred — particularly
around function signatures with many same-typed positional parameters.

---

## Limitations and future improvements

### Known limitations

**Research feed volume.** arXiv's cs.LG and cs.CL publish roughly 450 papers
daily between them. At high authority weight they bypass filtering entirely,
which is more volume than an LLM budget comfortably absorbs and more noise
than a news feed wants.

**Deduplication threshold is untuned.** 0.90 was chosen as a starting guess
and has not been validated against a labelled set of known duplicates.

**Source status conflates two states.** A source disabled deliberately and a
source failing repeatedly both show as unavailable. `last_error` also persists
after a source stops being retried, so the dashboard can display a stale
failure indefinitely.

**Schema management is manual.** The baseline lives in `schema.sql` with
incremental changes as numbered SQL files applied by hand. A fresh database
built from scratch may not reproduce the current state exactly.

**Single-category filtering.** The API accepts one category per request, so
the dashboard's filter is effectively single-select.

**Cost tracking reports zero on free tiers.** Token counts are recorded but
resolve to no cost when configured pricing is zero, which is accurate but
makes usage invisible.

### Planned improvements

**Corroboration-based relevance for research papers.** Rather than filtering
arXiv by keyword, only enrich papers that also appear in another source. This
uses the existing clustering to turn a cost problem into a signal: a paper
that Hacker News is discussing is a paper worth summarizing.

**Source health rules.** Promote a source to broken after N consecutive
failures, track `last_success_at` separately from `last_fetched_at`, and clear
stale errors on status change.

**Alembic migrations.** Replace hand-applied SQL with versioned migrations so
schema state is reproducible.

**Self-directed source discovery.** Periodically have the agent propose new
sources based on what existing content references — a genuinely agentic
capability the current design gestures at but does not implement.

**Threaded conversations.** The query history stores independent
question-answer pairs. Supporting follow-up questions that reference earlier
turns requires a thread identifier and passing prior turns into the loop.

**Digest delivery.** The API layer makes alternative delivery surfaces cheap:
a weekly email digest or a Telegram bot would consume the same endpoints the
dashboard does.