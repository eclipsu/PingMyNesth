"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import { usePulse, useNow } from "@/hooks/usePulse";
import type { PulseResponse } from "@/lib/api";
import { formatDuration, formatInterval, formatNumber, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";
import { AnimatedNumber } from "@/components/viz/AnimatedNumber";
import { TrafficChart } from "@/components/viz/TrafficChart";
import { CycleChart } from "@/components/viz/CycleChart";
import { SeatBadge } from "@/components/ui/Seats";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

/*
 * "Behind the scenes": a carousel about how the checking works, where every
 * number comes from /pulse (the worker's real cycles, real requests to USM,
 * real seat openings). If the API can't be reached it says so instead of
 * showing made-up figures.
 */

const SLIDE_MS = 9000;

type SlideProps = { pulse: PulseResponse | null; now: number };

const slides: { id: string; label: string; render: (p: SlideProps) => ReactNode }[] = [
  { id: "intro", label: "The question", render: (p) => <IntroSlide {...p} /> },
  { id: "map", label: "The map", render: (p) => <MapSlide {...p} /> },
  { id: "cycle", label: "One check", render: (p) => <CycleSlide {...p} /> },
  { id: "cache", label: "The cache", render: (p) => <CacheSlide {...p} /> },
  { id: "alert", label: "Seat → inbox", render: (p) => <AlertSlide {...p} /> },
  { id: "rules", label: "House rules", render: (p) => <RulesSlide {...p} /> },
];

export function BehindTheScenes() {
  const rootRef = useRef<HTMLElement>(null);
  const inView = useInView(rootRef, { margin: "200px 0px" });
  const { pulse, failed } = usePulse(inView);
  const now = useNow();
  const reduce = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  // autoplay until the visitor takes over; hovering or focusing pauses it
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);

  const go = useCallback((next: number, dir?: number) => {
    setDirection(dir ?? (next > index ? 1 : -1));
    setIndex((next + slides.length) % slides.length);
  }, [index]);

  const step = useCallback((dir: 1 | -1) => go(index + dir, dir), [go, index]);

  // the active tab's bar is a CSS animation; when it ends, advance. Pausing
  // (hover, focus, off screen) just pauses the animation, so no timers.
  const running = playing && !held && inView && !reduce;

  const manual = (fn: () => void) => {
    setPlaying(false);
    fn();
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -80) manual(() => step(1));
    else if (swipe > 80) manual(() => step(-1));
  };

  const status = pulse?.worker.status;

  return (
    <section
      ref={rootRef}
      id="behind-the-scenes"
      className="scroll-mt-20 overflow-hidden bg-ink py-24 text-white sm:py-28"
      aria-labelledby="bts-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="eyebrow !text-accent">Behind the scenes</p>
            <h2 id="bts-heading" className="mt-4 text-5xl font-bold sm:text-6xl">
              How we check {pulse ? formatNumber(pulse.catalog.courses) : "every"} courses{" "}
              <span className="text-accent">without hammering USM</span>.
            </h2>
          </div>
          <LiveBadge status={failed && !pulse ? "unreachable" : status} pulse={pulse} now={now} stale={failed} />
        </div>

        <div
          className="mt-12"
          role="region"
          aria-roledescription="carousel"
          aria-label="How Ping My Nest checks seats"
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocusCapture={() => setHeld(true)}
          onBlurCapture={() => setHeld(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") manual(() => step(1));
            if (e.key === "ArrowLeft") manual(() => step(-1));
          }}
        >
          {/* chapter tabs double as autoplay progress */}
          <div className="grid grid-cols-6 gap-2" role="tablist" aria-label="Slides">
            {slides.map((s, i) => {
              const autoplaying = playing && !reduce && i === index;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-controls={`bts-slide-${s.id}`}
                  onClick={() => manual(() => go(i))}
                  className="group text-left outline-none"
                >
                  <span className="block h-[3px] overflow-hidden bg-white/15">
                    {autoplaying ? (
                      <span
                        key={index}
                        className="bts-progress block h-full bg-accent"
                        style={{ animationDuration: `${SLIDE_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                        onAnimationEnd={() => step(1)}
                      />
                    ) : (
                      <span className={cn("block h-full bg-accent", i <= index ? "w-full" : "w-0")} />
                    )}
                  </span>
                  <span
                    className={cn(
                      "mt-2 hidden text-xs font-semibold uppercase tracking-wider transition-colors sm:block",
                      i === index ? "text-white" : "text-white/45 group-hover:text-white/80",
                    )}
                  >
                    <span className="font-mono text-white/40">0{i + 1}</span> {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* height follows the slide, animated, so short slides don't leave a hole */}
          <motion.div layout transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }} className="relative mt-6">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={slides[index].id}
                id={`bts-slide-${slides[index].id}`}
                role="tabpanel"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${slides.length}: ${slides[index].label}`}
                custom={direction}
                variants={{
                  enter: (dir: number) => ({ x: reduce ? 0 : dir * 80, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (dir: number) => ({ x: reduce ? 0 : dir * -80, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: reduce ? 0.15 : 0.45, ease: [0.22, 1, 0.36, 1] }}
                drag={reduce ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={onDragEnd}
                className="flex flex-col justify-center rounded-lg bg-bg p-5 text-ink shadow-[var(--shadow-float)] sm:min-h-[420px] sm:p-8"
              >
                {slides[index].render({ pulse, now })}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <p className="text-sm text-white/55">
              {failed
                ? "Live numbers are unavailable right now; showing the last ones we got."
                : "Every number here comes from the live system and refreshes every 10 seconds."}
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 text-white transition-colors hover:border-accent hover:text-accent"
                aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => manual(() => step(-1))}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 text-white transition-colors hover:border-accent hover:text-accent"
                aria-label="Previous slide"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => manual(() => step(1))}
                className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-ink transition-colors hover:bg-accent-hover"
                aria-label="Next slide"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveBadge({
  status,
  pulse,
  now,
  stale,
}: {
  status: PulseResponse["worker"]["status"] | "unreachable" | undefined;
  pulse: PulseResponse | null;
  now: number;
  stale: boolean;
}) {
  const last = pulse?.worker.last_cycle;
  let label = "Connecting…";
  let dot = "bg-white/40";
  if (status === "live") {
    label = `Worker live · last check ${timeAgo(last?.started_at, now)}`;
    dot = "";
  } else if (status === "stalled") {
    label = `Worker paused · last check ${timeAgo(last?.started_at, now)}`;
    dot = "bg-low";
  } else if (status === "offline") {
    label = "Worker hasn't run yet";
    dot = "bg-white/40";
  } else if (status === "unreachable") {
    label = "Live data unavailable";
    dot = "bg-full";
  }
  return (
    <p
      className="inline-flex items-center gap-2.5 rounded-md border border-white/15 px-3.5 py-2 font-mono text-[13px] text-white/85"
      aria-live="polite"
    >
      <span className={cn("live-dot", dot, stale && "opacity-50")} aria-hidden />
      {label}
    </p>
  );
}

/* ---------- slides ---------- */

function SlideHeader({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{kicker}</p>
      <h3 className="mt-3 font-display text-3xl font-extrabold uppercase leading-[0.95] sm:text-4xl">{title}</h3>
      {children ? <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{children}</p> : null}
    </div>
  );
}

function Stat({ value, label, hint, compact }: { value: number | null | undefined; label: string; hint?: string; compact?: boolean }) {
  return (
    <div className="border-l-2 border-accent pl-4">
      <AnimatedNumber value={value} compact={compact} className="block font-display text-4xl font-extrabold tabular-nums sm:text-5xl" />
      <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function IntroSlide({ pulse }: SlideProps) {
  const t = pulse?.last_24h;
  const requests = t ? t.worker_requests + t.search_requests : null;
  return (
    <div className="grid h-full gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <SlideHeader
        kicker="01 · The question"
        title={
          <>
            Seats open at random times.
            <br />
            <span className="mark">Someone has to keep looking.</span>
          </>
        }
      >
        USM&apos;s public class search shows live seat counts, but it won&apos;t tell you when a full
        section opens up. Refreshing it all day is miserable for you and wasteful for USM&apos;s servers.
        So one polite program does the looking for everyone, and you only hear from it when a seat opens.
      </SlideHeader>
      <div className="grid grid-cols-2 gap-x-6 gap-y-8">
        <Stat value={pulse?.catalog.courses} label="Courses in the catalog" hint={pulse ? `${pulse.catalog.subjects} subjects` : undefined} />
        <Stat value={pulse?.watching.sections} label="Sections being watched" hint="right now" />
        <Stat value={t?.sections_checked} compact label="Section checks" hint="last 24 hours" />
        <Stat value={requests} label="Requests to USM" hint="last 24 hours, total" />
      </div>
    </div>
  );
}

function MapSlide({ pulse, now }: SlideProps) {
  return (
    <div>
      <SlideHeader kicker="02 · The map" title="Seven pieces, one job.">
        The dots only move when something actually happens: when the worker finishes a real check,
        you&apos;ll see each request it sent to USM, and a gold dot means a seat alert went out.
      </SlideHeader>
      <div className="mt-6">
        <ArchitectureDiagram pulse={pulse} now={now} />
      </div>
    </div>
  );
}

function CycleSlide({ pulse, now }: SlideProps) {
  const last = pulse?.worker.last_cycle;
  const cycles = pulse?.recent_cycles ?? [];
  const perSubject = last && last.subjects ? last.usm_requests / last.subjects : null;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <SlideHeader kicker="03 · One check" title={<>One request per subject, <span className="mark">not per student.</span></>}>
          The worker doesn&apos;t ask about your section on its own. It asks once for the whole subject
          (up to 100 sections per answer) and compares every section it watches against the last count
          saved in Postgres. If 40 people watch different CSC sections, that&apos;s still one request per 100 CSC sections.
        </SlideHeader>
        {last ? (
          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line text-sm sm:grid-cols-4">
            {[
              { k: "Subjects", v: formatNumber(last.subjects) },
              { k: "Requests", v: formatNumber(last.usm_requests) },
              { k: "Sections read", v: formatNumber(last.sections_checked) },
              { k: "Took", v: formatDuration(last.duration_ms) },
            ].map((x) => (
              <div key={x.k} className="bg-surface px-4 py-3">
                <dt className="text-xs text-muted">{x.k}</dt>
                <dd className="mt-0.5 font-mono text-lg font-semibold">{x.v}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-6 text-sm text-muted">Waiting for the worker&apos;s first check…</p>
        )}
        {last ? (
          <p className="mt-3 text-xs text-muted">
            Last check {timeAgo(last.started_at, now)}
            {perSubject ? ` · ${perSubject.toFixed(perSubject % 1 ? 1 : 0)} request${perSubject === 1 ? "" : "s"} per subject` : ""}
            {last.subjects === 0 ? " · nothing watched, so zero requests" : ""}
          </p>
        ) : null}
      </div>
      <div className="flex min-h-[260px] flex-col rounded-md border border-line bg-surface p-5 pl-12">
        {cycles.length ? (
          <CycleChart cycles={cycles} now={now} className="h-full min-h-[220px]" />
        ) : (
          <p className="m-auto text-sm text-muted">No checks recorded yet.</p>
        )}
      </div>
    </div>
  );
}

function CacheSlide({ pulse }: SlideProps) {
  const t = pulse?.last_24h;
  const searches = t ? t.search_requests + t.cache_hits : 0;
  const saved = t && searches ? Math.round((t.cache_hits / searches) * 100) : null;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
      <div>
        <SlideHeader kicker="04 · The cache" title={<>A registration rush <span className="mark">stays our problem.</span></>}>
          When 200 students run the same search in the same minute, USM sees one request. Answers are kept
          for {formatInterval(pulse?.worker.search_cache_ttl_s ?? 60)}, and every request we make waits
          its turn in a single queue.
        </SlideHeader>
        <div className="mt-6 grid grid-cols-2 gap-6">
          <Stat value={t?.cache_hits} label="Searches from cache" hint="never reached USM (24h)" />
          <Stat value={saved} label="% of searches cached" hint={saved == null ? "no searches yet today" : "last 24 hours"} />
        </div>
      </div>
      <div className="flex min-h-[280px] flex-col rounded-md border border-line bg-surface p-5 pl-12">
        <p className="mb-3 text-sm font-semibold text-ink">Requests to USM, per hour</p>
        {pulse ? <TrafficChart hours={pulse.traffic} className="h-full min-h-[220px]" /> : <div className="skeleton m-auto h-48 w-full rounded" />}
      </div>
    </div>
  );
}

function AlertSlide({ pulse, now }: SlideProps) {
  const openings = pulse?.recent_openings ?? [];
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <SlideHeader kicker="05 · Seat → inbox" title={<>From <span className="text-full">full</span> to your inbox.</>}>
          The moment a section&apos;s count goes from 0 to anything above 0, everyone watching it gets an
          email with a link to SOAR. Then their watch pauses, so nobody gets spammed while the seat count moves around.
        </SlideHeader>
        <div className="mt-6 grid grid-cols-2 gap-6">
          <Stat value={pulse?.all_time.openings} label="Seats caught opening" hint="since launch" />
          <Stat value={pulse?.all_time.alerts} label="Alert emails sent" hint="since launch" />
        </div>
      </div>
      <div className="rounded-md border border-line bg-surface">
        <p className="border-b border-line px-5 py-3 text-sm font-semibold">Latest openings</p>
        {openings.length ? (
          <ul className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {openings.slice(0, 5).map((o, i) => (
                <motion.li
                  key={`${o.subject}${o.catalog_nbr}${o.class_section}${o.at}`}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <FlipBadge />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {o.subject} {o.catalog_nbr} <span className="font-mono text-xs text-muted">§{o.class_section}</span>
                    </p>
                    <p className="truncate text-sm text-ink-2">{o.descr}</p>
                  </div>
                  <div className="shrink-0 text-right font-mono text-xs text-muted">
                    <p className="text-ink">
                      {o.seats} seat{o.seats === 1 ? "" : "s"} · {o.notified} pinged
                    </p>
                    <p>{timeAgo(o.at, now)}</p>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="px-5 py-12 text-center text-sm text-muted">
            No seats have opened yet.
            {pulse ? ` The worker is watching ${formatNumber(pulse.watching.sections)} sections for one.` : ""}
          </p>
        )}
      </div>
    </div>
  );
}

/** FULL → OPEN, the moment the worker catches. */
function FlipBadge() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(reduce ?? false);
  useEffect(() => {
    if (reduce) return;
    const id = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(id);
  }, [reduce]);
  return (
    <span className="relative inline-flex w-16 shrink-0">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={open ? "open" : "full"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          <SeatBadge status={open ? "OPEN" : "FULL"} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function RulesSlide({ pulse }: SlideProps) {
  const rules = [
    {
      title: "Nothing watched, no requests",
      body: "If nobody is watching anything, the worker doesn't contact USM at all.",
      proof: pulse
        ? pulse.watching.subjects === 0
          ? "Right now: 0 subjects watched → 0 requests per check"
          : `Right now: ${pulse.watching.subjects} subject${pulse.watching.subjects === 1 ? "" : "s"} watched → about ${pulse.watching.subjects} request${pulse.watching.subjects === 1 ? "" : "s"} per check`
        : null,
    },
    {
      title: "One request at a time",
      body: "Requests go through a single queue, never faster than one per gap, no matter how many people are watching.",
      proof: pulse ? `Gap: ${formatInterval(pulse.worker.request_gap_s)} · check every ${formatInterval(pulse.worker.poll_interval_s)}` : null,
    },
    {
      title: "Public data, guest session",
      body: "The same public class search SOAR's catalog page uses. We never ask for or touch a student login.",
      proof: "We store only your verified email and the sections you watch",
    },
    {
      title: "Abuse gets throttled",
      body: "Every IP has token-bucket limits. Sign-in emails are capped at 3 resends, then a 30-minute cooldown.",
      proof: "Search: ~30 per minute per visitor",
    },
  ];
  return (
    <div>
      <SlideHeader kicker="06 · House rules" title="Polite by design." />
      <ol className="mt-6 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
        {rules.map((r, i) => (
          <motion.li
            key={r.title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.35 }}
            className="bg-surface p-5"
          >
            <p className="font-semibold">
              <span className="mr-2 font-mono text-accent-ink">0{i + 1}</span>
              {r.title}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{r.body}</p>
            {r.proof ? <p className="mt-3 font-mono text-xs text-muted">{r.proof}</p> : null}
          </motion.li>
        ))}
      </ol>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/search" className="btn btn-primary">
          Watch a class
        </Link>
        <a href="https://github.com/oscusm/PingMyNest" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          Read the code
        </a>
      </div>
    </div>
  );
}
