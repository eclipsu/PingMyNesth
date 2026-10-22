"use client";

import { useState } from "react";
import type { PulseCycle } from "@/lib/api";
import { formatDuration, formatNumber, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { niceCeil } from "./TrafficChart";

/**
 * One column per worker cycle (oldest → newest), height = how long the cycle
 * took. Cycles that saw a seat open get a green cap; cycles with errors a red one.
 */
export function CycleChart({
  cycles,
  className,
  now,
}: {
  cycles: PulseCycle[];
  className?: string;
  now: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceCeil(Math.max(1, ...cycles.map((c) => c.duration_ms)));
  const shown = cycles[active ?? cycles.length - 1];

  return (
    <figure className={cn("flex flex-col", className)}>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-muted">
        <span>Time per check, last {cycles.length} cycles</span>
        {shown ? (
          <span className="font-mono text-ink-2" aria-live="polite">
            {timeAgo(shown.started_at, now)} · {formatDuration(shown.duration_ms)} ·{" "}
            {formatNumber(shown.sections_checked)} sections · {shown.usm_requests} req
            {shown.openings ? ` · ${shown.openings} opened` : ""}
            {shown.errors ? ` · ${shown.errors} errors` : ""}
          </span>
        ) : null}
      </figcaption>
      <div className="relative mt-3 flex-1">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-line" />
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-line">
          <span className="absolute -top-2 right-full mr-1.5 whitespace-nowrap font-mono text-[10px] text-muted">
            {formatDuration(max)}
          </span>
        </div>
        <div className="relative flex h-full items-end gap-[2px]" onMouseLeave={() => setActive(null)}>
          {cycles.map((c, i) => (
            <button
              key={c.started_at}
              type="button"
              className="flex h-full min-w-0 flex-1 flex-col justify-end outline-none"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`Cycle ${timeAgo(c.started_at, now)}: ${formatDuration(c.duration_ms)}, ${c.sections_checked} sections, ${c.usm_requests} requests`}
            >
              <span
                className={cn(
                  "mx-auto flex w-full max-w-6 flex-col overflow-hidden rounded-t-[4px] bg-ink transition-[height,opacity] duration-500",
                  active != null && active !== i && "opacity-40",
                  i === cycles.length - 1 && active == null && "bg-accent-ink",
                )}
                style={{ height: `${Math.max(2, (c.duration_ms / max) * 100)}%` }}
              >
                {c.errors ? <span className="h-1 w-full bg-full" /> : c.openings ? <span className="h-1 w-full bg-open" /> : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </figure>
  );
}
