"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, Bell, Gauge, ShieldAlert, Sparkles, Users, Wrench } from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { usePingApi } from "@/hooks/usePingApi";
import { cn } from "@/lib/cn";
import { CyclesTab, EventsTab, OverviewTab, ToolsTab, UsersTab, WatchesTab } from "@/components/admin/tabs";

const tabs = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "users", label: "Users", icon: Users },
  { id: "watches", label: "Watches", icon: Bell },
  { id: "events", label: "Seat openings", icon: Sparkles },
  { id: "cycles", label: "Worker cycles", icon: Activity },
  { id: "tools", label: "Tools", icon: Wrench },
] as const;

type TabId = (typeof tabs)[number]["id"];

function AdminInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { sessionChecked, user } = usePingApi();
  const tab = (tabs.find((t) => t.id === params.get("tab"))?.id ?? "overview") as TabId;

  useEffect(() => {
    if (sessionChecked && !user) router.replace("/signup");
  }, [sessionChecked, user, router]);

  if (!sessionChecked || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="skeleton h-12 w-64 rounded" />
        <div className="skeleton mt-8 h-64 w-full rounded-md" />
      </div>
    );
  }

  if (!user.admin) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-full-soft text-full">
          <ShieldAlert className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-6 text-4xl font-bold">Admins only</h1>
        <p className="mt-3 text-muted">This account doesn&apos;t have access to the admin panel.</p>
        <Link href="/watches" className="btn btn-primary mt-8">
          Back to your nest
        </Link>
      </div>
    );
  }

  const select = (id: TabId) => router.replace(id === "overview" ? "/admin" : `/admin?tab=${id}`, { scroll: false });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="mt-3 text-5xl font-bold sm:text-6xl">Control room</h1>
        </div>
        <p className="inline-flex items-center gap-2 font-mono text-[13px] text-muted">
          <span className="live-dot" aria-hidden />
          Signed in as {user.email}
        </p>
      </div>

      <nav className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label="Admin sections">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <li key={t.id} className="relative">
                <button
                  type="button"
                  onClick={() => select(t.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-3 text-sm font-semibold transition-colors",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {t.label}
                </button>
                {active ? (
                  <motion.span
                    layoutId="admin-tab"
                    className="absolute inset-x-2 -bottom-px h-[3px] bg-accent"
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="mt-8"
      >
        {tab === "overview" && <OverviewTab />}
        {tab === "users" && <UsersTab selfId={user.id} />}
        {tab === "watches" && <WatchesTab />}
        {tab === "events" && <EventsTab />}
        {tab === "cycles" && <CyclesTab />}
        {tab === "tools" && <ToolsTab email={user.email} />}
      </motion.div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 bg-bg">
        <Suspense fallback={null}>
          <AdminInner />
        </Suspense>
      </main>
    </>
  );
}
