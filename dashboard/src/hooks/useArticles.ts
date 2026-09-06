import { useQuery } from "@tanstack/react-query";
import { fetchArticles, type ArticleQuery } from "../api/articles";

/** Load a page of articles, refetching when filters, sort, or page change. */
export function useArticles(query: ArticleQuery) {
  return useQuery({
    queryKey: ["articles", query],
    queryFn: () => fetchArticles(query),
    // Keeps the previous page on screen while the next one loads, so the
    // feed does not collapse to a spinner on every filter change.
    placeholderData: (previous) => previous,
  });
}
