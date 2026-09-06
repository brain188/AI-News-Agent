import { useState } from "react";

import type { Stats } from "../../types/api";
import { Icon } from "../ui/Icon";

const SUGGESTIONS = [
  "What happened in AI research this week?",
  "Any notable funding rounds recently?",
  "What changed in AI policy?",
];

// Matches the min_length on AskRequest — reject here rather than on a 422.
const MIN_LENGTH = 3;

interface AskInputProps {
  onSubmit: (question: string) => void;
  isPending: boolean;
  stats?: Stats;
}

/** The command shell: model context on top, a prompt line, then suggestions. */
export function AskInput({ onSubmit, isPending, stats }: AskInputProps) {
  const [value, setValue] = useState("");
  const canSubmit = value.trim().length >= MIN_LENGTH && !isPending;

  function submit() {
    if (!canSubmit) return;
    onSubmit(value.trim());
  }

  return (
    <div className="w-full bg-surface-container rounded-lg p-space-md shadow-md flex flex-col gap-space-sm relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
        <div className="flex items-center gap-space-xs">
          <Icon name="neurology" size={16} className="text-primary" />
          <span className="uppercase tracking-wider text-on-surface font-semibold">
            Semantic Synthesis Agent
          </span>
        </div>
        <div className="flex items-center gap-space-xs">
          <span className="px-space-xs py-space-2xs bg-surface-container-high rounded text-on-surface font-mono">
            {stats?.llm_model || "…"}
          </span>
          <span className="text-outline-variant">•</span>
          <span className="text-primary">
            rag context ({stats?.total_articles ?? 0} docs)
          </span>
        </div>
      </div>

      <div className="flex items-center gap-space-sm bg-surface-container-lowest rounded px-space-md py-space-sm">
        <span className="text-primary font-code-inline text-code-inline font-bold select-none">
          &gt;
        </span>
        <input
          type="text"
          value={value}
          disabled={isPending}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="query natural language corpus..."
          className="w-full bg-transparent text-on-surface font-code-inline text-code-inline focus:outline-none placeholder-outline-variant disabled:opacity-60"
        />
        <div className="flex items-center gap-space-xs shrink-0">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="hidden sm:flex items-center gap-1 px-space-sm py-space-xs rounded bg-surface-container-high hover:bg-surface-bright text-on-surface transition-colors font-label-sm text-label-sm disabled:opacity-40 disabled:hover:bg-surface-container-high"
          >
            <span>run</span>
            <span className="text-outline font-mono">[↵ Enter]</span>
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            aria-label="Run query"
            className="flex items-center justify-center p-space-xs rounded bg-primary text-on-primary hover:bg-primary-container transition-colors disabled:opacity-40"
          >
            <Icon name="arrow_forward" size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-space-xs pt-space-2xs">
        <span className="font-label-sm text-label-sm text-outline">suggested:</span>
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            disabled={isPending}
            onClick={() => {
              setValue(suggestion);
              onSubmit(suggestion);
            }}
            className="px-space-xs py-space-2xs rounded bg-surface-container-high hover:bg-surface-bright text-on-surface-variant font-label-sm text-label-sm transition-colors disabled:opacity-40"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
