import type { Metadata, Viewport } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { SCHOOL, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, jsonLd } from "@/lib/site";
import "./globals.css";

// One variable family: normal width for body, extra-condensed (font-stretch) for headings
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_TITLE} | ${SITE_NAME}`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "USM class seat alerts",
    "notify when class opens",
    "class availability notification",
    "open seat alert",
    "full class notification",
    "Southern Miss class search",
    "USM SOAR registration",
    "USM schedule builder",
    "University of Southern Mississippi courses",
    "Golden Eagles registration",
  ],
  category: "education",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#ffc72c",
};

// Who runs the site and what it is, for search engines and AI answers
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/images/eaglesnest-mark.png`,
      sameAs: ["https://github.com/oscusm/PingMyNest"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#org` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      audience: { "@type": "EducationalAudience", educationalRole: "student", name: `${SCHOOL} students` },
      featureList: [
        "Email alert when a full class section opens",
        "Search every USM class section with live seat counts",
        "Schedule builder that finds clash-free schedules",
        "Prerequisite map",
      ],
      publisher: { "@id": `${SITE_URL}/#org` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(siteJsonLd)} />
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              borderRadius: "0.5rem",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow-float)",
              fontFamily: "var(--font-archivo)",
            },
          }}
        />
      </body>
    </html>
  );
}
