import Link from "next/link";
import type { Metadata } from "next";
import { BrandLogo } from "@/components/landing/BrandLogo";

export const metadata: Metadata = {
  title: "Privacy — Ping My Nest",
  description:
    "What Ping My Nest stores, and how we use public USM class search data.",
};

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gold/20 via-gold/5 to-transparent" />

      <header className="relative z-10 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" title="Ping My Nest" />
            <span className="text-sm font-semibold">Ping My Nest</span>
          </Link>
          <Link href="/search" className="text-xs font-semibold text-gold hover:text-gold-soft">
            Search
          </Link>
        </div>
      </header>

      <article className="relative mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">Legal</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Privacy</h1>
        <p className="mt-3 text-sm text-white/55">
          Built for USM students. We keep data collection minimal.
        </p>

        <section className="mt-10 border border-gold/25 bg-surface p-5 sm:p-7">
          <h2 className="text-lg font-semibold tracking-tight">What we store</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            We store your verified USM email and the class sections you choose to
            watch. We don&apos;t store other personal profile data, passwords, or
            browsing history beyond what&apos;s needed to run alerts.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/75">
            <li className="border border-white/10 bg-black/40 px-3 py-2.5">
              Verified USM email (so we can send seat alerts)
            </li>
            <li className="border border-white/10 bg-black/40 px-3 py-2.5">
              Your watches (which sections you asked us to monitor)
            </li>
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Seat counts come from USM&apos;s public Class Search. We use them to
            detect when a watched section opens — we don&apos;t access your SOAR
            login or private student records.
          </p>
        </section>

        <section className="mt-6 border border-white/10 bg-surface p-5 sm:p-7">
          <h2 className="text-lg font-semibold tracking-tight">University guidance</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65">
            Class availability information used by Ping My Nest is publicly
            available. USM Information Security provided the following guidance:
          </p>
          <blockquote className="mt-4 border-l-2 border-gold bg-black/40 px-4 py-3 text-sm leading-relaxed text-white/70">
            <p>
              Since the information involved is publicly available, we do not have
              specific guidance to provide regarding the collection or use of that
              data beyond ensuring that all activity complies with applicable laws,
              policies, terms of use, and university requirements.
            </p>
            <p className="mt-3">
              Information Security does not generally modify, disable, or make
              exceptions to security monitoring or protective controls for
              individual projects. Our security controls and monitoring processes
              remain in place to protect university systems and resources.
            </p>
            <p className="mt-3">
              If you have specific questions regarding university policy,
              acceptable use requirements, or concerns about how your activity may
              interact with university systems, please let us know and we will be
              happy to review those questions and provide any guidance we can.
            </p>
          </blockquote>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            We rate-limit polling and design the service to stay conservative with
            university systems. Open source on{" "}
            <a
              href="https://github.com/oscusm/PingMyNest"
              className="font-semibold text-gold hover:text-gold-soft"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            .
          </p>
        </section>

        <p className="mt-8 text-sm text-white/45">
          Questions? Open an issue on{" "}
          <a
            href="https://github.com/oscusm/PingMyNest"
            className="text-gold hover:text-gold-soft"
            target="_blank"
            rel="noopener noreferrer"
          >
            github.com/oscusm/PingMyNest
          </a>
          .
        </p>
      </article>
    </main>
  );
}
