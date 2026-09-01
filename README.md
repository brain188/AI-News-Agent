# AI News Agent

Ingests AI news from RSS/API/scraped sources, deduplicates near-identical stories,
enriches them with LLM summaries and relevance scores, and serves the result over a
REST API.

**Status: Phase 1.** The database schema and the read API are in place. The ingestion
pipeline and the retrieval-augmented `/ask` agent are not yet implemented — see
[Roadmap](#roadmap).

## Requirements

- Python 3.12
- PostgreSQL 16 with the [`pgvector`](https://github.com/pgvector/pgvector) extension

## Quick start (Docker)

```bash
cp .env.example .env      # then fill in ANTHROPIC_API_KEY
docker compose up --build
```

The API is then on http://localhost:8000 (interactive docs at `/docs`).

`schema.sql` is applied automatically the first time the `db` volume is created.
To re-apply it after changing the schema, recreate the volume:
`docker compose down -v && docker compose up --build`.

## Quick start (local)

```bash
python -m venv .venv && .venv/bin/pip install -r requirements.txt
docker compose up -d db                      # or bring your own Postgres + pgvector
cp .env.example .env
uvicorn app.main:app --reload
```

## Configuration

All settings are read from the environment or `.env`; see `.env.example` for the full
list and `app/config.py` for defaults and validation.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres DSN. Must use the `postgresql+asyncpg://` driver. |
| `ANTHROPIC_API_KEY` | Key for LLM enrichment. |
| `LLM_MODEL` | Model used for summarisation and the agent. |
| `EMBEDDING_MODEL` | Embedding model. Its dimension must match `vector(N)` in `schema.sql` and `EMBEDDING_DIM` in `app/models.py`. |
| `DEDUP_SIMILARITY_THRESHOLD` | Cosine similarity above which two articles are one story. |
| `CORS_ALLOW_ORIGINS` | Comma-separated allowed origins; `*` for dev. |

`.env` holds real credentials and is gitignored. `.env.example` is the committed template.

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness probe. |
| `GET` | `/articles` | Enriched articles, newest first. Filters: `category`, `since`, `min_score`, `limit`, `offset`. |
| `GET` | `/articles/{article_id}` | A single enriched article. |
| `GET` | `/stats` | Last pipeline run, source health, 24h article count. |
| `POST` | `/ask` | Natural-language question. **Placeholder** — currently a title substring match, not a real agent. |

Only articles that have a matching `article_analysis` row are returned, because the
article endpoints inner-join analysis. Until the enrichment pipeline runs, these
endpoints return an empty list even when `articles` has rows.

## Layout

```
app/
  config.py          Settings (pydantic-settings) + validation
  database.py        Async engine, session factory, get_db dependency
  models.py          SQLAlchemy ORM models — mirrors schema.sql
  schemas.py         Pydantic request/response models
  main.py            App factory, CORS, router registration, lifespan
  routers/           articles.py, stats.py, ask.py
schema.sql           Authoritative DDL, applied on first DB init
```

`schema.sql` is the source of truth for the database; `app/models.py` mirrors it.
Change both together — there are no migrations yet (see Roadmap).

## Roadmap

Not yet implemented:

- **Ingestion pipeline** — nothing writes to `sources`, `articles`, or `pipeline_runs`
  yet. `feedparser`, `httpx`, `selectolax`, and `tenacity` are installed for it.
- **LLM enrichment** — nothing populates `article_analysis`; `anthropic` is unused so far.
- **Deduplication / clustering** — `clusters` and `cluster_members` are unused.
- **Real `/ask` agent** — retrieval over embeddings with a live-search fallback,
  logging each question to `agent_queries` (also currently unused).
- **Migrations** — `alembic` is a dependency but no migration environment exists;
  schema changes currently mean recreating the database.
- **Tests** — there is no test suite.
