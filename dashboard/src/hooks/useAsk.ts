import { useMutation } from "@tanstack/react-query";
import { askAgent } from "../api/ask";

/**
 * Submit a question to the agent.
 *
 * A mutation rather than a query: asking has a side effect (it writes to
 * `agent_queries`) and the answer is not a cacheable read.
 */
export function useAsk() {
  return useMutation({ mutationFn: askAgent });
}
