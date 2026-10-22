"use client";

import { useEffect, useState } from "react";
import { api, type PulseResponse } from "@/lib/api";

/**
 * Live /pulse data, refetched every `everyMs` while `enabled` (the section is
 * on screen) and the tab is visible. Keeps the last good answer if a refetch
 * fails, and reports the failure so the UI can say the data is stale.
 */
export function usePulse(enabled: boolean, everyMs = 10_000) {
  const [pulse, setPulse] = useState<PulseResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    let inflight = false;

    const load = async () => {
      inflight = true;
      if (document.visibilityState === "visible") {
        controller = new AbortController();
        try {
          const next = await api.pulse(controller.signal);
          if (!cancelled) {
            setPulse(next);
            setFailed(false);
          }
        } catch (err) {
          if (!cancelled && !(err instanceof DOMException && err.name === "AbortError")) setFailed(true);
        }
      }
      inflight = false;
      if (!cancelled) timer = setTimeout(load, everyMs);
    };
    void load();

    // come back to a stale tab → refresh right away
    const onVisible = () => {
      if (document.visibilityState !== "visible" || inflight) return;
      clearTimeout(timer);
      void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, everyMs]);

  return { pulse, failed };
}

/** Re-renders every `everyMs` so "12s ago" labels and countdowns tick. */
export function useNow(everyMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return now;
}
