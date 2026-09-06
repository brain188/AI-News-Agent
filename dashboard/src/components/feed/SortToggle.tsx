import clsx from "clsx";

import type { SortOrder } from "../../types/api";

interface SortToggleProps {
  value: SortOrder;
  onChange: (value: SortOrder) => void;
}

const OPTIONS: { id: SortOrder; label: string }[] = [
  { id: "relevant", label: "most relevant" },
  { id: "recent", label: "most recent" },
];

/** Controlled segmented switch. The [s] hotkey is wired up in ArticleFeed. */
export function SortToggle({ value, onChange }: SortToggleProps) {
  return (
    <div className="flex items-center gap-space-xs self-end lg:self-auto font-label-sm text-label-sm">
      <div className="flex items-center bg-surface-container-lowest p-0.5 rounded">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={clsx(
              "px-space-sm py-0.5 rounded transition-all",
              value === option.id
                ? "bg-surface-container-high text-primary font-semibold"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-surface-container text-outline text-[0.625rem] font-code-inline font-medium">
        [s] toggle
      </span>
    </div>
  );
}
