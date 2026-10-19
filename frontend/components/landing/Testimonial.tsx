"use client";

import Image from "next/image";
import { FadeIn } from "./FadeIn";

export function Testimonial() {
  return (
    <section
      className="relative bg-surface py-20 text-white sm:py-24"
      aria-labelledby="testimonial-heading"
    >
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <FadeIn>
          <figure className="relative overflow-hidden border border-gold/30 bg-ink px-8 py-12 sm:px-14 sm:py-16">
            <div className="absolute right-0 top-0 h-full w-1 bg-gold" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              From the nest
            </p>
            <blockquote
              id="testimonial-heading"
              className="mt-6 max-w-3xl text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl lg:text-4xl"
            >
              &ldquo;I stopped checking SOAR every hour. Ping My Nest emailed me
              within two minutes of a seat opening.&rdquo;
            </blockquote>
            <figcaption className="mt-10 flex items-center gap-4">
              <Image
                src="/images/avatar.png"
                alt="Portrait of a USM Computer Science student"
                width={56}
                height={56}
                className="h-14 w-14 object-cover ring-2 ring-gold"
              />
              <div>
                <p className="text-sm font-semibold text-white">Jordan M.</p>
                <p className="text-sm text-white/55">Computer Science · USM</p>
              </div>
            </figcaption>
          </figure>
        </FadeIn>
      </div>
    </section>
  );
}
