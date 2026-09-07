import { useCallback, useRef, useState } from "react";

import { useAsk } from "../../hooks/useAsk";
import { fromHistory, fromResponse, type ActiveAnswer } from "../../lib/answer";
import { relativeTime } from "../../lib/format";
import type { AgentQuery, Source, Stats } from "../../types/api";
import { ErrorState } from "../ui/ErrorState";
import { Icon } from "../ui/Icon";
import { AgentStream } from "./AgentStream";
import { AnswerBlock } from "./AnswerBlock";
import { AskEmptyState } from "./AskEmptyState";
import { AskInput } from "./AskInput";
import { ChatHistory } from "./ChatHistory";

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
  const [question, setQuestion] = useState("");
  // The answer pane renders from here whether the answer just arrived or was
  // replayed from history, so both paths write to one piece of state.
  const [activeAnswer, setActiveAnswer] = useState<ActiveAnswer | null>(null);
  const startedAt = useRef(0);

  const submit = useCallback(
    (asked: string) => {
      startedAt.current = Date.now();
      setQuestion(asked);
      ask.mutate(asked, {
        onSuccess: (result) => {
          setActiveAnswer(
            fromResponse(asked, result, (Date.now() - startedAt.current) / 1000),
          );
        },
      });
    },
    [ask],
  );

  const selectHistoryEntry = useCallback((entry: AgentQuery) => {
    setQuestion(entry.question);
    setActiveAnswer(fromHistory(entry));
  }, []);

  /** Load a prompt into the input without running it. */
  const useStarter = useCallback((starter: string) => setQuestion(starter), []);

  return (
    <div className="flex flex-col w-full gap-space-md">
      <MicroStrip stats={stats} />
      <AskInput
        value={question}
        onChange={setQuestion}
        onSubmit={submit}
        isPending={ask.isPending}
        stats={stats}
      />

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
          ) : activeAnswer ? (
            <AnswerBlock result={activeAnswer} />
          ) : (
            <AskEmptyState onUseStarter={useStarter} stats={stats} />
          )}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <AgentStream
            isPending={ask.isPending}
            lastElapsed={activeAnswer?.elapsedSeconds ?? null}
            stats={stats}
            sources={sources}
          />
          <ChatHistory
            activeId={activeAnswer?.id ?? null}
            onSelect={selectHistoryEntry}
            onUseStarter={useStarter}
          />
        </div>
      </div>
    </div>
  );
}
