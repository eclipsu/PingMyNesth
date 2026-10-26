import Link from "next/link";
import { Breadcrumbs } from "@/components/courses/Breadcrumbs";
import { Footer } from "@/components/landing/Footer";
import { Navbar } from "@/components/landing/Navbar";
import { codeOf, courseByCode, coursePath } from "@/lib/catalog";
import { jsonLd, pageMeta } from "@/lib/site";

const PATH = "/notify-when-class-opens";

export const metadata = pageMeta({
  title: "How to Get Notified When a Full Class Opens at USM",
  description:
    "Class full at Southern Miss? Here's how to get an email alert the moment a seat opens in any USM class section, so you can register in SOAR before anyone else. Free.",
  path: PATH,
});

const POPULAR = ["MAT 101", "MAT 167", "ENG 101", "CSC 101", "BSC 110", "PSY 110", "HIS 101", "CHE 106"];

const faqs = [
  {
    q: "Can I get a notification when a class opens up at USM?",
    a: "Yes. Watch the section on Ping My Nest and we'll email you as soon as USM's class search shows an open seat in it. It's free and only needs your email.",
  },
  {
    q: "Does Ping My Nest register me for the class?",
    a: "No. We never touch your SOAR account. The alert tells you a seat is open; you register for it in SOAR yourself.",
  },
  {
    q: "Can I watch more than one section?",
    a: "Yes. Watching every section that fits your week gives you the best chance, since you only need one of them to open.",
  },
  {
    q: "Is this run by USM?",
    a: "No. Ping My Nest is a free student project. It reads the same public class search USM's own catalog page uses.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
};

const steps = [
  {
    title: "Find the class",
    body: (
      <>
        <Link href="/search" className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent">
          Search
        </Link>{" "}
        by course code, name or professor. You&apos;ll see every section with its days, times and seats left.
      </>
    ),
  },
  {
    title: "Hit Ping me on the full section",
    body: "Sign in with your email (no password), and we start watching that section. Watch a few sections if more than one works for you.",
  },
  {
    title: "Get the email",
    body: "When a seat opens, from a drop or added capacity, we email you right away.",
  },
  {
    title: "Register in SOAR",
    body: "Open SOAR and add the section. Open seats from drops usually go fast, so act on the email when it lands.",
  },
];

export default function NotifyPage() {
  const popular = POPULAR.map(courseByCode).filter((c) => c !== null);
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqJsonLd)} />
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <Breadcrumbs
            crumbs={[
              { label: "Home", href: "/" },
              { label: "Get notified when a class opens", href: PATH },
            ]}
          />
          <p className="eyebrow mt-6">Seat alerts</p>
          <h1 className="mt-3 text-5xl font-bold text-ink sm:text-6xl">Get notified when a full class opens at USM</h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">
            A full class in SOAR isn&apos;t closed for good. Seats open whenever someone drops, and they go to whoever
            notices first. Ping My Nest watches the sections you pick and emails you the moment one opens, so that&apos;s
            you instead of a refresh button.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/search" className="btn btn-primary">
              Find a class to watch
            </Link>
            <Link href="/signup" className="btn btn-secondary">
              Sign up free
            </Link>
          </div>

          <section className="mt-14" aria-labelledby="steps">
            <h2 id="steps" className="text-3xl font-bold text-ink">
              How it works
            </h2>
            <ol className="mt-6 space-y-5">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-ink">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-ink">{s.title}</h3>
                    <p className="mt-1 leading-relaxed text-ink-2">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-14" aria-labelledby="tips">
            <h2 id="tips" className="text-3xl font-bold text-ink">
              Better odds of getting in
            </h2>
            <ul className="mt-5 list-disc space-y-3 pl-5 leading-relaxed text-ink-2">
              <li>Watch every section you could take, not just your favorite. You only need one to open.</li>
              <li>
                Use the{" "}
                <Link href="/schedule" className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent">
                  schedule builder
                </Link>{" "}
                to see which sections fit around your other classes and work, so you know which ones are worth watching.
              </li>
              <li>
                Check what a course needs first on its page or in the{" "}
                <Link href="/prereqs" className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent">
                  prerequisite map
                </Link>
                , so a seat doesn&apos;t open for a class SOAR won&apos;t let you take.
              </li>
              <li>Keep seat-alert emails out of spam. Gmail tends to get them fastest.</li>
            </ul>
          </section>

          <section className="mt-14" aria-labelledby="popular">
            <h2 id="popular" className="text-3xl font-bold text-ink">
              Popular intro classes
            </h2>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {popular.map((c) => (
                <li key={codeOf(c)}>
                  <Link href={coursePath(c)} className="flex items-baseline gap-3 rounded-md border border-line bg-surface px-4 py-3 hover:border-ink">
                    <span className="font-semibold text-ink">{codeOf(c)}</span>
                    <span className="truncate text-sm text-ink-2">{c.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/courses" className="mt-4 inline-block text-sm font-semibold text-ink hover:underline">
              Browse every USM course
            </Link>
          </section>

          <section className="mt-14" aria-labelledby="faq">
            <h2 id="faq" className="text-3xl font-bold text-ink">
              Questions
            </h2>
            <dl className="mt-5 divide-y divide-line border-y border-line">
              {faqs.map((f) => (
                <div key={f.q} className="py-5">
                  <dt className="font-semibold text-ink">{f.q}</dt>
                  <dd className="mt-2 leading-relaxed text-ink-2">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
