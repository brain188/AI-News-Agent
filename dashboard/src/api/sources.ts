import { request } from "./client";
import type { Source } from "../types/api";

/** Every configured feed with its health and recent yield. */
export function fetchSources(): Promise<Source[]> {
  return request<Source[]>("/sources");
}
