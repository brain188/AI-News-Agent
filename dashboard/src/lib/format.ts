import { formatDistanceToNowStrict } from "date-fns";

/** "4h ago", or "—" when the article carries no timestamp. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDistanceToNowStrict(date)} ago`;
}

/** "14:28:01" in the viewer's timezone — the execution log's clock. */
export function clockTime(iso: string | null | undefined): string {
  if (!iso) return "--:--:--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString(undefined, { hour12: false });
}

/** Relevance is stored 0-1; the design shows it as a whole-number score. */
export function scoreOutOf100(score: number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  return Math.round(score * 100);
}

/** "1.8s" / "2m 15s" — run durations, which span both scales. */
export function duration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  return `${mins}m ${Math.round(seconds - mins * 60)}s`;
}

/** "MON", "TUE" … for the ingestion-volume axis. */
export function weekdayLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
}

/** The host of an article URL, which is what identifies a source at a glance. */
export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function isToday(isoDate: string): boolean {
  return isoDate === new Date().toISOString().slice(0, 10);
}
