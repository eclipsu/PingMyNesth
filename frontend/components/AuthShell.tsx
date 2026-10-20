import Link from "next/link";
import { BrandLogo } from "@/components/landing/BrandLogo";

/** Centered, card-free layout shared by signup and verify. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-[26rem]">
        <Link href="/" className="mx-auto mb-6 flex w-fit flex-col items-center">
          <BrandLogo className="h-16 w-16" priority />
        </Link>
        {children}
      </div>
    </main>
  );
}
