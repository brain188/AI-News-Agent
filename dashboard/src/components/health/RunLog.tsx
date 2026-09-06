import { clockTime, duration } from "../../lib/format";
import type { Run } from "../../types/api";
import { Icon } from "../ui/Icon";

interface LogLine {
  key: string;
  time: string;
  level: "INFO" | "WARN" | "OK";
  stage: string;
  message: string;
}

const LEVEL_STYLE: Record<LogLine["level"], { label: string; body: string }> = {
  INFO: { label: "text-secondary", body: "text-on-surface" },
  WARN: { label: "text-tertiary-container", body: "text-tertiary-fixed" },
  OK: { label: "text-primary", body: "text-on-surface" },
};

// A single stack trace can be thousands of characters; the log is a scan
// surface, so each line is clipped and the full text lives in the title.
const MAX_ERROR_CHARS = 160;

function errorText(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : error && typeof error === "object"
        ? Object.entries(error as Record<string, unknown>)
            .map(([key, value]) => `${key}=${String(value)}`)
            .join(" ")
        : String(error);
  return raw.replace(/\s+/g, " ").trim();
}

/** Turn each stored run into the lines a tailed log would have shown. */
function toLines(runs: Run[]): LogLine[] {
  const lines: LogLine[] = [];

  // Oldest first, so the newest entry sits at the bottom like a real tail.
  for (const run of [...runs].reverse()) {
    // The counter columns count sources on an ingest run and articles on an
    // enrich run, so the noun has to follow the kind.
    const unit = run.kind === "enrich" ? "article" : "source";
    const stage = run.kind === "enrich" ? "enrich" : "ingest";

    lines.push({
      key: `${run.id}-start`,
      time: clockTime(run.started_at),
      level: "INFO",
      stage,
      message: `run started · ${run.sources_attempted} ${run.sources_attempted === 1 ? unit : `${unit}s`} queued`,
    });

    const failed = run.sources_attempted - run.sources_succeeded;
    if (failed > 0) {
      lines.push({
        key: `${run.id}-fail`,
        time: clockTime(run.started_at),
        level: "WARN",
        stage,
        message: `${failed} of ${run.sources_attempted} ${unit}s did not complete`,
      });
    }

    for (const [index, error] of (run.errors ?? []).entries()) {
      lines.push({
        key: `${run.id}-err-${index}`,
        time: clockTime(run.started_at),
        level: "WARN",
        stage,
        message: errorText(error),
      });
    }

    if (run.finished_at) {
      const seconds =
        (new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()) / 1000;
      const outcome =
        run.kind === "enrich"
          ? `${run.sources_succeeded} analyzed, ${run.articles_after_dedup} duplicates`
          : `${run.articles_found} new articles stored`;
      lines.push({
        key: `${run.id}-done`,
        time: clockTime(run.finished_at),
        level: "OK",
        stage,
        message: `complete in ${duration(seconds)} · ${outcome} · $${run.llm_cost_usd.toFixed(4)}`,
      });
    } else {
      lines.push({
        key: `${run.id}-running`,
        time: clockTime(run.started_at),
        level: "INFO",
        stage,
        message: "in progress — no finish time recorded",
      });
    }
  }

  return lines;
}

export function RunLog({ runs }: { runs: Run[] }) {
  const lines = toLines(runs);

  return (
    <div className="bg-surface-container-lowest rounded overflow-hidden flex flex-col">
      <div className="px-space-base py-space-xs bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-xs">
          <Icon name="terminal" size={16} className="text-outline" />
          <span className="font-label-sm text-label-sm text-on-surface font-semibold">
            PIPELINE EXECUTION LOG
          </span>
          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
        </div>
        <div className="flex items-center gap-space-sm">
          <span className="font-label-sm text-label-sm text-outline font-code-inline">
            last {runs.length} {runs.length === 1 ? "run" : "runs"}
          </span>
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard?.writeText(
                lines
                  .map((l) => `[${l.time}] ${l.level} ${l.stage}: ${l.message}`)
                  .join("\n"),
              )
            }
            className="font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1"
          >
            <Icon name="content_copy" size={14} />
            <span>Copy</span>
          </button>
        </div>
      </div>

      <div className="p-space-base font-code-inline text-code-inline text-on-surface space-y-1 overflow-y-auto max-h-52 select-text bg-background">
        {lines.length === 0 ? (
          <div className="text-outline">no pipeline runs recorded yet</div>
        ) : (
          lines.map((line) => {
            const style = LEVEL_STYLE[line.level];
            const clipped = line.message.length > MAX_ERROR_CHARS;
            return (
              <div key={line.key} className="flex items-start gap-space-xs">
                <span className="text-outline shrink-0">[{line.time}]</span>
                <span className={`${style.label} font-semibold shrink-0`}>{line.level}</span>
                <span className="text-outline shrink-0">{line.stage}:</span>
                <span
                  className={`${style.body} min-w-0 truncate`}
                  title={clipped ? line.message : undefined}
                >
                  {clipped ? `${line.message.slice(0, MAX_ERROR_CHARS)}…` : line.message}
                </span>
              </div>
            );
          })
        )}
        <div className="flex items-center gap-space-xs text-outline">
          <span className="text-primary">&gt;</span>
          <span className="animate-pulse">_ waiting for the next cycle</span>
        </div>
      </div>
    </div>
  );
}
