import { request } from "./client";
import type { AskResponse } from "../types/api";

/** Ask the agent a natural-language question about the news. */
export function askAgent(question: string): Promise<AskResponse> {
  return request<AskResponse>("/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}
