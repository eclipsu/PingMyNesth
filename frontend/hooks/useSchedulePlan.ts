"use client";

import { useSyncExternalStore } from "react";
import type { ClassSection } from "@/lib/api";
import {
  courseKey,
  type Commitment,
  type Day,
  type Favorites,
  type PlannedCourse,
  type TimeOfDay,
} from "@/lib/schedule";

/**
 * The schedule builder's saved plan: the course basket, the student's own
 * weekly commitments, and favorites. It lives in localStorage (no account
 * needed) and is shared live between /search and /schedule, and across tabs.
 */
export type SchedulePlan = {
  courses: PlannedCourse[];
  commitments: Commitment[];
  favorites: Favorites;
  onlyOpen: boolean;
};

const STORAGE_KEY = "pmn_schedule_v1";

const EMPTY_PLAN: SchedulePlan = {
  courses: [],
  commitments: [],
  favorites: { sections: [], instructors: [], times: [], daysOff: [] },
  onlyOpen: false,
};

let plan: SchedulePlan = EMPTY_PLAN;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Partial<SchedulePlan>;
      plan = { ...EMPTY_PLAN, ...saved, favorites: { ...EMPTY_PLAN.favorites, ...saved.favorites } };
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
}

function setPlan(update: (prev: SchedulePlan) => SchedulePlan) {
  load();
  plan = update(plan);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    /* storage blocked: keep the plan for this visit only */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    loaded = false;
    plan = EMPTY_PLAN;
    load();
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return plan;
}

const getServerSnapshot = () => EMPTY_PLAN;

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function mapCourse(key: string, fn: (c: PlannedCourse) => PlannedCourse) {
  setPlan((p) => ({ ...p, courses: p.courses.map((c) => (c.key === key ? fn(c) : c)) }));
}

export const scheduleActions = {
  /**
   * Add a section's course with every sibling section we know of, and star
   * the section that was picked so it leads the ranking. Returns false when
   * the course was already in the plan (the section still gets starred).
   */
  addSection(section: ClassSection, known: ClassSection[], campus?: string): boolean {
    const key = courseKey(section);
    const siblings = known.filter((s) => courseKey(s) === key);
    let added = false;
    setPlan((p) => {
      const favorites = p.favorites.sections.includes(section.class_nbr)
        ? p.favorites
        : { ...p.favorites, sections: [...p.favorites.sections, section.class_nbr] };
      const existing = p.courses.find((c) => c.key === key);
      if (existing) {
        // merge in any sections we didn't have yet, and un-drop it
        const have = new Set(existing.sections.map((s) => s.class_nbr));
        const merged = [...existing.sections, ...siblings.filter((s) => !have.has(s.class_nbr))];
        return {
          ...p,
          favorites,
          courses: p.courses.map((c) => (c.key === key ? { ...c, sections: merged, dropped: false } : c)),
        };
      }
      added = true;
      return {
        ...p,
        favorites,
        courses: [
          ...p.courses,
          {
            key,
            subject: section.subject,
            catalog_nbr: section.catalog_nbr,
            descr: section.descr,
            component: section.component,
            campus,
            sections: siblings.length ? siblings : [section],
            dropped: false,
          },
        ],
      };
    });
    return added;
  },

  /** Add every section of a course (from the builder's own course search). */
  addCourse(sections: ClassSection[], campus?: string) {
    const byKey = new Map<string, ClassSection[]>();
    for (const s of sections) byKey.set(courseKey(s), [...(byKey.get(courseKey(s)) ?? []), s]);
    setPlan((p) => {
      const courses = [...p.courses];
      for (const [key, list] of byKey) {
        const i = courses.findIndex((c) => c.key === key);
        if (i >= 0) {
          courses[i] = { ...courses[i], sections: list, dropped: false };
          continue;
        }
        const s = list[0];
        courses.push({
          key,
          subject: s.subject,
          catalog_nbr: s.catalog_nbr,
          descr: s.descr,
          component: s.component,
          campus,
          sections: list,
          dropped: false,
        });
      }
      return { ...p, courses };
    });
  },

  /** Replace a course's sections with fresh seat counts. */
  refreshSections(key: string, sections: ClassSection[]) {
    const fresh = sections.filter((s) => courseKey(s) === key);
    if (fresh.length) mapCourse(key, (c) => ({ ...c, sections: fresh }));
  },

  removeCourse(key: string) {
    setPlan((p) => ({ ...p, courses: p.courses.filter((c) => c.key !== key) }));
  },

  toggleDropped(key: string) {
    mapCourse(key, (c) => ({ ...c, dropped: !c.dropped }));
  },

  setLocked(key: string, classNbr: number | undefined) {
    mapCourse(key, (c) => ({ ...c, locked: classNbr }));
  },

  toggleFavoriteSection(classNbr: number) {
    setPlan((p) => ({ ...p, favorites: { ...p.favorites, sections: toggle(p.favorites.sections, classNbr) } }));
  },

  toggleFavoriteInstructor(name: string) {
    setPlan((p) => ({ ...p, favorites: { ...p.favorites, instructors: toggle(p.favorites.instructors, name) } }));
  },

  toggleTime(t: TimeOfDay) {
    setPlan((p) => ({ ...p, favorites: { ...p.favorites, times: toggle(p.favorites.times, t) } }));
  },

  toggleDayOff(d: Day) {
    setPlan((p) => ({ ...p, favorites: { ...p.favorites, daysOff: toggle(p.favorites.daysOff, d) } }));
  },

  setOnlyOpen(onlyOpen: boolean) {
    setPlan((p) => ({ ...p, onlyOpen }));
  },

  addCommitment(c: Commitment) {
    setPlan((p) => ({ ...p, commitments: [...p.commitments, c] }));
  },

  updateCommitment(id: string, patch: Partial<Commitment>) {
    setPlan((p) => ({
      ...p,
      commitments: p.commitments.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  },

  removeCommitment(id: string) {
    setPlan((p) => ({ ...p, commitments: p.commitments.filter((c) => c.id !== id) }));
  },

  clearAll() {
    setPlan(() => EMPTY_PLAN);
  },
};

export function useSchedulePlan(): SchedulePlan {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
