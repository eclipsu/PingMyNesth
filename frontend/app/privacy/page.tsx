import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { LegalSection, ReviewNote } from "@/components/legal/ReviewNote";

export const metadata: Metadata = {
  title: "Privacy Policy | Ping My Nest",
  description:
    "What Ping My Nest stores, and how we use public USM class search data.",
};

const linkClass =
  "font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="eyebrow">Legal</p>
          <h1 className="mt-4 text-5xl font-bold text-ink sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Built for USM students. We keep data collection minimal.
          </p>
          <p className="mt-3 text-sm text-muted">
            Last updated: <ReviewNote>effective date</ReviewNote>
          </p>

          <LegalSection title="Who we are">
            <p>
              Ping My Nest is a student-built project that alerts University of Southern
              Mississippi students when a seat opens in a class section. It is not operated by or
              affiliated with the University of Southern Mississippi.{" "}
              <ReviewNote>legal name of the operator (you, a student org, or a company)</ReviewNote>
            </p>
          </LegalSection>

          <LegalSection title="What we store">
            <p>
              We store your verified USM email and the class sections you choose to watch. We
              don&apos;t store other personal profile data, passwords, or browsing history beyond
              what&apos;s needed to run alerts.
            </p>
            <ul className="space-y-2.5">
              {[
                "Verified USM email (so we can send seat alerts)",
                "Your watches (which sections you asked us to monitor)",
                "Single-use sign-in links, which expire",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-ink-2"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-open" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p>
              Seat counts come from USM&apos;s public Class Search. We use them to detect when a
              watched section opens; we don&apos;t access your SOAR login or private student
              records.
            </p>
          </LegalSection>

          <LegalSection title="Cookies and browser storage">
            <p>
              When you sign in we set two session cookies so you stay signed in: a short-lived
              access cookie (15 minutes) and a refresh cookie (30 days, renewed while you use the
              site). Both are httpOnly, so scripts on the page can&apos;t read them. Signing out
              ends your session on every device. We don&apos;t use advertising or analytics
              cookies. <ReviewNote>update this if you add analytics</ReviewNote>
            </p>
          </LegalSection>

          <LegalSection title="Server logs and rate limiting">
            <p>
              To protect the service and USM systems, our API rate-limits requests by IP address.
              IP addresses are held in memory for this purpose and are not tied to your account.{" "}
              <ReviewNote>confirm what your host (e.g. Vercel, Fly.io) logs and for how long</ReviewNote>
            </p>
          </LegalSection>

          <LegalSection title="Who we share data with">
            <p>
              We don&apos;t sell your data. Alert and sign-in emails are delivered through a
              third-party email relay, which receives your email address and the message
              content. <ReviewNote>confirm the provider (currently Resend, resend.com) and link its privacy policy</ReviewNote>
            </p>
          </LegalSection>

          <LegalSection title="How long we keep it">
            <p>
              We keep your email and watches while your account is active.{" "}
              <ReviewNote>set a retention period, e.g. delete inactive accounts after a semester</ReviewNote>
            </p>
          </LegalSection>

          <LegalSection title="Your choices">
            <p>
              You can stop any watch from your watches page. To delete your account and all
              associated data, contact us at <ReviewNote>contact email</ReviewNote> and we will
              remove it.
            </p>
          </LegalSection>

          <LegalSection title="University guidance">
            <p>
              Class availability information used by Ping My Nest is publicly available. USM
              Information Security provided the following guidance:{" "}
              <ReviewNote>confirm this is an exact quote you have permission to publish</ReviewNote>
            </p>
            <blockquote className="space-y-3 border-l-2 border-accent pl-5 leading-relaxed text-muted">
              <p>
                Since the information involved is publicly available, we do not have specific
                guidance to provide regarding the collection or use of that data beyond ensuring
                that all activity complies with applicable laws, policies, terms of use, and
                university requirements.
              </p>
              <p>
                Information Security does not generally modify, disable, or make exceptions to
                security monitoring or protective controls for individual projects. Our security
                controls and monitoring processes remain in place to protect university systems
                and resources.
              </p>
              <p>
                If you have specific questions regarding university policy, acceptable use
                requirements, or concerns about how your activity may interact with university
                systems, please let us know and we will be happy to review those questions and
                provide any guidance we can.
              </p>
            </blockquote>
            <p>
              We rate-limit polling and design the service to stay conservative with university
              systems.
            </p>
          </LegalSection>

          <LegalSection title="Changes and contact">
            <p>
              If we change this policy we will update the date above. Questions? Open an issue on{" "}
              <a
                href="https://github.com/oscusm/PingMyNest"
                className={linkClass}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              . See also our{" "}
              <Link href="/terms" className={linkClass}>
                Terms &amp; Conditions
              </Link>
              .
            </p>
          </LegalSection>
        </article>
      </main>
      <Footer />
    </>
  );
}
