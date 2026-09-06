import clsx from "clsx";

import type { Stats } from "../../types/api";
import { Icon } from "../ui/Icon";

export type Tab = "feed" | "ask" | "health";

const TABS: { id: Tab; label: string }[] = [
  { id: "feed", label: "Feed" },
  { id: "ask", label: "Ask Agent" },
  { id: "health", label: "Pipeline Health & Sources" },
];

// The API's own version, so the badge tracks the backend it is talking to.
const APP_VERSION = "v0.1.0";

// A run inside this window means the pipeline is keeping up.
const DAEMON_FRESH_MS = 3 * 60 * 60 * 1000;

interface HeaderProps {
  active: Tab;
  onChange: (tab: Tab) => void;
  stats?: Stats;
  onRefresh: () => void;
}

function daemonState(stats?: Stats): { label: string; live: boolean } {
  if (!stats) return { label: "daemon: unknown", live: false };
  const last = stats.last_run_finished_at ?? stats.last_run_started_at;
  if (!last) return { label: "daemon: never run", live: false };
  const age = Date.now() - new Date(last).getTime();
  return age < DAEMON_FRESH_MS
    ? { label: "daemon: active", live: true }
    : { label: "daemon: stale", live: false };
}

export function Header({ active, onChange, stats, onRefresh }: HeaderProps) {
  const daemon = daemonState(stats);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-low shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-14 w-full px-gutter-desktop flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-lg min-w-0">
          <div className="flex items-center gap-space-xs shrink-0">
            <Icon name="terminal" size={20} className="text-primary" />
            <span className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              ai-news-agent
            </span>
            <span className="font-label-sm text-label-sm text-outline-variant">
              {APP_VERSION}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-space-xs px-space-xs py-space-2xs rounded bg-surface-container shrink-0">
            <span
              className={clsx(
                "w-1.5 h-1.5 rounded-full",
                daemon.live ? "bg-primary-container animate-pulse" : "bg-outline",
              )}
            />
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              {daemon.label}
              {stats?.sources_total ? (
                <span className="text-outline"> ({stats.sources_total} sources)</span>
              ) : null}
            </span>
          </div>

          <nav className="flex items-center gap-space-xs overflow-x-auto">
            {TABS.map((tab) => {
              const isActive = tab.id === active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onChange(tab.id)}
                  className={clsx(
                    "relative flex items-center gap-space-xs px-space-sm py-space-xs whitespace-nowrap rounded transition-colors font-label-md text-label-md",
                    isActive
                      ? "bg-surface-container-high text-on-surface font-semibold"
                      : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.id === "feed" && stats ? (
                    <span className="px-1.5 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm font-semibold">
                      {stats.total_articles}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-space-md shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            title="Refetch everything"
            className="hidden md:flex items-center gap-1 px-space-xs py-space-2xs rounded bg-surface-container hover:bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="text-outline">r</span> refresh
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Icon name="person" size={18} className="text-on-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
