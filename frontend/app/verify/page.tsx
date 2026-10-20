"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { api, ApiError, type VerifyResponse } from "@/lib/api";

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
  // a missing token is known on the first render, so it's initial state, not an effect
  const [status, setStatus] = useState<"working" | "ok" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState(
    token
      ? "Hang tight, confirming your USM email…"
      : "This sign-in link is incomplete. Open the link from your email again.",
  );

  useEffect(() => {
    if (!token) return;
    let alive = true;

    (async () => {
      try {
        await verifyOnce(token);
        if (!alive) return;
        setStatus("ok");
        setMessage("Email verified. Redirecting…");
        router.replace("/search");
      } catch (err) {
        if (!alive) return;

        // a reused link from someone who is already signed in (e.g. a second click)
        const signedIn = await api.me().then(() => true, () => false);
        if (!alive) return;
        if (signedIn) {
          setStatus("ok");
          setMessage("You're already signed in. Redirecting…");
          router.replace("/search");
          return;
        }

        const msg =
          err instanceof ApiError ? err.message : "Verification failed";
        const alreadyUsed = /already used/i.test(msg);
        const banned = /banned|rate limit/i.test(msg);

        setStatus("error");
        if (alreadyUsed) {
          setMessage("This link was already used. Request a new sign-in link.");
        } else if (banned) {
          setMessage("Too many attempts. Wait a few minutes, then request a new sign-in link.");
        } else if (/invalid|expired/i.test(msg)) {
          setMessage("This sign-in link is invalid or has expired. Links last 1 hour, so request a new one.");
        } else {
          setMessage("We couldn't sign you in right now. Request a new sign-in link and try again.");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [token, router]);

  return (
    <AuthShell>
      <div className="text-center">
        <span
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-md ${
            status === "ok"
              ? "bg-open-soft text-open"
              : status === "error"
                ? "bg-full-soft text-full"
                : "bg-accent-soft text-accent-ink"
          }`}
        >
          {status === "ok" ? (
            <Check className="h-6 w-6" aria-hidden />
          ) : status === "error" ? (
            <TriangleAlert className="h-6 w-6" aria-hidden />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
          )}
        </span>
        <h1 className="mt-5 text-4xl font-bold text-ink">
          {status === "ok"
            ? "You're verified"
            : status === "error"
              ? "Couldn't verify"
              : "Verifying your email"}
        </h1>

        <p
          className="mt-2 text-sm leading-relaxed text-muted"
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>

        {status === "error" ? (
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/signup" className="btn btn-accent w-full">
              Request a new link
            </Link>
            <Link href="/search" className="btn btn-ghost w-full">
              Go to search
            </Link>
          </div>
        ) : null}
      </div>
    </AuthShell>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-6">
          <p className="text-muted">Loading…</p>
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
