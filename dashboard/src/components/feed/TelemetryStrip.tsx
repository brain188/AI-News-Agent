import { useState } from "react";

import { relativeTime } from "../../lib/format";
import type { Source, Stats } from "../../types/api";
import { Icon } from "../ui/Icon";

interface TelemetryStripProps {
  stats?: Stats;
  sources?: Source[];
}

/** The 7-day volume series drawn as a single path, sized to the design's 112x16 box. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * 112,
    // 1..15 keeps the stroke inside the box at both extremes.
    y: 15 - (value / max) * 14,
  }));
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join("");
  const last = points[points.length - 1];

  return (
    <svg
      aria-label="Ingest sparkline graph"
      className="w-28 h-4 text-primary-container"
      fill="none"
      viewBox="0 0 112 16"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d={path}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.25"
      />
      <circle cx={last.x} cy={last.y} r="1.5" fill="currentColor" />
    </svg>
  );
}

/**
 * The operational strip above the feed: when the pipeline last ran, how many
 * sources are answering, and what came in. The drawer underneath holds the
 * actual errors, because "2 warning" is only useful if you can see which two.
 */
export function TelemetryStrip({ stats, sources }: TelemetryStripProps) {
  const [open, setOpen] = useState(false);

  const unhealthy = (sources ?? []).filter((s) => s.status !== "healthy");
  const warnings = stats ? stats.sources_broken + stats.sources_degraded : unhealthy.length;

  return (
    <section className="w-full bg-surface-container-low rounded-lg p-space-sm mb-space-base shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div className="flex flex-wrap items-center gap-space-md font-label-sm text-label-sm">
          <div className="flex items-center gap-1.5">
            {/* Muted when there are no stats — a live-looking pulse over "—"
                would claim the pipeline is running when nothing is known. */}
            <span
              className={
                stats
                  ? "w-2 h-2 rounded-full bg-primary-container animate-pulse"
                  : "w-2 h-2 rounded-full bg-outline"
              }
            />
            <span className="text-on-surface-variant">Last ingestion:</span>
            <span className="text-on-surface font-semibold font-code-inline">
              {relativeTime(stats?.last_run_finished_at ?? stats?.last_run_started_at)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-on-surface-variant">Sources:</span>
            <span className="text-primary font-semibold font-code-inline">
              {stats ? `${stats.sources_healthy}/${stats.sources_total} healthy` : "—"}
            </span>
            {warnings > 0 ? (
              <span className="text-tertiary-container text-[0.625rem] px-1 py-0.5 rounded bg-surface-container font-mono tracking-tight font-medium">
                {warnings} warning
              </span>
            ) : null}
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-on-surface-variant">Ingested 24h:</span>
            <span className="text-on-surface font-semibold font-code-inline">
              {stats?.articles_last_24h ?? "—"} items
            </span>
          </div>

          {stats?.daily_volume.length ? (
            <div className="flex items-center gap-1.5 pl-1">
              <span className="text-outline text-[0.625rem]">7d vol:</span>
              <Sparkline values={stats.daily_volume.map((d) => d.count)} />
            </div>
          ) : null}
        </div>

        {unhealthy.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="self-start md:self-auto inline-flex items-center gap-1 px-space-xs py-0.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface focus:outline-none"
          >
            <Icon name={open ? "expand_less" : "expand_more"} size={14} />
            <span>{open ? "collapse status" : "expand status"}</span>
          </button>
        ) : null}
      </div>

      {open && unhealthy.length > 0 ? (
        <div className="mt-space-sm pt-space-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm bg-surface-container-lowest p-space-sm rounded">
            {unhealthy.map((source) => (
              <div key={source.id} className="space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2 font-label-sm text-label-sm">
                  <span className="text-tertiary font-medium truncate">{source.name}</span>
                  <span className="text-outline whitespace-nowrap">
                    {source.status} · every {source.fetch_interval_minutes}m
                  </span>
                </div>
                <p className="font-code-inline text-[0.6875rem] text-on-surface-variant truncate">
                  {source.last_error ?? `${source.source_type.toUpperCase()} ${source.url}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
