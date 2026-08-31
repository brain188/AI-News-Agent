import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Article, ArticleAnalysis, Source
from app.schemas import ArticleOut

router = APIRouter(prefix="/articles", tags=["articles"])


@router.get("", response_model=list[ArticleOut])
async def list_articles(
    category: str | None = Query(default=None),
    since: datetime | None = Query(default=None),
    min_score: float = Query(default=0.0, ge=0.0, le=1.0),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Article, ArticleAnalysis, Source)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .join(Source, Source.id == Article.source_id)
        .where(ArticleAnalysis.relevance_score >= min_score)
        .order_by(Article.published_at.desc())
        .offset(offset)
        .limit(limit)
    )
    if category:
        stmt = stmt.where(ArticleAnalysis.category == category)
    if since:
        stmt = stmt.where(Article.published_at >= since)

    result = await db.execute(stmt)
    rows = result.all()

    return [
        ArticleOut(
            id=article.id,
            title=article.title,
            url=article.url,
            published_at=article.published_at,
            summary=analysis.summary,
            category=analysis.category,
            relevance_score=float(analysis.relevance_score),
            source_name=source.name,
        )
        for article, analysis, source in rows
    ]


@router.get("/{article_id}", response_model=ArticleOut)
async def get_article(article_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    stmt = (
        select(Article, ArticleAnalysis, Source)
        .join(ArticleAnalysis, ArticleAnalysis.article_id == Article.id)
        .join(Source, Source.id == Article.source_id)
        .where(Article.id == article_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Article not found")

    article, analysis, source = row
    return ArticleOut(
        id=article.id,
        title=article.title,
        url=article.url,
        published_at=article.published_at,
        summary=analysis.summary,
        category=analysis.category,
        relevance_score=float(analysis.relevance_score),
        source_name=source.name,
    )
