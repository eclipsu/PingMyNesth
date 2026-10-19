"use client";

import Image from "next/image";
import { Bell, Calendar, Clock, User, Users } from "lucide-react";

type Status = "OPEN" | "FULL" | "1 LEFT";

const courses: {
  code: string;
  section: string;
  campus: string;
  title: string;
  professor: string;
  days: string;
  time: string;
  avail: number;
  cap: number;
  crn: number;
  status: Status;
}[] = [
  {
    code: "CSC 111",
    section: "003",
    campus: "HBG",
    title: "Computer Science I",
    professor: "Dr. Rahimi",
    days: "Mon · Wed · Fri",
    time: "10:00 - 10:50",
    avail: 2,
    cap: 30,
    crn: 4257,
    status: "1 LEFT",
  },
  {
    code: "MAT 101",
    section: "H005",
    campus: "HBG",
    title: "College Algebra",
    professor: "Dr. Nguyen",
    days: "Tue · Thu",
    time: "1:00 - 2:15",
    avail: 8,
    cap: 50,
    crn: 1179,
    status: "OPEN",
  },
  {
    code: "ENG 101",
    section: "012",
    campus: "HBG",
    title: "Composition I",
    professor: "Prof. Hayes",
    days: "Mon · Wed · Fri",
    time: "9:00 - 9:50",
    avail: 0,
    cap: 28,
    crn: 2204,
    status: "FULL",
  },
];

const statusStyles: Record<Status, string> = {
  OPEN: "border-success/35 bg-success/20 text-success",
  FULL: "border-danger/35 bg-danger/20 text-danger",
  "1 LEFT": "border-gold/45 bg-gold/20 text-gold",
};

const seatAccent: Record<Status, string> = {
  OPEN: "text-success",
  FULL: "text-danger",
  "1 LEFT": "text-gold",
};

function seatCaption(status: Status, avail: number) {
  if (status === "FULL") return "No seats left";
  if (status === "1 LEFT") return "1 seat left";
  return `${avail} seats left`;
}

type DashboardMockProps = {
  compact?: boolean;
  phone?: boolean;
  className?: string;
};

function MockLogo({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/images/eaglesnest.png"
      alt=""
      width={536}
      height={537}
      className="object-contain"
      style={{ height: size, width: size }}
    />
  );
}

function SectionCard({
  course,
  dense,
}: {
  course: (typeof courses)[number];
  dense?: boolean;
}) {
  return (
    <div className="flex flex-col border border-white/10 bg-surface">
      <div className={dense ? "p-2.5" : "p-3.5"}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gold">
              Sec {course.section} · {course.campus}
            </p>
            <p className={`mt-0.5 font-semibold text-white ${dense ? "text-sm" : "text-base"}`}>
              {course.code}
            </p>
            <p className={`truncate text-white/50 ${dense ? "text-[9px]" : "text-[11px]"}`}>
              {course.title}
            </p>
          </div>
          <span
            className={`shrink-0 border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${statusStyles[course.status]}`}
          >
            {course.status}
          </span>
        </div>

        <div className="mt-2.5 flex items-end gap-2 border border-white/10 bg-black/45 px-2.5 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/40">Seats</p>
            <p className={`mt-0.5 text-[11px] font-semibold ${seatAccent[course.status]}`}>
              {seatCaption(course.status, course.avail)}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-xl font-bold leading-none ${seatAccent[course.status]}`}>
              {course.avail}
            </p>
            <p className="mt-0.5 text-[9px] text-white/40">of {course.cap}</p>
          </div>
        </div>

        {!dense ? (
          <div className="mt-2.5 space-y-1.5 text-[11px]">
            <p className="flex items-center gap-1.5 text-white/80">
              <User className="h-3 w-3 text-gold" />
              {course.professor}
            </p>
            <p className="flex items-center gap-1.5 text-white/80">
              <Calendar className="h-3 w-3 text-gold" />
              {course.days}
            </p>
            <p className="flex items-center gap-1.5 text-white/80">
              <Clock className="h-3 w-3 text-gold" />
              {course.time}
            </p>
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-1 truncate text-[9px] text-white/65">
            <User className="h-2.5 w-2.5 shrink-0 text-gold" />
            {course.professor}
          </p>
        )}
      </div>

      <div className={`border-t border-white/10 ${dense ? "p-2" : "p-2.5"}`}>
        <div
          className={`inline-flex w-full items-center justify-center gap-1 font-bold uppercase tracking-wider ${
            course.status === "OPEN"
              ? "bg-gold text-ink"
              : "border border-gold/40 bg-gold/10 text-gold"
          } ${dense ? "px-2 py-1.5 text-[8px]" : "px-3 py-2 text-[10px]"}`}
        >
          <Bell className={dense ? "h-2.5 w-2.5" : "h-3 w-3"} />
          Ping Me
        </div>
      </div>
    </div>
  );
}

export function DashboardMock({
  compact = false,
  phone = false,
  className = "",
}: DashboardMockProps) {
  if (phone) {
    const visible = courses.slice(0, 2);
    return (
      <div className={`flex h-full min-h-0 flex-col bg-ink text-white ${className}`} aria-hidden>
        <div className="flex items-center justify-between border-b border-white/10 bg-black px-2.5 py-2">
          <MockLogo size={20} />
          <span className="border border-gold/40 bg-gold/15 px-1.5 py-0.5 text-[8px] font-semibold text-gold">
            Nest
          </span>
        </div>
        <div className="border-b border-white/10 px-2.5 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-gold">Search</p>
          <div className="mt-1.5 border border-white/15 bg-black px-2 py-1 text-[8px] text-white/40">
            MAT 101
          </div>
        </div>
        <div className="flex-1 space-y-1.5 overflow-hidden p-2">
          {visible.map((course) => (
            <SectionCard key={course.crn} course={course} dense />
          ))}
        </div>
      </div>
    );
  }

  const visible = compact ? courses.slice(0, 2) : courses;

  return (
    <div
      className={`flex h-full min-h-0 flex-col bg-ink text-white ${className}`}
      aria-hidden={compact ? true : undefined}
    >
      <div
        className={`flex items-center justify-between border-b border-white/10 bg-black ${
          compact ? "px-3 py-2.5" : "px-4 py-3"
        }`}
      >
        <div className="flex items-center gap-2">
          <MockLogo size={compact ? 22 : 26} />
          <div>
            <p className={`font-semibold tracking-tight ${compact ? "text-xs" : "text-sm"}`}>
              Ping My Nest
            </p>
            <p className="text-[10px] text-white/40">Hattiesburg · Fall 2026</p>
          </div>
        </div>
        <span className="border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">
          Watching 5
        </span>
      </div>

      <div className={`border-b border-white/10 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold">
          Step 3 · Pick a section
        </p>
        <p className={`mt-1 font-semibold ${compact ? "text-sm" : "text-base"}`}>
          17 sections for MAT
        </p>
      </div>

      <div
        className={`grid flex-1 gap-2 overflow-hidden ${
          compact ? "grid-cols-2 p-2.5" : "grid-cols-2 p-3 lg:grid-cols-3"
        }`}
      >
        {visible.map((course) => (
          <SectionCard key={course.crn} course={course} dense={compact} />
        ))}
        {!compact ? (
          <div className="hidden border border-dashed border-white/15 bg-surface/50 p-3 lg:flex lg:flex-col lg:justify-center">
            <Users className="h-4 w-4 text-gold" />
            <p className="mt-2 text-xs font-semibold text-white/70">More sections</p>
            <p className="mt-1 text-[10px] text-white/40">Scroll to see the full nest</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
