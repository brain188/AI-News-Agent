import { useEffect, useState } from "react";

import type { Source, Stats } from "../../types/api";
import { Icon } from "../ui/Icon";

interface AgentStreamProps {
  isPending: boolean;
  /** Seconds the last completed run took, kept on screen after it finishes. */
  lastElapsed: number | null;
  stats?: Stats;
  sources?: Source[];
}

/**
 * Counts up for as long as it is mounted. The parent renders it only while a
 * question is in flight, so mounting *is* the start of the run — no reset, and
 * no clock state to keep in sync with the request.
 */
function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setSeconds((Date.now() - started) / 1000), 100);
    return () => window.clearInterval(id);
  }, []);

  return <>{seconds.toFixed(1)}s elapsed</>;
}

/**
 * The right rail. The API answers in one shot rather than streaming, so this
 * reports what is genuinely known — elapsed time, corpus size, which feeds are
 * answering — instead of inventing per-token telemetry.
 */
export function AgentStream({ isPending, lastElapsed, stats, sources }: AgentStreamProps) {
  const healthy = (sources ?? []).filter((source) => source.status === "healthy");

  // The rail's column span and gap belong to AskPanel; these are just panels.
  return (
    <>
      <div className="w-full bg-surface-container-low rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <span
              className={`w-2 h-2 rounded-full ${isPending ? "bg-primary-container animate-pulse" : "bg-outline"}`}
            />
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Agent Session
            </span>
          </div>
          <span className="font-mono text-label-sm text-primary">
            {isPending ? "RUNNING" : "IDLE"}
          </span>
        </div>

        <p className="text-on-surface-variant font-body-sm text-body-sm">
          The agent retrieves from the stored corpus first and falls back to live
          web search only when the corpus cannot answer.
        </p>

        <div className="w-full bg-surface-container-lowest rounded p-space-sm flex flex-col gap-space-xs font-mono text-label-sm">
          <div className="flex items-center justify-between text-outline pb-space-2xs">
            <span className="flex items-center gap-1">
              <Icon
                name="sync"
                size={13}
                className={isPending ? "text-primary animate-spin" : "text-outline"}
              />
              <span>AGENT_LOOP</span>
            </span>
            <span className="text-primary font-medium">
              {isPending ? (
                <ElapsedTimer />
              ) : lastElapsed !== null ? (
                `${lastElapsed.toFixed(1)}s last run`
              ) : (
                "—"
              )}
            </span>
          </div>

          <div className="flex flex-col gap-1 text-on-surface-variant py-space-xs">
            <div className="text-outline flex items-center gap-1.5">
              <span className="text-primary">•</span>
              <span>Corpus: {stats?.total_articles ?? 0} articles indexed</span>
            </div>
            <div className="text-outline flex items-center gap-1.5">
              <span className="text-primary">•</span>
              <span>Model: {stats?.llm_model || "unknown"}</span>
            </div>
            {isPending ? (
              <div className="text-primary flex items-center gap-1.5 animate-pulse font-medium">
                <Icon name="auto_awesome" size={12} />
                <span>Retrieving and synthesizing…</span>
              </div>
            ) : (
              <div className="text-outline flex items-center gap-1.5">
                <span className="text-outline">•</span>
                <span>Waiting for a question.</span>
              </div>
            )}
          </div>

          {isPending ? (
            <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full w-2/3 animate-pulse" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="w-full bg-surface-container-low rounded-lg p-space-md shadow-sm flex flex-col gap-space-xs">
        <div className="flex items-center gap-space-xs text-on-surface font-headline-sm text-headline-sm font-semibold">
          <Icon name="tune" size={16} className="text-secondary" />
          <span>Corpus Filter Constraints</span>
        </div>
        <div className="flex flex-col gap-space-xs mt-space-xs font-label-sm text-label-sm">
          {healthy.length === 0 ? (
            <p className="text-outline">No healthy sources are feeding the corpus.</p>
          ) : (
            healthy.map((source) => (
              <div
                key={source.id}
                className="flex items-center justify-between gap-space-sm p-space-xs bg-surface-container rounded"
              >
                <span className="text-on-surface-variant truncate">{source.name}</span>
                <span className="text-primary font-mono font-medium shrink-0">ENABLED</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
