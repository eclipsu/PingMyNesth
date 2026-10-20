"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { edgeKey, type GraphEdge, type PrereqGraph } from "@/lib/prereqGraph";

const MAX_NODE_W = 188;
const MIN_NODE_W = 124;
const NODE_H = 60;
const WAYPOINT_H = 8; // the slot a skipped column reserves for a passing arrow
// horizontal room for the arrow curves between columns; tighter on long chains
const colGap = (cols: number) => (cols > 5 ? 44 : 60);
const ROW_GAP = 16;
const PAD = 8;

type Props = {
  graph: PrereqGraph;
  target: string;
  onSelect: (code: string) => void;
};

const isWaypoint = (id: string) => id.startsWith("~");

/** Layered prerequisite diagram: foundations on the left, `target` on the right. */
export function PrereqMap({ graph, target, onSelect }: Props) {
  const layout = useMemo(() => graph.layout(target), [graph, target]);
  const [hover, setHover] = useState<string | null>(null);

  // fit node width to the space we have; scroll sideways only below the minimum
  const wrap = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(1100);
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setAvail(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const cols = layout.columns.length;
    const COL_GAP = colGap(cols);
    const nodeW = Math.max(
      MIN_NODE_W,
      Math.min(MAX_NODE_W, Math.floor((avail - PAD * 2 - (cols - 1) * COL_GAP) / cols)),
    );
    const slot = (id: string) => (isWaypoint(id) ? WAYPOINT_H : NODE_H);
    const colHeight = (col: string[]) =>
      col.reduce((h, id) => h + slot(id), 0) + Math.max(0, col.length - 1) * ROW_GAP;
    const height = Math.max(...layout.columns.map(colHeight)) + PAD * 2;

    // y is the vertical center of each slot
    const pos = new Map<string, { x: number; y: number }>();
    layout.columns.forEach((col, ci) => {
      let y = (height - colHeight(col)) / 2;
      for (const id of col) {
        pos.set(id, { x: PAD + ci * (nodeW + COL_GAP), y: y + slot(id) / 2 });
        y += slot(id) + ROW_GAP;
      }
    });
    return { nodeW, pos, height, width: PAD * 2 + cols * nodeW + (cols - 1) * COL_GAP };
  }, [layout, avail]);

  // when the chain is wider than the screen, start scrolled to the chosen course
  useEffect(() => {
    const el = wrap.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [layout, geo.width]);

  // a smooth curve from the prereq's right edge, through each waypoint, into the course
  const pathFor = (e: GraphEdge) => {
    const { pos, nodeW } = geo;
    const from = pos.get(e.from)!;
    const to = pos.get(e.to)!;
    const anchors: [number, number][] = [[from.x + nodeW, from.y]];
    for (const id of layout.routes.get(edgeKey(e)) ?? []) {
      const p = pos.get(id)!;
      anchors.push([p.x, p.y], [p.x + nodeW, p.y]);
    }
    anchors.push([to.x - 2, to.y]);

    let d = `M${anchors[0][0]} ${anchors[0][1]}`;
    for (let i = 1; i < anchors.length; i++) {
      const [x0, y0] = anchors[i - 1];
      const [x1, y1] = anchors[i];
      if (i % 2 === 0) {
        d += ` L${x1} ${y1}`; // straight run across a skipped column
      } else {
        const bend = (x1 - x0) * 0.5;
        d += ` C${x0 + bend} ${y0}, ${x1 - bend} ${y1}, ${x1} ${y1}`;
      }
    }
    return d;
  };

  // hovering a course lights up everything it depends on (walk edges upstream)
  const lit = useMemo(() => {
    if (!hover) return null;
    const nodes = new Set([hover]);
    const edges = new Set<GraphEdge>();
    const stack = [hover];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const e of layout.edges) {
        if (e.to === cur) {
          edges.add(e);
          if (!nodes.has(e.from)) {
            nodes.add(e.from);
            stack.push(e.from);
          }
        }
      }
    }
    return { nodes, edges };
  }, [hover, layout.edges]);

  return (
    <div ref={wrap} className="overflow-x-auto pb-2">
      <div className="relative" style={{ width: geo.width, height: geo.height }}>
        <svg width={geo.width} height={geo.height} className="absolute inset-0" aria-hidden>
          <defs>
            {[
              ["arrow", "var(--ink)"],
              ["arrow-alt", "var(--muted)"],
              ["arrow-lit", "var(--accent-ink)"],
            ].map(([id, color]) => (
              <marker key={id} id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill={color} />
              </marker>
            ))}
          </defs>
          {layout.edges.map((e) => {
            const on = lit?.edges.has(e);
            return (
              <path
                key={edgeKey(e)}
                d={pathFor(e)}
                fill="none"
                stroke={on ? "var(--accent-ink)" : e.alternative ? "var(--muted)" : "var(--ink)"}
                strokeWidth={on ? 2.5 : 1.6}
                strokeDasharray={e.alternative ? "6 5" : undefined}
                markerEnd={`url(#${on ? "arrow-lit" : e.alternative ? "arrow-alt" : "arrow"})`}
                opacity={lit && !on ? 0.15 : 1}
                className="transition-opacity duration-150"
              />
            );
          })}
        </svg>

        {[...layout.nodes.values()].map((n) => {
          const p = geo.pos.get(n.code)!;
          const isTarget = n.code === target;
          return (
            <button
              key={n.code}
              type="button"
              disabled={!n.known}
              onClick={() => onSelect(n.code)}
              onMouseEnter={() => setHover(n.code)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(n.code)}
              onBlur={() => setHover(null)}
              title={n.known ? `${n.code}: ${n.title}` : `${n.code} (not in our catalog yet)`}
              style={{ left: p.x, top: p.y - NODE_H / 2, width: geo.nodeW, height: NODE_H }}
              className={cn(
                "absolute flex flex-col justify-center rounded border-l-4 px-3 text-left transition-[opacity,background-color] duration-150",
                isTarget
                  ? "border-accent bg-ink text-white"
                  : n.known
                    ? "border border-l-4 border-line border-l-ink bg-surface text-ink hover:bg-accent-soft"
                    : "border border-dashed border-line-strong bg-bg text-muted",
                lit && !lit.nodes.has(n.code) && "opacity-30",
              )}
            >
              <span className="font-display text-lg font-extrabold uppercase leading-none">{n.code}</span>
              <span className={cn("mt-1 truncate text-xs", isTarget ? "text-white/70" : "text-muted")}>
                {n.known ? n.title : "Not in catalog yet"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
