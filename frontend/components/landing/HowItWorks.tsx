"use client";

import { BellRing, Eye, Search } from "lucide-react";
import { FadeIn } from "./FadeIn";

const steps = [
  {
    icon: Search,
    step: "01",
    title: "Search",
    description: "Find your USM course by name, professor, or CRN in seconds.",
  },
  {
    icon: Eye,
    step: "02",
    title: "Watch",
    description: "We'll monitor every section 24/7 while you focus elsewhere.",
  },
  {
    icon: BellRing,
    step: "03",
    title: "Get Pinged",
    description: "Receive an email the moment a seat opens in your nest.",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="section-paper relative scroll-mt-24 overflow-hidden py-20 sm:py-24"
      aria-labelledby="how-heading"
    >
      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8">
        <FadeIn>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">
            How it Works
          </p>
          <h2
            id="how-heading"
            className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
          >
            Three steps. Then we keep watch.
          </h2>
        </FadeIn>

        <FadeIn className="mt-12" delay={0.08}>
          <ol className="grid gap-3 lg:grid-cols-3">
            {steps.map((item) => {
              const Icon = item.icon;
              return (
                <li
                  key={item.title}
                  className="flex h-full flex-col border border-black/10 bg-white p-7"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-12 w-12 items-center justify-center bg-ink text-gold">
                      <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="text-sm font-bold tracking-[0.18em] text-gold-deep">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mt-6 text-2xl font-semibold tracking-tight text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-ink/65">
                    {item.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </FadeIn>
      </div>
    </section>
  );
}
