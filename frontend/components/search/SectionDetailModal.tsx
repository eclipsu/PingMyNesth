"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Bell, Calendar, Clock, Hash, MapPin, User, X } from "lucide-react";
import { SeatBadge, SeatMeter } from "@/components/ui/Seats";
import {
  formatDays,
  formatTimeRange,
  instructorLabel,
  seatStatus,
  type ClassSection,
} from "@/lib/api";

type Props = {
  section: ClassSection;
  onClose: () => void;
  onPing: () => void;
  pinging?: boolean;
  /** Visitor tried to watch while signed out — swap the CTA for a sign-in prompt. */
  needsSignIn?: boolean;
};

export function SectionDetailModal({ section, onClose, onPing, pinging, needsSignIn }: Props) {
  const status = seatStatus(section);
  const professor = instructorLabel(section);
  const days = formatDays(section.days);
  const time = formatTimeRange(section.start_time, section.end_time);
  const avail = section.enrollment_available ?? 0;
  const cap = section.class_capacity ?? 0;
  const full = status === "FULL";

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink/30 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_150ms_ease-out]" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-[81] max-h-[92vh] overflow-y-auto rounded-t-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)] outline-none data-[state=open]:animate-[sheet-in_220ms_cubic-bezier(0.22,1,0.36,1)] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:p-7 sm:data-[state=open]:animate-[pop-in_180ms_ease-out]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted">§{section.class_section}</span>
                <SeatBadge status={status} />
              </div>
              <Dialog.Title className="mt-2 text-2xl font-bold text-ink">
                {section.subject} {section.catalog_nbr}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-ink-2">{section.descr}</Dialog.Description>
            </div>
            <Dialog.Close
              className="-mr-2 -mt-1 rounded-lg p-2 text-muted hover:bg-subtle hover:text-ink"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <SeatMeter status={status} avail={avail} cap={cap} className="mt-6 border-y border-line py-4" />

          <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
            <DetailItem icon={<User className="h-4 w-4" />} label="Professor" value={professor || "Staff"} />
            <DetailItem icon={<Calendar className="h-4 w-4" />} label="Days" value={days || "TBA"} />
            <DetailItem icon={<Clock className="h-4 w-4" />} label="Time" value={time || "TBA"} />
            <DetailItem icon={<Hash className="h-4 w-4" />} label="CRN" value={String(section.class_nbr)} mono />
            {section.campus ? (
              <DetailItem icon={<MapPin className="h-4 w-4" />} label="Campus" value={section.campus} />
            ) : null}
          </dl>

          {needsSignIn ? (
            <div className="mt-7 border-t border-line pt-5">
              <p className="font-semibold text-ink">Sign in to get seat alerts</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">
                We&apos;ll email a sign-in link to your USM or Gmail address. Once you&apos;re in, come back
                and hit Ping me on {section.subject} {section.catalog_nbr}.
              </p>
              <Link href="/signup" className="btn btn-accent mt-4 w-full">
                Continue with email
              </Link>
            </div>
          ) : (
            <button
              type="button"
              disabled={pinging}
              onClick={onPing}
              className="btn btn-accent mt-7 h-12 w-full"
            >
              <Bell className="h-4 w-4" aria-hidden />
              {pinging ? "Saving…" : full ? "Ping me when a seat opens" : "Watch this section"}
            </button>
          )}
          <p className="mt-3 text-center text-xs text-muted">
            One email per opening. Stop watching anytime.
          </p>
          <Link
            href={`/prereqs?course=${encodeURIComponent(`${section.subject} ${section.catalog_nbr}`)}`}
            className="mt-4 block text-center text-sm font-semibold text-ink underline decoration-accent decoration-2 underline-offset-4"
          >
            Prerequisite map for {section.subject} {section.catalog_nbr}
          </Link>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetailItem({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 text-muted">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className={mono ? "font-mono text-sm text-ink" : "text-sm font-medium text-ink"}>
          {value}
        </dd>
      </div>
    </div>
  );
}
