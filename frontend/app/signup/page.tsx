"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { BrandLogo } from "@/components/landing/BrandLogo";
import { usePingApi } from "@/hooks/usePingApi";

export default function SignupPage() {
  const { signup, busy, error, clearError } = usePingApi();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await signup(email);
      setSent(true);
    } catch {
      /* error surfaced on hook */
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[url('/images/usm-campus.jpg')] bg-cover bg-center opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/90 to-black" />

      <div className="relative w-full max-w-lg border border-white/10 bg-surface p-8 sm:p-10">
        <BrandLogo className="h-12 w-12" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
          Start watching classes
        </h1>
        <p className="mt-3 text-white/60">
          We&apos;ll email you a magic link. No password — just your USM email.
        </p>

        {sent ? (
          <div className="mt-8 border border-success/30 bg-success/10 p-5">
            <p className="text-sm font-semibold text-white">Check your email</p>
            <p className="mt-1 text-sm text-white/65">
              We sent a verification link to{" "}
              <span className="font-medium text-gold">{email}</span>.
            </p>
          </div>
        ) : (
          <form className="mt-8 space-y-3" onSubmit={onSubmit}>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              USM email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@usm.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-white/15 bg-black px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-gold"
            />
            {error ? (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className="btn btn-gold w-full disabled:opacity-60">
              {busy ? "Sending…" : "Continue with USM Email"}
            </button>
          </form>
        )}

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-medium text-white/50 hover:text-gold"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
