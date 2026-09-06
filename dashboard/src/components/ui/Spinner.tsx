import clsx from "clsx";

/**
 * A pulsing block cursor rather than a rotating disc — the interface's
 * heritage is a terminal, and a blinking cursor is what "working" looks like
 * there.
 */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={clsx(
        "inline-block w-2 h-4 align-middle bg-primary animate-pulse",
        className,
      )}
    />
  );
}

/** Placeholder rows that hold the feed's shape while the first page loads. */
export function ArticleSkeleton() {
  return (
    <div className="bg-surface-container-low rounded-lg p-space-base animate-pulse">
      <div className="flex items-center gap-2 mb-space-sm">
        <div className="h-3 w-16 rounded bg-surface-container-high" />
        <div className="h-3 w-24 rounded bg-surface-container" />
      </div>
      <div className="h-4 w-3/4 rounded bg-surface-container-high mb-space-sm" />
      <div className="h-3 w-full rounded bg-surface-container mb-1.5" />
      <div className="h-3 w-5/6 rounded bg-surface-container" />
    </div>
  );
}
