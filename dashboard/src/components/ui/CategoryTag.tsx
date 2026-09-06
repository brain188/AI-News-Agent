import clsx from "clsx";

import { categoryStyle } from "../../lib/categories";
import type { Category } from "../../types/api";

interface CategoryTagProps {
  category: Category | null;
  className?: string;
}

/** The tinted chip that labels an article's category. */
export function CategoryTag({ category, className }: CategoryTagProps) {
  if (!category) return null;
  return (
    <span
      className={clsx(
        "px-1.5 py-0.5 rounded font-label-sm text-[0.6875rem] font-semibold tracking-wide uppercase",
        categoryStyle(category).tag,
        className,
      )}
    >
      {category}
    </span>
  );
}
