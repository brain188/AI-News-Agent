import type { ReactNode } from "react";
import clsx from "clsx";

import { useRuns } from "../../hooks/useStats";
import { duration, relativeTime } from "../../lib/format";
import type { Source, Stats } from "../../types/api";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { Icon } from "../ui/Icon";
import { RunLog } from "./RunLog";
import { SourceMatrix } from "./SourceMatrix";
import { VolumeChart } from "./VolumeChart";

interface KpiProps {
  label: string;
  badge: ReactNode;
  value: ReactNode;
  detail: ReactNode;
  /** Segments of the footing bar: [tailwind bg class, percentage]. */
  bar: [string, number][];
}

function Kpi({ label, badge, value, detail, bar }: KpiProps) {
  return (
    <div className="bg-surface-container-low p-space-base rounded flex flex-col justify-between relative overflow-hidden">
      <div className="flex items-center justify-between gap-space-xs">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          {label}
        </span>
        {badge}
      </div>
      <div className="my-space-sm">
        <div className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
          {value}
        </div>
        <div className="font-label-sm text-label-sm text-on-surface-variant mt-space-2xs flex flex-wrap items-center gap-space-xs">
          {detail}
        </div>
      </div>
      <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden flex">
        {bar.map(([color, width], index) => (
          <div key={index} className={clsx("h-full", color)} style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  );
}

interface PipelineHealthProps {
  stats?: Stats;
  sources?: Source[];
  statsError: unknown;
  sourcesError: unknown;
  onRefresh: () => void;
}

export function PipelineHealth({
  stats,
  sources,
  statsError,
  sourcesError,
  onRefresh,
}: PipelineHealthProps) {
  const runs = useRuns(10);

  if (statsError) {
    return <ErrorState error={statsError} onRetry={onRefresh} />;
  }
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xs">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-surface-container-low p-space-base rounded h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const healthPct = stats.sources_total
    ? (stats.sources_healthy / stats.sources_total) * 100
    : 0;
  const runOk = stats.last_run_finished_at !== null && stats.last_run_error_count === 0;
  const sourcesDegraded = stats.sources_broken + stats.sources_degraded > 0;
  const analyzedPct = stats.total_articles
    ? Math.min(100, (stats.articles_last_24h / stats.total_articles) * 100)
    : 0;

  return (
    <div className="flex flex-col w-full gap-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low p-space-sm rounded">
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center gap-space-xs px-space-xs py-space-2xs bg-surface-container rounded">
            <span
              className={clsx(
                "w-2 h-2 rounded-full",
                runOk ? "bg-primary animate-pulse" : "bg-tertiary-container",
              )}
            />
            <span className="font-label-sm text-label-sm text-on-surface">
              SYS_ORCHESTRATOR: {runOk ? "ONLINE" : "ATTENTION"}
            </span>
          </div>
          <span className="font-label-sm text-label-sm text-outline-variant">
            model: {stats.llm_model || "unset"}
          </span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-space-xs px-space-sm py-space-xs bg-surface-container text-on-surface-variant hover:text-on-surface font-label-md text-label-md rounded transition-colors"
        >
          <Icon name="refresh" size={16} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-xs">
        <Kpi
          label="EXECUTION // LATEST"
          badge={
            <span
              className={clsx(
                "px-space-xs py-space-2xs font-label-sm text-label-sm rounded flex items-center gap-1",
                runOk ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary-fixed-dim",
              )}
            >
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  runOk ? "bg-primary" : "bg-tertiary",
                )}
              />
              {stats.last_run_finished_at ? (runOk ? "SUCCESS" : "ERRORS") : "NEVER RUN"}
            </span>
          }
          value={
            <>
              {relativeTime(stats.last_run_finished_at ?? stats.last_run_started_at).replace(
                " ago",
                "",
              )}{" "}
              <span className="text-label-md font-label-md text-outline font-normal">ago</span>
            </>
          }
          detail={
            <>
              <span className="text-on-surface font-code-inline">
                t_exec: {duration(stats.last_run_duration_seconds)}
              </span>
              <span>•</span>
              <span>{stats.last_run_articles_found ?? 0} found</span>
            </>
          }
          bar={[["bg-primary", runOk ? 100 : 60]]}
        />

        <Kpi
          label="HARVEST_NODES"
          badge={
            <span
              className={clsx(
                "px-space-xs py-space-2xs font-label-sm text-label-sm rounded flex items-center gap-1",
                sourcesDegraded
                  ? "bg-tertiary/10 text-tertiary-fixed-dim"
                  : "bg-primary/10 text-primary",
              )}
            >
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full",
                  sourcesDegraded ? "bg-tertiary" : "bg-primary",
                )}
              />
              {sourcesDegraded ? "DEGRADED" : "NOMINAL"}
            </span>
          }
          value={
            <>
              {stats.sources_healthy}{" "}
              <span className="text-headline-sm font-headline-sm text-outline font-normal">
                / {stats.sources_total} ACTV
              </span>
            </>
          }
          detail={
            <>
              <span className="text-primary font-semibold">
                {healthPct.toFixed(1)}% healthy
              </span>
              {stats.sources_broken > 0 ? (
                <>
                  <span>•</span>
                  <span className="text-error">{stats.sources_broken} broken</span>
                </>
              ) : null}
            </>
          }
          bar={[
            ["bg-primary", healthPct],
            ["bg-error", 100 - healthPct],
          ]}
        />

        <Kpi
          label="DOCS // 24H_VOL"
          badge={
            <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
              <Icon name="trending_up" size={14} />
              24h
            </span>
          }
          value={
            <>
              {stats.articles_last_24h}{" "}
              <span className="text-headline-sm font-headline-sm text-outline font-normal">
                articles
              </span>
            </>
          }
          detail={
            <span>
              {stats.daily_volume.length
                ? `vs ${(
                    stats.daily_volume.reduce((sum, d) => sum + d.count, 0) /
                    stats.daily_volume.length
                  ).toFixed(0)} / day mean`
                : "no history yet"}
            </span>
          }
          bar={[["bg-secondary-container", Math.min(100, analyzedPct)]]}
        />

        <Kpi
          label="CORPUS // INDEXED"
          badge={
            <span className="font-label-sm text-label-sm text-on-surface-variant font-code-inline">
              dims: 384
            </span>
          }
          value={
            <>
              {stats.total_articles.toLocaleString()}{" "}
              <span className="text-headline-sm font-headline-sm text-outline font-normal">
                articles
              </span>
            </>
          }
          detail={
            <>
              <span className="text-on-surface">
                {stats.last_run_articles_after_dedup ?? 0} kept last run
              </span>
              <span>•</span>
              <span>pgvector cosine</span>
            </>
          }
          bar={[["bg-primary-container", Math.min(100, analyzedPct)]]}
        />
      </div>

      {stats.daily_volume.some((d) => d.count > 0) ? (
        <VolumeChart days={stats.daily_volume} />
      ) : (
        <EmptyState
          icon="bar_chart"
          title="No ingestion history"
          hint="Nothing has been fetched in the last week. Run the pipeline to start the series."
          command="python -m app.cli run"
        />
      )}

      {sourcesError ? (
        <ErrorState error={sourcesError} onRetry={onRefresh} />
      ) : sources ? (
        <SourceMatrix sources={sources} />
      ) : (
        <div className="bg-surface-container-low rounded h-48 animate-pulse" />
      )}

      {runs.error ? (
        <ErrorState error={runs.error} onRetry={() => void runs.refetch()} />
      ) : runs.data ? (
        <RunLog runs={runs.data} />
      ) : (
        <div className="bg-surface-container-lowest rounded h-40 animate-pulse" />
      )}
    </div>
  );
}
