import { ApiError } from "../../api/client";
import { Icon } from "./Icon";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

function describe(error: unknown): { title: string; detail: string } {
  if (error instanceof ApiError) {
    // Status 0 is this client's marker for "the fetch never landed".
    if (error.status === 0) {
      return {
        title: "API unreachable",
        detail: `${error.message} — is uvicorn running?`,
      };
    }
    return { title: `Request failed (${error.status})`, detail: error.message };
  }
  return {
    title: "Something went wrong",
    detail: error instanceof Error ? error.message : String(error),
  };
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { title, detail } = describe(error);
  return (
    <div className="bg-surface-container-low rounded-lg p-space-base flex items-start gap-space-sm">
      <Icon name="error" size={18} className="text-error mt-0.5 shrink-0" />
      <div className="flex flex-col gap-space-2xs min-w-0">
        <p className="font-headline-sm text-headline-sm text-error">{title}</p>
        <p className="font-code-inline text-code-inline text-on-surface-variant break-words">
          {detail}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="self-start mt-space-xs px-space-sm py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm transition-colors"
          >
            retry
          </button>
        ) : null}
      </div>
    </div>
  );
}
