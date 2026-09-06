import clsx from "clsx";

import { categoryStyle } from "../../lib/categories";
import { scoreOutOf100 } from "../../lib/format";
import type { Category } from "../../types/api";

interface RelevanceBarProps {
  score: number | null;
  category: Category | null;
}

/**
 * Relevance is secondary information: a muted numeral and a thin bar, findable
 * but never competing with the title.
 */
export function RelevanceBar({ score, category }: RelevanceBarProps) {
  const value = scoreOutOf100(score);
  if (value === null) {
    // An article can exist before enrichment scores it.
    return (
      <span className="text-[0.6875rem] font-code-inline text-outline-variant">
        unscored
      </span>
    );
  }

  const style = categoryStyle(category);
  return (
    <div className="flex items-center gap-2" title={`Relevance: ${value}%`}>
      <span className={clsx("text-[0.6875rem] font-code-inline", style.scoreText)}>
        score {value}
      </span>
      <div className="w-16 h-1 bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full", style.bar)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
