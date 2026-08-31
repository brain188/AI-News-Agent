from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import articles, ask, stats

app = FastAPI(title="AI News Agent API", version="0.1.0")

# Allow the dashboard (running on a different port/origin during dev) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this before deploying publicly
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(articles.router)
app.include_router(stats.router)
app.include_router(ask.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
