"use client";

import { FormEvent, useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { usePingApi } from "@/hooks/usePingApi";

// Mirrors isUSMEmail in cmd/api/handlers_signup.go
const USM_EMAIL = /^[a-z0-9._-]+@usm\.edu$/i;

export default function SignupPage() {
  const { signup, busy, error, clearError } = usePingApi();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!USM_EMAIL.test(email.trim())) {
      setEmailError("Use your @usm.edu email.");
      return;
    }
    setEmailError(null);
    try {
      await signup(email);
      setSent(true);
    } catch {
      /* error surfaced on hook */
    }
  };

  return (
    <AuthShell>
      {sent ? (
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-open-soft text-open">
            <MailCheck className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-5 text-4xl font-bold text-ink">Check your inbox</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Open
            it on this device to start watching classes.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="btn btn-ghost btn-sm mt-5"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <>
          <h1 className="text-4xl font-bold text-ink">Sign in</h1>

          <form className="mt-7 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Email</span>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoFocus
                autoComplete="email"
                placeholder="you@usm.edu"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                aria-invalid={emailError ? true : undefined}
                aria-describedby={emailError ? "email-error" : undefined}
                className="input"
              />
              {emailError ? (
                <span id="email-error" className="mt-2 block text-sm text-full">
                  {emailError}
                </span>
              ) : null}
            </label>
            {error ? (
              <p className="rounded-lg bg-full-soft px-3 py-2 text-sm text-full" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={busy} className="btn btn-accent w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
