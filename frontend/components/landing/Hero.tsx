"use client";

import Image from "next/image";
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
    <section className="text-ink">
      <div className="relative overflow-hidden bg-accent">
        {/* Same photo twice: its empty sky sits behind the text, then fades into the gate below */}
        <div className="absolute -left-8 -top-8 bottom-0 w-[max(200%,130rem)] [mask-image:linear-gradient(#000_60%,transparent)]">
          <Image
            src="/images/usm-campus.jpg"
            alt=""
            fill
            sizes="max(200vw, 130rem)"
            className="object-cover object-top opacity-60 mix-blend-multiply blur-md grayscale"
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
          <Link
            href={user ? "/search" : "/signup"}
            className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink/80 transition-colors hover:text-ink"
          >
            <span className="font-bold uppercase tracking-wider text-ink">Free</span>
            <span aria-hidden className="text-ink/40">/</span>
            Built by USM students, for Golden Eagles
          </Link>

          <h1 className="mt-6 text-[clamp(3.25rem,7.2vw,6.6rem)] font-extrabold leading-[0.96]">
            Class full? We&apos;ll ping you
            <br className="hidden sm:block" /> the second a seat opens.
          </h1>

          <div className="mt-10 grid items-start gap-8 pb-14 lg:grid-cols-2 lg:gap-16 lg:pb-16">
            <div>
              <form
                onSubmit={submitSearch}
                className="flex items-center gap-2 rounded-md border border-ink/15 bg-surface p-1.5 shadow-[var(--shadow-float)] ring-ink focus-within:ring-2"
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

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-semibold text-ink/75">Popular:</span>
                {chips.map((chip) => (
                  <button key={chip} type="button" onClick={() => goSearch(chip)} className="chip border-ink/20 bg-white/70 text-ink hover:bg-white">
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <p className="max-w-xl text-lg font-medium leading-relaxed text-ink/80 lg:text-xl">
              Get reminded the exact second someone drops a class, so you can grab the
              seat first.
            </p>
          </div>
        </div>

        <div className="relative h-64 sm:h-96 lg:h-[34rem]">
          <Image
            src="/images/usm-campus.jpg"
            alt="The University of Southern Mississippi front gate with the dome behind it"
            fill
            sizes="100vw"
            className="object-cover object-[center_52%] mix-blend-multiply grayscale [mask-image:linear-gradient(transparent,#000_45%)]"
          />
        </div>
      </div>

      <div className="relative mx-auto -mt-16 max-w-6xl px-4 pb-16 sm:-mt-24 sm:px-6 lg:pb-20">
        <FadeIn className="mx-auto max-w-4xl">
          <HeroPreview />
        </FadeIn>
      </div>
    </section>
  );
}
