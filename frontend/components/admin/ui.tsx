"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";

/**
 * Loads `fn` now, again whenever `deps` change, and every `refreshMs` while the
 * tab is visible. Keeps showing the previous data while reloading.
 */
export function useAdminLoad<T>(fn: (signal: AbortSignal) => Promise<T>, refreshMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });

  // state is only set after the await, so calling this from an effect is fine
  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await fnRef.current(signal ?? new AbortController().signal);
      setData(next);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    if (!refreshMs) return () => controller.abort();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load(controller.signal);
    }, refreshMs);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [load, refreshMs]);

  const reload = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  return { data, setData, error, loading, reload };
}

export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-sans text-sm font-bold normal-case tracking-normal" style={{ fontStretch: "100%" }}>
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Tile({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "good" | "warn" | "bad" }) {
  return (
    <div className="card px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-display text-4xl font-extrabold tabular-nums",
          tone === "good" && "text-open",
          tone === "warn" && "text-low",
          tone === "bad" && "text-full",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-md bg-full-soft px-4 py-3 text-sm text-full" role="alert">
      {message}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-muted">{children}</p>;
}

export function StatusDot({ tone, label }: { tone: "good" | "warn" | "bad" | "idle"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider",
        tone === "good" && "text-open",
        tone === "warn" && "text-low",
        tone === "bad" && "text-full",
        tone === "idle" && "text-muted",
      )}
    >
      <span
        className={cn(
          "h-2 w-2",
          tone === "good" && "bg-open",
          tone === "warn" && "bg-low",
          tone === "bad" && "bg-full",
          tone === "idle" && "bg-muted",
        )}
        aria-hidden
      />
      {label}
    </span>
  );
}

/** A confirm step for destructive actions. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)] outline-none data-[state=open]:animate-[pop-in_180ms_ease-out]">
          <Dialog.Title className="font-sans text-lg font-bold normal-case" style={{ fontStretch: "100%" }}>
            {title}
          </Dialog.Title>
          <Dialog.Description asChild>
            <div className="mt-2 text-sm leading-relaxed text-ink-2">{body}</div>
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-sm bg-full text-white hover:bg-[#991b1b]" onClick={onConfirm} disabled={busy}>
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Right-hand sheet for details (a user's watches and sessions). */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content className="admin-sheet fixed inset-y-0 right-0 z-[81] flex w-full max-w-lg flex-col border-l border-line bg-bg shadow-[var(--shadow-float)] outline-none">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-surface px-6 py-4">
            <Dialog.Title className="min-w-0 truncate font-sans text-base font-bold normal-case" style={{ fontStretch: "100%" }}>
              {title}
            </Dialog.Title>
            <Dialog.Close className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink" aria-label="Close">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Details</Dialog.Description>
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const th = "px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted";
export const td = "px-4 py-3 align-middle";
