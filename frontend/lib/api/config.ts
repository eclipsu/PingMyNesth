/**
 * Public env consumed by the browser.
 * NEXT_PUBLIC_PRODUCTION=false uses local/dev defaults + same-origin /api proxy.
 * NEXT_PUBLIC_PRODUCTION=true uses NEXT_PUBLIC_API_BASE_URL directly.
 */
export type ApiConfig = {
  /** Absolute API origin or same-origin prefix (e.g. "/api") */
  baseUrl: string;
  production: boolean;
  /** Upstream used only by Next rewrites (server). */
  upstream: string;
};

function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getApiConfig(): ApiConfig {
  const production = readBool(process.env.NEXT_PUBLIC_PRODUCTION, false);
  const configured = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/$/, "");
  const upstream = (process.env.API_UPSTREAM ?? "http://localhost:8080").replace(/\/$/, "");

  // Default to same-origin /api (Next rewrite → API_UPSTREAM) in every mode.
  // API_UPSTREAM is server-only, so the browser can never call it directly.
  const baseUrl = configured || "/api";

  return { baseUrl, production, upstream };
}

export function apiUrl(path: string, query?: Record<string, string | number | undefined | null>): string {
  const { baseUrl } = getApiConfig();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(
    `${baseUrl}${normalized}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
  );

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  // Same-origin relative path when baseUrl is "/api"
  if (baseUrl.startsWith("/")) {
    return `${url.pathname}${url.search}`;
  }
  return url.toString();
}
