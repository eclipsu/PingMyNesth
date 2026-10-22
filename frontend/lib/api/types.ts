export type ApiErrorBody = {
  error: string;
};

export type HealthResponse = {
  status: string;
};

export type MessageResponse = {
  message: string;
};

/** Returned by /verify; the session itself arrives as httpOnly cookies. */
export type VerifyResponse = MessageResponse;

export type MeResponse = {
  id: number;
  email: string;
  verified: boolean;
  /** On the API's ADMIN_EMAILS list; unlocks /admin. */
  admin?: boolean;
};

export type ClassSection = {
  class_nbr: number;
  subject: string;
  catalog_nbr: string;
  class_section: string;
  descr: string;
  strm: string;
  enrollment_available: number;
  class_capacity: number;
  enrl_stat_descr: string;
  campus?: string;
  acad_career?: string;
  session_code?: string;
  days?: string;
  start_time?: string;
  end_time?: string;
  instructor_name?: string;
  instr_first_name?: string;
};

export type SearchResponse = {
  pageCount: number;
  classes: ClassSection[];
};

/** All /search query params. Only `subject` is required by the API. */
export type SearchParams = {
  subject: string;
  catalog_nbr?: string;
  campus?: string;
  x_acad_career?: string;
  session_code?: string;
  /** Comma-separated USM day codes, e.g. "M,W,F" */
  days?: string;
  /** USM time format, e.g. "09.00" */
  start_time_ge?: string;
  end_time_le?: string;
  instructor_name?: string;
  instr_first_name?: string;
  crse_attr?: string;
  crse_attr_value?: string;
};

export type WatchRequest = {
  class_nbr: number;
};

export type WatchItem = {
  id: number;
  class_nbr: number;
  active: boolean;
  subject: string;
  catalog_nbr: string;
  class_section: string;
  descr: string;
  enrollment_available: number;
};

export type SeatStatus = "OPEN" | "FULL" | "1 LEFT";

/* ---------- /pulse: what the worker and API actually did ---------- */

export type PulseCycle = {
  started_at: string;
  duration_ms: number;
  subjects: number;
  sections_checked: number;
  usm_requests: number;
  openings: number;
  errors: number;
};

export type PulseOpening = {
  subject: string;
  catalog_nbr: string;
  class_section: string;
  descr: string;
  seats: number;
  watchers: number;
  notified: number;
  at: string;
};

export type PulseHour = {
  hour: string;
  worker: number;
  search: number;
  cache_hits: number;
};

export type PulseTotals = {
  cycles: number;
  sections_checked: number;
  worker_requests: number;
  search_requests: number;
  cache_hits: number;
  openings: number;
  alerts: number;
};

export type PulseResponse = {
  generated_at: string;
  worker: {
    status: "live" | "stalled" | "offline";
    last_cycle: PulseCycle | null;
    poll_interval_s: number;
    request_gap_s: number;
    search_cache_ttl_s: number;
  };
  catalog: { subjects: number; courses: number; instructors: number };
  watching: { active: number; sections: number; subjects: number };
  last_24h: PulseTotals;
  all_time: PulseTotals;
  /** Last 24 hours, oldest first. */
  traffic: PulseHour[];
  /** Oldest first. */
  recent_cycles: PulseCycle[];
  recent_openings: PulseOpening[];
};

/* ---------- /admin ---------- */

export type AdminSection = {
  class_nbr: number;
  subject: string;
  catalog_nbr: string;
  class_section: string;
  descr: string;
  seats: number;
  watchers: number;
};

export type AdminOverview = {
  pulse: PulseResponse;
  users: { total: number; verified: number; new_this_week: number };
  watches: { active: number; notified: number; sections: number; subjects: number; watchers: number };
  top_sections: AdminSection[];
};

export type AdminUser = {
  id: number;
  email: string;
  verified: boolean;
  created_at: string | null;
  active_watches: number;
  total_watches: number;
  sessions: number;
};

export type AdminWatch = {
  id: number;
  class_nbr: number;
  active: boolean;
  created_at: string | null;
  user_id?: number;
  email?: string;
  subject: string;
  catalog_nbr: string;
  class_section: string;
  descr: string;
  seats: number;
  checked_at?: string | null;
};

export type AdminSession = {
  id: number;
  user_agent: string;
  created_at: string | null;
  expires_at: string | null;
};

export type AdminUserDetail = {
  user: AdminUser;
  watches: AdminWatch[];
  sessions: AdminSession[];
};

export type AdminSeatEvent = PulseOpening & { id: number; class_nbr: number };

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isConflict() {
    return this.status === 409;
  }

  get isRateLimited() {
    return this.status === 429 || this.status === 403;
  }
}
