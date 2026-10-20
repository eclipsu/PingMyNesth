"use client";

import { useCallback } from "react";
import { useCourseIndex, useProfessorIndex } from "@/hooks/useCourseIndex";
import type { ProfessorSuggestion, Suggestion } from "@/lib/courseIndex";
import { Combobox, type ComboboxProps } from "./Combobox";

type Passthrough<T> = Omit<ComboboxProps<T>, "suggest" | "itemKey" | "renderItem">;

/** Course search with trie suggestions ("calc", "Calculus I", "MAT 16"). */
export function CourseCombobox(props: Passthrough<Suggestion>) {
  const index = useCourseIndex();
  const suggest = useCallback((q: string) => index?.search(q, 8) ?? [], [index]);
  return (
    <Combobox
      {...props}
      suggest={suggest}
      itemKey={(s) => s.query}
      renderItem={(s) => (
        <>
          <span className="w-20 shrink-0 font-display text-lg font-extrabold uppercase leading-none">
            {s.query}
          </span>
          <span className="min-w-0 truncate text-sm text-ink-2">
            {s.kind === "course" ? s.title : `${s.name} · all courses`}
          </span>
        </>
      )}
    />
  );
}

/** USM instructor search ("chen", "ching", "zhifu x"). */
export function ProfessorCombobox(props: Passthrough<ProfessorSuggestion>) {
  const index = useProfessorIndex();
  const suggest = useCallback((q: string) => index?.search(q, 8) ?? [], [index]);
  return (
    <Combobox
      {...props}
      suggest={suggest}
      itemKey={(p) => p.name + p.subjects.join()}
      renderItem={(p) => (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{p.name}</span>
          <span className="block truncate text-xs text-muted">{p.subjects.join(" · ")}</span>
        </span>
      )}
    />
  );
}
