import { request } from "./client";
import type { Run, Stats } from "../types/api";

/** Pipeline health: last run, source counts, 24h volume, 7-day history. */
export function fetchStats(): Promise<Stats> {
  return request<Stats>("/stats");
}

/** Recent pipeline runs, newest first — the execution log. */
export function fetchRuns(limit = 10): Promise<Run[]> {
  return request<Run[]>(`/stats/runs?limit=${limit}`);
}
