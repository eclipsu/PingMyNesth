"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FadeIn } from "./FadeIn";
import { HeroPreview } from "./HeroPreview";
import { CourseCombobox } from "@/components/search/CourseCombobox";
import { usePingApi } from "@/hooks/usePingApi";

const chips = ["MAT 101", "CSC 101", "ENG 101", "BSC 110", "PSY 110"] as const;

export function Hero() {
  const router = useRouter();
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
    <section className="brushed-gold text-ink">
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <Link
            href={user ? "/search" : "/signup"}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink/80 transition-colors hover:text-ink"
          >
            <span className="font-bold uppercase tracking-wider text-ink">Free</span>
            <span aria-hidden className="text-ink/40">/</span>
            Built by USM students, for Golden Eagles
          </Link>

          <h1 className="mt-8 text-[clamp(3.25rem,9vw,6.75rem)] font-extrabold leading-[0.92]">
            Class full? We&apos;ll <span className="underline decoration-ink decoration-[0.12em] underline-offset-[0.1em]">ping you</span>
            <br className="hidden sm:block" /> the second a seat opens.
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-lg font-medium leading-relaxed text-ink/80">
            Watch any section at Southern Miss and get an email the moment someone
            drops. No more refreshing SOAR at 2&nbsp;a.m.
          </p>

          <form
            onSubmit={submitSearch}
            className="mx-auto mt-9 flex max-w-xl items-center gap-2 rounded-md border border-ink/15 bg-surface p-1.5 shadow-[var(--shadow-float)] ring-ink focus-within:ring-2"
            role="search"
          >
            <Search className="ml-2.5 h-5 w-5 shrink-0 text-muted" aria-hidden />
            <label htmlFor="hero-search" className="sr-only">
              Search classes
            </label>
            <CourseCombobox
              id="hero-search"
              value={query}
              onChange={setQuery}
              onPick={(s) => goSearch(s.query)}
              placeholder="Calculus I, calc, or MAT 101"
              className="min-w-0 flex-1"
              inputClassName="h-11 w-full bg-transparent px-1 text-base text-ink outline-none placeholder:text-[#8b8b95]"
            />
            <button type="submit" className="btn btn-primary">
              Find seats
            </button>
          </form>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <span className="mr-1 text-sm font-semibold text-ink/75">Popular:</span>
            {chips.map((chip) => (
              <button key={chip} type="button" onClick={() => goSearch(chip)} className="chip border-ink/20 bg-white/70 text-ink hover:bg-white">
                {chip}
              </button>
            ))}
          </div>
        </div>

        <FadeIn className="mx-auto mt-16 max-w-4xl sm:mt-20">
          <HeroPreview />
        </FadeIn>
      </div>
    </section>
  );
}
