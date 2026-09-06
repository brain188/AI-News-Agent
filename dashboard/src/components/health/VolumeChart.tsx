import { isToday, weekdayLabel } from "../../lib/format";
import type { DailyCount } from "../../types/api";
import { Icon } from "../ui/Icon";

// The SVG viewBox the design draws the histogram in.
const WIDTH = 700;
const BASELINE = 140;
const TOP = 22;

/** Ingestion volume per day, with the mean drawn across as a guideline. */
export function VolumeChart({ days }: { days: DailyCount[] }) {
  if (days.length === 0) return null;

  const counts = days.map((d) => d.count);
  const max = Math.max(...counts, 1);
  const mean = counts.reduce((sum, n) => sum + n, 0) / counts.length;
  const peak = Math.max(...counts);

  const slot = WIDTH / days.length;
  const barWidth = Math.min(50, slot * 0.5);
  const scale = (BASELINE - TOP) / max;
  const meanY = BASELINE - mean * scale;

  return (
    <div className="bg-surface-container-low rounded p-space-base flex flex-col gap-space-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
        <div className="flex items-center gap-space-sm">
          <Icon name="bar_chart" size={20} className="text-primary" />
          <span className="font-headline-sm text-headline-sm text-on-surface">
            {days.length}-Day Ingestion Volume
          </span>
        </div>
        <div className="flex items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant">
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-2.5 bg-primary-container rounded" />
            <span>Harvested Docs</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <span className="w-2.5 h-0.5 bg-secondary" />
            <span>
              Mean:{" "}
              <strong className="text-on-surface font-semibold">
                {mean.toFixed(1)} / day
              </strong>
            </span>
          </div>
        </div>
      </div>

      <div className="w-full bg-surface-container-lowest p-space-md rounded flex flex-col gap-space-xs">
        <div className="w-full h-44 relative">
          <svg
            className="w-full h-full"
            preserveAspectRatio="none"
            viewBox={`0 0 ${WIDTH} 160`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {[20, 60, 100].map((y) => (
              <line
                key={y}
                className="text-surface-container-high"
                stroke="currentColor"
                strokeDasharray="3 3"
                strokeWidth="1"
                x1="0"
                x2={WIDTH}
                y1={y}
                y2={y}
              />
            ))}
            <line
              className="text-surface-container-high"
              stroke="currentColor"
              strokeWidth="1"
              x1="0"
              x2={WIDTH}
              y1={BASELINE}
              y2={BASELINE}
            />

            {mean > 0 ? (
              <line
                className="text-secondary"
                stroke="currentColor"
                strokeDasharray="4 2"
                strokeWidth="1.5"
                x1="0"
                x2={WIDTH}
                y1={meanY}
                y2={meanY}
              />
            ) : null}

            {days.map((day, index) => {
              const height = day.count * scale;
              const x = index * slot + (slot - barWidth) / 2;
              const y = BASELINE - height;
              const today = isToday(day.day);
              const isPeak = !today && day.count === peak && peak > 0;
              const fill = today
                ? "text-primary"
                : isPeak
                  ? "text-primary-container"
                  : "text-surface-container-highest group-hover:text-primary-container transition-colors";

              return (
                <g key={day.day} className="cursor-pointer group">
                  <title>
                    {day.day}: {day.count} articles
                  </title>
                  {day.count > 0 ? (
                    <rect
                      className={fill}
                      fill="currentColor"
                      height={height}
                      rx="2"
                      width={barWidth}
                      x={x}
                      y={y}
                    />
                  ) : null}
                  <text
                    className={
                      today || isPeak
                        ? "text-primary text-[10px] font-semibold"
                        : "text-outline-variant text-[10px]"
                    }
                    fill="currentColor"
                    textAnchor="middle"
                    x={x + barWidth / 2}
                    y={Math.max(y - 7, 9)}
                  >
                    {day.count}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div
          className="grid text-center font-label-sm text-label-sm text-outline px-space-2xs"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((day) => (
            <span
              key={day.day}
              className={isToday(day.day) ? "text-primary font-semibold" : undefined}
            >
              {weekdayLabel(day.day)}
              {isToday(day.day) ? " (TODAY)" : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
