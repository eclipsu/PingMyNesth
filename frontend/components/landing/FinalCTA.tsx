"use client";

import Image from "next/image";
import Link from "next/link";
import { FadeIn } from "./FadeIn";
import { usePingApi } from "@/hooks/usePingApi";

export function FinalCTA() {
  const { user } = usePingApi();

  return (
    <section
      className="relative overflow-hidden bg-ink py-24 sm:py-28"
      aria-labelledby="cta-heading"
    >
      <Image
        src="/images/usm-campus.jpg"
        alt=""
        fill
        className="object-cover object-center opacity-30"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/80" />

      <div className="relative mx-auto max-w-[1280px] px-5 text-center sm:px-8">
        <FadeIn>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Golden Eagles
          </p>
          <h2
            id="cta-heading"
            className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl"
          >
            Ready to build your nest?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            Start watching the classes you need. We&apos;ll ping you the moment a
            seat opens — so you can get back to campus life.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {user ? (
              <Link href="/search" className="btn btn-gold">
                Browse Classes
              </Link>
            ) : (
              <>
                <Link href="/signup" className="btn btn-gold">
                  Start Watching Classes
                </Link>
                <Link href="/search" className="btn btn-ghost">
                  Browse Courses
                </Link>
              </>
            )}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
