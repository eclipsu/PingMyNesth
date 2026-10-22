"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Mail } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SeatStatus } from "@/lib/api";

type Row = {
  code: string;
  section: string;
  title: string;
  avail: number;
  cap: number;
};

const rows: Row[] = [
  { code: "CSC 101", section: "003", title: "Computer Science I", avail: 0, cap: 30 },
  { code: "MAT 167", section: "H01", title: "Calculus I", avail: 1, cap: 35 },
  { code: "ENG 102", section: "012", title: "Composition II", avail: 0, cap: 24 },
];

function status(avail: number): SeatStatus {
  if (avail <= 0) return "FULL";
  if (avail === 1) return "1 LEFT";
  return "OPEN";
}

// Status colors tuned for the black hero (the light-surface tokens are too dark here)
const tone: Record<SeatStatus, { text: string; seat: string; label: string }> = {
  OPEN: { text: "text-[#4ade80]", seat: "bg-[#4ade80]", label: "Open" },
  "1 LEFT": { text: "text-[#fb923c]", seat: "bg-[#fb923c]", label: "1 left" },
  FULL: { text: "text-[#f87171]", seat: "", label: "Full" },
};

/** One block per seat: taken seats stay dim, open seats light up in the status color. */
function SeatBlocks({ avail, cap, s }: { avail: number; cap: number; s: SeatStatus }) {
  return (
    <div className="flex gap-[2px]" aria-hidden>
      {Array.from({ length: cap }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-3 flex-1 transition-colors duration-300",
            i >= cap - avail ? tone[s].seat : "bg-white/15",
          )}
        />
      ))}
    </div>
  );
}

/** Looping demo: CSC 101 flips from full to open, then the alert email lands. */
export function HeroPreview() {
  const reduce = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const opened = reduce || flipped;

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setFlipped((v) => !v), 3600);
    const first = window.setTimeout(() => setFlipped(true), 1400);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [reduce]);

  return (
    <div className="relative text-left" aria-hidden>
      <div className="overflow-hidden rounded-md border border-white/10 bg-[#141414]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl font-extrabold uppercase text-white">Your nest</span>
            <span className="text-sm text-white/50">Spring 2027 · Hattiesburg</span>
          </div>
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60">
            <span className="live-dot" />
            <span className="hidden sm:inline">Checked a few seconds ago</span>
            <span className="sm:hidden">Live</span>
          </span>
        </div>

        <div className="hidden grid-cols-[1.2fr_1fr_5rem] gap-6 border-b border-white/10 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40 sm:grid">
          <span>Section</span>
          <span>Seats open</span>
          <span className="text-right">Status</span>
        </div>

        <ul className="divide-y divide-white/10">
          {rows.map((row, i) => {
            const avail = i === 0 && opened ? 2 : row.avail;
            const s = status(avail);
            const justOpened = i === 0 && opened;
            return (
              <li
                key={row.code}
                className={cn(
                  "grid grid-cols-[1fr_auto] items-center gap-4 border-l-4 px-5 py-4 transition-colors duration-300 sm:grid-cols-[1.2fr_1fr_5rem] sm:gap-6",
                  justOpened ? "border-accent bg-white/[0.04]" : "border-transparent",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-2xl font-extrabold uppercase leading-none text-white">
                      {row.code}
                    </span>
                    <span className="font-mono text-xs text-white/40">§{row.section}</span>
                  </div>
                  <p className="mt-1.5 truncate text-sm text-white/60">
                    {row.title}
                  </p>
                </div>

                <div className="hidden sm:block">
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn("font-display text-3xl font-extrabold leading-none tabular-nums", avail > 0 ? tone[s].text : "text-white")}>
                      {avail}
                    </span>
                    <span className="text-sm text-white/40">/ {row.cap}</span>
                  </div>
                  <div className="mt-2">
                    <SeatBlocks avail={avail} cap={row.cap} s={s} />
                  </div>
                </div>

                <span className={cn("text-right text-xs font-bold uppercase tracking-wider", tone[s].text)}>
                  {tone[s].label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <AnimatePresence>
        {opened ? (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute -bottom-10 right-3 hidden w-[min(22rem,calc(100%-1.5rem))] rounded-md border-l-4 border-accent bg-surface p-4 text-ink shadow-[var(--shadow-float)] sm:-right-6 sm:block"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink text-accent">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">Seat open in CSC 101</p>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">now</span>
                </div>
                <p className="mt-0.5 text-sm leading-snug text-ink-2">
                  Section 003 just opened 2 seats. Register in SOAR before they&apos;re gone.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
