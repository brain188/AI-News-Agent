import { useState } from "react";
import clsx from "clsx";

import {
  useAskHistory,
  useClearAskHistory,
  useDeleteAskHistoryEntry,
} from "../../hooks/useAskHistory";
import type { AgentQuery } from "../../types/api";
import { ErrorState } from "../ui/ErrorState";
import { Icon } from "../ui/Icon";
import { HistoryEntry } from "./HistoryEntry";

interface ChatHistoryProps {
  activeId: string | null;
  onSelect: (entry: AgentQuery) => void;
  /** Load a starter prompt into the input without running it. */
  onUseStarter: (question: string) => void;
}

// Shown only before the first question — after that the real history is better
// guidance than any suggestion could be.
const STARTERS = [
  "What happened in AI research this week?",
  "Any notable funding rounds recently?",
  "What changed in AI policy?",
];

/** The right rail's query history: what has been asked, newest first. */
export function ChatHistory({ activeId, onSelect, onUseStarter }: ChatHistoryProps) {
  const history = useAskHistory();
  const removeEntry = useDeleteAskHistoryEntry();
  const clearAll = useClearAskHistory();
  const [confirmingClear, setConfirmingClear] = useState(false);

  const entries = history.data ?? [];
  const isEmpty = !history.isPending && entries.length === 0;

  return (
    <div className="w-full bg-surface-container-low rounded-lg p-space-md shadow-sm flex flex-col gap-space-xs">
      <div
        className={clsx(
          "flex items-center justify-between gap-space-xs pb-space-2xs",
          isEmpty && "border-b border-surface-container",
        )}
      >
        <div className="flex items-center gap-space-xs font-headline-sm text-headline-sm text-on-surface font-semibold min-w-0">
          {/* "history" is the ligature that actually exists in Material
              Symbols; the mockup's history_toggle_drop_down does not. */}
          <Icon name="history" size={16} className="text-primary" />
          <span className={clsx("truncate", isEmpty && "tracking-wide")}>
            {isEmpty ? "QUERY HISTORY" : "Query History"}
          </span>
          <span
            className={clsx(
              "px-1.5 rounded bg-surface-container-highest font-mono text-[11px] shrink-0",
              isEmpty ? "text-outline font-medium" : "text-primary font-semibold",
            )}
          >
            {isEmpty ? "[0]" : entries.length}
          </span>
        </div>

        {isEmpty ? (
          <span className="font-mono text-[10px] text-outline uppercase shrink-0">
            clean-session
          </span>
        ) : confirmingClear ? (
          // Clearing is irreversible, so the button asks once before firing.
          <div className="flex items-center gap-1 text-[11px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => {
                clearAll.mutate();
                setConfirmingClear(false);
              }}
              className="px-1 py-0.5 rounded text-error hover:bg-surface-container transition-colors"
            >
              confirm
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="px-1 py-0.5 rounded text-outline hover:text-on-surface transition-colors"
            >
              cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            className="flex items-center gap-1 text-[11px] font-mono text-outline hover:text-error transition-colors px-1 py-0.5 rounded hover:bg-surface-container shrink-0"
          >
            <Icon name="clear_all" size={12} />
            <span>clear</span>
          </button>
        )}
      </div>

      {history.error ? (
        <ErrorState error={history.error} onRetry={() => void history.refetch()} />
      ) : history.isPending ? (
        <div className="flex flex-col gap-1.5 mt-space-2xs">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-10 rounded bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : isEmpty ? (
        <>
          <div className="flex flex-col items-center justify-center text-center p-space-md rounded bg-surface-container-lowest border border-surface-container-high mt-space-xs gap-space-xs">
            <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-outline">
              <Icon name="history_edu" size={20} />
            </div>
            <span className="font-mono text-[11px] text-primary font-semibold uppercase tracking-wider mt-space-2xs">
              Awaiting first synthesis
            </span>
            <p className="text-on-surface-variant text-[11px] font-mono leading-relaxed">
              Every question you ask, and the citations behind its answer, will be
              kept here.
            </p>
          </div>

          <div className="flex flex-col gap-space-xs mt-space-xs">
            <div className="flex items-center justify-between text-[10px] font-mono text-outline px-space-2xs">
              <span>SUGGESTED STARTER SNIPPETS</span>
              <span className="text-primary">READY</span>
            </div>
            <div className="flex flex-col gap-1.5 font-mono">
              {STARTERS.map((starter, index) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => onUseStarter(starter)}
                  className={clsx(
                    "text-left p-space-xs rounded bg-surface-container hover:bg-surface-container-high flex flex-col gap-0.5 transition-all group cursor-pointer border-l-2 border-surface-container-highest",
                    index === 1 ? "hover:border-secondary" : "hover:border-primary",
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={clsx(
                        "text-[11px] text-on-surface transition-colors line-clamp-1",
                        index === 1
                          ? "group-hover:text-secondary"
                          : "group-hover:text-primary",
                      )}
                    >
                      &gt; {starter}
                    </span>
                    <Icon
                      name="play_arrow"
                      size={12}
                      className={clsx(
                        "text-outline shrink-0",
                        index === 1
                          ? "group-hover:text-secondary"
                          : "group-hover:text-primary",
                      )}
                    />
                  </div>
                  <span className="text-[9px] text-outline">runnable quick-prompt</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5 mt-space-2xs font-mono max-h-96 overflow-y-auto">
          {entries.map((entry) => (
            <HistoryEntry
              key={entry.id}
              entry={entry}
              isActive={entry.id === activeId}
              onSelect={onSelect}
              onRemove={(id) => removeEntry.mutate(id)}
              isRemoving={removeEntry.isPending && removeEntry.variables === entry.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
