import { Icon } from "./Icon";

interface EmptyStateProps {
  icon?: string;
  title: string;
  /** Say what to do next, not just that there is nothing here. */
  hint: string;
  /** A shell command the reader can run to fix it. */
  command?: string;
}

export function EmptyState({ icon = "inbox", title, hint, command }: EmptyStateProps) {
  return (
    <div className="bg-surface-container-low rounded-lg py-space-xl px-space-base flex flex-col items-center text-center gap-space-xs">
      <Icon name={icon} size={28} className="text-outline-variant" />
      <p className="font-headline-sm text-headline-sm text-on-surface">{title}</p>
      <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">{hint}</p>
      {command ? (
        <code className="mt-space-xs px-space-sm py-space-xs rounded bg-surface-container-lowest font-code-inline text-code-inline text-primary">
          <span className="text-outline select-none">$ </span>
          {command}
        </code>
      ) : null}
    </div>
  );
}
