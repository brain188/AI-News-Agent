# AI News Agent — Dashboard

React + TypeScript client for the FastAPI backend in `../app`. Vite for the
build, TanStack Query for server state, Tailwind v4 for styling.

## Running it

The API must be up first — the dashboard is a client, not a source of truth.

```bash
# from the repo root
docker compose up -d db
uvicorn app.main:app --reload

# then, in dashboard/
npm install
npm run dev
```

`.env.local` points the client at the API:

```
VITE_API_BASE_URL=http://localhost:8000
```

Copy `.env.local.example` if you do not have one. Vite only exposes variables
prefixed with `VITE_`.

## Screens

Three zones on one surface, switched by the header tabs. There is no router —
there is no second page and no URL worth deep-linking to yet.

| Tab | Component | Reads |
| --- | --- | --- |
| Feed | `components/feed/ArticleFeed` | `GET /articles`, `GET /stats`, `GET /sources` |
| Ask Agent | `components/ask/AskPanel` | `POST /ask`, `GET /stats`, `GET /sources` |
| Pipeline Health & Sources | `components/health/PipelineHealth` | `GET /stats`, `GET /stats/runs`, `GET /sources` |

Keyboard: `s` toggles the feed's sort order, `r` refetches everything.

## Design

The visual system is "Syntactic Terminal", authored in Stitch. The exported
screens are kept in `design/stitch/` as the reference the components were built
against:

- `main-feed.html`
- `ask-panel.html`
- `pipeline-health.html`
- `mark.svg` — the app mark, also `public/favicon.svg`

Every token — colour, type scale, named spacing step — is transcribed into the
`@theme` block at the top of `src/index.css`. Change the design system in Stitch
first, then mirror it there; nothing else in the codebase hard-codes a colour.

Icons are Material Symbols Outlined, loaded from Google Fonts in `index.html`
and referenced by ligature name through `components/ui/Icon`.

The design is dark-only by intent. It is a reading tool for one technical user,
so density and legibility beat decoration.

## Structure

```
src/
├── api/          fetch wrapper, one module per endpoint group
├── types/        mirrors app/schemas.py — change this first when the API changes
├── hooks/        TanStack Query wrappers; components never call fetch directly
├── components/
│   ├── shell/    header, footer
│   ├── feed/     article list, filters, sort, telemetry strip
│   ├── ask/      prompt shell, answer, citations, agent rail
│   ├── health/   KPIs, volume chart, source matrix, run log
│   └── ui/       category tag, icon, spinner, empty and error states
└── lib/          formatting and category styling
```

## Checks

```bash
npm run lint    # eslint, including the react-hooks rules
npm run build   # tsc -b && vite build
```
