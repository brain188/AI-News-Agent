import { request } from "./client";
import type { ArticlePage, Category, SortOrder } from "../types/api";

export interface ArticleQuery {
  /** The API filters on one category at a time, so this is single-select. */
  category: Category | null;
  sort: SortOrder;
  limit: number;
  offset: number;
}

/** Fetch a page of analyzed articles, filtered and sorted. */
export function fetchArticles(query: ArticleQuery): Promise<ArticlePage> {
  const params = new URLSearchParams({
    sort: query.sort,
    limit: String(query.limit),
    offset: String(query.offset),
  });
  if (query.category) {
    params.set("category", query.category);
  }
  return request<ArticlePage>(`/articles?${params}`);
}
