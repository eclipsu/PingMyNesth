"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Calendar,
  Clock,
  Filter,
  Search as SearchIcon,
  User,
  Users,
} from "lucide-react";
import { BrandLogo } from "@/components/landing/BrandLogo";
import { SectionDetailModal } from "@/components/search/SectionDetailModal";
import { WatchSuccessModal } from "@/components/search/WatchSuccessModal";
import { usePingApi } from "@/hooks/usePingApi";
import {
  formatDays,
  formatTimeRange,
  instructorLabel,
  parseCourseQuery,
  seatStatus,
  toUsmTime,
  ApiError,
  type ClassSection,
  type SearchParams,
} from "@/lib/api";

const SUGGESTIONS = ["MAT", "MAT 101", "CSC 111", "ENG 101", "BSC 110"] as const;
const PENDING_SEARCH_KEY = "pmn_pending_search";
const DEFAULT_CAMPUS = "HBG";
const TOAST_MS = 3800;

function watchToastMessage(err: unknown): string {
  const msg =
    err instanceof ApiError || err instanceof Error ? err.message : "";
  if (/already exist/i.test(msg)) {
    return "We're already watching this class for you.";
  }
  return msg.trim() || "Couldn't save that watch right now.";
}

const PHYSICAL_CAMPUSES = [
  { value: "HBG", label: "Hattiesburg" },
  { value: "GULF", label: "Gulf Park" },
] as const;

const DAY_OPTIONS = [
  { code: "M", label: "Mon" },
  { code: "T", label: "Tue" },
  { code: "W", label: "Wed" },
  { code: "R", label: "Thu" },
  { code: "F", label: "Fri" },
] as const;

type Filters = {
  query: string;
  instructor_name: string;
  campus: string;
  online: boolean;
  days: string[];
  start_time_ge: string;
};

type Phase = "idle" | "ready" | "empty" | "error";

const EMPTY_FILTERS: Filters = {
  query: "",
  instructor_name: "",
  campus: DEFAULT_CAMPUS,
  online: false,
  days: [],
  start_time_ge: "",
};

function statusStyle(status: ReturnType<typeof seatStatus>) {
  if (status === "OPEN") return "bg-success/20 text-success border-success/35";
  if (status === "1 LEFT") return "bg-gold/20 text-gold border-gold/45";
  return "bg-danger/20 text-danger border-danger/35";
}

function seatAccent(status: ReturnType<typeof seatStatus>) {
  if (status === "OPEN") return "text-success";
  if (status === "1 LEFT") return "text-gold";
  return "text-danger";
}

function seatCaption(status: ReturnType<typeof seatStatus>, avail: number) {
  if (status === "FULL") return "No seats left";
  if (status === "1 LEFT") return "1 seat left";
  return `${avail} seats left`;
}

function campusLabel(f: Filters) {
  const physical =
    PHYSICAL_CAMPUSES.find((c) => c.value === f.campus)?.label ?? "Hattiesburg";
  if (f.online) return `${physical} · Online`;
  return physical;
}

function toParams(f: Filters): SearchParams | null {
  const parsed = parseCourseQuery(f.query);
  if (!parsed?.subject) return null;
  return {
    subject: parsed.subject,
    catalog_nbr: parsed.catalog_nbr,
    instructor_name: f.instructor_name.trim() || undefined,
    campus: f.online ? "ONLINE" : f.campus || undefined,
    days: f.days.length ? f.days.join(",") : undefined,
    start_time_ge: toUsmTime(f.start_time_ge) || f.start_time_ge || undefined,
  };
}

export default function SearchPage() {
  const { search, watch, user, sessionChecked, error, clearError } = usePingApi();
  const bootstrapped = useRef(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showRefine, setShowRefine] = useState(false);
  const [signInFor, setSignInFor] = useState<number | null>(null);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [watching, setWatching] = useState<number | null>(null);
  const [label, setLabel] = useState("");
  const [detail, setDetail] = useState<ClassSection | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [toast]);

  const runSearch = useCallback(
    async (next: Filters, opts?: { scroll?: boolean }) => {
      clearError();
      const payload = toParams(next);
      if (!payload) {
        setPhase("idle");
        return;
      }

      const id = ++reqId.current;
      setLabel([payload.subject, payload.catalog_nbr].filter(Boolean).join(" "));

      try {
        const res = await search(payload);
        if (id !== reqId.current) return;
        const list = res.classes ?? [];
        setClasses(list);
        setPhase(list.length ? "ready" : "empty");
        if (opts?.scroll && resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } catch {
        if (id !== reqId.current) return;
        setPhase("error");
      }
    },
    [clearError, search],
  );

  // One-shot handoff from landing (no URL query params — those remount / flicker)
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    let pending: string | null = null;
    if (typeof window !== "undefined") {
      pending = sessionStorage.getItem(PENDING_SEARCH_KEY);
      if (pending) sessionStorage.removeItem(PENDING_SEARCH_KEY);
      // One-shot from old ?q= links, then scrub the query string so it never sticks
      if (!pending) pending = new URLSearchParams(window.location.search).get("q");
      if (window.location.search) window.history.replaceState(null, "", "/search");
    }
    if (!pending) return;
    const next = { ...EMPTY_FILTERS, query: pending };
    setFilters(next);
    void runSearch(next);
  }, [runSearch]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(filters, { scroll: true });
  };

  const pickSuggestion = (q: string) => {
    const next = { ...filters, query: q };
    setFilters(next);
    void runSearch(next, { scroll: true });
  };

  const toggleDay = (code: string) => {
    setFilters((prev) => ({
      ...prev,
      days: prev.days.includes(code)
        ? prev.days.filter((d) => d !== code)
        : [...prev.days, code],
    }));
  };

  const applyRefine = () => {
    setShowRefine(false);
    void runSearch(filters, { scroll: true });
  };

  const onPing = async (section: ClassSection) => {
    clearError();
    // watches are tied to the signed-in account, so alerts only ever go to a
    // verified inbox
    if (!user) {
      setSignInFor(section.class_nbr);
      setDetail(section);
      return;
    }
    setWatching(section.class_nbr);
    try {
      await watch(section.class_nbr);
      setSignInFor(null);
      setDetail(null);
      setSuccessCode(`${section.subject}${section.catalog_nbr}`);
    } catch (err) {
      clearError();
      setToast(watchToastMessage(err));
    } finally {
      setWatching(null);
    }
  };

  const activeRefine = useMemo(() => {
    let n = 0;
    if (filters.instructor_name) n += 1;
    if (filters.online || filters.campus !== DEFAULT_CAMPUS) n += 1;
    if (filters.days.length) n += 1;
    if (filters.start_time_ge) n += 1;
    return n;
  }, [filters]);

  const resetRefine = () => {
    setFilters((f) => ({
      ...f,
      instructor_name: "",
      campus: DEFAULT_CAMPUS,
      online: false,
      days: [],
      start_time_ge: "",
    }));
  };

  const parsedHint = parseCourseQuery(filters.query);

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-gold/20 via-gold/5 to-transparent" />
      <div className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <BrandLogo className="h-8 w-8" title="Ping My Nest" />
            <span className="text-sm font-semibold">Ping My Nest</span>
          </Link>
          {sessionChecked ? (
            <Link href={user ? "/watches" : "/signup"} className="text-xs font-semibold text-gold hover:text-gold-soft">
              {user ? "My watches" : "Sign in"}
            </Link>
          ) : null}
        </div>
      </header>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="mx-auto max-w-3xl rounded-2xl border border-gold/25 bg-surface p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
            Step 1 · Find a class
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            What class do you need a seat in?
          </h1>
          <p className="mt-1.5 text-sm text-white/55">
            Type a subject like <span className="font-semibold text-gold">MAT</span> or a course like{" "}
            <span className="font-semibold text-gold">CSC 111</span>.
          </p>

          <form onSubmit={onSubmit} className="mt-5" role="search">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex min-h-[52px] flex-1 items-center rounded-xl border border-white/15 bg-black focus-within:border-gold">
                <SearchIcon className="ml-3 h-5 w-5 shrink-0 text-gold" aria-hidden />
                <input
                  value={filters.query}
                  onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                  placeholder="e.g. MAT 101"
                  autoFocus
                  className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-white outline-none placeholder:text-white/35"
                  aria-label="Course search"
                />
                {filters.query ? (
                  <button
                    type="button"
                    className="mr-2 px-2 py-1 text-xs font-semibold text-white/45 hover:text-white"
                    onClick={() => setFilters((f) => ({ ...f, query: "" }))}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={!filters.query.trim()}
                className="btn btn-gold min-h-[52px] min-w-[120px] !rounded-xl disabled:opacity-50"
              >
                Search
              </button>
            </div>

            {filters.query && !parsedHint ? (
              <p className="mt-2 text-xs text-danger" role="status">
                Use a subject code (MAT) or course (MAT 101).
              </p>
            ) : parsedHint ? (
              <p className="mt-2 text-xs text-white/45" role="status">
                Searching{" "}
                <span className="font-semibold text-gold">
                  {parsedHint.subject}
                  {parsedHint.catalog_nbr ? ` ${parsedHint.catalog_nbr}` : " (all numbers)"}
                </span>
              </p>
            ) : null}
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickSuggestion(s)}
                className="rounded-lg border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-gold hover:bg-gold/15 hover:text-gold"
              >
                {s}
              </button>
            ))}
          </div>

          {phase !== "idle" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/40">
                Step 2 · Refine
              </p>
              <button
                type="button"
                onClick={() => setShowRefine((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/80 hover:border-gold hover:text-gold"
              >
                <Filter className="h-3.5 w-3.5" aria-hidden />
                {showRefine ? "Hide filters" : "Filters"}
                {activeRefine > 0 ? (
                  <span className="rounded-md bg-gold px-1.5 py-0.5 text-[10px] font-bold text-ink">
                    {activeRefine}
                  </span>
                ) : null}
              </button>
              <span className="text-xs text-white/40">Campus · {campusLabel(filters)}</span>
            </div>
          ) : null}

          {showRefine ? (
            <div className="mt-4 rounded-xl border border-gold/20 bg-black/60 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">Filters</p>
                <button
                  type="button"
                  onClick={resetRefine}
                  className="text-xs font-semibold text-gold hover:text-gold-soft"
                >
                  Reset
                </button>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Campus
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {PHYSICAL_CAMPUSES.map((c) => {
                    const on = filters.campus === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setFilters((f) => ({ ...f, campus: c.value }))}
                        className={`rounded-lg px-2 py-2.5 text-center text-xs font-semibold transition-colors ${
                          on
                            ? "bg-gold text-ink"
                            : "border border-white/15 bg-ink text-white/65 hover:border-gold/50 hover:text-white"
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={filters.online}
                    onClick={() => setFilters((f) => ({ ...f, online: !f.online }))}
                    className={`rounded-lg px-2 py-2.5 text-center text-xs font-semibold transition-colors ${
                      filters.online
                        ? "bg-gold text-ink"
                        : "border border-white/15 bg-ink text-white/65 hover:border-gold/50 hover:text-white"
                    }`}
                  >
                    Online
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  Days
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {DAY_OPTIONS.map((d) => {
                    const on = filters.days.includes(d.code);
                    return (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => toggleDay(d.code)}
                        className={`min-w-[3.25rem] rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                          on
                            ? "border-gold bg-gold text-ink"
                            : "border-white/15 bg-transparent text-white/60 hover:border-gold/50 hover:text-gold"
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                    <User className="h-3 w-3 text-gold" /> Professor
                  </span>
                  <input
                    value={filters.instructor_name}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, instructor_name: e.target.value }))
                    }
                    placeholder="Last name"
                    className="w-full rounded-lg border border-white/15 bg-ink px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                    <Clock className="h-3 w-3 text-gold" /> Starts after
                  </span>
                  <input
                    type="time"
                    value={filters.start_time_ge}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, start_time_ge: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/15 bg-ink px-3 py-2.5 text-sm text-white outline-none focus:border-gold [color-scheme:dark]"
                  />
                </label>
              </div>

              <button type="button" onClick={applyRefine} className="btn btn-gold mt-5 w-full !rounded-xl">
                Apply filters
              </button>
            </div>
          ) : null}
        </section>

        <div ref={resultsRef} className="mt-8 scroll-mt-20">
          {phase !== "idle" ? (
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">
                  Step 3 · Pick a section
                </p>
                <h2 className="mt-1 text-lg font-semibold tracking-tight" aria-live="polite">
                  {phase === "ready"
                    ? `${classes.length} section${classes.length === 1 ? "" : "s"} for ${label}`
                    : phase === "empty"
                      ? `No sections for ${label}`
                      : phase === "error"
                        ? "Something went wrong"
                        : label
                          ? `Results for ${label}`
                          : "Results"}
                </h2>
              </div>
            </div>
          ) : null}

          {phase === "empty" ? (
            <div className="rounded-2xl border border-white/10 bg-surface px-6 py-14 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">404</p>
              <p className="mt-3 text-2xl font-semibold">Not found</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-white/55">
                Nothing matched <span className="font-semibold text-gold">{label}</span>. Try a
                broader subject or clear filters.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.slice(0, 3).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold hover:border-gold hover:text-gold"
                  >
                    Try {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {phase === "error" ? (
            <div className="rounded-2xl border border-danger/35 bg-danger/10 px-6 py-12 text-center">
              <p className="font-semibold">Couldn&apos;t search right now</p>
              <p className="mt-1 text-sm text-white/60">{error || "Is the API running?"}</p>
              <button
                type="button"
                className="btn btn-gold mt-5 !rounded-xl"
                onClick={() => void runSearch(filters)}
              >
                Try again
              </button>
            </div>
          ) : null}

          {phase === "ready" ? (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {classes.map((c) => {
                const status = seatStatus(c);
                const instructor = instructorLabel(c);
                const days = formatDays(c.days);
                const time = formatTimeRange(c.start_time, c.end_time);
                const avail = c.enrollment_available ?? 0;
                const cap = c.class_capacity ?? 0;
                return (
                  <li
                    key={c.class_nbr}
                    className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface transition-colors hover:border-gold/45"
                  >
                    <button
                      type="button"
                      onClick={() => setDetail(c)}
                      className="flex flex-1 flex-col p-4 text-left sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold">
                            Sec {c.class_section}
                            {c.campus ? ` · ${c.campus}` : ""}
                          </p>
                          <h3 className="mt-1 text-xl font-semibold tracking-tight">
                            {c.subject} {c.catalog_nbr}
                          </h3>
                          <p className="mt-1 line-clamp-2 text-sm text-white/55">{c.descr}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle(status)}`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="mt-4 flex items-end gap-3 rounded-xl border border-white/10 bg-black/45 px-3 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                            Seats
                          </p>
                          <p className={`mt-1 text-sm font-semibold ${seatAccent(status)}`}>
                            {seatCaption(status, avail)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-3xl font-bold leading-none tracking-tight ${seatAccent(status)}`}>
                            {avail}
                          </p>
                          <p className="mt-1 text-xs text-white/40">of {cap}</p>
                        </div>
                      </div>

                      <dl className="mt-4 space-y-2.5 text-sm">
                        <div className="flex items-start gap-2.5">
                          <User className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                          <div className="min-w-0">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                              Professor
                            </dt>
                            <dd className="font-semibold text-white">
                              {instructor || "TBA"}
                            </dd>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                          <div className="min-w-0">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                              Days
                            </dt>
                            <dd className="font-semibold text-white">{days || "TBA"}</dd>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                          <div className="min-w-0">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                              Time
                            </dt>
                            <dd className="font-semibold text-white">{time || "TBA"}</dd>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Users className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
                          <div className="min-w-0">
                            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                              CRN
                            </dt>
                            <dd className="font-semibold text-white">{c.class_nbr}</dd>
                          </div>
                        </div>
                      </dl>
                    </button>

                    <div className="border-t border-white/10 p-3 sm:p-4">
                      <button
                        type="button"
                        disabled={watching === c.class_nbr}
                        onClick={() => void onPing(c)}
                        className={`inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-50 ${
                          status === "OPEN"
                            ? "rounded-xl bg-gold text-ink"
                            : "rounded-xl border border-gold/40 bg-gold/10 text-gold hover:bg-gold hover:text-ink"
                        }`}
                      >
                        <Bell className="h-3.5 w-3.5" aria-hidden />
                        {watching === c.class_nbr ? "Saving…" : "Ping Me"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>

      {detail ? (
        <SectionDetailModal
          section={detail}
          pinging={watching === detail.class_nbr}
          onClose={() => {
            setDetail(null);
            setSignInFor(null);
          }}
          onPing={() => void onPing(detail)}
        />
      ) : null}

      {detail && signInFor === detail.class_nbr ? (
        <div className="fixed inset-0 z-[85] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-gold/25 bg-surface p-5 text-white shadow-2xl">
            <p className="text-sm font-semibold">Sign in to get seat alerts</p>
            <p className="mt-1.5 text-sm text-white/55">
              We&apos;ll email a magic link to your USM address. Once you&apos;re in, come back
              and hit Ping Me on {detail.subject} {detail.catalog_nbr}.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/signup" className="btn btn-gold flex-1 !rounded-xl">
                Sign in with USM email
              </Link>
              <button
                type="button"
                className="px-4 text-sm text-white/50 hover:text-white"
                onClick={() => setSignInFor(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className="fixed inset-x-0 bottom-6 z-[95] flex justify-center px-4 pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto max-w-md rounded-xl border border-gold/35 bg-ink px-4 py-3 text-sm text-white shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            {toast}
          </div>
        </div>
      ) : null}

      {successCode ? (
        <WatchSuccessModal courseCode={successCode} onDone={() => setSuccessCode(null)} />
      ) : null}
    </main>
  );
}
