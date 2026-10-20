"use client";

import { FormEvent, useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/AuthShell";
import { usePingApi } from "@/hooks/usePingApi";
import { ApiError } from "@/lib/api";

// Mirrors isAllowedEmail in cmd/api/handlers_signup.go (USM, plus Gmail for now)
const ALLOWED_EMAIL = /^[a-z0-9._+-]+@(usm\.edu|gmail\.com)$/i;

// Mirrors cmd/api/signup_guard.go: 30s between emails, 3 resends, then the
// server locks sign-in emails for this IP for 30 minutes.
const RESEND_COOLDOWN = 30;
const MAX_RESENDS = 3;

/** Seconds to wait from a refused send (the API sends retry_after). */
function retryAfter(err: unknown): number | null {
  if (!(err instanceof ApiError) || (err.status !== 429 && err.status !== 403)) return null;
  const body = err.body as { retry_after?: unknown } | null;
  return typeof body?.retry_after === "number" ? body.retry_after : RESEND_COOLDOWN;
}

function clock(secs: number) {
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, "0");
  return m ? `${m}:${s}` : `${secs}s`;
}

export default function SignupPage() {
  const { signup, busy, error, clearError } = usePingApi();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendsLeft, setResendsLeft] = useState(MAX_RESENDS);
  const [locked, setLocked] = useState(false); // the server banned this IP for a while
  const [resendNote, setResendNote] = useState<string | null>(null);

  // tick the countdown once a second while it's running
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  // a refused send: show the server's wait, and remember a ban
  const handleRefusal = (err: unknown) => {
    const wait = retryAfter(err);
    if (wait == null) return false;
    setCooldown(wait);
    setLocked(err instanceof ApiError && err.status === 403);
    return true;
  };

  const resend = async () => {
    clearError();
    setResendNote(null);
    try {
      await signup(email);
      setResendsLeft((n) => n - 1);
      setCooldown(RESEND_COOLDOWN);
      setResendNote("Sent again. It can take a minute to arrive.");
    } catch (err) {
      handleRefusal(err);
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();
    if (!ALLOWED_EMAIL.test(email.trim())) {
      setEmailError("Use your @usm.edu or @gmail.com email.");
      return;
    }
    setEmailError(null);
    try {
      await signup(email);
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
      setResendsLeft(MAX_RESENDS);
      setResendNote(null);
    } catch (err) {
      handleRefusal(err); /* message surfaced on the hook */
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
          <p className="mt-5 border-l-4 border-accent pl-4 text-left text-sm leading-relaxed text-ink-2">
            Don&apos;t see it? <strong>Check your Junk or Spam folder.</strong> USM&apos;s mail
            filter can be strict with new senders. Mark it &quot;Not junk&quot; so seat alerts
            land in your inbox too.
          </p>

          <div className="mt-6" aria-live="polite">
            {locked ? (
              <p className="text-sm text-full">
                Too many sign-in emails. Try again in {clock(cooldown)}.
              </p>
            ) : resendsLeft > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => void resend()}
                  disabled={busy || cooldown > 0}
                  className="btn btn-secondary w-full"
                >
                  {busy ? "Sending…" : cooldown > 0 ? `Resend link in ${clock(cooldown)}` : "Resend link"}
                </button>
                <p className="mt-2 text-xs text-muted">
                  {resendNote ?? `${resendsLeft} resend${resendsLeft === 1 ? "" : "s"} left.`}
                  {resendNote ? ` ${resendsLeft} left.` : ""}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-2">
                No resends left. Wait 30 minutes before requesting another link.
              </p>
            )}
            {error && !locked ? <p className="mt-2 text-sm text-full" role="alert">{error}</p> : null}
          </div>

          <button
            type="button"
            onClick={() => {
              setSent(false);
              clearError();
            }}
            className="btn btn-ghost btn-sm mt-4"
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
                placeholder="you@usm.edu or you@gmail.com"
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
                {cooldown > 0
                  ? locked
                    ? `Too many sign-in emails. Try again in ${clock(cooldown)}.`
                    : `Wait ${clock(cooldown)} before requesting another link.`
                  : error}
              </p>
            ) : null}
            <button type="submit" disabled={busy || (locked && cooldown > 0)} className="btn btn-accent w-full">
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
