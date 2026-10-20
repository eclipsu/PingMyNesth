"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { CourseCombobox } from "@/components/search/CourseCombobox";
import { PrereqMap } from "@/components/prereqs/PrereqMap";
import { usePrereqGraph } from "@/hooks/useCourseIndex";

const DEFAULT_COURSE = "MAT 280";

function PrereqsInner() {
  const router = useRouter();
  const params = useSearchParams();
  const graph = usePrereqGraph();
  const target = (params.get("course") ?? DEFAULT_COURSE).toUpperCase();
  const [query, setQuery] = useState("");

  const select = (code: string) => {
    setQuery("");
    router.replace(`/prereqs?course=${encodeURIComponent(code)}`, { scroll: false });
  };

  const known = graph?.has(target);
  const node = graph?.node(target);
  const groups = graph?.groups(target) ?? [];
  const plan = graph && groups.length ? graph.plan(target) : [];
  const unlocks = graph?.unlocks(target) ?? [];
  const unlocksAll = graph?.unlocksAll(target) ?? [];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
            <p className="eyebrow">Prerequisites</p>
            <h1 className="mt-4 text-5xl font-bold text-ink sm:text-6xl">Prereq map</h1>
            <p className="mt-3 max-w-xl text-muted">
              See everything you need before a course, the fastest order to take it, and what it
              opens up next.
            </p>
            <form className="mt-6 max-w-xl" onSubmit={(e) => e.preventDefault()}>
              <CourseCombobox
                value={query}
                onChange={setQuery}
                onPick={(s) => s.kind === "course" && select(s.query)}
                placeholder="Pick a course: Calculus III, PHY 202, CSC 306"
                ariaLabel="Course for the prerequisite map"
                inputClassName="input h-13 text-base"
              />
            </form>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          {!graph ? (
            <div className="skeleton h-72 w-full rounded-md" />
          ) : !known ? (
            <p className="text-muted">
              We don&apos;t have {target} in the catalog yet. Pick another course above.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-4xl font-bold text-ink">{target}</h2>
                  <p className="mt-1 text-ink-2">{node?.title}</p>
                </div>
                <div className="flex flex-wrap items-center gap-5 text-sm text-ink-2" aria-label="Legend">
                  <span className="flex items-center gap-2">
                    <svg width="34" height="10" aria-hidden>
                      <line x1="0" y1="5" x2="26" y2="5" stroke="var(--ink)" strokeWidth="1.6" />
                      <path d="M26 1 L34 5 L26 9 z" fill="var(--ink)" />
                    </svg>
                    Required
                  </span>
                  <span className="flex items-center gap-2">
                    <svg width="34" height="10" aria-hidden>
                      <line x1="0" y1="5" x2="26" y2="5" stroke="var(--muted)" strokeWidth="1.6" strokeDasharray="6 5" />
                      <path d="M26 1 L34 5 L26 9 z" fill="var(--muted)" />
                    </svg>
                    One of these
                  </span>
                  <span className="text-muted">Hover a course to trace its chain. Click to re-center.</span>
                </div>
              </div>

              <div className="mt-8">
                {groups.length ? (
                  <PrereqMap graph={graph} target={target} onSelect={select} />
                ) : (
                  <p className="border-l-4 border-accent pl-4 text-ink-2">
                    No course prerequisites listed. You can take {target} without another course
                    first.
                  </p>
                )}
              </div>

              <div className="mt-12 grid gap-10 lg:grid-cols-3">
                {plan.length > 1 ? (
                  <section aria-labelledby="plan-heading">
                    <h3 id="plan-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                      Fastest path · {plan.length} semesters
                    </h3>
                    <ol className="mt-4 space-y-3">
                      {plan.map((sem, i) => (
                        <li key={i} className="flex gap-4">
                          <span className="w-6 shrink-0 font-display text-2xl font-extrabold leading-none text-line-strong">
                            {i + 1}
                          </span>
                          <span className="flex flex-wrap gap-1.5">
                            {sem.map((code) => (
                              <button key={code} type="button" onClick={() => select(code)} className="chip h-8">
                                {code}
                              </button>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 text-xs text-muted">
                      Picks the shortest option wherever you have a choice. Check your degree plan.
                    </p>
                  </section>
                ) : null}

                <section aria-labelledby="unlocks-heading">
                  <h3 id="unlocks-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                    Unlocks next
                  </h3>
                  {unlocks.length ? (
                    <>
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {unlocks.map((code) => (
                          <button key={code} type="button" onClick={() => select(code)} className="chip h-8">
                            {code}
                          </button>
                        ))}
                      </div>
                      {unlocksAll.length > unlocks.length ? (
                        <p className="mt-3 text-sm text-muted">
                          {unlocksAll.length} courses in total build on {target}.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-muted">Nothing in our catalog lists {target} as a prerequisite.</p>
                  )}
                </section>

                <section aria-labelledby="usm-heading">
                  <h3 id="usm-heading" className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                    USM&apos;s wording
                  </h3>
                  <p className="mt-4 border-l-4 border-line-strong pl-4 text-sm leading-relaxed text-ink-2">
                    {node?.requirement || "No requirement text listed."}
                  </p>
                  <Link
                    href={`/search?q=${encodeURIComponent(target)}`}
                    className="btn btn-primary btn-sm mt-5"
                  >
                    See {target} sections
                  </Link>
                </section>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PrereqsPage() {
  return (
    <Suspense fallback={null}>
      <PrereqsInner />
    </Suspense>
  );
}
