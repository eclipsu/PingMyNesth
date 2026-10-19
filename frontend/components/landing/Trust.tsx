"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { FadeIn } from "./FadeIn";

type Stat = {
  label: string;
  value: number;
  suffix: string;
  prefix?: string;
};

const stats: Stat[] = [
  { label: "Courses Tracked", value: 1200, suffix: "+" },
  { label: "Seat Alerts Sent", value: 8400, suffix: "+" },
  { label: "Students Watching", value: 650, suffix: "+" },
  { label: "Average Alert Time", value: 2, suffix: " min", prefix: "<" },
];

function AnimatedNumber({
  value,
  suffix,
  prefix = "",
}: {
  value: number;
  suffix: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }

    const duration = 1200;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduce, value]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

export function Trust() {
  return (
    <section className="section-paper relative py-20 sm:py-24" aria-labelledby="trust-heading">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <FadeIn>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">
            Across campus
          </p>
          <h2
            id="trust-heading"
            className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
          >
            Trusted by students across USM.
          </h2>
        </FadeIn>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.06}>
              <article
                className={`border border-black/10 p-6 transition-transform duration-300 hover:-translate-y-1 ${
                  i % 2 === 0 ? "bg-ink text-white" : "bg-gold text-ink"
                }`}
              >
                <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  <AnimatedNumber
                    value={stat.value}
                    suffix={stat.suffix}
                    prefix={stat.prefix}
                  />
                </p>
                <p
                  className={`mt-2 text-sm font-medium ${
                    i % 2 === 0 ? "text-white/60" : "text-ink/70"
                  }`}
                >
                  {stat.label}
                </p>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
