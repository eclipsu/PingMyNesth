"use client";

import Link from "next/link";
import { Check, Lock, Mail, RotateCcw, SlidersHorizontal } from "lucide-react";
import { SeatBadge } from "@/components/ui/Seats";
import { FadeIn } from "./FadeIn";

// A sample week for the schedule builder card: classes on the hour grid
// (8 AM start, 1 row = 30 min) plus one commitment the student drew in.
const PREVIEW_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const PREVIEW_BLOCKS = [
  { day: 0, row: 2, span: 2, label: "MAT 167", tone: "gold" },
  { day: 2, row: 2, span: 2, label: "MAT 167", tone: "gold" },
  { day: 4, row: 2, span: 2, label: "MAT 167", tone: "gold" },
  { day: 1, row: 3, span: 3, label: "CSC 101", tone: "ink" },
  { day: 3, row: 3, span: 3, label: "CSC 101", tone: "ink" },
  { day: 1, row: 10, span: 3, label: "ENG 102", tone: "soft" },
  { day: 3, row: 10, span: 3, label: "ENG 102", tone: "soft" },
  { day: 0, row: 9, span: 8, label: "Work", tone: "busy" },
  { day: 2, row: 9, span: 8, label: "Work", tone: "busy" },
] as const;
const PREVIEW_ROWS = 18;

const toneClass = {
  gold: "bg-accent text-ink border-accent-hover",
  ink: "bg-ink text-white border-ink",
  soft: "bg-accent-soft text-ink border-accent-ink",
  busy: "text-ink border-ink/25 bg-[repeating-linear-gradient(135deg,var(--subtle)_0_6px,var(--line-strong)_6px_12px)]",
} as const;

export function Features() {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-y border-line bg-subtle py-24 sm:py-28"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">Features</p>
          <h2
            id="features-heading"
            className="mt-4 text-5xl font-bold text-ink sm:text-6xl"
          >
            Everything you need to stop refreshing SOAR.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Built around one job: get you into the section you need.
          </p>
        </div>

        <FadeIn className="mt-14 grid gap-4 md:grid-cols-6">
          <div className="md:col-span-4">
            <article className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface">
              <div className="p-7 sm:p-8">
                <Mail className="h-5 w-5 text-accent-ink" aria-hidden />
                <h3 className="mt-4 text-xl font-bold text-ink">
                  Alerts the moment a seat opens
                </h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
                  The moment a seat opens, you get a clear email with the course, the section,
                  and a link back to SOAR.
                </p>
              </div>
              {/* the sample email is a flush strip of the card, not a box inside it */}
              <div className="mt-auto border-l-4 border-t border-l-accent border-t-line bg-subtle px-7 py-5 sm:px-8">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-ink">Ping My Nest</span>
                  <span>&lt;alerts@pingmynest&gt;</span>
                  <span className="ml-auto">9:41 AM</span>
                </div>
                <p className="mt-3 font-semibold text-ink">A seat opened in CSC 101 §003</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  Computer Science I now has 2 open seats. Seats go fast during
                  registration, so head to SOAR now.
                </p>
                <span className="btn btn-accent btn-sm mt-4">Open SOAR</span>
              </div>
            </article>
          </div>

          <div className="md:col-span-2">
            <article className="flex h-full flex-col rounded-lg border border-line bg-surface p-7">
              <SlidersHorizontal className="h-5 w-5 text-accent-ink" aria-hidden />
              <h3 className="mt-4 text-xl font-bold text-ink">
                Filter like you plan
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Campus, days, start time, professor. Find the section that fits your week.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Hattiesburg", "Online", "Mon", "Wed", "After 10am"].map((t, i) => (
                  <span
                    key={t}
                    className="chip pointer-events-none"
                    aria-pressed={i === 0 || i === 4 ? "true" : "false"}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </article>
          </div>

          <div className="md:col-span-2">
            <article className="flex h-full flex-col rounded-lg border border-line bg-surface p-7">
              <div className="flex gap-1.5">
                <SeatBadge status="FULL" />
                <SeatBadge status="1 LEFT" />
                <SeatBadge status="OPEN" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-ink">
                Seat counts at a glance
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Live open, nearly-full, and full status on every section, straight from USM
                Class Search.
              </p>
            </article>
          </div>

          <div className="md:col-span-2">
            <article className="flex h-full flex-col rounded-lg border border-line bg-surface p-7">
              <RotateCcw className="h-5 w-5 text-accent-ink" aria-hidden />
              <h3 className="mt-4 text-xl font-bold text-ink">
                Missed it? Re-watch
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                Someone beat you to it? Turn the watch back on in one click from your nest.
              </p>
            </article>
          </div>

          <div className="md:col-span-2">
            <article className="flex h-full flex-col rounded-lg border border-line bg-ink p-7 text-white">
              <Lock className="h-5 w-5 text-accent" aria-hidden />
              <h3 className="mt-4 text-xl font-bold">No SOAR login. Ever.</h3>
              <ul className="mt-3 space-y-2 text-[15px] text-white/70">
                {["Only your email", "Public class data only", "No passwords to leak"].map(
                  (t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-accent" aria-hidden />
                      {t}
                    </li>
                  ),
                )}
              </ul>
            </article>
          </div>

          <div className="md:col-span-6">
            <article className="grid h-full overflow-hidden rounded-lg border border-line bg-surface md:grid-cols-[1fr_1.15fr]">
              <div className="flex flex-col p-7 sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-ink">New</p>
                <h3 className="mt-3 text-xl font-bold text-ink">Build your whole week</h3>
                <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted">
                  Add the courses you need and we line up every schedule that fits, without
                  clashes. Drag on the calendar to block out work, practice or anything else, and
                  sections that collide get swapped for one that doesn&apos;t.
                </p>
                <ul className="mt-5 space-y-2 text-[15px] text-ink-2">
                  {[
                    "Star sections and professors you like, pick mornings or Fridays off",
                    "Lock a section, drop a course, see total credits as you go",
                    "Ping any full section right from your schedule",
                  ].map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-accent" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/schedule" className="btn btn-primary mt-7 self-start">
                  Open the schedule builder
                </Link>
              </div>

              <div className="border-t border-line bg-subtle p-5 sm:p-7 md:border-l md:border-t-0" aria-hidden>
                <div className="overflow-hidden rounded border border-line bg-surface">
                  <div className="grid grid-cols-5 border-b border-line">
                    {PREVIEW_DAYS.map((d) => (
                      <p
                        key={d}
                        className="border-l border-line py-2 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-muted first:border-l-0"
                      >
                        {d}
                      </p>
                    ))}
                  </div>
                  <div
                    className="relative grid grid-cols-5"
                    style={{
                      gridTemplateRows: `repeat(${PREVIEW_ROWS}, 0.85rem)`,
                      backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px)",
                      backgroundSize: "100% 1.7rem",
                    }}
                  >
                    {PREVIEW_DAYS.map((d, i) => (
                      <div
                        key={d}
                        className="border-l border-line first:border-l-0"
                        style={{ gridColumn: i + 1, gridRow: `1 / span ${PREVIEW_ROWS}` }}
                      />
                    ))}
                    {PREVIEW_BLOCKS.map((b) => (
                      <div
                        key={`${b.day}-${b.row}`}
                        className={`z-10 mx-1 overflow-hidden rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold leading-tight ${toneClass[b.tone]}`}
                        style={{ gridColumn: b.day + 1, gridRow: `${b.row} / span ${b.span}` }}
                      >
                        {b.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
