"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import { api, instructorLabel, type ClassSection, type SeatStatus } from "@/lib/api";
import { timeAgo } from "@/lib/format";

/*
 * Live sections from USM Class Search (through the public /api/search, which
 * the API caches for a minute). Rotates through popular intro courses, three
 * at a time. A row lights up only when its seat count really changed since
 * the last fetch.
 */

const POOL = ["CSC 101", "MAT 101", "ENG 101", "BSC 110", "PSY 110", "MAT 167", "HIS 101", "CHE 106"];
const PER_PAGE = 3;
const ROTATE_MS = 7000;
const REFRESH_MS = 60_000;

type Row = { course: string; section: ClassSection; changed: number | null };

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

const MAX_BLOCKS = 40;

/** One block per seat (scaled down for big lectures): open seats light up. */
function SeatBlocks({ avail, cap, s }: { avail: number; cap: number; s: SeatStatus }) {
  const blocks = Math.min(cap, MAX_BLOCKS);
  const lit = cap > 0 ? Math.ceil((avail / cap) * blocks) : 0;
  return (
    <div className="flex gap-[2px]" aria-hidden>
      {Array.from({ length: blocks }, (_, i) => (
        <span
          key={i}
          className={cn("h-3 flex-1 transition-colors duration-500", i >= blocks - lit ? tone[s].seat : "bg-white/15")}
        />
      ))}
    </div>
  );
}

/** The fullest real section of a course: that's the one students fight over. */
function pickSection(classes: ClassSection[]): ClassSection | null {
  const real = classes.filter((c) => (c.class_capacity ?? 0) > 0);
  if (!real.length) return null;
  return real.reduce((best, c) => {
    const fill = (x: ClassSection) => 1 - Math.max(0, x.enrollment_available) / x.class_capacity;
    return fill(c) > fill(best) || (fill(c) === fill(best) && c.class_capacity > best.class_capacity) ? c : best;
  });
}

function parse(code: string) {
  const [subject, catalog_nbr] = code.split(" ");
  return { subject, catalog_nbr };
}

export function HeroPreview() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [page, setPage] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [hover, setHover] = useState(false);
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // fetch the pool one course at a time (gentle on the rate limit), then
  // refresh every minute while the tab is visible
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchCourse = async (code: string) => {
      try {
        const res = await api.search(parse(code), controller.signal);
        const section = pickSection(res.classes);
        if (cancelled || !section) return;
        const prev = rowsRef.current[code];
        const changed =
          prev && prev.section.class_nbr === section.class_nbr && prev.section.enrollment_available !== section.enrollment_available
            ? Date.now()
            : prev?.changed ?? null;
        setRows((r) => ({ ...r, [code]: { course: code, section, changed } }));
        setCheckedAt(new Date().toISOString());
        setFailed(false);
      } catch (err) {
        if (!cancelled && !(err instanceof DOMException && err.name === "AbortError")) setFailed(true);
      }
    };

    const sweep = async () => {
      for (const code of POOL) {
        if (cancelled) return;
        await fetchCourse(code);
        await new Promise((r) => setTimeout(r, 400));
      }
    };

    void sweep();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void sweep();
    }, REFRESH_MS);
    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const loaded = useMemo(() => POOL.map((c) => rows[c]).filter(Boolean) as Row[], [rows]);
  const pages = Math.max(1, Math.ceil(loaded.length / PER_PAGE));

  useEffect(() => {
    if (reduce || hover || pages < 2) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pages), ROTATE_MS);
    return () => clearInterval(id);
  }, [reduce, hover, pages]);

  const visible = loaded.slice((page % pages) * PER_PAGE, (page % pages) * PER_PAGE + PER_PAGE);
  const fullCount = loaded.filter((r) => r.section.enrollment_available <= 0).length;

  const open = (code: string) => {
    sessionStorage.setItem("pmn_pending_search", code);
    router.push("/search");
  };

  return (
    <div className="relative text-left" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="overflow-hidden rounded-md border border-white/10 bg-[#141414]">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl font-extrabold uppercase text-white">Live seats</span>
            <span className="hidden text-sm text-white/50 sm:inline">USM Class Search · popular courses</span>
          </div>
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60" aria-live="polite">
            <span className={cn("live-dot", failed && "bg-full")} />
            {failed && !loaded.length ? "Unavailable" : checkedAt ? `Checked ${timeAgo(checkedAt, now)}` : "Checking…"}
          </span>
        </div>

        <div className="hidden grid-cols-[1.2fr_1fr_5rem] gap-6 border-b border-white/10 px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40 sm:grid">
          <span>Section</span>
          <span>Seats open</span>
          <span className="text-right">Status</span>
        </div>

        <ul className="relative min-h-[15.5rem] divide-y divide-white/10 sm:min-h-[15.75rem]">
          {!loaded.length ? (
            failed ? (
              <li className="px-5 py-16 text-center text-sm text-white/50">
                Live class data is unavailable right now. Search still works once it&apos;s back.
              </li>
            ) : (
              Array.from({ length: PER_PAGE }, (_, i) => (
                <li key={i} className="flex items-center gap-6 px-5 py-5">
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-28 animate-pulse rounded-sm bg-white/10" />
                    <div className="h-3 w-44 animate-pulse rounded-sm bg-white/5" />
                  </div>
                  <div className="hidden h-8 w-40 animate-pulse rounded-sm bg-white/5 sm:block" />
                </li>
              ))
            )
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {visible.map((row, i) => {
                const sec = row.section;
                const avail = Math.max(0, sec.enrollment_available);
                const s = status(avail);
                const prof = instructorLabel(sec);
                const fresh = row.changed != null && now - row.changed < 2 * REFRESH_MS;
                return (
                  <motion.li
                    key={`${row.course}-${page}`}
                    initial={reduce ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -14 }}
                    transition={{ duration: 0.35, delay: reduce ? 0 : i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <button
                      type="button"
                      onClick={() => open(row.course)}
                      className={cn(
                        "grid w-full grid-cols-[1fr_auto] items-center gap-4 border-l-4 px-5 py-4 text-left transition-colors duration-300 hover:bg-white/[0.04] sm:grid-cols-[1.2fr_1fr_5rem] sm:gap-6",
                        fresh ? "border-accent bg-white/[0.04]" : "border-transparent",
                      )}
                      aria-label={`${row.course} section ${sec.class_section}: ${avail} of ${sec.class_capacity} seats open. Search ${row.course}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-2xl font-extrabold uppercase leading-none text-white">{row.course}</span>
                          <span className="font-mono text-xs text-white/40">§{sec.class_section}</span>
                          {fresh ? <span className="text-[10px] font-bold uppercase tracking-wider text-accent">changed</span> : null}
                        </div>
                        <p className="mt-1.5 truncate text-sm text-white/60">
                          {sec.descr}
                          {prof ? ` · ${prof}` : ""}
                        </p>
                      </div>

                      <div className="hidden sm:block">
                        <div className="flex items-baseline gap-1.5">
                          <span className={cn("font-display text-3xl font-extrabold leading-none tabular-nums", avail > 0 ? tone[s].text : "text-white")}>
                            {avail}
                          </span>
                          <span className="text-sm text-white/40">/ {sec.class_capacity}</span>
                        </div>
                        <div className="mt-2">
                          <SeatBlocks avail={avail} cap={sec.class_capacity} s={s} />
                        </div>
                      </div>

                      <span className={cn("text-right text-xs font-bold uppercase tracking-wider", tone[s].text)}>{tone[s].label}</span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          )}
        </ul>

        {pages > 1 ? (
          <div className="flex justify-center gap-1.5 border-t border-white/10 py-3">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPage(i)}
                aria-label={`Show courses ${i * PER_PAGE + 1} to ${Math.min(loaded.length, (i + 1) * PER_PAGE)}`}
                className={cn("h-1.5 rounded-full transition-all duration-300", i === page % pages ? "w-6 bg-accent" : "w-1.5 bg-white/25 hover:bg-white/50")}
              />
            ))}
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {fullCount > 0 ? (
          <motion.div
            key="callout"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute -bottom-10 right-3 hidden w-[min(22rem,calc(100%-1.5rem))] rounded-md border-l-4 border-accent bg-surface p-4 text-ink shadow-[var(--shadow-float)] sm:-right-6 sm:block"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-ink text-accent">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {fullCount} of {loaded.length} popular courses have a full section
                </p>
                <p className="mt-0.5 text-sm leading-snug text-ink-2">
                  Watch one and we&apos;ll email you the moment a seat opens.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
