import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearAskHistory,
  deleteAskHistoryEntry,
  fetchAskHistory,
} from "../api/ask";

/** The query key the ask mutation invalidates so new answers appear at once. */
export const ASK_HISTORY_KEY = ["ask-history"];

const HISTORY_LIMIT = 20;

/** Past questions, newest first. */
export function useAskHistory() {
  return useQuery({
    queryKey: ASK_HISTORY_KEY,
    queryFn: () => fetchAskHistory(HISTORY_LIMIT),
    // History only changes through this UI, so it need not go stale on its own.
    staleTime: Infinity,
  });
}

/** Delete one entry, refreshing the list once the server confirms. */
export function useDeleteAskHistoryEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteAskHistoryEntry,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ASK_HISTORY_KEY }),
  });
}

/** Delete every entry. Callers confirm with the user first. */
export function useClearAskHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearAskHistory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ASK_HISTORY_KEY }),
  });
}
