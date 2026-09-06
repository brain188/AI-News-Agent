import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import { AskPanel } from "./components/ask/AskPanel";
import { ArticleFeed } from "./components/feed/ArticleFeed";
import { PipelineHealth } from "./components/health/PipelineHealth";
import { Footer } from "./components/shell/Footer";
import { Header, type Tab } from "./components/shell/Header";
import { useSources } from "./hooks/useSources";
import { useStats } from "./hooks/useStats";

/**
 * Three zones on one surface, switched by the header tabs. No router — there
 * is no second page and no URL worth deep-linking to yet.
 */
export default function App() {
  const [tab, setTab] = useState<Tab>("feed");
  const queryClient = useQueryClient();

  // Stats and sources feed the header and both other screens, so they are
  // fetched once here rather than in each tab.
  const stats = useStats();
  const sources = useSources();

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries();
  }, [queryClient]);

  // [r] refetches, matching the hint in the header.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        refresh();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [refresh]);

  return (
    <div className="min-h-screen flex flex-col bg-background font-body-md text-body-md text-on-surface antialiased">
      <Header active={tab} onChange={setTab} stats={stats.data} onRefresh={refresh} />

      <main className="w-full flex-1 pt-14 bg-background">
        <div className="max-w-5xl mx-auto px-gutter-desktop py-space-md">
          {tab === "feed" ? (
            <ArticleFeed stats={stats.data} sources={sources.data} />
          ) : tab === "ask" ? (
            <AskPanel stats={stats.data} sources={sources.data} />
          ) : (
            <PipelineHealth
              stats={stats.data}
              sources={sources.data}
              statsError={stats.error}
              sourcesError={sources.error}
              onRefresh={refresh}
            />
          )}
        </div>
      </main>

      <Footer
        stats={stats.data}
        isFetching={stats.isFetching || sources.isFetching}
        hasError={Boolean(stats.error || sources.error)}
      />
    </div>
  );
}
