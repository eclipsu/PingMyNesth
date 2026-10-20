"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Runs `fn` at most once per `intervalMs`. The first call goes through
 * immediately; calls inside the window collapse into one trailing call with
 * the latest arguments, so the last click always wins.
 */
export function useThrottledCallback<A extends unknown[]>(fn: (...args: A) => void, intervalMs: number) {
  const fnRef = useRef(fn);
  const last = useRef(0);
  const timer = useRef<number | null>(null);
  const pendingArgs = useRef<A | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return useCallback(
    (...args: A) => {
      const wait = last.current + intervalMs - Date.now();
      if (wait <= 0) {
        last.current = Date.now();
        fnRef.current(...args);
        return;
      }
      pendingArgs.current = args;
      timer.current ??= window.setTimeout(() => {
        timer.current = null;
        last.current = Date.now();
        if (pendingArgs.current) fnRef.current(...pendingArgs.current);
        pendingArgs.current = null;
      }, wait);
    },
    [intervalMs],
  );
}
