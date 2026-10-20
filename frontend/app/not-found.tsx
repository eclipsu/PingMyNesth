import Link from "next/link";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex flex-1 items-center">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <p className="eyebrow">404</p>
          <h1 className="mt-4 text-6xl font-extrabold text-ink sm:text-7xl">Page not found</h1>
          <p className="mt-4 max-w-md text-lg text-muted">
            That page doesn&apos;t exist. The class you&apos;re after probably does.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/search" className="btn btn-primary">
              Search classes
            </Link>
            <Link href="/" className="btn btn-secondary">
              Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
