"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { BrandLogo } from "./BrandLogo";
import { DashboardMock } from "./DashboardMock";
import { usePingApi } from "@/hooks/usePingApi";

const chips = ["MAT", "MAT 101", "CSC 111", "ENG 101", "BSC 110"] as const;

export function Hero() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { user } = usePingApi();
  const [query, setQuery] = useState("");

  const goSearch = (raw: string) => {
    const q = raw.trim();
    if (q) sessionStorage.setItem("pmn_pending_search", q);
    router.push("/search");
  };

  const submitSearch = (e?: FormEvent) => {
    e?.preventDefault();
    goSearch(query);
  };

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/images/usm-campus.jpg"
          alt="University of Southern Mississippi campus"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/45" />
      </div>

      <div className="relative mx-auto grid max-w-[1280px] items-center gap-12 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-20 lg:pt-32">
        <div>
          <BrandLogo className="h-12 w-12" title="Ping My Nest" priority />

          <motion.p
            className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-gold"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Never miss an open class
          </motion.p>

          <motion.h1
            className="mt-3 max-w-xl text-[clamp(2.8rem,6.5vw,4.75rem)] font-semibold leading-[0.98] tracking-tight text-white"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
          >
            Find your next class.
            <br />
            We&apos;ll keep <span className="text-gold">watch</span>.
          </motion.h1>

          <motion.p
            className="mt-5 max-w-lg text-base leading-relaxed text-white/65 sm:text-lg"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            Ping My Nest monitors course availability and emails you the moment a
            seat opens. No more refreshing SOAR every hour.
          </motion.p>

          <motion.form
            onSubmit={submitSearch}
            className="mt-8 flex w-full max-w-xl items-stretch border border-white/15 bg-black/70 p-1.5"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            role="search"
          >
            <Search className="ml-3 mt-3.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
            <label htmlFor="hero-search" className="sr-only">
              Search classes
            </label>
            <input
              id="hero-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. MAT 101 or CSC 111"
              className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/40 sm:text-base"
            />
            <button type="submit" className="btn btn-gold !rounded-lg shrink-0" aria-label="Search">
              Search
            </button>
          </motion.form>

          <motion.div
            className="mt-4 flex flex-wrap gap-2"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => goSearch(chip)}
                className="border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white/75 hover:border-gold hover:text-gold"
              >
                {chip}
              </button>
            ))}
          </motion.div>

          <motion.div
            className="mt-8 flex flex-wrap gap-3"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.14 }}
          >
            {user ? (
              <Link href="/search" className="btn btn-gold">
                Browse Classes
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-gold">
                  Start Watching
                </Link>
                <Link href="/search" className="btn btn-ghost">
                  Browse Classes
                </Link>
              </>
            )}
          </motion.div>

          <p className="mt-10 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            The University of Southern Mississippi
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] lg:max-w-none">
          <div className="overflow-hidden border border-white/10 bg-surface shadow-[0_24px_50px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-2 border-b border-white/10 bg-black px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-gold" />
              <span className="h-2.5 w-2.5 rounded-[2px] bg-[#28C840]" />
              <span className="ml-2 text-[11px] text-white/40">pingmynest · search</span>
            </div>
            <div className="h-[300px] bg-ink sm:h-[340px] lg:h-[360px]">
              <DashboardMock compact />
            </div>
          </div>
        </div>
      </div>

      <div className="relative border-y border-black/10 bg-gold">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <p className="text-sm font-bold text-ink">
            Registration week is here — start watching the classes you need.
          </p>
          <Link href="/search" className="text-sm font-bold text-ink underline-offset-4 hover:underline">
            Browse open seats
          </Link>
        </div>
      </div>
    </section>
  );
}
