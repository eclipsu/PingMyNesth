"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

type Props = {
  courseCode: string;
  onDone: () => void;
};

export function WatchSuccessModal({ courseCode, onDone }: Props) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watch-success-title"
      onClick={onDone}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-gold/25 bg-surface p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 bg-gold/15">
          <Check className="h-4 w-4 text-gold" strokeWidth={2.5} aria-hidden />
        </div>

        <h2 id="watch-success-title" className="mt-4 text-lg font-semibold tracking-tight">
          Watching {courseCode}
        </h2>
        <p className="mt-1.5 text-sm text-white/55">
          We&apos;ll email you when a seat opens.
        </p>

        <button type="button" onClick={onDone} className="btn btn-gold mt-6 w-full !rounded-xl">
          Done
        </button>
      </div>
    </div>
  );
}
