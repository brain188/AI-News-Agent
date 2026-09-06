import type { Category } from "../types/api";

/** The six categories the analyzer assigns, in the order the design lists them. */
export const CATEGORIES: Category[] = [
  "research",
  "product",
  "funding",
  "policy",
  "opinion",
  "other",
];

/**
 * Category styling, verbatim from the Stitch design.
 *
 * Tags carry tint, not fill — six saturated pills on one screen would compete
 * with the titles they are meant to annotate.
 */
interface CategoryStyle {
  /** The tag chip on an article card. */
  tag: string;
  /** The filter pill when this category is the active one. */
  pillActive: string;
  /** Title hover colour and the relevance bar fill, per category accent. */
  titleHover: string;
  bar: string;
  scoreText: string;
}

const NEUTRAL: CategoryStyle = {
  tag: "bg-surface-bright text-on-surface-variant",
  pillActive: "bg-primary-container/20 text-primary-container font-semibold",
  titleHover: "group-hover:text-primary",
  bar: "bg-outline",
  scoreText: "text-on-surface-variant",
};

const STYLES: Record<Category, CategoryStyle> = {
  research: {
    tag: "bg-primary/10 text-primary",
    pillActive: "bg-primary-container/20 text-primary-container font-semibold",
    titleHover: "group-hover:text-primary",
    bar: "bg-primary-container",
    scoreText: "text-primary-container",
  },
  product: {
    tag: "bg-secondary-container/15 text-secondary-fixed-dim",
    pillActive: "bg-secondary-container/20 text-secondary-fixed-dim font-semibold",
    titleHover: "group-hover:text-secondary",
    bar: "bg-secondary",
    scoreText: "text-secondary",
  },
  policy: {
    ...NEUTRAL,
    tag: "bg-tertiary-container/15 text-tertiary",
    pillActive: "bg-tertiary-container/20 text-tertiary font-semibold",
  },
  funding: NEUTRAL,
  opinion: {
    ...NEUTRAL,
    tag: "bg-surface-bright text-tertiary-fixed-dim",
  },
  other: NEUTRAL,
};

export function categoryStyle(category: Category | null): CategoryStyle {
  if (!category) return NEUTRAL;
  return STYLES[category] ?? NEUTRAL;
}

/** The pill styling for a filter that is not currently selected. */
export const PILL_INACTIVE =
  "bg-surface-container text-on-surface-variant hover:text-on-surface";
