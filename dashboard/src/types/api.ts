/**
 * Mirrors the Pydantic schemas in `app/schemas.py`. When the backend changes,
 * change this file first and let TypeScript surface every break.
 *
 * Timestamps are strings — JSON has no date type. Parse at the render
 * boundary so the raw value stays available.
 */

export type Category =
  | "research"
  | "product"
  | "funding"
  | "policy"
  | "opinion"
  | "other";

export type SortOrder = "recent" | "relevant";

export type SourceStatus = "healthy" | "degraded" | "broken";

export type SourceType = "rss" | "api" | "scrape";

export interface Article {
  id: string;
  title: string;
  url: string;
  published_at: string | null;
  summary: string | null;
  category: Category | null;
  relevance_score: number | null;
  source_name: string | null;
  /** 1 for an unclustered article; >1 when other sources covered the story. */
  cluster_size: number;
}

export interface ArticlePage {
  items: Article[];
  total: number;
}

export interface AskResponse {
  answer: string;
  cited_article_ids: string[];
  cited_articles: Article[];
  used_live_search: boolean;
}

export interface DailyCount {
  /** ISO date, e.g. "2026-09-06". */
  day: string;
  count: number;
}

export interface Stats {
  last_run_started_at: string | null;
  last_run_finished_at: string | null;
  sources_healthy: number;
  sources_broken: number;
  sources_degraded: number;
  sources_total: number;
  articles_last_24h: number;
  last_run_duration_seconds: number | null;
  last_run_articles_found: number | null;
  last_run_articles_after_dedup: number | null;
  last_run_error_count: number;
  total_articles: number;
  llm_model: string;
  /** Oldest day first, one entry per day including days with no articles. */
  daily_volume: DailyCount[];
}

export type RunKind = "ingest" | "enrich";

export interface Run {
  id: string;
  /**
   * Which stage this run was. The counter fields below count *sources* for an
   * "ingest" run and *articles* for an "enrich" run — the backend reuses one
   * table for both, so this is what tells them apart.
   */
  kind: RunKind;
  started_at: string;
  finished_at: string | null;
  sources_attempted: number;
  sources_succeeded: number;
  articles_found: number;
  articles_after_dedup: number;
  llm_cost_usd: number;
  errors: unknown[];
}

export interface Source {
  id: string;
  name: string;
  source_type: SourceType;
  url: string;
  status: SourceStatus;
  fetch_interval_minutes: number;
  authority_weight: number;
  last_fetched_at: string | null;
  last_error: string | null;
  articles_last_24h: number;
}
