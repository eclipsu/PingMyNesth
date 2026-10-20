"use client";

import { Check, Lock, Mail, RotateCcw, SlidersHorizontal } from "lucide-react";
import { SeatBadge } from "@/components/ui/Seats";
import { FadeIn } from "./FadeIn";

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
                  Computer Science I with Dr. Rahimi now has 2 open seats. Seats go fast during
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
        </FadeIn>
      </div>
    </section>
  );
}
