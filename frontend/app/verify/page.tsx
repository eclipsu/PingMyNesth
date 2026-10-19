"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BrandLogo } from "@/components/landing/BrandLogo";
import {
  api,
  ApiError,
  getSessionToken,
  type VerifyResponse,
} from "@/lib/api";

const verifyJobs = new Map<string, Promise<VerifyResponse>>();

function verifyOnce(token: string): Promise<VerifyResponse> {
  const existing = verifyJobs.get(token);
  if (existing) return existing;

  const job = api.verify(token).catch((err) => {
    const msg = err instanceof ApiError ? err.message : "";
    if (!/already used/i.test(msg)) {
      verifyJobs.delete(token);
    }
    throw err;
  });

  verifyJobs.set(token, job);
  return job;
}

function VerifyInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Hang tight — confirming your USM email…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token. Open the link from your email.");
      return;
    }

    if (getSessionToken() && !verifyJobs.has(token)) {
      setStatus("ok");
      setMessage("You're already signed in. Redirecting…");
      router.replace("/search");
      return;
    }

    let alive = true;

    (async () => {
      try {
        const res = await verifyOnce(token);
        if (!alive) return;
        setStatus("ok");
        setMessage(res.message || "Email verified. Redirecting…");
        router.replace("/search");
      } catch (err) {
        if (!alive) return;

        if (getSessionToken()) {
          setStatus("ok");
          setMessage("Email verified. Redirecting…");
          router.replace("/search");
          return;
        }

        const msg =
          err instanceof ApiError ? err.message : "Verification failed";
        const alreadyUsed = /already used/i.test(msg);
        const banned = /banned|rate limit/i.test(msg);

        setStatus("error");
        if (alreadyUsed) {
          setMessage(
            "This link was already used. Request a new magic link from signup.",
          );
        } else if (banned) {
          setMessage(
            "API rate limit hit — restart the API server (clears the ban), then request a new link.",
          );
        } else {
          setMessage(msg);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, router]);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/usm-campus.jpg')] bg-cover bg-center opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />

      <div className="relative w-full max-w-lg border border-white/10 bg-surface p-8 sm:p-10">
        <BrandLogo className="h-12 w-12" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
          {status === "ok"
            ? "You're verified"
            : status === "error"
              ? "Couldn't verify"
              : "Verifying your email"}
        </h1>

        <p
          className={`mt-3 text-sm ${status === "error" ? "text-danger" : "text-white/60"}`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>

        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/signup" className="text-sm font-medium text-white/55 hover:text-gold">
            Request a new link
          </Link>
          <Link href="/search" className="text-sm font-medium text-white/55 hover:text-gold">
            Go to search
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-ink px-6">
          <p className="text-white/55">Loading…</p>
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
