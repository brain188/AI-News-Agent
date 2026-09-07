import type { AgentQuery, Article, AskResponse } from "../types/api";

/**
 * What the answer pane renders. A live run and a replayed history entry carry
 * the same substance, so both are normalised to this rather than teaching the
 * component two shapes.
 */
export interface ActiveAnswer {
  /** The history row's id; null for a run that has not been reloaded yet. */
  id: string | null;
  question: string;
  answer: string;
  cited_articles: Article[];
  used_live_search: boolean;
  /** Wall-clock seconds, known only for a run made in this session. */
  elapsedSeconds: number | null;
  /** When the stored entry was written; null for a live run. */
  createdAt: string | null;
}

/** Normalise a fresh agent response. */
export function fromResponse(
  question: string,
  result: AskResponse,
  elapsedSeconds: number | null,
): ActiveAnswer {
  return {
    id: null,
    question,
    answer: result.answer,
    cited_articles: result.cited_articles,
    used_live_search: result.used_live_search,
    elapsedSeconds,
    createdAt: null,
  };
}

/** Normalise a stored history entry. */
export function fromHistory(entry: AgentQuery): ActiveAnswer {
  return {
    id: entry.id,
    question: entry.question,
    answer: entry.answer ?? "",
    cited_articles: entry.cited_articles,
    used_live_search: entry.used_live_search,
    elapsedSeconds: null,
    createdAt: entry.created_at,
  };
}
