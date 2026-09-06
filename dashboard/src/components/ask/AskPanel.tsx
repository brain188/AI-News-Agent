import { useRef, useState } from "react";

import { useAsk } from "../../hooks/useAsk";
import { relativeTime } from "../../lib/format";
import type { Source, Stats } from "../../types/api";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { Icon } from "../ui/Icon";
import { AgentStream } from "./AgentStream";
import { AnswerBlock } from "./AnswerBlock";
import { AskInput } from "./AskInput";

interface AskPanelProps {
  stats?: Stats;
  sources?: Source[];
}

/** The compact health line above the prompt, carried from the feed's strip. */
function MicroStrip({ stats }: { stats?: Stats }) {
  return (
    <div className="w-full bg-surface-container-low px-space-md py-space-xs rounded flex flex-wrap items-center justify-between gap-space-sm text-on-surface-variant font-label-sm text-label-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-space-sm">
        <span className="inline-flex items-center gap-1.5 px-space-xs py-space-2xs bg-surface-container rounded text-primary">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>AGENT_READY</span>
        </span>
        <span className="text-outline-variant">/</span>
        <span className="flex items-center gap-1">
          <Icon name="history" size={14} className="text-outline" />
          <span>
            last sync:{" "}
            <span className="text-on-surface font-medium">
              {relativeTime(stats?.last_run_finished_at ?? stats?.last_run_started_at)}
            </span>
          </span>
        </span>
        <span className="text-outline-variant">/</span>
        <span className="flex items-center gap-1">
          <Icon name="hub" size={14} className="text-primary" />
          <span>
            sources:{" "}
            <span className="text-primary font-medium">
              {stats ? `${stats.sources_healthy}/${stats.sources_total}` : "—"}
            </span>{" "}
            operational
          </span>
        </span>
      </div>
      <div className="flex items-center gap-space-md text-outline">
        <span>delta: +{stats?.articles_last_24h ?? 0} in 24h</span>
      </div>
    </div>
  );
}

export function AskPanel({ stats, sources }: AskPanelProps) {
  const ask = useAsk();
  const [elapsed, setElapsed] = useState<number | null>(null);
  const startedAt = useRef<number>(0);

  function submit(question: string) {
    startedAt.current = Date.now();
    setElapsed(null);
    ask.mutate(question, {
      onSettled: () => setElapsed((Date.now() - startedAt.current) / 1000),
    });
  }

  return (
    <div className="flex flex-col w-full gap-space-md">
      <MicroStrip stats={stats} />
      <AskInput onSubmit={submit} isPending={ask.isPending} stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {ask.error ? (
            <ErrorState error={ask.error} onRetry={() => ask.reset()} />
          ) : ask.isPending ? (
            <div className="w-full bg-surface-container-low rounded-lg p-space-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center gap-space-xs">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Synthesizing…
                </span>
              </div>
              {/* Answers take several seconds; the wait needs to look like
                  work in progress, not a broken page. */}
              <div className="flex flex-col gap-space-sm animate-pulse">
                <div className="h-3 w-full rounded bg-surface-container" />
                <div className="h-3 w-11/12 rounded bg-surface-container" />
                <div className="h-3 w-4/5 rounded bg-surface-container" />
                <div className="h-3 w-2/3 rounded bg-surface-container" />
              </div>
            </div>
          ) : ask.data ? (
            <AnswerBlock result={ask.data} elapsedSeconds={elapsed} />
          ) : (
            <EmptyState
              icon="neurology"
              title="Ask the agent something"
              hint="It searches the stored corpus first, and only reaches for live web search when the corpus cannot answer. Every claim it makes comes back with the articles behind it."
            />
          )}
        </div>

        <AgentStream
          isPending={ask.isPending}
          lastElapsed={elapsed}
          stats={stats}
          sources={sources}
        />
      </div>
    </div>
  );
}
