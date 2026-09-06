import clsx from "clsx";

import { categoryStyle } from "../../lib/categories";
import { hostname, relativeTime } from "../../lib/format";
import type { Article } from "../../types/api";
import { CategoryTag } from "../ui/CategoryTag";
import { Icon } from "../ui/Icon";
import { RelevanceBar } from "./RelevanceBar";

interface ArticleCardProps {
  article: Article;
  /** Compact drops the summary — used for citation cards under an answer. */
  compact?: boolean;
}

/**
 * Pure presentational. Title dominant, summary at a comfortable line length,
 * then a metadata row: source, relative time, category, relevance.
 *
 * `summary`, `category`, and `relevance_score` are all nullable because an
 * article can exist before enrichment runs.
 */
export function ArticleCard({ article, compact = false }: ArticleCardProps) {
  const style = categoryStyle(article.category);
  const source = article.source_name ?? hostname(article.url);

  return (
    <article className="group bg-surface-container-low hover:bg-surface-container transition-all duration-150 rounded-lg p-space-base shadow-sm">
      <div className="flex flex-col gap-space-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-2 min-w-0">
            <CategoryTag category={article.category} />
            <span className="text-on-surface-variant font-code-inline truncate">
              {source}
            </span>
            <span className="text-outline">•</span>
            <span className="font-code-inline text-outline whitespace-nowrap">
              {relativeTime(article.published_at)}
            </span>
          </div>
          <RelevanceBar score={article.relevance_score} category={article.category} />
        </div>

        <h2 className="font-headline-sm text-headline-sm text-on-surface leading-snug">
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className={clsx("transition-colors inline-flex items-start gap-1", style.titleHover)}
          >
            {article.title}
            <Icon
              name="arrow_outward"
              size={14}
              className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </a>
        </h2>

        {!compact && article.summary ? (
          // max-w-[72ch] keeps summaries under the ~80 character line length
          // beyond which a dense feed stops being readable.
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed max-w-[72ch]">
            {article.summary}
          </p>
        ) : null}

        {article.cluster_size > 1 ? (
          <div className="pt-space-xs mt-space-2xs">
            <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary">
              <Icon name="account_tree" size={14} />
              <span>
                also covered by {article.cluster_size - 1}{" "}
                {article.cluster_size === 2 ? "source" : "sources"}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </article>
  );
}
