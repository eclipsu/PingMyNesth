import Link from "next/link";
import Image from "next/image";
import { BrandLogo } from "./BrandLogo";

const quickLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#faq", label: "FAQ" },
  { href: "/search", label: "Search" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black py-14 text-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 sm:px-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-sm">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <BrandLogo className="h-8 w-8" title="Ping My Nest" />
            <span className="text-sm font-semibold tracking-tight text-white">
              Ping My Nest
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-white/55">
            Course availability alerts for University of Southern Mississippi
            students. Made by USM students.
          </p>
          <Image
            src="/images/usmlogo.webp"
            alt="University of Southern Mississippi seal"
            width={56}
            height={56}
            className="mt-5 opacity-80"
          />
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/75 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold">
              Company
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <a
                  href="https://github.com/oscusm/PingMyNest"
                  className="text-sm text-white/75 transition-colors hover:text-gold"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="text-sm text-white/75 transition-colors hover:text-gold"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold">
              Legal
            </p>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-white/75 transition-colors hover:text-gold"
                >
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-[1280px] flex-col gap-2 border-t border-white/10 px-5 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>© {new Date().getFullYear()} Ping My Nest</p>
        <p>Made by USM students.</p>
      </div>
    </footer>
  );
}
