"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, BellOff, Search as SearchIcon, Trash2 } from "lucide-react";
import { BrandLogo } from "@/components/landing/BrandLogo";
import { usePingApi, type WatchItem } from "@/hooks/usePingApi";

function statusChip(w: WatchItem) {
  if (!w.active) {
    return { label: "Notified", className: "border-white/20 bg-white/5 text-white/55" };
  }
  if (w.enrollment_available > 0) {
    return { label: "Open now", className: "border-success/35 bg-success/20 text-success" };
  }
  return { label: "Watching", className: "border-gold/45 bg-gold/15 text-gold" };
}

export default function WatchesPage() {
  const router = useRouter();
  const { sessionChecked, user, watches, listWatches, deleteWatch, watch, logout, error, clearError } =
    usePingApi();
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!user) {
      router.replace("/signup");
      return;
    }
    void listWatches().catch(() => {
      /* error surfaced on hook */
    });
  }, [sessionChecked, user, listWatches, router]);

  const onRemove = async (classNbr: number) => {
    clearError();
    setPending(classNbr);
    try {
      await deleteWatch(classNbr);
    } catch {
      /* error surfaced on hook */
    } finally {
      setPending(null);
    }
  };

  // watches go inactive after the alert email; this turns one back on
  const onRewatch = async (classNbr: number) => {
    clearError();
    setPending(classNbr);
    try {
      await watch(classNbr);
      await listWatches();
    } catch {
      /* error surfaced on hook */
    } finally {
      setPending(null);
    }
  };

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace("/");
    }
  };

  const loading = !sessionChecked || (user && watches === null);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gold/20 via-gold/5 to-transparent" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" title="Ping My Nest" />
            <span className="text-sm font-semibold">Ping My Nest</span>
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => void onLogout()}
              className="text-xs font-semibold text-white/55 hover:text-gold"
            >
              Sign out
            </button>
          ) : null}
        </div>
      </header>

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">My watches</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Classes we&apos;re watching for you
            </h1>
            {user ? (
              <p className="mt-1.5 text-sm text-white/55">
                Alerts go to <span className="font-medium text-gold">{user.email}</span>
              </p>
            ) : null}
          </div>
          <Link href="/search" className="btn btn-gold !rounded-xl !py-2.5 !px-4 text-sm">
            <SearchIcon className="mr-1.5 h-4 w-4" aria-hidden />
            Add a class
          </Link>
        </div>

        {error ? (
          <p className="mt-6 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="mt-10 text-sm text-white/55">Loading your watches…</p>
        ) : watches && watches.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-surface p-8 text-center">
            <Bell className="mx-auto h-6 w-6 text-gold" aria-hidden />
            <p className="mt-3 font-semibold">No watches yet</p>
            <p className="mt-1 text-sm text-white/55">
              Search for a full class and hit Ping Me. We&apos;ll email you when a seat opens.
            </p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {watches?.map((w) => {
              const chip = statusChip(w);
              const busy = pending === w.class_nbr;
              return (
                <li
                  key={w.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">
                        {w.subject} {w.catalog_nbr}-{w.class_section}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${chip.className}`}
                      >
                        {chip.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-white/55">{w.descr}</p>
                    <p className="mt-0.5 text-xs text-white/40">CRN {w.class_nbr}</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {!w.active ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onRewatch(w.class_nbr)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-gold hover:bg-gold hover:text-ink disabled:opacity-50"
                      >
                        <Bell className="h-3.5 w-3.5" aria-hidden />
                        Watch again
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void onRemove(w.class_nbr)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white/70 hover:border-danger/50 hover:text-danger disabled:opacity-50"
                      aria-label={`Stop watching ${w.subject} ${w.catalog_nbr}-${w.class_section}`}
                    >
                      {w.active ? (
                        <BellOff className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      )}
                      {w.active ? "Stop" : "Remove"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
