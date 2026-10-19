"use client";

import { FadeIn } from "./FadeIn";
import { DashboardMock } from "./DashboardMock";

export function ProductPreview() {
  return (
    <section
      className="relative overflow-hidden bg-ink py-20 text-white sm:py-24"
      aria-labelledby="preview-heading"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-white/10" />
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <FadeIn>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Product Preview
          </p>
          <h2
            id="preview-heading"
            className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl"
          >
            Your nest, at a glance.
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/60 sm:text-[1.05rem]">
            Watch USM classes, read alerts, and jump into registration when a
            seat opens.
          </p>
        </FadeIn>

        <FadeIn className="relative mt-12" delay={0.1}>
          <div className="mx-auto max-w-5xl overflow-hidden border border-white/10 bg-black">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-gold" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#28C840]" />
              <div className="ml-3 flex-1 bg-white/5 px-4 py-1.5 text-center text-[11px] text-white/45">
                pingmynest · search
              </div>
            </div>
            <div className="h-[420px] bg-ink sm:h-[480px]">
              <DashboardMock />
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
