"use client";

import {
  Bell,
  Eye,
  Filter,
  Heart,
  Search,
  Sparkles,
} from "lucide-react";
import { FadeIn } from "./FadeIn";
import { SectionLabel } from "./SectionLabel";

const features = [
  {
    icon: Bell,
    title: "Smart Alerts",
    description:
      "Get an email the moment a seat opens. No refresh loops during registration week.",
    tone: "gold" as const,
  },
  {
    icon: Search,
    title: "Powerful Search",
    description:
      "Find classes by subject, professor, CRN, or keyword — built for USM catalogs.",
    tone: "ink" as const,
  },
  {
    icon: Eye,
    title: "Watch Multiple Sections",
    description:
      "Track every section you care about in one nest. Pause or remove anytime.",
    tone: "paper" as const,
  },
  {
    icon: Sparkles,
    title: "Availability Insights",
    description:
      "See open, full, and nearly-full seats at a glance with clear status badges.",
    tone: "paper" as const,
  },
  {
    icon: Filter,
    title: "Modern Filters",
    description:
      "Narrow by time, days, credits, professor, and availability in a few taps.",
    tone: "ink" as const,
  },
  {
    icon: Heart,
    title: "Favorites",
    description:
      "Save courses for later and jump back when you're ready to watch them.",
    tone: "gold" as const,
  },
];

const toneClass = {
  gold: "bg-gold text-ink border-gold",
  ink: "bg-ink text-white border-ink",
  paper: "bg-white text-ink border-black/10",
};

export function Features() {
  return (
    <section
      id="features"
      className="relative scroll-mt-24 bg-surface py-20 text-white sm:py-24"
      aria-labelledby="features-heading"
    >
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <FadeIn>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Features
          </p>
          <h2
            id="features-heading"
            className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Everything you need to stop refreshing SOAR.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:text-[1.05rem]">
            Built around one job: help Golden Eagles find a seat and get notified
            the second it opens.
          </p>
        </FadeIn>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <FadeIn key={feature.title} delay={i * 0.04}>
                <article
                  className={`group h-full border p-7 transition-transform duration-300 hover:-translate-y-1 ${toneClass[feature.tone]}`}
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      feature.tone === "gold"
                        ? "bg-ink text-gold"
                        : feature.tone === "ink"
                          ? "bg-gold text-ink"
                          : "bg-gold/20 text-ink"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight">
                    {feature.title}
                  </h3>
                  <p
                    className={`mt-2 text-[15px] leading-relaxed ${
                      feature.tone === "ink" ? "text-white/65" : "text-ink/70"
                    }`}
                  >
                    {feature.description}
                  </p>
                </article>
              </FadeIn>
            );
          })}
        </div>

        {/* Email preview strip */}
        <FadeIn className="mt-3" delay={0.1}>
          <div className="grid overflow-hidden border border-white/10 lg:grid-cols-[1fr_1.1fr]">
            <div className="bg-gold p-8 sm:p-10">
              <SectionLabel>Inbox</SectionLabel>
              <h3 className="mt-3 text-3xl font-semibold tracking-tight text-ink">
                Smart alerts that actually feel urgent.
              </h3>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink/70">
                When a seat opens, you get a clear ping — course, section, and a
                path back to SOAR.
              </p>
            </div>
            <div className="bg-paper p-6 text-ink sm:p-8">
              <div className="border border-black/10 bg-white p-5 shadow-[0_18px_40px_rgba(0,0,0,0.08)]">
                <p className="text-xs font-bold uppercase tracking-wider text-gold-deep">
                  Ping My Nest
                </p>
                <p className="mt-2 text-lg font-semibold tracking-tight">
                  Seat available in CSC 111
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/60">
                  Section 003 · Dr. Rahimi · 2 seats open. Register before
                  they&apos;re gone.
                </p>
                <div className="mt-4 inline-flex bg-ink px-4 py-2 text-xs font-semibold text-white">
                  Open in SOAR
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
