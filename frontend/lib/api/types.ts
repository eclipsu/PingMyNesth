export type ApiErrorBody = {
  error: string;
};

export type HealthResponse = {
  status: string;
};

export type MessageResponse = {
  message: string;
};

/** Returned by /verify — cookie is primary; token kept for Bearer fallback. */
export type VerifyResponse = MessageResponse & {
  token?: string;
};

export type MeResponse = {
  id: number;
  email: string;
  verified: boolean;
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
