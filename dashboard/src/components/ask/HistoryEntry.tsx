import clsx from "clsx";

import { relativeTime } from "../../lib/format";
import type { AgentQuery } from "../../types/api";
import { Icon } from "../ui/Icon";

interface HistoryEntryProps {
  entry: AgentQuery;
  isActive: boolean;
  onSelect: (entry: AgentQuery) => void;
  onRemove: (id: string) => void;
  isRemoving: boolean;
}

/** One row in the right rail's query history. */
export function HistoryEntry({
  entry,
  isActive,
  onSelect,
  onRemove,
  isRemoving,
}: HistoryEntryProps) {
  // An entry whose answer never came back has nothing to load into the pane.
  const selectable = Boolean(entry.answer);
  const sources = entry.cited_articles.length;

  return (
    <div
      className={clsx(
        "group relative p-space-xs rounded flex flex-col gap-1 transition-all",
        isActive
          ? "bg-surface-container-high border-l-2 border-primary"
          : "bg-surface-container hover:bg-surface-container-high",
        isRemoving && "opacity-40 pointer-events-none",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <button
          type="button"
          disabled={!selectable}
          onClick={() => onSelect(entry)}
          title={entry.question}
          className={clsx(
            "text-left text-[12px] line-clamp-2 leading-tight transition-colors min-w-0",
            isActive
              ? "text-primary font-medium"
              : selectable
                ? "text-on-surface group-hover:text-primary cursor-pointer"
                : "text-outline cursor-not-allowed",
          )}
        >
          {entry.question}
        </button>
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          title="Remove entry"
          aria-label={`Remove "${entry.question}" from history`}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-0.5 text-outline hover:text-error transition-all rounded shrink-0"
        >
          <Icon name="close" size={13} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-1 text-[10px] text-on-surface-variant">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="whitespace-nowrap">{relativeTime(entry.created_at)}</span>
          <span className="text-outline-variant">•</span>
          <span className="whitespace-nowrap">
            {selectable ? `${sources} ${sources === 1 ? "source" : "sources"}` : "no answer"}
          </span>
        </div>
        {/* Whether an answer came from the open web or only the curated corpus
            changes how much to trust it, so it is stated on every row. */}
        <span
          className={clsx(
            "px-1 rounded bg-surface-container-lowest text-[9px] tracking-wide shrink-0",
            entry.used_live_search
              ? "text-primary font-semibold"
              : "text-outline font-medium",
          )}
        >
          {entry.used_live_search ? "⚡ WEB" : "CORPUS"}
        </span>
      </div>
    </div>
  );
}
