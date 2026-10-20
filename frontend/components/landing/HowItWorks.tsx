"use client";

import { BellRing, Eye, Search } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Find your class",
    description: "Search by subject or course number. Every section shows live seat counts.",
  },
  {
    icon: Eye,
    title: "Hit “Ping me”",
    description: "Pick the full section you need. We start checking it around the clock.",
  },
  {
    icon: BellRing,
    title: "Get the email",
    description: "The moment a seat frees up, an alert lands in your USM inbox. Go register.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 py-24 sm:py-28" aria-labelledby="how-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="eyebrow">How it works</p>
          <h2 id="how-heading" className="mt-4 text-5xl font-bold text-ink sm:text-6xl">
            Three steps, then <span className="text-accent-ink">we keep watch</span>.
          </h2>
        </div>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-3">
          {steps.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex flex-col bg-surface p-7 sm:p-8">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-md bg-ink text-accent">
                    <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="font-display text-5xl font-extrabold leading-none text-line-strong" aria-hidden>
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-bold text-ink">
                  <span className="sr-only">Step {i + 1}: </span>
                  {item.title}
                </h3>
                <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted">
                  {item.description}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
