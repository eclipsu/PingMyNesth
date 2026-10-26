/**
 * Schedule builder core: turns a basket of courses (each with its candidate
 * sections) plus the student's own weekly commitments into ranked,
 * clash-free schedules. Pure functions only, so it runs in tests and in the
 * browser alike.
 */
import type { ClassSection } from "./api/types";

export type Day = "M" | "T" | "W" | "R" | "F" | "S" | "U";
export const WEEKDAYS: Day[] = ["M", "T", "W", "R", "F"];
export const DAY_LABELS: Record<Day, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

/** One weekly block, in minutes after midnight. */
export type Slot = { day: Day; start: number; end: number };

export type Commitment = Slot & { id: string; label: string };

export type TimeOfDay = "morning" | "afternoon" | "evening";

export type PlannedCourse = {
  /** courseKey(): "MAT 167" or "BSC 110 LAB" */
  key: string;
  subject: string;
  catalog_nbr: string;
  descr: string;
  component?: string;
  /** The /search campus filter the sections came from, reused on refresh. */
  campus?: string;
  sections: ClassSection[];
  /** Dropped courses stay in the list but out of every schedule. */
  dropped: boolean;
  /** Only ever use this section. */
  locked?: number;
};

export type Favorites = {
  sections: number[];
  /** instructorName() values */
  instructors: string[];
  times: TimeOfDay[];
  daysOff: Day[];
};

export type BuildOptions = {
  onlyOpen: boolean;
  /** Also use online sections of courses planned for a physical campus. */
  includeOnline?: boolean;
  /** How many ranked schedules to return. */
  limit?: number;
};

export type Schedule = {
  picks: ClassSection[];
  score: number;
  reasons: string[];
  credits: number;
  fullCount: number;
};

export type BuildResult = {
  schedules: Schedule[];
  /** Valid combinations found (capped at MAX_COMBOS). */
  total: number;
  truncated: boolean;
  /** Courses left out because no section can work at all. */
  blocked: { key: string; reason: string }[];
  /** When nothing fits: courses whose removal would make schedules possible. */
  culprits: string[];
  /** Pairs of courses that can't fit together under any choice of sections. */
  conflictPairs: [string, string][];
  /**
   * When nothing fits: one section per course with as few overlaps as
   * possible, so the clashes can be drawn on the week. `groups` holds the
   * courses that overlap each other, one array per tangle.
   */
  clashView: { picks: ClassSection[]; groups: string[][] } | null;
};

export type Clash = { label: string; key?: string; slot: Slot };

/**
 * What a section would collide with: classes already picked (other courses
 * only) and the student's commitments. Empty means it would fit.
 */
export function sectionClashes(s: ClassSection, picks: ClassSection[], commitments: Commitment[]): Clash[] {
  const mine = sectionSlots(s);
  const key = courseKey(s);
  const out: Clash[] = [];
  for (const p of picks) {
    if (courseKey(p) === key) continue;
    const hit = sectionSlots(p).find((b) => mine.some((a) => overlaps(a, b)));
    if (hit) out.push({ label: `${courseKey(p)} §${p.class_section}`, key: courseKey(p), slot: hit });
  }
  for (const c of commitments) {
    if (mine.some((a) => overlaps(a, c))) out.push({ label: c.label || "Busy", slot: c });
  }
  return out;
}

const MAX_COMBOS = 20_000;

/** "1:00 PM", "13:00" or USM's "13.00" → minutes after midnight. */
export function parseClock(raw?: string | null): number | null {
  const m = raw?.trim().match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d+)*\s*([AaPp][Mm])?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const mer = m[3]?.toUpperCase();
  if (mer === "PM" && h < 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 870 → "2:30 PM"; short → "2:30p" / "2p". */
export function formatClock(minutes: number, short = false): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  if (short) return `${h}${m ? `:${String(m).padStart(2, "0")}` : ""}${h24 < 12 ? "a" : "p"}`;
  return `${h}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

function parseDays(raw: string): Day[] {
  return raw
    .toUpperCase()
    .split("")
    .filter((d): d is Day => d in DAY_LABELS);
}

/** Every weekly block a section meets. Online/TBA sections have none. */
export function sectionSlots(s: ClassSection): Slot[] {
  const meetings = s.times?.length
    ? s.times
    : [{ days: s.days ?? "", start_time: s.start_time ?? "", end_time: s.end_time ?? "" }];
  const slots: Slot[] = [];
  for (const m of meetings) {
    const start = parseClock(m.start_time);
    const end = parseClock(m.end_time);
    if (start === null || end === null || end <= start) continue;
    for (const day of parseDays(m.days)) slots.push({ day, start, end });
  }
  return slots;
}

export function overlaps(a: Slot, b: Slot): boolean {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

/** Sections of one course are interchangeable; a lab is its own course. */
export function courseKey(s: Pick<ClassSection, "subject" | "catalog_nbr" | "component">): string {
  const base = `${s.subject} ${s.catalog_nbr}`;
  return s.component && s.component !== "LEC" ? `${base} ${s.component}` : base;
}

/** USM's campus codes, as Class Search filters on and returns them. */
export const CAMPUSES = [
  { value: "HBG", label: "Hattiesburg" },
  { value: "USMGC", label: "Gulf Park" },
  { value: "ONLNE", label: "Online" },
] as const;
export const ONLINE_CAMPUS = "ONLNE";

export function isOnline(s: ClassSection): boolean {
  return s.campus === ONLINE_CAMPUS;
}

/** Sections a course planned for `campus` can use: that campus plus online. */
export function sectionsForCampus(sections: ClassSection[], campus?: string): ClassSection[] {
  if (!campus) return sections;
  return sections.filter((s) => !s.campus || s.campus === campus || isOnline(s));
}

/** "3" → 3, "3.00" → 3, "1-3" → 1 (the minimum), missing → null. */
export function sectionCredits(s: ClassSection): number | null {
  const n = parseFloat(s.units ?? "");
  return Number.isFinite(n) ? n : null;
}

/** Credits used for totals; sections without data count as a typical 3. */
export const ASSUMED_CREDITS = 3;

export function instructorName(s: ClassSection): string | null {
  const name = [s.instr_first_name, s.instructor_name].map((p) => p?.trim()).filter(Boolean).join(" ");
  return name || null;
}

export function timeOfDay(minutes: number): TimeOfDay {
  if (minutes < 12 * 60) return "morning";
  if (minutes < 17 * 60) return "afternoon";
  return "evening";
}

function isFull(s: ClassSection) {
  return (s.enrollment_available ?? 0) <= 0;
}

/** Which sections of a course can be used at all, and why not if none. */
function candidates(
  course: PlannedCourse,
  commitments: Commitment[],
  onlyOpen: boolean,
  includeOnline: boolean,
): { list: ClassSection[]; reason?: string } {
  const sections =
    includeOnline || course.campus === ONLINE_CAMPUS ? course.sections : course.sections.filter((s) => !isOnline(s));
  const pool = course.locked ? course.sections.filter((s) => s.class_nbr === course.locked) : sections;
  if (!pool.length) return { list: [], reason: "No sections this term" };

  const clashes = new Set<string>();
  let full = 0;
  const list = pool.filter((s) => {
    if (onlyOpen && isFull(s)) {
      full += 1;
      return false;
    }
    const hit = commitments.find((c) => sectionSlots(s).some((slot) => overlaps(slot, c)));
    if (hit) {
      clashes.add(hit.label || "a commitment");
      return false;
    }
    return true;
  });
  if (list.length) return { list };

  const prefix = course.locked ? "Your locked section" : pool.length === 1 ? "The only section" : "Every section";
  if (clashes.size && !full) return { list, reason: `${prefix} clashes with ${[...clashes].join(", ")}` };
  if (full && !clashes.size) return { list, reason: `${prefix} is full. Ping it, or turn off Open only` };
  return { list, reason: `Every section is either full or clashes with ${[...clashes].join(", ")}` };
}

/** Depth-first search over one section per course, pruning on any clash. */
function combine(pools: ClassSection[][], cap: number): { combos: ClassSection[][]; truncated: boolean } {
  const combos: ClassSection[][] = [];
  const slotsOf = new Map<ClassSection, Slot[]>();
  for (const pool of pools) for (const s of pool) slotsOf.set(s, sectionSlots(s));

  const picked: ClassSection[] = [];
  const taken: Slot[] = [];
  let truncated = false;

  const walk = (i: number) => {
    if (combos.length >= cap) {
      truncated = true;
      return;
    }
    if (i === pools.length) {
      combos.push([...picked]);
      return;
    }
    for (const s of pools[i]) {
      const slots = slotsOf.get(s)!;
      if (slots.some((a) => taken.some((b) => overlaps(a, b)))) continue;
      picked.push(s);
      taken.push(...slots);
      walk(i + 1);
      picked.pop();
      taken.length -= slots.length;
      if (truncated) return;
    }
  };
  walk(0);
  return { combos, truncated };
}

const TIME_LABEL: Record<TimeOfDay, string> = {
  morning: "mornings",
  afternoon: "afternoons",
  evening: "evenings",
};

export function scoreSchedule(picks: ClassSection[], fav: Favorites): Omit<Schedule, "picks"> {
  let score = 0;
  const reasons: string[] = [];
  const favSections = new Set(fav.sections);
  const favInstructors = new Set(fav.instructors);

  const starred = picks.filter((s) => favSections.has(s.class_nbr));
  score += starred.length * 100;
  if (starred.length) {
    reasons.push(
      starred.length === 1
        ? `Starred ${starred[0].subject} ${starred[0].catalog_nbr} §${starred[0].class_section}`
        : `${starred.length} starred sections`,
    );
  }

  const profs = [...new Set(picks.map(instructorName).filter((n): n is string => !!n && favInstructors.has(n)))];
  score += profs.length * 40;
  if (profs.length) reasons.push(`With ${profs.join(", ")}`);

  const slots = picks.flatMap(sectionSlots);
  if (fav.times.length && slots.length) {
    const inside = slots.filter((s) => fav.times.includes(timeOfDay(s.start))).length;
    score += inside * 6 - (slots.length - inside) * 8;
    const label = fav.times.map((t) => TIME_LABEL[t]).join(" & ");
    if (inside === slots.length) reasons.push(`All classes in your ${label}`);
    else if (inside / slots.length >= 0.6) reasons.push(`Mostly ${label}`);
  }

  const busyDays = new Set(slots.map((s) => s.day));
  if (fav.daysOff.length) {
    const kept = fav.daysOff.filter((d) => !busyDays.has(d));
    score -= (fav.daysOff.length - kept.length) * 25 + slots.filter((s) => fav.daysOff.includes(s.day)).length * 5;
    if (kept.length) reasons.push(`${kept.map((d) => DAY_LABELS[d]).join(" & ")} free`);
  }

  const fullCount = picks.filter(isFull).length;
  score += (picks.length - fullCount) * 4 - fullCount * 12;
  // online always "fits" and adds no campus days, so nudge in-person
  // schedules ahead when both work (outweighs a three-day class's day cost)
  score -= picks.filter(isOnline).length * 8;

  // Gentle tie-breakers: fewer days on campus, fewer long gaps between classes
  score -= busyDays.size * 2;
  for (const day of busyDays) {
    const sorted = slots.filter((s) => s.day === day).sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      score -= Math.max(0, sorted[i].start - sorted[i - 1].end) / 60;
    }
  }

  const credits = picks.reduce((sum, s) => sum + (sectionCredits(s) ?? ASSUMED_CREDITS), 0);
  return { score: Math.round(score * 10) / 10, reasons, credits, fullCount };
}

export function buildSchedules(
  courses: PlannedCourse[],
  commitments: Commitment[],
  fav: Favorites,
  { onlyOpen, includeOnline = true, limit = 50 }: BuildOptions,
): BuildResult {
  const active = courses.filter((c) => !c.dropped);
  const blocked: BuildResult["blocked"] = [];
  const usable: { key: string; list: ClassSection[] }[] = [];
  for (const course of active) {
    const { list, reason } = candidates(course, commitments, onlyOpen, includeOnline);
    if (list.length) usable.push({ key: course.key, list });
    else blocked.push({ key: course.key, reason: reason ?? "No usable section" });
  }

  // fewest options first prunes the search tree earliest
  usable.sort((a, b) => a.list.length - b.list.length);
  const { combos, truncated } = usable.length
    ? combine(
        usable.map((u) => u.list),
        MAX_COMBOS,
      )
    : { combos: [], truncated: false };

  let culprits: string[] = [];
  const conflictPairs: [string, string][] = [];
  if (!combos.length && usable.length > 1) {
    culprits = usable
      .filter((_, i) => combine(usable.filter((__, j) => j !== i).map((u) => u.list), 1).combos.length)
      .map((u) => u.key);
    for (let i = 0; i < usable.length; i++) {
      for (let j = i + 1; j < usable.length; j++) {
        if (!combine([usable[i].list, usable[j].list], 1).combos.length) {
          conflictPairs.push([usable[i].key, usable[j].key]);
        }
      }
    }
  }

  const order = new Map(active.map((c, i) => [c.key, i]));
  const byOrder = (a: ClassSection, b: ClassSection) => (order.get(courseKey(a)) ?? 0) - (order.get(courseKey(b)) ?? 0);

  let clashView: BuildResult["clashView"] = null;
  if (!combos.length && usable.length > 1) {
    const picks = leastClashing(usable.map((u) => u.list)).sort(byOrder);
    clashView = { picks, groups: clashGroups(picks) };
  }

  const schedules = combos
    .map((picks) => {
      // show picks in the order the student added the courses
      picks.sort(byOrder);
      return { picks, ...scoreSchedule(picks, fav) };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.picks.map((p) => p.class_nbr).join().localeCompare(b.picks.map((p) => p.class_nbr).join()),
    )
    .slice(0, limit);

  return { schedules, total: combos.length, truncated, blocked, culprits, conflictPairs, clashView };
}

const CLASH_SEARCH_STEPS = 50_000;

/**
 * One section per pool with the fewest overlapping pairs. Branch and bound,
 * so the usual one-clash case returns quickly; a step cap keeps big baskets
 * responsive, at worst settling for a schedule with an extra clash.
 */
function leastClashing(pools: ClassSection[][]): ClassSection[] {
  const slotsOf = new Map<ClassSection, Slot[]>();
  for (const pool of pools) for (const s of pool) slotsOf.set(s, sectionSlots(s));
  const hits = (a: ClassSection, b: ClassSection) =>
    slotsOf.get(a)!.some((x) => slotsOf.get(b)!.some((y) => overlaps(x, y)));

  let best: ClassSection[] = [];
  let bestCount = Infinity;
  let steps = 0;
  const picked: ClassSection[] = [];

  const walk = (i: number, count: number) => {
    if (count >= bestCount || steps++ > CLASH_SEARCH_STEPS) return;
    if (i === pools.length) {
      best = [...picked];
      bestCount = count;
      return;
    }
    // try the sections that add the fewest clashes first
    const ranked = pools[i]
      .map((s) => ({ s, added: picked.filter((p) => hits(s, p)).length }))
      .sort((a, b) => a.added - b.added);
    for (const { s, added } of ranked) {
      picked.push(s);
      walk(i + 1, count + added);
      picked.pop();
    }
  };
  walk(0, 0);
  return best;
}

/** Courses in `picks` that overlap, joined into groups (A hits B, B hits C → one group). */
export function clashGroups(picks: ClassSection[]): string[][] {
  const parent = new Map<string, string>();
  const find = (k: string): string => (parent.get(k) === k ? k : find(parent.get(k)!));
  const tangled = new Set<string>();
  for (const p of picks) parent.set(courseKey(p), courseKey(p));
  for (let i = 0; i < picks.length; i++) {
    for (let j = i + 1; j < picks.length; j++) {
      const a = sectionSlots(picks[i]);
      if (!sectionSlots(picks[j]).some((b) => a.some((x) => overlaps(x, b)))) continue;
      const [ka, kb] = [courseKey(picks[i]), courseKey(picks[j])];
      tangled.add(ka).add(kb);
      parent.set(find(ka), find(kb));
    }
  }
  const groups = new Map<string, string[]>();
  for (const k of tangled) groups.set(find(k), [...(groups.get(find(k)) ?? []), k]);
  return [...groups.values()];
}
