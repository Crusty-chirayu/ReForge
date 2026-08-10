import type { NextConfig } from "next";

/**
 * ReForge frontend — Next.js configuration.
 *
 * The frontend talks to the frozen Fastify backend through same-origin
 * rewrites. In development (and `next start`) these proxy /health and /v1/*
 * to the backend at http://127.0.0.1:3000 — no CORS is required on the
 * backend because the browser only ever sees the frontend origin.
 *
 * Override the backend origin with REFORGE_BACKEND_URL when needed.
 */
const BACKEND_ORIGIN =
  process.env.REFORGE_BACKEND_URL ?? "http://127.0.0.1:3000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: "/health",
        destination: `${BACKEND_ORIGIN}/health`,
      },
      {
        source: "/v1/:path*",
        destination: `${BACKEND_ORIGIN}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
