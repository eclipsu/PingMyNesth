"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrandLogo } from "./BrandLogo";
import { usePingApi } from "@/hooks/usePingApi";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it Works" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const { user, sessionChecked } = usePingApi();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const accountLabel = user ? user.email.split("@")[0] : "Sign In";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
        scrolled ? "border-b border-white/10 bg-black/90" : "bg-transparent"
      }`}
    >
      <nav
        className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:h-[4.5rem] sm:px-8"
        aria-label="Primary"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLogo className="h-9 w-9" title="Ping My Nest" priority />
          <span className="text-[15px] font-semibold tracking-tight text-white sm:text-base">
            Ping My Nest
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-gold"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {sessionChecked && user ? (
            <>
              <Link
                href="/watches"
                className="text-sm font-medium text-white/70 transition-colors hover:text-gold"
              >
                {accountLabel}
              </Link>
              <Link href="/search" className="btn btn-gold !py-2.5 !px-4 text-sm">
                Search
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:text-gold"
              >
                Sign In
              </Link>
              <Link href="/signup" className="btn btn-gold !py-2.5 !px-4 text-sm">
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 top-16 z-40 bg-black/70 md:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="relative z-50 border-b border-white/10 bg-surface px-5 py-6 md:hidden"
            >
              <ul className="flex flex-col gap-4">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="block text-base font-medium text-white"
                      onClick={() => setOpen(false)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3">
                {sessionChecked && user ? (
                  <>
                    <p className="text-sm text-white/55">{user.email}</p>
                    <Link
                      href="/watches"
                      className="btn btn-ghost w-full"
                      onClick={() => setOpen(false)}
                    >
                      My watches
                    </Link>
                    <Link
                      href="/search"
                      className="btn btn-gold w-full"
                      onClick={() => setOpen(false)}
                    >
                      Search classes
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/signup"
                      className="btn btn-ghost w-full"
                      onClick={() => setOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="btn btn-gold w-full"
                      onClick={() => setOpen(false)}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
