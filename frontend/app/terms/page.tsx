import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { LegalSection } from "@/components/legal/ReviewNote";

export const metadata: Metadata = {
  title: "Terms & Conditions | Ping My Nest",
  description: "The terms for using Ping My Nest seat alerts.",
};

const linkClass =
  "font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-4 text-5xl font-bold text-ink sm:text-6xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            The short version: it&apos;s a free helper, it can miss things, and SOAR is always the
            source of truth.
          </p>
          <p className="mt-3 text-sm text-muted">
            Last updated: October 22, 2026
          </p>

          <LegalSection title="Using Ping My Nest">
            <p>
              Ping My Nest is a free tool that watches public University of Southern Mississippi
              class availability and emails you when a seat opens in a section you choose. By
              signing up or using the site, you agree to these terms.
            </p>
            <p>
              Ping My Nest is a student project and is not operated by, endorsed by, or affiliated
              with the University of Southern Mississippi. Ping My Nest is operated by oscusm.
            </p>
          </LegalSection>

          <LegalSection title="Your account">
            <p>
              You need a USM or Gmail address to watch sections. Keep access to your inbox secure,
              since sign-in links are sent there. One account per person, please.
            </p>
          </LegalSection>

          <LegalSection title="No guarantee of a seat">
            <p>
              Alerts are best-effort. Seat data comes from USM&apos;s public Class Search and can be
              delayed, wrong, or unavailable. An alert does not reserve a seat, and someone else may
              register first. Always confirm availability and register in SOAR. We are not
              responsible for missed registrations, holds, prerequisites, or other enrollment
              issues.
            </p>
          </LegalSection>

          <LegalSection title="Acceptable use">
            <p>Please don&apos;t:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>scrape, overload, or try to bypass the rate limits of Ping My Nest or USM systems;</li>
              <li>sign up with someone else&apos;s email address;</li>
              <li>use the service to violate USM policies or any law.</li>
            </ul>
            <p>We may suspend accounts that do any of these.</p>
          </LegalSection>

          <LegalSection title="Changes to the service">
            <p>
              We may change, pause, or shut down Ping My Nest at any time, including during
              registration periods, for example if USM changes its Class Search or asks us to stop.
            </p>
          </LegalSection>

          <LegalSection title="Disclaimer and liability">
            <p>
              Ping My Nest is provided &quot;as is&quot; without warranties of any kind. To the
              fullest extent allowed by law, we are not liable for any damages arising from your use
              of the service.
            </p>
          </LegalSection>

          <LegalSection title="Governing law">
            <p>
              These terms are governed by the laws of the State of Mississippi.
            </p>
          </LegalSection>

          <LegalSection title="Privacy and contact">
            <p>
              How we handle your data is described in our{" "}
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              . Questions about these terms? Open an issue on{" "}
              <a href="https://github.com/oscusm/PingMyNest/issues" className={linkClass} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              .
            </p>
          </LegalSection>
        </article>
      </main>
      <Footer />
    </>
  );
}
