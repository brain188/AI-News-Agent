import { useCallback, useEffect, useState } from "react";

import { useArticles } from "../../hooks/useArticles";
import type { Category, SortOrder, Source, Stats } from "../../types/api";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { ArticleSkeleton } from "../ui/Spinner";
import { ArticleCard } from "./ArticleCard";
import { CategoryFilter } from "./CategoryFilter";
import { SortToggle } from "./SortToggle";
import { TelemetryStrip } from "./TelemetryStrip";

const PAGE_SIZE = 20;

interface ArticleFeedProps {
  stats?: Stats;
  sources?: Source[];
}

/** Owns filter, sort, and paging state; renders every load state around them. */
export function ArticleFeed({ stats, sources }: ArticleFeedProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [sort, setSort] = useState<SortOrder>("recent");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const query = { category, sort, limit, offset: 0 };
  const { data, error, isPending, isFetching, refetch } = useArticles(query);

  // Narrowing the filter should not leave the reader deep in a page that no
  // longer exists, so every change to the query resets paging with it.
  const changeCategory = useCallback((next: Category | null) => {
    setCategory(next);
    setLimit(PAGE_SIZE);
  }, []);

  const changeSort = useCallback((next: SortOrder) => {
    setSort(next);
    setLimit(PAGE_SIZE);
  }, []);

  const toggleSort = useCallback(() => {
    setSort((prev) => (prev === "relevant" ? "recent" : "relevant"));
    setLimit(PAGE_SIZE);
  }, []);

  // [s] toggles sort, matching the hint next to the switch.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        toggleSort();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSort]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = items.length < total;

  return (
    <div className="flex flex-col w-full">
      <TelemetryStrip stats={stats} sources={sources} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-sm mb-space-base bg-surface-container-low px-space-sm py-space-xs rounded-lg">
        <CategoryFilter value={category} onChange={changeCategory} />
        <SortToggle value={sort} onChange={changeSort} />
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="flex flex-col gap-space-sm w-full">
          {Array.from({ length: 4 }, (_, i) => (
            <ArticleSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={category ? "filter_alt_off" : "inbox"}
          title={category ? `No ${category} articles yet` : "No articles yet"}
          hint={
            category
              ? "Nothing in the corpus carries this category. Clear the filter, or wait for the next run to classify more."
              : "The corpus is empty. Run the pipeline to fetch, analyze, and store some articles."
          }
          command={category ? undefined : "python -m app.cli run"}
        />
      ) : (
        <div className="flex flex-col gap-space-sm w-full">
          {items.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <div className="mt-space-base py-space-sm flex items-center justify-between font-label-sm text-label-sm text-outline">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-outline" />
            <span>
              {hasMore
                ? `showing ${items.length} of ${total}`
                : `end of stream · ${total} ${total === 1 ? "article" : "articles"}`}
            </span>
          </div>
          <div className="flex items-center gap-space-sm">
            <span className="font-code-inline text-[0.625rem] text-on-surface-variant">
              sort: {sort}
              {category ? ` · category: ${category}` : ""}
            </span>
            {hasMore ? (
              <button
                type="button"
                disabled={isFetching}
                onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                {isFetching ? "fetching…" : "fetch earlier"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
