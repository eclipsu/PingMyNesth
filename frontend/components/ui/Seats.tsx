import { cn } from "@/lib/cn";
import type { SeatStatus } from "@/lib/api";

const badgeStyles: Record<SeatStatus, string> = {
  OPEN: "text-open",
  "1 LEFT": "text-low",
  FULL: "text-full",
};

const dotStyles: Record<SeatStatus, string> = {
  OPEN: "bg-open",
  "1 LEFT": "bg-low",
  FULL: "bg-full",
};

const badgeLabel: Record<SeatStatus, string> = {
  OPEN: "Open",
  "1 LEFT": "1 left",
  FULL: "Full",
};

export function SeatBadge({ status, className }: { status: SeatStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
        badgeStyles[status],
        className,
      )}
    >
      <span className={cn("h-2 w-2", dotStyles[status])} aria-hidden />
      {badgeLabel[status]}
    </span>
  );
}

/** Horizontal fill bar: how much of the section is taken. */
export function SeatMeter({
  status,
  avail,
  cap,
  className,
}: {
  status: SeatStatus;
  avail: number;
  cap: number;
  className?: string;
}) {
  const taken = cap > 0 ? Math.min(1, Math.max(0, (cap - avail) / cap)) : 1;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">
          {status === "FULL" ? "No seats" : `${avail} seat${avail === 1 ? "" : "s"} open`}
        </span>
        <span className="font-mono text-xs text-muted">
          {cap - avail}/{cap} taken
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-sm bg-subtle">
        <div
          className={cn("h-full transition-[width] duration-500", dotStyles[status])}
          style={{ width: `${Math.max(4, taken * 100)}%` }}
        />
      </div>
    </div>
  );
}
