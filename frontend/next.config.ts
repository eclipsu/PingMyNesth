import type { NextConfig } from "next";
import path from "path";

const production = ["1", "true", "yes", "on"].includes(
  (process.env.NEXT_PUBLIC_PRODUCTION ?? "false").toLowerCase(),
);
const upstream = (process.env.API_UPSTREAM ?? "http://localhost:8080").replace(
  /\/$/,
  "",
);
const publicBase = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  // Baseline hardening for every page: no framing (clickjacking on sign-in),
  // no MIME sniffing, no full URLs (with sign-in tokens) leaking via Referer.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // Local/dev: browser hits /api/*, Next rewrites to API_UPSTREAM (avoids CORS)
  // Production with a public API URL: skip rewrite; client hits NEXT_PUBLIC_API_BASE_URL
  async rewrites() {
    if (production && publicBase && !publicBase.startsWith("/")) {
      return [];
    }
    return [
      {
        source: "/api/:path*",
        destination: `${upstream}/:path*`,
      },
    ];
  },
};

export default nextConfig;
