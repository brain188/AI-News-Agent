import { useMemo, useState } from "react";
import clsx from "clsx";

import { hostname, relativeTime } from "../../lib/format";
import type { Source, SourceStatus } from "../../types/api";
import { Icon } from "../ui/Icon";

const STATUS_STYLE: Record<SourceStatus, { chip: string; dot: string; icon: string }> = {
  healthy: {
    chip: "bg-primary/10 text-primary",
    dot: "bg-primary",
    icon: "check_circle",
  },
  degraded: {
    chip: "bg-tertiary/20 text-tertiary-fixed",
    dot: "bg-tertiary-container animate-pulse",
    icon: "dns",
  },
  broken: {
    chip: "bg-error/20 text-error",
    dot: "bg-error animate-pulse",
    icon: "warning",
  },
};

const PROTOCOL: Record<string, string> = {
  rss: "RSS / Atom",
  api: "JSON Web API",
  scrape: "DOM Scraper",
};

/** Dense table of every configured feed. Broken rows are tinted and sort first. */
export function SourceMatrix({ sources }: { sources: Source[] }) {
  const [filter, setFilter] = useState("");

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return sources;
    return sources.filter(
      (source) =>
        source.name.toLowerCase().includes(needle) ||
        source.url.toLowerCase().includes(needle),
    );
  }, [sources, filter]);

  return (
    <div className="bg-surface-container-low rounded flex flex-col overflow-hidden">
      <div className="p-space-base bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <Icon name="hub" size={20} className="text-primary" />
          <span className="font-headline-sm text-headline-sm text-on-surface">
            Monitored Ingestion Feeds
          </span>
          <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-code-inline">
            {sources.length} {sources.length === 1 ? "handler" : "handlers"}
          </span>
        </div>
        <div className="flex items-center bg-surface-container-lowest px-space-sm py-1 rounded gap-space-xs">
          <Icon name="filter_list" size={16} className="text-outline" />
          <input
            type="text"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="filter sources..."
            className="bg-transparent text-on-surface font-label-sm text-label-sm focus:outline-none placeholder:text-outline w-28 md:w-36"
          />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[52rem] table-fixed text-left font-body-sm text-body-sm">
          <colgroup>
            <col className="w-[38%]" />
            <col className="w-[14%]" />
            <col className="w-[7%]" />
            <col className="w-[13%]" />
            <col className="w-[28%]" />
          </colgroup>
          <thead className="bg-surface-container-lowest text-outline font-label-sm text-label-sm uppercase tracking-wider">
            <tr>
              <th className="py-space-xs px-space-base font-medium">Source Name &amp; Namespace</th>
              <th className="py-space-xs px-space-sm font-medium">Protocol</th>
              <th className="py-space-xs px-space-sm font-medium">Cycle</th>
              <th className="py-space-xs px-space-sm font-medium">Health Status</th>
              <th className="py-space-xs px-space-base font-medium text-right">
                Throughput / Telemetry
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-space-lg px-space-base text-center text-outline">
                  {sources.length === 0
                    ? "No sources configured — seed the sources table to start ingesting."
                    : `Nothing matches "${filter}".`}
                </td>
              </tr>
            ) : (
              visible.map((source) => {
                const style = STATUS_STYLE[source.status];
                const unhealthy = source.status !== "healthy";
                return (
                  <tr
                    key={source.id}
                    className={clsx(
                      "hover:bg-surface-container transition-colors group",
                      unhealthy && "bg-error/5",
                    )}
                  >
                    <td className="py-space-sm px-space-base">
                      <div className="flex items-center gap-space-xs min-w-0 max-w-full">
                        <span
                          className={clsx("w-2 h-2 rounded-full flex-shrink-0", style.dot)}
                        />
                        <span className="font-headline-sm text-headline-sm text-on-surface font-code-inline truncate">
                          {source.name}
                        </span>
                        <span className="font-label-sm text-label-sm px-1 rounded bg-surface-container-high text-on-surface-variant truncate">
                          {hostname(source.url)}
                        </span>
                      </div>
                    </td>
                    <td className="py-space-sm px-space-sm font-label-sm text-label-sm text-on-surface-variant whitespace-nowrap">
                      {PROTOCOL[source.source_type] ?? source.source_type}
                    </td>
                    <td className="py-space-sm px-space-sm font-label-sm text-label-sm text-outline whitespace-nowrap">
                      {source.fetch_interval_minutes}m
                    </td>
                    <td className="py-space-sm px-space-sm">
                      <span
                        className={clsx(
                          "px-space-xs py-space-2xs rounded font-label-sm text-label-sm font-code-inline inline-flex items-center gap-1 uppercase",
                          style.chip,
                        )}
                      >
                        <Icon name={style.icon} size={12} />
                        {source.status === "healthy" ? "OK" : source.status}
                      </span>
                    </td>
                    <td
                      className={clsx(
                        "py-space-sm px-space-base text-right font-label-sm text-label-sm font-code-inline",
                        unhealthy ? "text-error" : "text-on-surface",
                      )}
                    >
                      {/* The error is the useful number on a broken row; the
                          yield is the useful number on a working one. */}
                      {source.last_error ? (
                        <span title={source.last_error} className="block truncate">
                          {source.last_error.split("\n")[0]}
                        </span>
                      ) : (
                        <span className="block truncate">
                          {source.articles_last_24h} in 24h
                          <span className="text-outline">
                            {" "}
                            · {relativeTime(source.last_fetched_at)}
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
