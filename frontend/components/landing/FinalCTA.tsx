"use client";

import Link from "next/link";
import { BrandLogo } from "./BrandLogo";
import { usePingApi } from "@/hooks/usePingApi";

export function FinalCTA() {
  const { user } = usePingApi();

  return (
    <section className="px-4 pb-24 sm:px-6 sm:pb-28" aria-labelledby="cta-heading">
      <div className="mx-auto max-w-6xl rounded-lg bg-accent px-6 py-16 text-center text-ink sm:px-12 sm:py-20">
        <div>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-md bg-white">
            <BrandLogo className="h-11 w-11" title="" />
          </span>
          <h2
            id="cta-heading"
            className="mx-auto mt-8 max-w-3xl text-5xl font-extrabold sm:text-7xl"
          >
            Registration is stressful.{" "}
            <span className="underline decoration-[0.08em] underline-offset-[0.12em]">Waiting</span>{" "}
            doesn&apos;t have to be.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg font-medium leading-relaxed text-ink/80">
            Start watching the classes you need. We&apos;ll ping you the moment a seat opens.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href={user ? "/search" : "/signup"} className="btn btn-primary h-12 px-6">
              {user ? "Search classes" : "Start watching (it's free)"}
            </Link>
            {!user ? (
              <Link
                href="/search"
                className="btn h-12 border-2 border-ink px-6 text-ink hover:bg-ink hover:text-accent"
              >
                Browse classes
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
