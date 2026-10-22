"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { PulseResponse } from "@/lib/api";
import { formatDuration, formatInterval, formatNumber, timeAgo } from "@/lib/format";
import { cn } from "@/lib/cn";

/*
 * The real system, drawn as it runs. Packets only move when something really
 * happened: a new worker cycle arriving in /pulse sends one packet per request
 * the worker made to USM, then writes to Postgres; a seat opening sends a gold
 * packet out through Resend to the student's inbox. Between cycles the worker
 * node counts down to its next check.
 */

type NodeId = "student" | "web" | "api" | "db" | "worker" | "usm" | "email";

const W = 150;
const H = 58;

const nodes: Record<NodeId, { x: number; y: number; title: string; sub: string }> = {
  student: { x: 10, y: 156, title: "You", sub: "browser / inbox" },
  web: { x: 196, y: 156, title: "Next.js", sub: "pingmynest.lol" },
  api: { x: 392, y: 36, title: "Go API", sub: "rate-limited" },
  db: { x: 392, y: 156, title: "Postgres", sub: "last seat counts" },
  worker: { x: 392, y: 276, title: "Worker", sub: "the poller" },
  usm: { x: 600, y: 96, title: "USM Class Search", sub: "public, guest only" },
  email: { x: 600, y: 276, title: "Resend", sub: "seat alert email" },
};

const cx = (id: NodeId) => nodes[id].x + W / 2;
const cy = (id: NodeId) => nodes[id].y + H / 2;
const right = (id: NodeId) => nodes[id].x + W;
const left = (id: NodeId) => nodes[id].x;
const top = (id: NodeId) => nodes[id].y;
const bottom = (id: NodeId) => nodes[id].y + H;

type EdgeId = "student-web" | "web-api" | "api-usm" | "api-db" | "worker-db" | "worker-usm" | "worker-email" | "email-student";

const edges: Record<EdgeId, string> = {
  "student-web": `M ${right("student")} ${cy("student")} H ${left("web")}`,
  "web-api": `M ${cx("web")} ${top("web")} V ${cy("api")} H ${left("api")}`,
  "api-usm": `M ${right("api")} ${cy("api")} H ${cx("usm")} V ${top("usm")}`,
  "api-db": `M ${cx("api")} ${bottom("api")} V ${top("db")}`,
  "worker-db": `M ${cx("worker")} ${top("worker")} V ${bottom("db")}`,
  "worker-usm": `M ${right("worker")} ${cy("worker") - 14} H 566 V ${cy("usm")} H ${left("usm")}`,
  "worker-email": `M ${right("worker")} ${cy("worker") + 8} H ${left("email")}`,
  "email-student": `M ${cx("email")} ${bottom("email")} V 360 H ${cx("student")} V ${bottom("student")}`,
};

type Packet = { key: number; edge: EdgeId; reverse?: boolean; delay: number; duration: number; tone: "ink" | "gold" | "green" };

const toneFill: Record<Packet["tone"], string> = { ink: "#0a0a0a", gold: "#f2b705", green: "#15803d" };

function PacketDot({ packet, onDone }: { packet: Packet; onDone: (key: number) => void }) {
  const pathRef = useRef<SVGPathElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!path || !dot) return;
    const len = path.getTotalLength();
    let raf = 0;
    const start = performance.now() + packet.delay;
    const tick = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / packet.duration));
      const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      const at = path.getPointAtLength((packet.reverse ? 1 - eased : eased) * len);
      dot.setAttribute("cx", String(at.x));
      dot.setAttribute("cy", String(at.y));
      dot.setAttribute("opacity", t < start ? "0" : "1");
      if (p < 1) raf = requestAnimationFrame(tick);
      else onDone(packet.key);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [packet, onDone]);

  return (
    <g>
      <path ref={pathRef} d={edges[packet.edge]} fill="none" stroke="none" />
      <circle ref={dotRef} r={5.5} fill={toneFill[packet.tone]} stroke="#fff" strokeWidth={2} opacity={0} />
    </g>
  );
}

export function ArchitectureDiagram({ pulse, now }: { pulse: PulseResponse | null; now: number }) {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<NodeId>("worker");
  const [packets, setPackets] = useState<Packet[]>([]);
  const [hot, setHot] = useState<Partial<Record<NodeId, number>>>({});
  const seq = useRef(0);
  const lastSeen = useRef<string | null>(null);

  const last = pulse?.worker.last_cycle ?? null;
  const interval = pulse?.worker.poll_interval_s ?? 60;

  // fire packets when a new real cycle shows up
  useEffect(() => {
    if (!last) return;
    const id = last.started_at;
    const first = lastSeen.current === null;
    if (lastSeen.current === id) return;
    lastSeen.current = id;
    if (reduce) return;

    const out: Packet[] = [];
    const reqs = Math.min(last.usm_requests, 6);
    const add = (p: Omit<Packet, "key">) => out.push({ ...p, key: ++seq.current });
    for (let i = 0; i < reqs; i++) {
      add({ edge: "worker-usm", delay: i * 260, duration: 900, tone: "ink" });
      add({ edge: "worker-usm", reverse: true, delay: 900 + i * 260, duration: 900, tone: "ink" });
    }
    const afterUsm = reqs ? 1800 + (reqs - 1) * 260 : 0;
    add({ edge: "worker-db", delay: afterUsm, duration: 700, tone: "ink" });
    if (last.openings > 0) {
      add({ edge: "worker-email", delay: afterUsm + 700, duration: 800, tone: "gold" });
      add({ edge: "email-student", delay: afterUsm + 1500, duration: 1600, tone: "gold" });
    }
    // on first load, only replay it if it's fresh; old cycles don't animate
    const age = now - new Date(id).getTime();
    if (first && age > (interval + 30) * 1000) return;

    const t0 = performance.now();
    setPackets((prev) => [...prev, ...out]);
    setHot({ worker: t0, ...(reqs ? { usm: t0 + 400 } : {}), db: t0 + afterUsm, ...(last.openings ? { email: t0 + afterUsm + 700 } : {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.started_at, reduce]);

  const done = useCallback((key: number) => setPackets((prev) => prev.filter((p) => p.key !== key)), []);

  // countdown to the next check, from when the last one finished
  const finishedAt = last ? new Date(last.started_at).getTime() + last.duration_ms : null;
  const remaining = finishedAt ? Math.max(0, interval - (now - finishedAt) / 1000) : null;
  const progress = remaining == null ? 0 : 1 - remaining / interval;
  const checking = remaining === 0 && pulse?.worker.status === "live";

  const t24 = pulse?.last_24h;
  const details: Record<NodeId, { title: string; body: string; stat?: string }> = {
    student: {
      title: "You",
      body: "Search any USM class and hit Ping me on a full section. No SOAR login: just a verified email, so we know where to send the alert.",
      stat: pulse ? `${formatNumber(pulse.watching.active)} watches active right now` : undefined,
    },
    web: {
      title: "Next.js on Vercel",
      body: "The site you're on. Every /api call is forwarded to the Go API from the same domain, so session cookies stay first-party and httpOnly.",
    },
    api: {
      title: "Go API",
      body: "Handles sign-in, search and watches. Every IP gets token-bucket rate limits, and identical searches share a 60-second cache, so a registration rush costs USM about one request per course per minute instead of one per student.",
      stat: t24 ? `Last 24h: ${formatNumber(t24.search_requests)} searches sent to USM, ${formatNumber(t24.cache_hits)} answered from cache` : undefined,
    },
    db: {
      title: "Postgres",
      body: "Stores the last seat count for every section. The worker compares each new count with the stored one, and a change from 0 to more than 0 counts as a seat opening.",
      stat: pulse ? `${formatNumber(pulse.watching.sections)} sections in ${formatNumber(pulse.watching.subjects)} subjects being watched` : undefined,
    },
    worker: {
      title: "The worker",
      body: `Every ${formatInterval(interval)} it asks USM for each watched subject (100 sections per request, at least ${formatInterval(pulse?.worker.request_gap_s ?? 5)} apart). If nothing is being watched, it makes no requests at all.`,
      stat: last
        ? `Last check ${timeAgo(last.started_at, now)}: ${formatNumber(last.sections_checked)} sections, ${last.usm_requests} requests, ${formatDuration(last.duration_ms)}`
        : undefined,
    },
    usm: {
      title: "USM Class Search",
      body: "USM's public class search endpoint, the same one SOAR's own catalog page uses. We use a guest session only, never a student login.",
      stat: t24 ? `${formatNumber(t24.worker_requests + t24.search_requests)} requests from us in the last 24h` : undefined,
    },
    email: {
      title: "Resend → your inbox",
      body: "When a seat opens, every verified watcher gets an email with the course, the section and a link to SOAR. The watch then pauses so you don't get spammed; turn it back on with one click.",
      stat: pulse ? `${formatNumber(pulse.all_time.alerts)} alerts sent for ${formatNumber(pulse.all_time.openings)} seat openings` : undefined,
    },
  };

  const d = details[selected];
  const ringR = 11;
  const ringC = 2 * Math.PI * ringR;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-center">
      <div className="-mx-2 overflow-x-auto px-2">
        <svg viewBox="0 0 760 372" className="h-auto w-full min-w-[560px]" role="img" aria-label="Ping My Nest architecture: browser, Next.js, Go API, Postgres, worker, USM Class Search, and Resend email">
          {/* edges */}
          {(Object.keys(edges) as EdgeId[]).map((id) => {
            const alert = id === "worker-email" || id === "email-student";
            return (
              <path
                key={id}
                d={edges[id]}
                fill="none"
                stroke={alert ? "#e0a20c" : "#c9c9cf"}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeDasharray={alert ? "5 6" : undefined}
                className={cn(!reduce && "arch-flow")}
              />
            );
          })}
          {/* edge labels */}
          <text x={(right("api") + cx("usm")) / 2 - 6} y={cy("api") - 8} className="arch-label" textAnchor="middle">
            search · 60s cache
          </text>
          <text x={572} y={(cy("usm") + cy("worker")) / 2 + 20} className="arch-label">
            every {formatInterval(interval)}
          </text>
          <text x={(cx("email") + cx("student")) / 2} y={354} className="arch-label" textAnchor="middle">
            seat-opened email
          </text>

          {/* nodes */}
          {(Object.keys(nodes) as NodeId[]).map((id) => {
            const n = nodes[id];
            const isSel = selected === id;
            const flash = hot[id] !== undefined;
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-pressed={isSel}
                aria-label={`${n.title}: show details`}
                className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#8a6100]"
                onClick={() => setSelected(id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(id);
                  }
                }}
              >
                <rect
                  x={n.x}
                  y={n.y}
                  width={W}
                  height={H}
                  rx={6}
                  fill={isSel ? "#0a0a0a" : "#fff"}
                  stroke={isSel ? "#0a0a0a" : "#c9c9cf"}
                  strokeWidth={isSel ? 2 : 1.5}
                  className="transition-[fill,stroke] duration-200"
                />
                {flash && !reduce ? (
                  <rect
                    key={hot[id]}
                    x={n.x}
                    y={n.y}
                    width={W}
                    height={H}
                    rx={6}
                    fill="none"
                    stroke={id === "email" ? "#f2b705" : "#ffc72c"}
                    strokeWidth={3}
                    className="arch-flash"
                    style={{ animationDelay: `${Math.max(0, (hot[id] ?? 0) - (hot.worker ?? 0))}ms` }}
                  />
                ) : null}
                <text x={n.x + 14} y={n.y + 25} className="arch-title" style={isSel ? { fill: "#fff" } : undefined}>
                  {n.title}
                </text>
                <text x={n.x + 14} y={n.y + 43} className="arch-sub" style={isSel ? { fill: "rgb(255 255 255 / 0.7)" } : undefined}>
                  {id === "worker" && checking ? "checking now…" : n.sub}
                </text>
                {id === "worker" && remaining != null ? (
                  <g transform={`translate(${n.x + W - 22} ${n.y + H / 2})`} aria-hidden>
                    <circle r={ringR} fill="none" stroke={isSel ? "#3f3f46" : "#e4e4e7"} strokeWidth={3} />
                    <circle
                      r={ringR}
                      fill="none"
                      stroke="#ffc72c"
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeDasharray={ringC}
                      strokeDashoffset={ringC * (1 - progress)}
                      transform="rotate(-90)"
                      className="transition-[stroke-dashoffset] duration-1000 ease-linear"
                    />
                  </g>
                ) : null}
              </g>
            );
          })}

          {packets.map((p) => (
            <PacketDot key={p.key} packet={p} onDone={done} />
          ))}
        </svg>
      </div>

      <div className="min-h-[220px] rounded-md border border-line bg-surface p-6">
        <p className="eyebrow">Tap any box</p>
        <h4 className="mt-3 text-xl font-bold text-ink">{d.title}</h4>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{d.body}</p>
        {d.stat ? (
          <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 font-mono text-[13px] text-ink">
            <span className="live-dot mt-1.5 shrink-0" aria-hidden />
            {d.stat}
          </p>
        ) : null}
        {selected === "worker" && remaining != null && pulse?.worker.status === "live" ? (
          <p className="mt-2 font-mono text-[13px] text-muted">
            {checking ? "Next check is running…" : `Next check in ${Math.ceil(remaining)}s`}
          </p>
        ) : null}
      </div>
    </div>
  );
}
