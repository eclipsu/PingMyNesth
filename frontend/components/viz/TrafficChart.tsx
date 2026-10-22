"use client";

import { useState } from "react";
import type { PulseHour } from "@/lib/api";
import { formatHour, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";

// Validated pair (dataviz validator, light surface): gold for the worker,
// blue for student searches. Gold is under 3:1, so the legend and tooltip
// always carry the values too.
export const SERIES = {
  worker: { color: "#c98500", label: "Worker checks" },
  search: { color: "#2a78d6", label: "Student searches" },
} as const;

/**
 * Requests to USM per hour for the last 24 hours, stacked by who made them.
 * Each column is one hour; hovering (or focusing) a column shows its numbers.
 */
export function TrafficChart({ hours, className }: { hours: PulseHour[]; className?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...hours.map((h) => h.worker + h.search));
  const nice = niceCeil(max);
  const shown = active ?? hours.length - 1;
  const h = hours[shown];

  return (
    <figure className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
        <div className="flex items-center gap-4">
          {Object.values(SERIES).map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}
        </div>
        {h ? (
          <span className="font-mono text-ink-2" aria-live="polite">
            {active == null ? "This hour" : formatHour(h.hour)}: {formatNumber(h.worker)} worker ·{" "}
            {formatNumber(h.search)} search · {formatNumber(h.cache_hits)} cached
          </span>
        ) : null}
      </div>

      <div className="relative mt-3 flex-1">
        {/* recessive grid: baseline, middle, top */}
        {[0, 0.5, 1].map((f) => (
          <div
            key={f}
            className="pointer-events-none absolute inset-x-0 border-t border-line"
            style={{ bottom: `${f * 100}%` }}
          >
            <span className="absolute -top-2 right-full mr-1.5 whitespace-nowrap font-mono text-[10px] text-muted">
              {formatNumber(nice * f, true)}
            </span>
          </div>
        ))}
        <div
          className="relative flex h-full items-end gap-[2px] pl-0"
          role="img"
          aria-label={`Requests to USM per hour over the last 24 hours, peak ${formatNumber(max)}`}
          onMouseLeave={() => setActive(null)}
        >
          {hours.map((hour, i) => {
            const total = hour.worker + hour.search;
            return (
              <button
                key={hour.hour}
                type="button"
                className="group relative flex h-full min-w-0 flex-1 flex-col justify-end outline-none"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${formatHour(hour.hour)}: ${hour.worker} worker requests, ${hour.search} search requests, ${hour.cache_hits} cache hits`}
              >
                <span
                  className={cn(
                    "mx-auto flex w-full max-w-6 flex-col justify-end gap-[2px] transition-opacity",
                    active != null && active !== i && "opacity-40",
                  )}
                  style={{ height: `${(total / nice) * 100}%` }}
                >
                  {hour.search > 0 ? (
                    <span
                      className="w-full rounded-t-[4px]"
                      style={{ background: SERIES.search.color, flexGrow: hour.search }}
                    />
                  ) : null}
                  {hour.worker > 0 ? (
                    <span
                      className={cn("w-full", hour.search > 0 ? "" : "rounded-t-[4px]")}
                      style={{ background: SERIES.worker.color, flexGrow: hour.worker }}
                    />
                  ) : null}
                </span>
                {total === 0 ? <span className="mx-auto h-[2px] w-full max-w-6 bg-line-strong" /> : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
        <span>{hours[0] ? formatHour(hours[0].hour) : ""}</span>
        <span>now</span>
      </div>
    </figure>
  );
}

/** Rounds up to 1, 2, 5 × 10^n so axis labels stay clean. */
export function niceCeil(n: number): number {
  const pow = 10 ** Math.floor(Math.log10(Math.max(1, n)));
  for (const m of [1, 2, 5, 10]) if (n <= m * pow) return m * pow;
  return 10 * pow;
}
