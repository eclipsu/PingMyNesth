"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";
import { DAY_LABELS, WEEKDAYS, formatClock, type Commitment, type Day, type Slot } from "@/lib/schedule";

export type CalendarEvent = Slot & {
  id: string;
  title: string;
  subtitle?: string;
  color: CourseColor;
  /** dimmed, e.g. a full section */
  muted?: boolean;
  onClick?: () => void;
};

export type CourseColor = { bg: string; border: string; text: string };

/** Course fills from the site palette: gold, black, and neutrals. */
export const COURSE_COLORS: CourseColor[] = [
  { bg: "var(--accent)", border: "var(--accent-hover)", text: "var(--ink)" },
  { bg: "var(--ink)", border: "var(--ink)", text: "#ffffff" },
  { bg: "var(--accent-soft)", border: "var(--accent-ink)", text: "var(--ink)" },
  { bg: "var(--surface)", border: "var(--ink)", text: "var(--ink)" },
  { bg: "var(--subtle)", border: "var(--muted)", text: "var(--ink)" },
];

const HOUR_PX = 48;
const EDITOR_PX = 176;
const SNAP = 15;

type Props = {
  events: CalendarEvent[];
  commitments: Commitment[];
  onAddCommitment: (c: Commitment) => void;
  onUpdateCommitment: (id: string, patch: Partial<Commitment>) => void;
  onRemoveCommitment: (id: string) => void;
};

type Drag =
  | { mode: "create"; day: Day; anchor: number; current: number; moved: boolean }
  | { mode: "move"; id: string; grab: number; day: Day; start: number; length: number; moved: boolean; x: number; y: number }
  | { mode: "resize"; id: string; day: Day; start: number; end: number };

const newId = () => Math.random().toString(36).slice(2, 10);

/**
 * Week grid in the style of Google Calendar. Classes render as fixed blocks;
 * the student's own commitments can be drawn (drag on empty space), moved
 * (drag the block, even across days) and resized (drag the bottom edge).
 */
export function WeekCalendar({ events, commitments, onAddCommitment, onUpdateCommitment, onRemoveCommitment }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  // handlers read the ref: a fast release can arrive before React re-renders
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  const [selected, setSelected] = useState<string | null>(null);

  const all: Slot[] = [...events, ...commitments];
  const days: Day[] = all.some((s) => s.day === "S" || s.day === "U")
    ? [...WEEKDAYS, "S", ...(all.some((s) => s.day === "U") ? (["U"] as Day[]) : [])]
    : WEEKDAYS;
  const firstHour = Math.min(8, ...all.map((s) => Math.floor(s.start / 60)));
  const lastHour = Math.max(20, ...all.map((s) => Math.ceil(s.end / 60)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);
  const dayStart = firstHour * 60;
  const dayEnd = lastHour * 60;

  // Escape closes the editor; Delete removes the selected block
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      const typing = e.target instanceof HTMLInputElement;
      if (!typing && (e.key === "Delete" || e.key === "Backspace")) {
        onRemoveCommitment(selected);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, onRemoveCommitment]);

  /** Pointer position → the day column and snapped minute under it. */
  const locate = (clientX: number, clientY: number) => {
    const rect = gridRef.current!.getBoundingClientRect();
    const col = Math.min(days.length - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * days.length)));
    const raw = dayStart + ((clientY - rect.top) / HOUR_PX) * 60;
    const minute = Math.min(dayEnd, Math.max(dayStart, Math.round(raw / SNAP) * SNAP));
    return { day: days[col], minute };
  };

  const startCreate = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    const { day, minute } = locate(e.clientX, e.clientY);
    gridRef.current!.setPointerCapture(e.pointerId);
    setSelected(null);
    setDrag({ mode: "create", day, anchor: minute, current: minute, moved: false });
  };

  const startMove = (e: ReactPointerEvent, c: Commitment) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const { minute } = locate(e.clientX, e.clientY);
    gridRef.current!.setPointerCapture(e.pointerId);
    setDrag({
      mode: "move",
      id: c.id,
      grab: minute - c.start,
      day: c.day,
      start: c.start,
      length: c.end - c.start,
      moved: false,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const startResize = (e: ReactPointerEvent, c: Commitment) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    gridRef.current!.setPointerCapture(e.pointerId);
    setDrag({ mode: "resize", id: c.id, day: c.day, start: c.start, end: c.end });
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { day, minute } = locate(e.clientX, e.clientY);
    if (drag.mode === "create") {
      setDrag({ ...drag, current: minute, moved: drag.moved || minute !== drag.anchor });
    } else if (drag.mode === "move") {
      const moved = drag.moved || Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4;
      const start = Math.min(dayEnd - drag.length, Math.max(dayStart, minute - drag.grab));
      setDrag({ ...drag, day: moved ? day : drag.day, start: moved ? start : drag.start, moved });
    } else {
      setDrag({ ...drag, end: Math.max(drag.start + SNAP, minute) });
    }
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    onPointerMove(e);
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.mode === "create") {
      // a plain click makes a one-hour block, like Google Calendar
      const [start, end] = drag.moved
        ? [Math.min(drag.anchor, drag.current), Math.max(drag.anchor, drag.current)]
        : [drag.anchor, Math.min(dayEnd, drag.anchor + 60)];
      if (end - start >= SNAP) {
        const id = newId();
        onAddCommitment({ id, label: "Busy", day: drag.day, start, end });
        setSelected(id);
      }
    } else if (drag.mode === "move") {
      if (drag.moved) onUpdateCommitment(drag.id, { day: drag.day, start: drag.start, end: drag.start + drag.length });
      setSelected(drag.id);
    } else {
      onUpdateCommitment(drag.id, { end: drag.end });
      setSelected(drag.id);
    }
    setDrag(null);
  };

  // what each commitment looks like right now, including an in-flight drag
  const shown = commitments.map((c) => {
    if (drag?.mode === "move" && drag.id === c.id) return { ...c, day: drag.day, start: drag.start, end: drag.start + drag.length };
    if (drag?.mode === "resize" && drag.id === c.id) return { ...c, end: drag.end };
    return c;
  });
  const draft =
    drag?.mode === "create" && drag.moved
      ? { day: drag.day, start: Math.min(drag.anchor, drag.current), end: Math.max(drag.anchor, drag.current) }
      : null;
  const editing = shown.find((c) => c.id === selected) ?? null;

  const top = (min: number) => ((min - dayStart) / 60) * HOUR_PX;
  const height = (s: Slot) => Math.max(14, ((s.end - s.start) / 60) * HOUR_PX);

  const closeEditor = useCallback(() => setSelected(null), []);

  /** Popover beside the block: to its right, or its left near the week's end. */
  const editorPosition = (c: Commitment): CSSProperties => {
    const col = days.indexOf(c.day);
    const pct = (n: number) => `${(n / days.length) * 100}%`;
    const y = Math.max(0, Math.min(top(c.start), hours.length * HOUR_PX - EDITOR_PX));
    return col < days.length - 2 ? { top: y, left: pct(col + 1) } : { top: y, right: pct(days.length - col) };
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <div className="min-w-[36rem]">
        <div
          className="sticky top-0 z-20 grid border-b border-line bg-surface"
          style={{ gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div />
          {days.map((d) => (
            <div key={d} className="border-l border-line py-2.5 text-center text-xs font-bold uppercase tracking-[0.14em] text-muted">
              {DAY_LABELS[d]}
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: "3.25rem minmax(0, 1fr)" }}>
          <div className="relative" style={{ height: hours.length * HOUR_PX }}>
            {hours.map((h) => (
              <span
                key={h}
                className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted first:translate-y-0"
                style={{ top: (h - firstHour) * HOUR_PX }}
              >
                {h === firstHour ? "" : formatClock(h * 60, true)}
              </span>
            ))}
          </div>

          <div
            ref={gridRef}
            className={cn("relative grid touch-none select-none", drag ? "cursor-grabbing" : "cursor-crosshair")}
            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, height: hours.length * HOUR_PX }}
            onPointerDown={startCreate}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
          >
            {/* hour and half-hour lines */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(color-mix(in srgb, var(--line) 50%, transparent) 1px, transparent 1px)`,
                backgroundSize: `100% ${HOUR_PX}px, 100% ${HOUR_PX / 2}px`,
              }}
            />
            {days.map((d) => (
              <div key={d} className="relative border-l border-line">
                {events
                  .filter((ev) => ev.day === d)
                  .map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={ev.onClick}
                      className={cn(
                        "absolute inset-x-1 z-10 overflow-hidden rounded-[3px] border px-1.5 py-1 text-left transition-[filter] hover:brightness-95",
                        ev.muted && "opacity-70 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgb(255_255_255/0.55)_6px_12px)]",
                      )}
                      style={{
                        top: top(ev.start),
                        height: height(ev),
                        background: ev.color.bg,
                        borderColor: ev.color.border,
                        color: ev.color.text,
                      }}
                    >
                      <span className="block truncate text-xs font-bold leading-tight">{ev.title}</span>
                      {ev.end - ev.start >= 45 ? (
                        <span className="block truncate text-[11px] leading-tight opacity-80">{ev.subtitle}</span>
                      ) : null}
                      {ev.end - ev.start >= 70 ? (
                        <span className="block truncate text-[10px] tabular-nums leading-tight opacity-75">
                          {formatClock(ev.start, true)}–{formatClock(ev.end, true)}
                        </span>
                      ) : null}
                    </button>
                  ))}

                {shown
                  .filter((c) => c.day === d)
                  .map((c) => (
                    <div
                      key={c.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${c.label}, ${DAY_LABELS[c.day]} ${formatClock(c.start)} to ${formatClock(c.end)}. Drag to move.`}
                      onPointerDown={(e) => startMove(e, c)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setSelected(c.id);
                      }}
                      className={cn(
                        "group absolute inset-x-1 z-10 cursor-grab overflow-hidden rounded-[3px] border border-ink/25 px-1.5 py-1 text-ink",
                        selected === c.id && "z-20 ring-2 ring-ink",
                      )}
                      style={{
                        top: top(c.start),
                        height: height(c),
                        background:
                          "repeating-linear-gradient(135deg, var(--subtle) 0 6px, color-mix(in srgb, var(--line-strong) 70%, transparent) 6px 12px)",
                      }}
                    >
                      <span className="block truncate text-xs font-bold leading-tight">{c.label || "Busy"}</span>
                      {c.end - c.start >= 45 ? (
                        <span className="block truncate text-[10px] tabular-nums leading-tight text-ink-2">
                          {formatClock(c.start, true)}–{formatClock(c.end, true)}
                        </span>
                      ) : null}
                      <span
                        onPointerDown={(e) => startResize(e, c)}
                        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                        aria-hidden
                      >
                        <span className="mx-auto mt-0.5 block h-0.5 w-6 rounded bg-ink/40 opacity-0 group-hover:opacity-100" />
                      </span>
                    </div>
                  ))}

                {draft && draft.day === d ? (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-20 rounded-[3px] border-2 border-dashed border-ink/60 bg-surface/90 px-1.5 py-1"
                    style={{ top: top(draft.start), height: height(draft) }}
                  >
                    <span className="text-[10px] font-bold tabular-nums">
                      {formatClock(draft.start, true)}–{formatClock(draft.end, true)}
                    </span>
                  </div>
                ) : null}
              </div>
            ))}

            {editing && !drag ? (
              <CommitmentEditor
                key={editing.id}
                commitment={editing}
                days={days}
                style={editorPosition(editing)}
                onChange={(patch) => onUpdateCommitment(editing.id, patch)}
                onCopyTo={(day) => onAddCommitment({ ...editing, id: newId(), day })}
                onRemove={() => {
                  onRemoveCommitment(editing.id);
                  setSelected(null);
                }}
                onClose={closeEditor}
                taken={commitments.filter((c) => c.label === editing.label && c.start === editing.start).map((c) => c.day)}
              />
            ) : null}
          </div>
        </div>
      </div>

    </div>
  );
}

function CommitmentEditor({
  commitment: c,
  days,
  style,
  taken,
  onChange,
  onCopyTo,
  onRemove,
  onClose,
}: {
  commitment: Commitment;
  days: Day[];
  style: CSSProperties;
  /** days that already have this same block */
  taken: Day[];
  onChange: (patch: Partial<Commitment>) => void;
  onCopyTo: (day: Day) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // focus the label without scrolling the page
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, []);

  // any press outside the popover closes it, like Google Calendar
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [onClose]);

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label="Edit commitment"
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute z-30 mx-1.5 w-64 cursor-auto space-y-3 rounded-lg border border-line bg-surface p-3 shadow-[var(--shadow-float)]"
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={c.label}
          onChange={(e) => onChange({ label: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") onClose();
          }}
          placeholder="Work, practice, commute…"
          aria-label="Label"
          className="input h-9 min-w-0 flex-1"
          maxLength={40}
        />
        <button type="button" onClick={onClose} className="text-xs font-bold uppercase tracking-wider text-ink-2 hover:text-ink">
          Done
        </button>
      </div>
      <p className="text-xs tabular-nums text-muted">
        {DAY_LABELS[c.day]} {formatClock(c.start)}–{formatClock(c.end)}
      </p>
      <div role="group" aria-label="Repeat on">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
          Repeat on
        </p>
        <div className="flex gap-1">
          {days.map((d) => {
            const on = taken.includes(d);
            return (
              <button
                key={d}
                type="button"
                disabled={on}
                onClick={() => onCopyTo(d)}
                title={on ? `Already on ${DAY_LABELS[d]}` : `Repeat on ${DAY_LABELS[d]}`}
                className={cn(
                  "h-7 flex-1 rounded text-[11px] font-bold",
                  on ? "bg-ink text-white" : "border border-line-strong text-ink-2 hover:border-ink",
                )}
              >
                {DAY_LABELS[d].slice(0, 2)}
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" onClick={onRemove} className="btn btn-ghost btn-sm w-full text-full">
        Delete
      </button>
    </div>
  );
}
