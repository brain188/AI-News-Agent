import type { Stats } from "../../types/api";
import { Icon } from "../ui/Icon";

// Loaded into the prompt rather than run, so the reader can edit before asking.
const QUICK_START = [
  "What happened in AI research this week?",
  "Which products shipped recently?",
  "What changed in AI policy?",
];

interface AskEmptyStateProps {
  onUseStarter: (question: string) => void;
  stats?: Stats;
}

/** The answer pane before anything has been asked in this session. */
export function AskEmptyState({ onUseStarter, stats }: AskEmptyStateProps) {
  return (
    <div className="w-full bg-surface-container-low rounded-lg p-space-lg shadow-sm flex flex-col items-center justify-center text-center gap-space-md min-h-[460px] border border-surface-container-highest/40">
      <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center mb-space-2xs">
        <Icon name="terminal" size={28} className="text-primary animate-pulse" />
      </div>

      <div className="flex flex-col gap-space-2xs max-w-lg">
        <div className="flex items-center justify-center gap-space-xs">
          <span className="w-2 h-2 rounded-full bg-outline" />
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold uppercase tracking-wide">
            Awaiting Query Dispatch
          </span>
        </div>
        <p className="text-on-surface-variant font-body-md text-body-md leading-relaxed">
          The agent is primed. Ask a question or load a starter prompt — it searches
          the stored corpus first and reaches for live web search only when the
          corpus cannot answer.
        </p>
      </div>

      <div className="w-full max-w-xl bg-surface-container-lowest rounded-lg p-space-md flex flex-col gap-space-sm text-left mt-space-sm border border-surface-container-high">
        <div className="flex items-center justify-between text-outline font-label-sm text-label-sm pb-space-2xs border-b border-surface-container">
          <span className="flex items-center gap-1 font-mono">
            <Icon name="bolt" size={14} className="text-primary" />
            <span>QUICK-START PROMPTS</span>
          </span>
          <span className="text-[10px] font-mono text-outline-variant">CLICK TO LOAD</span>
        </div>
        <div className="flex flex-col gap-space-xs font-mono text-[12px]">
          {QUICK_START.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onUseStarter(prompt)}
              className="text-left p-space-xs rounded bg-surface-container hover:bg-surface-container-high hover:text-primary text-on-surface transition-all flex items-center justify-between gap-space-sm group"
            >
              <span className="line-clamp-1">
                <span className="text-primary font-bold">&gt;</span> {prompt}
              </span>
              <Icon
                name="arrow_forward"
                size={14}
                className="opacity-0 group-hover:opacity-100 text-primary shrink-0 transition-opacity"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-space-md text-outline font-label-sm text-label-sm pt-space-xs">
        <span className="flex items-center gap-1">
          <Icon name="database" size={14} className="text-primary" />
          <span>Indexed articles: {stats?.total_articles ?? 0}</span>
        </span>
        <span className="text-outline-variant">•</span>
        <span className="flex items-center gap-1">
          <Icon name="bolt" size={14} className="text-secondary" />
          <span>Model: {stats?.llm_model || "unknown"}</span>
        </span>
      </div>
    </div>
  );
}
