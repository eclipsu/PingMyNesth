import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { BehindTheScenes } from "@/components/landing/BehindTheScenes";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { faqs } from "@/components/landing/faqs";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, jsonLd, pageMeta } from "@/lib/site";

export const metadata = pageMeta({
  title: `${SITE_TITLE} | ${SITE_NAME}`,
  absoluteTitle: true,
  description: SITE_DESCRIPTION,
  path: "/",
});

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(faqJsonLd)} />
        <Hero />
        <HowItWorks />
        <BehindTheScenes />
        <Features />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
