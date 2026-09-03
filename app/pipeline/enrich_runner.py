from app.config import settings
from app.core.logging import get_logger
from app.database import AsyncSessionLocal
from app.enrichment import repository as enrich_repo
from app.enrichment.analyzer import analyze_batch
from app.enrichment.clustering import find_nearest_cluster
from app.enrichment.costs import is_over_budget, spend_today
from app.enrichment.embeddings import build_embed_text, embed_texts
from app.pipeline import repository

log = get_logger(__name__)

MAX_ARTICLES_PER_RUN = 200


async def run_enrichment() -> None:
    """Embed, deduplicate, and summarize all unclustered articles."""
    async with AsyncSessionLocal() as db:
        run = await repository.start_run(db)
        articles = await enrich_repo.get_unanalyzed_articles(db, MAX_ARTICLES_PER_RUN)

        if not articles:
            log.info("no_articles_to_enrich")
            await repository.finish_run(db, run, 0, 0, 0, [])
            await db.commit()
            return

        log.info("enrichment_started", run_id=str(run.id), articles=len(articles))

        texts = [build_embed_text(a.title, a.raw_content) for a in articles]
        vectors = await embed_texts(texts)

        # Split into duplicates (cheap) and new stories needing an LLM call.
        pending: list[tuple] = []
        duplicates = 0

        for article, vector in zip(articles, vectors):
            match = await find_nearest_cluster(db, vector)
            if match:
                await enrich_repo.add_cluster_member(
                    db, match.cluster_id, article.id, match.similarity
                )
                duplicates += 1
                continue
            pending.append((article, vector))

        log.info("dedup_complete", duplicates=duplicates, new_stories=len(pending))

        total_cost = 0.0
        analyzed = 0
        errors: list[dict] = []
        baseline_spend = await spend_today(db)

        for start in range(0, len(pending), settings.enrichment_batch_size):
            if is_over_budget(baseline_spend + total_cost):
                log.warning("budget_exceeded", spent=baseline_spend + total_cost)
                errors.append({"stage": "analysis", "error": "daily budget exceeded"})
                break

            batch = pending[start : start + settings.enrichment_batch_size]
            batch_articles = [article for article, _ in batch]

            try:
                results, usage = await analyze_batch(batch_articles)
            except Exception as exc:
                log.error("analysis_failed", error=str(exc))
                errors.append({"stage": "analysis", "error": str(exc)})
                continue

            total_cost += usage.cost_usd()

            for index, (article, vector) in enumerate(batch):
                result = results.get(index)
                if not result:
                    continue

                cluster = await enrich_repo.create_cluster(db, article.id)
                await enrich_repo.save_analysis(
                    db,
                    article_id=article.id,
                    cluster_id=cluster.id,
                    summary=result.summary,
                    category=result.category,
                    relevance_score=result.relevance_score,
                    embedding=vector,
                )
                await enrich_repo.add_cluster_member(db, cluster.id, article.id, 1.0)
                analyzed += 1

        run.llm_cost_usd = total_cost
        await repository.finish_run(
            db, run, len(articles), analyzed, len(articles), duplicates, errors
        )
        await db.commit()

        log.info(
            "enrichment_finished",
            run_id=str(run.id),
            analyzed=analyzed,
            duplicates=duplicates,
            cost_usd=round(total_cost, 4),
        )