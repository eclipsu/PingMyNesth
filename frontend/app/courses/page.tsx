import Link from "next/link";
import { Breadcrumbs } from "@/components/courses/Breadcrumbs";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { allCourses, subjectSlug, subjects } from "@/lib/catalog";
import { pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: "All USM Courses: Open Seats and Seat Alerts by Subject",
  description:
    "Every University of Southern Mississippi course by subject, from Accounting to Theatre. Pick a class to check open seats, prerequisites, and get notified when a full section opens.",
  path: "/courses",
});

export default function CoursesPage() {
  const list = subjects();
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs crumbs={[{ label: "Home", href: "/" }, { label: "Courses", href: "/courses" }]} />
          <h1 className="mt-6 text-5xl font-bold text-ink sm:text-6xl">USM courses</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">
            {allCourses().length.toLocaleString()} Southern Miss courses across {list.length} subjects. Open one to see what
            it needs first, check open seats, or get an email when a full section opens.
          </p>

          <ul className="mt-10 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((s) => (
              <li key={s.subject}>
                <Link
                  href={`/courses/${subjectSlug(s.subject)}`}
                  className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 text-ink hover:text-accent-ink"
                >
                  <span>
                    <span className="font-semibold">{s.name}</span>{" "}
                    <span className="text-sm text-muted">{s.subject}</span>
                  </span>
                  <span className="text-sm tabular-nums text-muted">{s.count}</span>
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
