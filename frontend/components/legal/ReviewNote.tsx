export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-4 leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}
