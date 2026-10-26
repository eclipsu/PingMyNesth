import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/courses/Breadcrumbs";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { codeOf, coursePath, coursesIn, subjectBySlug, subjectSlug, subjects } from "@/lib/catalog";
import { pageMeta } from "@/lib/site";

type Props = { params: Promise<{ subject: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return subjects().map((s) => ({ subject: subjectSlug(s.subject) }));
}

export async function generateMetadata({ params }: Props) {
  const subject = subjectBySlug((await params).subject);
  if (!subject) return {};
  const count = coursesIn(subject.subject).length;
  return pageMeta({
    title: `${subject.name} (${subject.subject}) Courses at USM: Open Seats & Alerts`,
    description: `All ${count} ${subject.name} (${subject.subject}) courses at the University of Southern Mississippi. Check open seats and prerequisites, and get notified when a full ${subject.subject} class opens.`,
    path: `/courses/${subjectSlug(subject.subject)}`,
  });
}

export default async function SubjectPage({ params }: Props) {
  const subject = subjectBySlug((await params).subject);
  if (!subject) notFound();
  const courses = coursesIn(subject.subject);
  const path = `/courses/${subjectSlug(subject.subject)}`;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs
            crumbs={[
              { label: "Home", href: "/" },
              { label: "Courses", href: "/courses" },
              { label: subject.name, href: path },
            ]}
          />
          <p className="eyebrow mt-6">{subject.subject}</p>
          <h1 className="mt-3 text-5xl font-bold text-ink sm:text-6xl">{subject.name} courses at USM</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            {courses.length} {subject.name} course{courses.length === 1 ? "" : "s"} at Southern Miss. When a section
            you need is full, Ping My Nest can email you the moment a seat opens.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/search?q=${encodeURIComponent(subject.subject)}`} className="btn btn-primary">
              See open {subject.subject} seats
            </Link>
          </div>

          <ul className="mt-10 divide-y divide-line border-y border-line">
            {courses.map((c) => (
              <li key={c.catalog_nbr}>
                <Link href={coursePath(c)} className="flex items-baseline gap-4 py-3 hover:text-accent-ink">
                  <span className="w-24 shrink-0 font-semibold tabular-nums text-ink">{codeOf(c)}</span>
                  <span className="text-ink-2">{c.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
