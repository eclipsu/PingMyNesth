import { apiUrl } from "./config";
import { clearSessionToken, getSessionToken, setSessionToken } from "./session";
import {
  ApiError,
  type ClassSection,
  type HealthResponse,
  type MeResponse,
  type MessageResponse,
  type SearchParams,
  type SearchResponse,
  type SeatStatus,
  type VerifyResponse,
  type WatchItem,
  type WatchRequest,
} from "./types";

type RequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | undefined | null>;
  /** Skip Authorization header (public routes). Cookie still sent. */
  auth?: boolean;
  signal?: AbortSignal;
};

async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(status: number, body: unknown): string {
  if (typeof body === "string" && body.trim()) {
    // Backend sometimes returns plain text; sometimes JSON stringified without braces in edge cases
    const trimmed = body.trim();
    try {
      const parsed = JSON.parse(trimmed) as { error?: unknown };
      if (typeof parsed?.error === "string" && parsed.error.trim()) return parsed.error;
    } catch {
      return trimmed;
    }
    return trimmed;
  }
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === "string" && err.trim()) return err;
  }
  if (status === 429 || status === 403) return "Too many requests — try again in a minute";
  if (status === 401) return "Please sign in again";
  return `Request failed (${status})`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, signal } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // Cookie auth (credentials) + Bearer fallback for current / local backends
  if (auth) {
    const token = getSessionToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(apiUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: "include",
    signal,
  });

  const parsed = await parseBody(res);

  if (!res.ok) {
    if (res.status === 401) clearSessionToken();
    throw new ApiError(res.status, errorMessage(res.status, parsed), parsed);
  }

  return parsed as T;
}

export const api = {
  health: (signal?: AbortSignal) =>
    request<HealthResponse>("/health", { auth: false, signal }),

  signup: (email: string, signal?: AbortSignal) =>
    request<MessageResponse>("/signup", {
      method: "POST",
      auth: false,
      body: { email: email.trim().toLowerCase() },
      signal,
    }),

  /**
   * Call after the user lands on /verify?token=...
   * Stores Bearer token if the API returns one (local backends often do).
   */
  verify: async (token: string, signal?: AbortSignal) => {
    const data = await request<VerifyResponse>("/verify", {
      auth: false,
      query: { token },
      signal,
    });
    if (data.token) setSessionToken(data.token);
    return data;
  },

  search: async (params: SearchParams, signal?: AbortSignal) => {
    const data = await request<Partial<SearchResponse>>("/search", {
      auth: false,
      query: {
        subject: params.subject.trim().toUpperCase(),
        catalog_nbr: params.catalog_nbr?.trim(),
        campus: params.campus?.trim(),
        x_acad_career: params.x_acad_career?.trim(),
        session_code: params.session_code?.trim(),
        days: params.days?.trim(),
        start_time_ge: params.start_time_ge?.trim(),
        end_time_le: params.end_time_le?.trim(),
        instructor_name: params.instructor_name?.trim(),
        instr_first_name: params.instr_first_name?.trim(),
        crse_attr: params.crse_attr?.trim(),
        crse_attr_value: params.crse_attr_value?.trim(),
      },
      signal,
    });

    // Upstream can return `"classes": null` — never leak that to UI
    return {
      pageCount: typeof data.pageCount === "number" ? data.pageCount : 0,
      classes: Array.isArray(data.classes) ? data.classes : [],
    } satisfies SearchResponse;
  },

  watch: (payload: WatchRequest, signal?: AbortSignal) =>
    request<MessageResponse>("/watch", {
      method: "POST",
      body: { class_nbr: payload.class_nbr },
      signal,
    }),

  me: (signal?: AbortSignal) => request<MeResponse>("/me", { signal }),

  watches: (signal?: AbortSignal) => request<WatchItem[]>("/watches", { signal }),

  deleteWatch: (classNbr: number, signal?: AbortSignal) =>
    request<MessageResponse | null>("/watch/delete", {
      method: "DELETE",
      body: { class_nbr: classNbr },
      signal,
    }),

  logout: async (signal?: AbortSignal) => {
    try {
      await request<MessageResponse | null>("/logout", { signal });
    } catch (err) {
      // /logout may not exist on older backends — still clear local session
      if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 405)) {
        clearSessionToken();
        throw err;
      }
    }
    clearSessionToken();
  },
};

/** Parse free-text like "MAT 101", "mat101", "CSC111" into search params. */
export function parseCourseQuery(raw: string): SearchParams | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, " ");
  if (!cleaned) return null;

  const spaced = cleaned.match(/^([A-Z]{2,4})\s+(\d{3}[A-Z]?)$/);
  if (spaced) return { subject: spaced[1], catalog_nbr: spaced[2] };

  const glued = cleaned.match(/^([A-Z]{2,4})(\d{3}[A-Z]?)$/);
  if (glued) return { subject: glued[1], catalog_nbr: glued[2] };

  if (/^[A-Z]{2,4}$/.test(cleaned)) return { subject: cleaned };

  return null;
}

export function seatsLabel(section: ClassSection): string {
  const avail = section.enrollment_available ?? 0;
  const cap = section.class_capacity ?? 0;
  return `${avail}/${cap}`;
}

export function isOpen(section: ClassSection): boolean {
  return (section.enrollment_available ?? 0) > 0;
}

export function seatStatus(section: ClassSection): SeatStatus {
  const avail = section.enrollment_available ?? 0;
  if (avail <= 0) return "FULL";
  if (avail === 1) return "1 LEFT";
  return "OPEN";
}

export function instructorLabel(section: ClassSection): string | null {
  const last = section.instructor_name?.trim();
  const first = section.instr_first_name?.trim();
  if (!last && !first) return null;
  if (last && first) return `${first} ${last}`;
  return last || first || null;
}

const DAY_NAMES: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

/** "M,W,F" or "MWF" → "Mon · Wed · Fri" */
export function formatDays(raw?: string | null): string | null {
  if (!raw?.trim()) return null;
  const parts = raw
    .toUpperCase()
    .split(/[,\s]+/)
    .flatMap((chunk) => {
      if (chunk.includes(",") || chunk.length <= 1) return [chunk];
      // MWF / TTH style
      return chunk.split("");
    })
    .map((d) => d.trim())
    .filter(Boolean);

  const names = parts.map((d) => DAY_NAMES[d] ?? d);
  if (!names.length) return null;
  return names.join(" · ");
}

export function formatTimeRange(start?: string | null, end?: string | null): string | null {
  const s = start?.trim();
  const e = end?.trim();
  if (!s && !e) return null;
  const pretty = (t: string) => t.replace(".", ":");
  if (s && e) return `${pretty(s)} - ${pretty(e)}`;
  return pretty(s || e || "");
}

export function scheduleLabel(section: ClassSection): string | null {
  const days = formatDays(section.days);
  const time = formatTimeRange(section.start_time, section.end_time);
  if (days && time) return `${days} · ${time}`;
  return days || time || null;
}

/** Convert "09:00" / "9" / "9am" style input into USM `09.00` when possible. */
export function toUsmTime(raw: string): string | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (/^\d{1,2}\.\d{2}$/.test(v)) return v.padStart(5, "0");
  const m = v.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return undefined;
  let hour = Number(m[1]);
  const min = m[2] ?? "00";
  const mer = m[3]?.toLowerCase();
  if (mer === "pm" && hour < 12) hour += 12;
  if (mer === "am" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}.${min}`;
}

export { ApiError, getSessionToken, setSessionToken, clearSessionToken };
export type {
  ClassSection,
  HealthResponse,
  MeResponse,
  MessageResponse,
  SearchParams,
  SearchResponse,
  VerifyResponse,
  WatchItem,
  WatchRequest,
};
