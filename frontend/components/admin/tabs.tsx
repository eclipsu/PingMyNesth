"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff, Eye, LogOut, RefreshCw, Search, Send, Trash2 } from "lucide-react";
import {
  api,
  type AdminSeatEvent,
  type AdminUser,
  type AdminUserDetail,
  type AdminWatch,
  type PulseCycle,
} from "@/lib/api";
import { formatDateTime, formatDuration, formatInterval, formatNumber, timeAgo } from "@/lib/format";
import { useNow } from "@/hooks/usePulse";
import { cn } from "@/lib/cn";
import { TrafficChart } from "@/components/viz/TrafficChart";
import { CycleChart } from "@/components/viz/CycleChart";
import { ConfirmDialog, Empty, ErrorNote, Panel, Sheet, StatusDot, Tile, td, th, useAdminLoad } from "./ui";

function errMsg(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

/* ---------- overview ---------- */

export function OverviewTab() {
  const { data, error } = useAdminLoad((s) => api.admin.overview(s), 10_000);
  const now = useNow();
  if (!data) return error ? <ErrorNote message={error} /> : <LoadingGrid />;
  const { pulse, users, watches, top_sections } = data;
  const last = pulse.worker.last_cycle;
  const workerTone = pulse.worker.status === "live" ? "good" : pulse.worker.status === "stalled" ? "warn" : "bad";
  const t24 = pulse.last_24h;
  const searches = t24.search_requests + t24.cache_hits;

  return (
    <div className="space-y-6">
      <ErrorNote message={error} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Users" value={formatNumber(users.total)} hint={`${users.verified} verified · ${users.new_this_week} new this week`} />
        <Tile label="Active watches" value={formatNumber(watches.active)} hint={`${watches.sections} sections · ${watches.subjects} subjects · ${watches.watchers} people`} />
        <Tile label="Seats opened (24h)" value={formatNumber(t24.openings)} hint={`${formatNumber(pulse.all_time.openings)} all time`} tone={t24.openings ? "good" : undefined} />
        <Tile label="Alerts sent (24h)" value={formatNumber(t24.alerts)} hint={`${formatNumber(pulse.all_time.alerts)} all time`} />
        <Tile label="Worker requests (24h)" value={formatNumber(t24.worker_requests)} hint={`${formatNumber(t24.cycles)} cycles · ${formatNumber(t24.sections_checked, true)} section checks`} />
        <Tile label="Search requests (24h)" value={formatNumber(t24.search_requests)} hint={searches ? `${Math.round((t24.cache_hits / searches) * 100)}% of searches served from cache` : "no searches yet"} />
        <Tile label="Cache hits (24h)" value={formatNumber(t24.cache_hits)} hint="searches that never reached USM" />
        <Tile label="Notified watches" value={formatNumber(watches.notified)} hint="paused after their alert" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Worker" action={<StatusDot tone={workerTone} label={pulse.worker.status} />}>
          <dl className="grid grid-cols-2 gap-px bg-line text-sm">
            {[
              ["Last check", last ? timeAgo(last.started_at, now) : "never"],
              ["Took", last ? formatDuration(last.duration_ms) : "—"],
              ["Subjects / requests", last ? `${last.subjects} / ${last.usm_requests}` : "—"],
              ["Sections read", last ? formatNumber(last.sections_checked) : "—"],
              ["Poll interval", formatInterval(pulse.worker.poll_interval_s)],
              ["Request gap", formatInterval(pulse.worker.request_gap_s)],
              [`Errors (last ${pulse.recent_cycles.length} checks)`, formatNumber(pulse.recent_cycles.reduce((n, c) => n + c.errors, 0))],
              ["Catalog", `${formatNumber(pulse.catalog.courses)} courses · ${pulse.catalog.subjects} subjects`],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface px-5 py-3">
                <dt className="text-xs text-muted">{k}</dt>
                <dd className="mt-0.5 font-mono font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="h-48 border-t border-line p-5 pl-14">
            {pulse.recent_cycles.length ? <CycleChart cycles={pulse.recent_cycles} now={now} className="h-full" /> : <Empty>No cycles yet.</Empty>}
          </div>
        </Panel>
        <Panel title="Requests to USM, last 24 hours">
          <div className="h-[360px] p-5 pl-12">
            <TrafficChart hours={pulse.traffic} className="h-full" />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Most watched sections">
          {top_sections.length ? (
            <table className="w-full text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className={th}>Section</th>
                  <th className={cn(th, "text-right")}>Seats</th>
                  <th className={cn(th, "text-right")}>Watchers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {top_sections.map((s) => (
                  <tr key={s.class_nbr}>
                    <td className={td}>
                      <p className="font-semibold">
                        {s.subject} {s.catalog_nbr} <span className="font-mono text-xs text-muted">§{s.class_section}</span>
                      </p>
                      <p className="max-w-[260px] truncate text-xs text-muted">{s.descr}</p>
                    </td>
                    <td className={cn(td, "text-right font-mono", s.seats > 0 ? "text-open" : "text-full")}>{s.seats}</td>
                    <td className={cn(td, "text-right font-mono font-semibold")}>{s.watchers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Empty>Nobody is watching anything right now.</Empty>
          )}
        </Panel>
        <Panel title="Latest seat openings">
          <EventsTable events={pulse.recent_openings.map((o, i) => ({ ...o, id: i, class_nbr: 0 }))} now={now} compact />
        </Panel>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="skeleton h-28 rounded-md" />
      ))}
    </div>
  );
}

/* ---------- users ---------- */

export function UsersTab({ selfId }: { selfId: number }) {
  const { data, error, loading, reload } = useAdminLoad((s) => api.admin.users(s));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<AdminUser | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "delete" | "signout"; user: AdminUser } | null>(null);
  const [busy, setBusy] = useState(false);

  const users = useMemo(
    () => (data ?? []).filter((u) => u.email.toLowerCase().includes(q.trim().toLowerCase())),
    [data, q],
  );

  const act = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      const res =
        confirm.kind === "delete" ? await api.admin.deleteUser(confirm.user.id) : await api.admin.signOutUser(confirm.user.id);
      toast.success(res.message);
      setConfirm(null);
      if (confirm.kind === "delete") setOpen(null);
      await reload();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Toolbar q={q} setQ={setQ} placeholder="Search by email" loading={loading} onReload={reload} count={data ? `${users.length} of ${data.length}` : undefined} />
      <ErrorNote message={error} />
      <Panel>
        {users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line bg-subtle/50">
                <tr>
                  <th className={th}>Email</th>
                  <th className={th}>Joined</th>
                  <th className={cn(th, "text-right")}>Watching</th>
                  <th className={cn(th, "text-right")}>Sessions</th>
                  <th className={cn(th, "text-right")}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-bg">
                    <td className={td}>
                      <button type="button" className="text-left font-semibold hover:underline" onClick={() => setOpen(u)}>
                        {u.email}
                      </button>
                      <div className="mt-0.5 flex gap-2">
                        {u.verified ? <StatusDot tone="good" label="verified" /> : <StatusDot tone="idle" label="unverified" />}
                        {u.id === selfId ? <span className="text-xs font-bold uppercase tracking-wider text-accent-ink">you</span> : null}
                      </div>
                    </td>
                    <td className={cn(td, "text-muted")}>{formatDateTime(u.created_at)}</td>
                    <td className={cn(td, "text-right font-mono")}>
                      {u.active_watches}
                      <span className="text-muted"> / {u.total_watches}</span>
                    </td>
                    <td className={cn(td, "text-right font-mono")}>{u.sessions}</td>
                    <td className={cn(td, "text-right")}>
                      <div className="inline-flex gap-1">
                        <IconButton label="View" onClick={() => setOpen(u)}>
                          <Eye className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Sign out everywhere" disabled={!u.sessions} onClick={() => setConfirm({ kind: "signout", user: u })}>
                          <LogOut className="h-4 w-4" />
                        </IconButton>
                        <IconButton label="Delete user" danger disabled={u.id === selfId} onClick={() => setConfirm({ kind: "delete", user: u })}>
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{data ? "No users match." : "Loading users…"}</Empty>
        )}
      </Panel>

      <UserSheet user={open} onClose={() => setOpen(null)} onChanged={reload} />

      <ConfirmDialog
        open={!!confirm}
        busy={busy}
        title={confirm?.kind === "delete" ? "Delete this user?" : "Sign out everywhere?"}
        body={
          confirm?.kind === "delete" ? (
            <>
              <strong className="text-ink">{confirm.user.email}</strong> and their {confirm.user.total_watches} watch
              {confirm.user.total_watches === 1 ? "" : "es"} will be removed for good. They can sign up again later.
            </>
          ) : (
            <>
              Ends all {confirm?.user.sessions} session{confirm?.user.sessions === 1 ? "" : "s"} for{" "}
              <strong className="text-ink">{confirm?.user.email}</strong>. Their watches keep running.
            </>
          )
        }
        confirmLabel={confirm?.kind === "delete" ? "Delete user" : "Sign out"}
        onConfirm={() => void act()}
        onClose={() => setConfirm(null)}
      />
    </div>
  );
}

function UserSheet({ user, onClose, onChanged }: { user: AdminUser | null; onClose: () => void; onChanged: () => void }) {
  return (
    <Sheet open={!!user} title={user?.email ?? ""} onClose={onClose}>
      {user ? <UserDetail id={user.id} onChanged={onChanged} /> : null}
    </Sheet>
  );
}

function UserDetail({ id, onChanged }: { id: number; onChanged: () => void }) {
  const { data, error, reload } = useAdminLoad<AdminUserDetail>((s) => api.admin.user(id, s));
  if (!data) return error ? <ErrorNote message={error} /> : <div className="skeleton h-40 rounded-md" />;
  const changed = async () => {
    await reload();
    onChanged();
  };
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="card px-4 py-3">
          <dt className="text-xs text-muted">Joined</dt>
          <dd className="mt-0.5 font-semibold">{formatDateTime(data.user.created_at)}</dd>
        </div>
        <div className="card px-4 py-3">
          <dt className="text-xs text-muted">User id</dt>
          <dd className="mt-0.5 font-mono font-semibold">{data.user.id}</dd>
        </div>
      </dl>
      <div>
        <h3 className="mb-2 font-sans text-sm font-bold normal-case" style={{ fontStretch: "100%" }}>
          Watches ({data.watches.length})
        </h3>
        {data.watches.length ? (
          <ul className="space-y-2">
            {data.watches.map((w) => (
              <WatchRow key={w.id} watch={w} onChanged={changed} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No watches.</p>
        )}
      </div>
      <div>
        <h3 className="mb-2 font-sans text-sm font-bold normal-case" style={{ fontStretch: "100%" }}>
          Active sessions ({data.sessions.length})
        </h3>
        {data.sessions.length ? (
          <ul className="space-y-2">
            {data.sessions.map((s) => (
              <li key={s.id} className="card px-4 py-3 text-sm">
                <p className="truncate font-mono text-xs text-ink-2" title={s.user_agent}>
                  {s.user_agent || "unknown device"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Started {formatDateTime(s.created_at)} · expires {formatDateTime(s.expires_at)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Signed out everywhere.</p>
        )}
      </div>
    </div>
  );
}

/* ---------- watches ---------- */

type WatchFilter = "all" | "active" | "notified" | "open";

export function WatchesTab() {
  const { data, error, loading, reload } = useAdminLoad((s) => api.admin.watches(s), 30_000);
  const now = useNow(5000);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<WatchFilter>("active");

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      all: list.length,
      active: list.filter((w) => w.active).length,
      notified: list.filter((w) => !w.active).length,
      open: list.filter((w) => w.active && w.seats > 0).length,
    };
  }, [data]);

  const watches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((w) => {
      if (filter === "active" && !w.active) return false;
      if (filter === "notified" && w.active) return false;
      if (filter === "open" && !(w.active && w.seats > 0)) return false;
      if (!needle) return true;
      return `${w.subject} ${w.catalog_nbr} ${w.subject}${w.catalog_nbr} ${w.descr} ${w.email} ${w.class_nbr}`.toLowerCase().includes(needle);
    });
  }, [data, q, filter]);

  return (
    <div className="space-y-4">
      <Toolbar q={q} setQ={setQ} placeholder="Course, title, email or CRN" loading={loading} onReload={reload}>
        <div className="flex flex-wrap gap-1.5">
          {(["active", "open", "notified", "all"] as const).map((f) => (
            <button key={f} type="button" className="chip !h-8 capitalize" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === "open" ? "Open now" : f} <span className="ml-1.5 font-mono text-xs opacity-60">{counts[f]}</span>
            </button>
          ))}
        </div>
      </Toolbar>
      <ErrorNote message={error} />
      <Panel>
        {watches.length ? (
          <ul className="divide-y divide-line">
            {watches.map((w) => (
              <WatchRow key={w.id} watch={w} onChanged={reload} now={now} flat />
            ))}
          </ul>
        ) : (
          <Empty>{data ? "No watches match." : "Loading watches…"}</Empty>
        )}
      </Panel>
    </div>
  );
}

function WatchRow({ watch: w, onChanged, now, flat }: { watch: AdminWatch; onChanged: () => void | Promise<void>; now?: number; flat?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const run = async (fn: () => Promise<{ message: string }>) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(res.message);
      setConfirm(false);
      await onChanged();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const tone = !w.active ? "idle" : w.seats > 0 ? "good" : "warn";
  const label = !w.active ? "notified" : w.seats > 0 ? "open now" : "watching";

  return (
    <li className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", flat ? "px-5 py-3.5" : "card px-4 py-3")}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold">
            {w.subject} {w.catalog_nbr}
          </span>
          <span className="font-mono text-xs text-muted">§{w.class_section}</span>
          <StatusDot tone={tone} label={label} />
          <span className="font-mono text-xs text-muted">
            {w.seats} seat{w.seats === 1 ? "" : "s"}
          </span>
        </div>
        <p className="truncate text-sm text-ink-2">{w.descr}</p>
        <p className="mt-0.5 font-mono text-xs text-muted">
          CRN {w.class_nbr}
          {w.email ? ` · ${w.email}` : ""} · added {formatDateTime(w.created_at)}
          {w.checked_at && now ? ` · checked ${timeAgo(w.checked_at, now)}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={busy}
          onClick={() => void run(() => api.admin.setWatchActive(w.id, !w.active))}
        >
          {w.active ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {w.active ? "Pause" : "Resume"}
        </button>
        <IconButton label="Delete watch" danger disabled={busy} onClick={() => setConfirm(true)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
      <ConfirmDialog
        open={confirm}
        busy={busy}
        title="Delete this watch?"
        body={
          <>
            {w.subject} {w.catalog_nbr} §{w.class_section}
            {w.email ? ` for ${w.email}` : ""} stops being watched and disappears from their nest.
          </>
        }
        confirmLabel="Delete watch"
        onConfirm={() => void run(() => api.admin.deleteWatch(w.id))}
        onClose={() => setConfirm(false)}
      />
    </li>
  );
}

/* ---------- seat events ---------- */

export function EventsTab() {
  const { data, error, loading, reload } = useAdminLoad((s) => api.admin.events(300, s), 15_000);
  const now = useNow(5000);
  const [q, setQ] = useState("");
  const events = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((e) => !needle || `${e.subject} ${e.catalog_nbr} ${e.subject}${e.catalog_nbr} ${e.descr} ${e.class_nbr}`.toLowerCase().includes(needle));
  }, [data, q]);
  return (
    <div className="space-y-4">
      <Toolbar q={q} setQ={setQ} placeholder="Filter openings" loading={loading} onReload={reload} count={data ? `${events.length} events` : undefined} />
      <ErrorNote message={error} />
      <Panel>
        <EventsTable events={events} now={now} />
      </Panel>
    </div>
  );
}

function EventsTable({ events, now, compact }: { events: AdminSeatEvent[]; now: number; compact?: boolean }) {
  if (!events.length) return <Empty>No seats have opened yet.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-line">
          <tr>
            <th className={th}>When</th>
            <th className={th}>Section</th>
            <th className={cn(th, "text-right")}>Seats</th>
            <th className={cn(th, "text-right")}>Emailed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {events.map((e) => (
            <tr key={`${e.id}-${e.at}`}>
              <td className={cn(td, "whitespace-nowrap")}>
                <p className="font-medium">{timeAgo(e.at, now)}</p>
                {!compact ? <p className="text-xs text-muted">{formatDateTime(e.at)}</p> : null}
              </td>
              <td className={td}>
                <p className="font-semibold">
                  {e.subject} {e.catalog_nbr} <span className="font-mono text-xs text-muted">§{e.class_section}</span>
                </p>
                <p className="max-w-[280px] truncate text-xs text-muted">
                  {e.descr}
                  {e.class_nbr ? ` · CRN ${e.class_nbr}` : ""}
                </p>
              </td>
              <td className={cn(td, "text-right font-mono text-open")}>{e.seats}</td>
              <td className={cn(td, "text-right font-mono", e.notified < e.watchers && "text-full")}>
                {e.notified}/{e.watchers}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- poll cycles ---------- */

export function CyclesTab() {
  const { data, error, loading, reload } = useAdminLoad<PulseCycle[]>((s) => api.admin.cycles(200, s), 10_000);
  const now = useNow();
  const [errorsOnly, setErrorsOnly] = useState(false);
  const cycles = (data ?? []).filter((c) => !errorsOnly || c.errors > 0);
  const chart = useMemo(() => (data ?? []).slice(0, 80).reverse(), [data]);
  return (
    <div className="space-y-4">
      <Toolbar loading={loading} onReload={reload} count={data ? `${data.length} most recent` : undefined}>
        <button type="button" className="chip !h-8" aria-pressed={errorsOnly} onClick={() => setErrorsOnly((v) => !v)}>
          Errors only
        </button>
      </Toolbar>
      <ErrorNote message={error} />
      {chart.length ? (
        <Panel title="Duration per cycle">
          <div className="h-56 p-5 pl-14">
            <CycleChart cycles={chart} now={now} className="h-full" />
          </div>
        </Panel>
      ) : null}
      <Panel>
        {cycles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-line">
                <tr>
                  <th className={th}>Started</th>
                  <th className={cn(th, "text-right")}>Took</th>
                  <th className={cn(th, "text-right")}>Subjects</th>
                  <th className={cn(th, "text-right")}>Requests</th>
                  <th className={cn(th, "text-right")}>Sections</th>
                  <th className={cn(th, "text-right")}>Opened</th>
                  <th className={cn(th, "text-right")}>Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line font-mono">
                {cycles.map((c) => (
                  <tr key={c.started_at}>
                    <td className={cn(td, "font-sans")}>
                      {timeAgo(c.started_at, now)} <span className="text-xs text-muted">· {formatDateTime(c.started_at)}</span>
                    </td>
                    <td className={cn(td, "text-right")}>{formatDuration(c.duration_ms)}</td>
                    <td className={cn(td, "text-right")}>{c.subjects}</td>
                    <td className={cn(td, "text-right")}>{c.usm_requests}</td>
                    <td className={cn(td, "text-right")}>{formatNumber(c.sections_checked)}</td>
                    <td className={cn(td, "text-right", c.openings && "font-semibold text-open")}>{c.openings}</td>
                    <td className={cn(td, "text-right", c.errors && "font-semibold text-full")}>{c.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{data ? "No cycles match." : "Loading cycles…"}</Empty>
        )}
      </Panel>
    </div>
  );
}

/* ---------- tools ---------- */

export function ToolsTab({ email }: { email: string }) {
  const [sending, setSending] = useState(false);
  const [health, setHealth] = useState<string | null>(null);

  const sendTest = async () => {
    setSending(true);
    try {
      const res = await api.admin.testAlert();
      toast.success(res.message);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSending(false);
    }
  };

  const checkHealth = async () => {
    const t0 = performance.now();
    try {
      const res = await api.health();
      setHealth(`API ${res.status} · ${Math.round(performance.now() - t0)} ms round trip`);
    } catch (err) {
      setHealth(`API unreachable: ${errMsg(err)}`);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Test the alert email">
        <div className="p-5">
          <p className="text-sm leading-relaxed text-ink-2">
            Sends a sample &ldquo;seat opened&rdquo; email (CSC 101, marked as a test) to <strong className="text-ink">{email}</strong>{" "}
            through the same Resend sender the worker uses. Use it to check delivery before a demo.
          </p>
          <button type="button" className="btn btn-accent mt-4" disabled={sending} onClick={() => void sendTest()}>
            <Send className="h-4 w-4" />
            {sending ? "Sending…" : "Send test alert"}
          </button>
        </div>
      </Panel>
      <Panel title="API health">
        <div className="p-5">
          <p className="text-sm leading-relaxed text-ink-2">Pings /health through the same proxy students use.</p>
          <button type="button" className="btn btn-secondary mt-4" onClick={() => void checkHealth()}>
            <RefreshCw className="h-4 w-4" />
            Check now
          </button>
          {health ? <p className="mt-3 font-mono text-sm">{health}</p> : null}
        </div>
      </Panel>
      <Panel title="Simulate a seat opening (local dev)" className="lg:col-span-2">
        <div className="p-5 text-sm leading-relaxed text-ink-2">
          <p>With the dev stack running against the replica, flip a watched section to full and back. The worker catches it on its next cycle, sends the alert, and it shows up here and on the homepage carousel.</p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-ink p-4 font-mono text-[13px] text-white">
            {`./replica --mutate <class_nbr> 0   # full\n# wait one poll interval\n./replica --mutate <class_nbr> 3   # 3 seats open → alert`}
          </pre>
        </div>
      </Panel>
    </div>
  );
}

/* ---------- shared bits ---------- */

function Toolbar({
  q,
  setQ,
  placeholder,
  loading,
  onReload,
  count,
  children,
}: {
  q?: string;
  setQ?: (v: string) => void;
  placeholder?: string;
  loading: boolean;
  onReload: () => void;
  count?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {setQ ? (
        <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
          <span className="sr-only">{placeholder}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="input !h-10 pl-9" />
        </label>
      ) : null}
      {children}
      <div className="ml-auto flex items-center gap-3">
        {count ? <span className="text-xs text-muted">{count}</span> : null}
        <button type="button" className="btn btn-ghost btn-sm" onClick={onReload} disabled={loading} aria-label="Reload">
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-35",
        danger && "hover:!bg-full-soft hover:!text-full",
      )}
    >
      {children}
    </button>
  );
}
