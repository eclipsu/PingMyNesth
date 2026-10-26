import Link from "next/link";
import { SITE_URL, jsonLd } from "@/lib/site";

export type Crumb = { label: string; href: string };

/** Visible trail plus BreadcrumbList structured data, so results show the path. */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: `${SITE_URL}${c.href}`,
    })),
  };
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(data)} />
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1.5">
            {i ? <span aria-hidden>/</span> : null}
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="text-ink-2">
                {c.label}
              </span>
            ) : (
              <Link href={c.href} className="hover:text-ink hover:underline">
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
