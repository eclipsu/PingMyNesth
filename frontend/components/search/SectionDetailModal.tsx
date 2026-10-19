"use client";

import { useEffect } from "react";
import {
  Calendar,
  Clock,
  Eye,
  User,
  Users,
  X,
} from "lucide-react";
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
};

export function SectionDetailModal({ section, onClose, onPing, pinging }: Props) {
  const status = seatStatus(section);
  const professor = instructorLabel(section);
  const days = formatDays(section.days);
  const time = formatTimeRange(section.start_time, section.end_time);
  const avail = section.enrollment_available ?? 0;
  const cap = section.class_capacity ?? 0;
  const full = status === "FULL";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="section-detail-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gold/25 bg-surface p-5 text-white shadow-[0_30px_80px_rgba(0,0,0,0.55)] sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="section-detail-title" className="text-2xl font-bold tracking-tight text-gold">
              {section.subject}
              {section.catalog_nbr}
            </h2>
            <p className="mt-1 text-lg font-semibold leading-snug">{section.descr}</p>
            <p className="mt-2 text-sm text-white/45">
              Section {section.class_section} · CRN {section.class_nbr}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 p-2 text-white/50 hover:border-gold hover:text-gold"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3 rounded-xl border border-white/10 bg-black/50 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">Seats</p>
            <p
              className={`mt-1 text-sm font-semibold ${
                full ? "text-danger" : status === "1 LEFT" ? "text-gold" : "text-success"
              }`}
            >
              {full ? "No seats left" : status === "1 LEFT" ? "1 seat left" : `${avail} seats left`}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-3xl font-bold leading-none ${
                full ? "text-danger" : status === "1 LEFT" ? "text-gold" : "text-success"
              }`}
            >
              {avail}
            </p>
            <p className="mt-1 text-xs text-white/40">of {cap}</p>
          </div>
        </div>

        <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-black/40 px-4">
          <DetailRow
            icon={<User className="h-4 w-4" />}
            label="Professor"
            value={professor || "TBA"}
          />
          <DetailRow
            icon={<Calendar className="h-4 w-4" />}
            label="Days"
            value={days || "TBA"}
          />
          <DetailRow
            icon={<Clock className="h-4 w-4" />}
            label="Time"
            value={time || "TBA"}
          />
          <DetailRow
            icon={<Users className="h-4 w-4" />}
            label="CRN"
            value={String(section.class_nbr)}
          />
          <DetailRow
            icon={<Eye className="h-4 w-4" />}
            label="Watching"
            value="Join the nest"
            sub="We'll ping you when a seat opens"
          />
        </div>

        {section.campus ? (
          <div className="mt-5">
            <p className="text-sm font-bold text-gold">Campus</p>
            <p className="mt-1 text-sm text-white/65">{section.campus}</p>
          </div>
        ) : null}

        {section.descr ? (
          <div className="mt-5">
            <p className="text-sm font-bold text-gold">Description</p>
            <p className="mt-1 text-sm leading-relaxed text-white/65">{section.descr}</p>
          </div>
        ) : null}

        <button
          type="button"
          disabled={pinging}
          onClick={onPing}
          className="btn btn-gold mt-6 w-full !rounded-xl disabled:opacity-60"
        >
          {pinging ? "Saving…" : full ? "Ping Me when a seat opens" : "Watch this section"}
        </button>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-3.5">
      <span className="mt-0.5 text-gold">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-white/45">{label}</p>
        <p className="font-semibold text-white">{value}</p>
        {sub ? <div className="mt-0.5 text-sm text-white/55">{sub}</div> : null}
      </div>
    </div>
  );
}
