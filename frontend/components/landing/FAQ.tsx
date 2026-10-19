"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FadeIn } from "./FadeIn";

const faqs = [
  {
    q: "Do I need to sign in?",
    a: "You can browse and search classes without an account. Watching a class and receiving alerts requires a quick email signup so we know where to send pings.",
  },
  {
    q: "What email do I use?",
    a: "Use your USM email. We'll send a magic link so you can verify and start watching classes — no password to remember.",
  },
  {
    q: "What data do you store?",
    a: "Only your verified USM email and the class sections you watch. We don't store other personal profile stuff. Seat counts come from USM's public Class Search — we never access your SOAR login. Details are on the Privacy page.",
  },
  {
    q: "Is Ping My Nest only for USM?",
    a: "Yes. Ping My Nest is built specifically for University of Southern Mississippi students and course data from SOAR-style registration.",
  },
  {
    q: "Is it free?",
    a: "Yes. Core search, watching, and seat alerts are free for USM students while we grow the nest.",
  },
  {
    q: "How fast are alerts?",
    a: "Most seat-open alerts land in under two minutes. Timing can vary with registration load, but we watch continuously so you don't have to.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="section-paper relative scroll-mt-24 py-20 sm:py-24"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <FadeIn>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-deep">
              FAQ
            </p>
            <h2
              id="faq-heading"
              className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl"
            >
              Quick answers before you start watching.
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink/65">
              Light on jargon. Built for registration week.
            </p>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="divide-y divide-black/10 border border-black/10 bg-white">
              {faqs.map((item, i) => {
                const isOpen = open === i;
                return (
                  <div key={item.q} className="px-5 sm:px-6">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-4 py-5 text-left"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : i)}
                    >
                      <span className="text-base font-semibold text-ink">
                        {item.q}
                      </span>
                      <ChevronDown
                        className={`h-5 w-5 shrink-0 text-gold-deep transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <p className="pb-5 text-sm leading-relaxed text-ink/65">
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
