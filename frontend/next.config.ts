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
  process.env.REFORGE_BACKEND_URL ?? "http://127.0.0.1:3001";

/**
 * Maximum request body the rewrite proxy will buffer, in bytes.
 *
 * When a rewrite proxies a request, Next.js buffers the body in memory so it
 * can be read more than once. That buffer defaults to 10 MB, and exceeding it
 * does NOT fail loudly: Next.js forwards only the first 10 MB, which truncates
 * the multipart stream mid-file and makes the backend's parser hang up the
 * socket (ECONNRESET).
 *
 * ReForge accepts ZIP archives up to 200 MB — `MAX_ARCHIVE_BYTES` in
 * src/lib/utils/archive.ts, mirroring the frozen backend's Fastify multipart
 * `fileSize` limit — so the proxy buffer must match that contract or large
 * uploads to /v1/analyze/archive, /v1/pipeline, /v1/execute, and /v1/snapshot
 * break before the backend ever sees them.
 *
 * This raises only the proxy's buffer ceiling. It grants no new capability:
 * the backend still independently enforces its own 200 MB limit and rejects
 * anything larger, and the client still validates size before uploading.
 */
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    proxyClientMaxBodySize: MAX_UPLOAD_BYTES,
  },
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
