"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CourseIndex, ProfessorIndex } from "@/lib/courseIndex";
import { PrereqGraph } from "@/lib/prereqGraph";

type Indexes = { courses: CourseIndex; professors: ProfessorIndex; prereqs: PrereqGraph };

// One catalog fetch + one trie build per page load, shared by every search box.
let pending: Promise<Indexes> | null = null;

function loadIndexes(): Promise<Indexes> {
  pending ??= api
    .courses()
    .then((catalog) => ({
      courses: new CourseIndex(catalog),
      professors: new ProfessorIndex(catalog.instructors ?? []),
      prereqs: new PrereqGraph(catalog.courses),
    }))
    .catch((err) => {
      pending = null; // let the next mount retry
      throw err;
    });
  return pending;
}

function useIndexes(): Indexes | null {
  const [indexes, setIndexes] = useState<Indexes | null>(null);
  useEffect(() => {
    let alive = true;
    loadIndexes()
      .then((ix) => alive && setIndexes(ix))
      .catch(() => {
        /* autocomplete is optional; plain "MAT 101" search still works */
      });
    return () => {
      alive = false;
    };
  }, []);
  return indexes;
}

/** Course autocomplete index, or null while it loads (or if the API is down). */
export function useCourseIndex(): CourseIndex | null {
  return useIndexes()?.courses ?? null;
}

/** Prerequisite graph over the catalog, or null while it loads. */
export function usePrereqGraph(): PrereqGraph | null {
  return useIndexes()?.prereqs ?? null;
}

/** USM instructor autocomplete index, or null while it loads. */
export function useProfessorIndex(): ProfessorIndex | null {
  return useIndexes()?.professors ?? null;
}
