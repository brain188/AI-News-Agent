import type { Stats } from "../../types/api";

interface FooterProps {
  stats?: Stats;
  isFetching: boolean;
  /** True when the shell's own queries failed — the footer should not claim
      the stream is synchronized while the API is unreachable. */
  hasError: boolean;
}

export function Footer({ stats, isFetching, hasError }: FooterProps) {
  const state = hasError ? "disconnected" : isFetching ? "syncing" : "stream synchronized";
  return (
    <footer className="w-full bg-surface-container-lowest py-space-sm">
      <div className="max-w-5xl mx-auto px-gutter-desktop flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
        <span className={hasError ? "text-error" : undefined}>system: {state}</span>
        <span className="text-outline">
          stale after 60s
          {stats ? ` • corpus: ${stats.total_articles} articles` : ""}
        </span>
      </div>
    </footer>
  );
}
