import { request } from "./client";
import type { AgentQuery, AskResponse } from "../types/api";

/** Ask the agent a natural-language question about the news. */
export function askAgent(question: string): Promise<AskResponse> {
  return request<AskResponse>("/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

/** Past questions with their answers and citations, newest first. */
export function fetchAskHistory(limit = 20, offset = 0): Promise<AgentQuery[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });
  return request<AgentQuery[]>(`/ask/history?${params}`);
}

/** Remove one entry from history. Returns 204, so there is no body to parse. */
export function deleteAskHistoryEntry(id: string): Promise<void> {
  return request<void>(`/ask/history/${id}`, { method: "DELETE" });
}

/** Remove every entry. The UI confirms before calling this. */
export function clearAskHistory(): Promise<void> {
  return request<void>("/ask/history", { method: "DELETE" });
}
