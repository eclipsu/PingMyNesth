import type { Metadata } from "next";

/** Canonical origin; the apex domain redirects here. */
export const SITE_URL = "https://www.pingmynest.lol";
export const SITE_NAME = "Ping My Nest";
export const SCHOOL = "The University of Southern Mississippi";

export const SITE_TITLE = "USM Class Seat Alerts: Get Notified When a Full Class Opens";
export const SITE_DESCRIPTION =
  "Free seat alerts for Southern Miss students. Watch any full USM class and get an email the moment a seat opens, plus a schedule builder and prerequisite map. No more refreshing SOAR.";

/**
 * Per-page metadata with its own canonical URL. Next merges metadata
 * shallowly, so openGraph and twitter are rebuilt here rather than inherited.
 */
export function pageMeta({
  title,
  description,
  path,
  noindex,
  absoluteTitle,
}: {
  title: string;
  /** skip the "| Ping My Nest" suffix (the homepage, which writes its own) */
  absoluteTitle?: boolean;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title, description, images: [SHARE_IMAGE] },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** The share card from app/opengraph-image.tsx; pages that set openGraph don't inherit it. */
const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Ping My Nest: get an email the moment a seat opens in a full USM class",
};

/** JSON for a <script type="application/ld+json">, safe to inline in HTML. */
export function jsonLd(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
