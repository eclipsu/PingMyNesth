/**
 * Visible marker for legal copy the owner still has to customize or get reviewed.
 * Search the codebase for <ReviewNote before launch; none should remain.
 */
export function ReviewNote({ children }: { children: React.ReactNode }) {
  return (
    <mark className="rounded-md bg-low-soft px-1.5 py-0.5 font-medium text-low [box-decoration-break:clone]">
      [To review: {children}]
    </mark>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-4 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}
