"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  api,
  ApiError,
  getApiConfig,
  parseCourseQuery,
  type ClassSection,
  type MeResponse,
  type SearchParams,
  type SearchResponse,
  type WatchItem,
} from "@/lib/api";

/**
 * One hook for the whole Ping My Nest API.
 *
 * @example
 * const pmn = usePingApi();
 * await pmn.signup("you@usm.edu");
 * const results = await pmn.search({ subject: "MAT", catalog_nbr: "101" });
 * await pmn.watch(4257);
 * await pmn.listWatches();
 */
export function usePingApi() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<MeResponse | null>(null);
  const [watches, setWatches] = useState<WatchItem[] | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const inflight = useRef(0);

  const clearError = useCallback(() => setError(null), []);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    inflight.current += 1;
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(toMessage(err));
      throw err;
    } finally {
      inflight.current = Math.max(0, inflight.current - 1);
      if (inflight.current === 0) setBusy(false);
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
      return me;
    } catch (err) {
      setUser(null);
      if (err instanceof ApiError && err.isUnauthorized) return null;
      throw err;
    }
  }, []);

  useEffect(() => {
    // sessions moved to httpOnly cookies; don't leave the old token readable
    try {
      window.localStorage.removeItem("pmn_session");
      window.sessionStorage.removeItem("pmn_session");
    } catch {
      /* storage blocked */
    }
    let cancelled = false;
    (async () => {
      try {
        await refreshSession();
      } catch {
        /* API down — leave logged out */
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession]);

  const health = useCallback(() => run(() => api.health()), [run]);

  const signup = useCallback(
    (email: string) => run(() => api.signup(email)),
    [run],
  );

  const verify = useCallback(
    (token: string) =>
      run(async () => {
        const res = await api.verify(token);
        await refreshSession();
        return res;
      }),
    [run, refreshSession],
  );

  const search = useCallback(
    (params: SearchParams) => run(() => api.search(params)),
    [run],
  );

  /** "MAT 101" / "CSC111" / "ENG" into search params */
  const searchQuery = useCallback(
    async (raw: string): Promise<SearchResponse> => {
      const parsed = parseCourseQuery(raw);
      if (!parsed) {
        const err = new ApiError(400, "Enter a subject like MAT or MAT 101");
        setError(err.message);
        throw err;
      }
      return search(parsed);
    },
    [search],
  );

  const watch = useCallback(
    (classNbr: number) => run(() => api.watch({ class_nbr: classNbr })),
    [run],
  );

  const listWatches = useCallback(
    () =>
      run(async () => {
        const list = await api.watches();
        setWatches(list);
        return list;
      }),
    [run],
  );

  const deleteWatch = useCallback(
    (classNbr: number) =>
      run(async () => {
        await api.deleteWatch(classNbr);
        setWatches((prev) =>
          prev ? prev.filter((w) => w.class_nbr !== classNbr) : prev,
        );
      }),
    [run],
  );

  const logout = useCallback(
    () =>
      run(async () => {
        await api.logout();
        setUser(null);
        setWatches(null);
      }),
    [run],
  );

  const me = useCallback(
    () =>
      run(async () => {
        const profile = await refreshSession();
        return profile;
      }),
    [run, refreshSession],
  );

  return {
    config: getApiConfig(),
    sessionChecked,
    user,
    isAuthenticated: Boolean(user),
    watches,
    busy,
    error,
    clearError,
    health,
    signup,
    verify,
    search,
    searchQuery,
    watch,
    me,
    refreshSession,
    listWatches,
    deleteWatch,
    logout,
    parseCourseQuery,
  };
}

function toMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export type UsePingApi = ReturnType<typeof usePingApi>;
export type { ClassSection, MeResponse, SearchParams, WatchItem };
