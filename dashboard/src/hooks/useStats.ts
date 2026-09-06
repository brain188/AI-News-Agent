import { useQuery } from "@tanstack/react-query";
import { fetchRuns, fetchStats } from "../api/stats";

// Pipeline health changes at most once per run, so it can go stale slowly.
const STALE_MS = 120_000;

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    staleTime: STALE_MS,
  });
}

export function useRuns(limit = 10) {
  return useQuery({
    queryKey: ["runs", limit],
    queryFn: () => fetchRuns(limit),
    staleTime: STALE_MS,
  });
}
