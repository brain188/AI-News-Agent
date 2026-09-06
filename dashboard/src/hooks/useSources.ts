import { useQuery } from "@tanstack/react-query";
import { fetchSources } from "../api/sources";

/** The configured feeds and their health. Changes only when a run finishes. */
export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
    staleTime: 120_000,
  });
}
