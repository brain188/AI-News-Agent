import clsx from "clsx";

import { CATEGORIES, categoryStyle, PILL_INACTIVE } from "../../lib/categories";
import type { Category } from "../../types/api";

interface CategoryFilterProps {
  /** null means "All". The API filters on one category at a time. */
  value: Category | null;
  onChange: (value: Category | null) => void;
}

/** Controlled — filter state lives in ArticleFeed. */
export function CategoryFilter({ value, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={clsx(
          "px-space-sm py-0.5 rounded font-label-sm text-label-sm transition-colors",
          value === null
            ? "bg-primary-container/20 text-primary-container font-semibold"
            : PILL_INACTIVE,
        )}
      >
        All
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(value === category ? null : category)}
          className={clsx(
            "px-space-sm py-0.5 rounded font-label-sm text-label-sm transition-colors",
            value === category ? categoryStyle(category).pillActive : PILL_INACTIVE,
          )}
        >
          {category}
        </button>
      ))}
    </div>
  );
}
