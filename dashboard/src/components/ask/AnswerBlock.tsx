import type { ReactNode } from "react";

import { duration, hostname, relativeTime, scoreOutOf100 } from "../../lib/format";
import { categoryStyle } from "../../lib/categories";
import type { ActiveAnswer } from "../../lib/answer";
import type { Article } from "../../types/api";
import { Icon } from "../ui/Icon";

interface AnswerBlockProps {
  result: ActiveAnswer;
}

/** `**bold**` is the only markup the agent reliably emits; render just that. */
function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="text-on-surface font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

interface Block {
  marker: string | null;
  text: string;
}

/**
 * Split the answer into paragraphs, promoting "1." / "-" lines to the design's
 * marked key-point rows. Anything else stays plain prose.
 */
function toBlocks(answer: string): Block[] {
  const lines = answer
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  let bulletIndex = 0;
  return lines.map((line) => {
    const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      return { marker: numbered[1].padStart(2, "0"), text: numbered[2] };
    }
    const bulleted = line.match(/^[-*•]\s+(.*)$/);
    if (bulleted) {
      bulletIndex += 1;
      return { marker: String(bulletIndex).padStart(2, "0"), text: bulleted[1] };
    }
    return { marker: null, text: line };
  });
}

/** One grounding source, on the connector line under the synthesis. */
function CitationCard({ article }: { article: Article }) {
  const style = categoryStyle(article.category);
  const score = scoreOutOf100(article.relevance_score);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noreferrer"
      className="group relative bg-surface-container hover:bg-surface-container-high transition-all p-space-sm rounded flex flex-col gap-space-2xs"
    >
      <span
        className={`absolute -left-[1.4rem] top-4 w-2 h-2 rounded-full ${style.bar}`}
      />
      <div className="flex flex-wrap items-center justify-between gap-2 text-on-surface-variant font-label-sm text-label-sm">
        <div className="flex items-center gap-space-xs min-w-0">
          <span
            className={`px-1 py-0.5 bg-surface-container-lowest rounded font-mono font-medium ${style.scoreText}`}
          >
            {hostname(article.url)}
          </span>
          <span className="text-outline">•</span>
          <span className="whitespace-nowrap">{relativeTime(article.published_at)}</span>
          {article.category ? (
            <>
              <span className="text-outline">•</span>
              <span className="truncate">{article.category}</span>
            </>
          ) : null}
        </div>
        {score !== null ? (
          <div className={`flex items-center gap-1 font-mono font-medium ${style.scoreText}`}>
            <span>relevance {score}%</span>
            <Icon
              name="arrow_outward"
              size={14}
              className="group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        ) : null}
      </div>
      <h4
        className={`font-headline-sm text-headline-sm text-on-surface transition-colors ${style.titleHover}`}
      >
        {article.title}
      </h4>
      {article.summary ? (
        <p className="text-outline text-body-sm font-body-sm line-clamp-1">
          {article.summary}
        </p>
      ) : null}
    </a>
  );
}

export function AnswerBlock({ result }: AnswerBlockProps) {
  const blocks = toBlocks(result.answer);
  const lead = blocks.find((block) => block.marker === null);
  const points = blocks.filter((block) => block.marker !== null);
  const rest = blocks.filter((block) => block.marker === null && block !== lead);

  return (
    <div className="w-full bg-surface-container-low rounded-lg p-space-lg shadow-sm flex flex-col gap-space-md">
      <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-sm">
        <div className="flex items-center gap-space-xs">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Synthesis Completed
          </span>
          {/* A replayed entry has no elapsed time — saying when it was asked
              is the honest equivalent. */}
          {result.elapsedSeconds !== null ? (
            <span className="text-outline font-label-sm text-label-sm ml-space-xs">
              generated in {duration(result.elapsedSeconds)}
            </span>
          ) : result.createdAt ? (
            <span className="text-outline font-label-sm text-label-sm ml-space-xs">
              from history · {relativeTime(result.createdAt)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-space-xs">
          {result.used_live_search ? (
            // Whether the answer came from the curated corpus or the open web
            // changes how much to trust it, so it is stated, not implied.
            <span className="flex items-center gap-1 px-space-xs py-space-2xs rounded bg-tertiary-container/20 text-tertiary font-label-sm text-label-sm">
              <Icon name="travel_explore" size={14} />
              live web search used
            </span>
          ) : (
            <span className="flex items-center gap-1 px-space-xs py-space-2xs rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
              <Icon name="database" size={14} />
              stored corpus only
            </span>
          )}
          <button
            type="button"
            title="Copy answer"
            onClick={() => void navigator.clipboard?.writeText(result.answer)}
            className="p-space-xs rounded hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <Icon name="content_copy" size={18} />
          </button>
        </div>
      </div>

      <div className="text-on-surface font-body-lg text-body-lg flex flex-col gap-space-base leading-relaxed">
        {lead ? (
          <p className="text-on-surface font-medium max-w-[76ch]">{inline(lead.text)}</p>
        ) : null}

        {points.length > 0 ? (
          <div className="flex flex-col gap-space-base pl-space-xs">
            {points.map((point, index) => (
              <div key={index} className="flex items-start gap-space-sm">
                <span className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono text-label-sm shrink-0 mt-1">
                  {point.marker}
                </span>
                <div className="text-on-surface-variant max-w-[76ch]">
                  {inline(point.text)}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {rest.map((block, index) => (
          <p key={index} className="text-on-surface-variant max-w-[76ch]">
            {inline(block.text)}
          </p>
        ))}
      </div>

      <div className="mt-space-md pt-space-md flex flex-col gap-space-sm relative">
        <div className="flex flex-wrap items-center justify-between gap-space-xs">
          <div className="flex items-center gap-space-xs">
            <Icon name="verified" size={18} className="text-primary" />
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Grounding Sources
            </span>
            <span className="px-space-xs py-space-2xs bg-surface-container rounded text-outline font-label-sm text-label-sm">
              {result.cited_articles.length} referenced
            </span>
          </div>
        </div>

        {result.cited_articles.length > 0 ? (
          <div className="relative pl-space-lg flex flex-col gap-space-sm before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-3 before:w-0.5 before:bg-surface-container-highest">
            {result.cited_articles.map((article) => (
              <CitationCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="font-body-sm text-body-sm text-outline">
            {result.used_live_search
              ? "This answer came from live web search — no stored article backs it."
              : "The agent cited no stored articles for this answer."}
          </p>
        )}
      </div>
    </div>
  );
}
