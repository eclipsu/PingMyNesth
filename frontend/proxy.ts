import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Forwards same-origin /api/* to the Go API (API_UPSTREAM, e.g.
 * https://api.pingmynest.lol). The browser only ever talks to
 * pingmynest.lol, so the session cookies stay first-party.
 *
 * On Vercel every forwarded request reaches the API from Vercel's servers, so
 * we pass the visitor's IP along with EDGE_SECRET. The API trusts that IP only
 * when the secret matches, which keeps per-student rate limits per student.
 */
export function proxy(request: NextRequest) {
  const upstream = (process.env.API_UPSTREAM ?? "http://localhost:8080").replace(/\/$/, "");
  const path = request.nextUrl.pathname.replace(/^\/api/, "") || "/";
  const target = new URL(upstream + path + request.nextUrl.search);

  const headers = new Headers(request.headers);
  // Vercel sets x-forwarded-for itself (the first entry is the visitor)
  const visitor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const secret = process.env.EDGE_SECRET;
  headers.delete("x-pmn-client-ip");
  headers.delete("x-pmn-edge-secret");
  if (secret && visitor) {
    headers.set("x-pmn-client-ip", visitor);
    headers.set("x-pmn-edge-secret", secret);
  }

  return NextResponse.rewrite(target, { request: { headers } });
}

export const config = {
  matcher: "/api/:path*",
};
