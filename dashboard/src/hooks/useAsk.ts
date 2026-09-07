import { useMutation, useQueryClient } from "@tanstack/react-query";

import { askAgent } from "../api/ask";
import { ASK_HISTORY_KEY } from "./useAskHistory";

/**
 * Submit a question to the agent.
 *
 * A mutation rather than a query: asking has a side effect (it writes to
 * `agent_queries`) and the answer is not a cacheable read.
 */
export function useAsk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: askAgent,
    // Refresh history so the new entry appears without a manual reload.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ASK_HISTORY_KEY }),
  });
}
