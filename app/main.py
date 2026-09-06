from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine
from app.routers import articles, ask, sources, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    # Close pooled DB connections on shutdown so reloads/restarts don't leak them.
    await engine.dispose()


app = FastAPI(title="AI News Agent API", version="0.1.0", lifespan=lifespan)

# Allow the dashboard (running on a different port/origin during dev) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(articles.router)
app.include_router(stats.router)
app.include_router(sources.router)
app.include_router(ask.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok"}
