"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { Plus } from "lucide-react";

const faqs = [
  {
    q: "Do I need to sign in?",
    a: "You can browse and search classes without an account. Watching a class and receiving alerts requires a quick email signup so we know where to send pings.",
  },
  {
    q: "What email do I use?",
    a: "Your USM email, or a Gmail address if you prefer (Gmail often gets our emails faster). We'll send a sign-in link, so there's no password to remember.",
  },
  {
    q: "What data do you store?",
    a: "Only your verified email and the class sections you watch. Seat counts come from USM's public Class Search; we never access your SOAR login. Details are on the Privacy page.",
  },
  {
    q: "Is Ping My Nest only for USM?",
    a: "Yes. Ping My Nest is built specifically for University of Southern Mississippi students and USM course data.",
  },
  {
    q: "Is it free?",
    a: "Yes. Search, watching, and seat alerts are free for USM students.",
  },
  {
    q: "How fast are alerts?",
    a: "We check watched sections continuously and email you as soon as we see a seat open. Timing depends on how many sections are being watched and on registration load.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 py-24 sm:py-28" aria-labelledby="faq-heading">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="eyebrow">FAQ</p>
          <h2
            id="faq-heading"
            className="mt-4 text-5xl font-bold text-ink sm:text-6xl"
          >
            Questions, answered.
          </h2>
          <p className="mt-4 max-w-sm text-lg leading-relaxed text-muted">
            Anything else? Open an issue on{" "}
            <a
              href="https://github.com/oscusm/PingMyNest"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent"
            >
              GitHub
            </a>
            .
          </p>
        </div>

        <div>
          <Accordion.Root type="single" collapsible defaultValue="0" className="border-t border-line">
            {faqs.map((item, i) => (
              <Accordion.Item key={item.q} value={String(i)} className="border-b border-line">
                <Accordion.Header>
                  <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left text-[17px] font-semibold text-ink">
                    {item.q}
                    <Plus
                      className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-45 group-data-[state=open]:text-accent-ink"
                      aria-hidden
                    />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=closed]:animate-[collapse_200ms_ease-out] data-[state=open]:animate-[expand_220ms_ease-out]">
                  <p className="max-w-xl pb-6 text-[15px] leading-relaxed text-muted">{item.a}</p>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </div>
      </div>
    </section>
  );
}
