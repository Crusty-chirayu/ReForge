// ─────────────────────────────────────────────────────────────────────────────
// API error classification and honest, actionable messaging.
//
// The backend is a frozen Fastify service. When the frontend cannot reach it,
// or when it answers with a structured error, the console must say something
// the operator can act on — never a raw `TypeError: Failed to fetch`, never a
// stack trace, and never an invented explanation.
//
// This module is the single source of truth for turning an unknown thrown
// value into a { title, description } pair the UI can render.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiError } from "@/lib/api/client";

/** Where the backend is expected to be reachable (mirrors next.config.ts). */
export const BACKEND_HINT =
  "Ensure it is running on http://127.0.0.1:3000, then retry.";

/** HTTP status of an error, when it came from the backend. */
export function statusOf(error: unknown): number | null {
  if (error instanceof ApiError) return error.status;
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return null;
}

/**
 * True when the request never produced an HTTP response — the backend is
 * unreachable, DNS failed, the connection was refused, or the proxy is down.
 *
 * `fetch` rejects with a `TypeError` in every one of those cases, which is why
 * a status-less error is treated as a transport failure.
 */
export function isNetworkError(error: unknown): boolean {
  if (statusOf(error) !== null) return false;
  if (isAbortError(error)) return false;
  return error instanceof TypeError || error instanceof Error;
}

/** True when the caller aborted the request (navigation, cancel, unmount). */
export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  return error instanceof Error && error.name === "AbortError";
}

/**
 * True when the backend is up but a required capability is not configured —
 * e.g. Project Brain with no inference provider. Never treated as a failure of
 * the user's input.
 */
export function isProviderUnavailable(error: unknown): boolean {
  return statusOf(error) === 503;
}

/** True for client-side (4xx) errors, which are never worth retrying. */
export function isClientError(error: unknown): boolean {
  const status = statusOf(error);
  return status !== null && status >= 400 && status < 500;
}

export interface ErrorDescription {
  title: string;
  description: string;
}

export interface DescribeOptions {
  /** What the UI was trying to load, e.g. "pipeline result". */
  resource?: string;
  /** Backend route involved, shown only as technical context. */
  endpoint?: string;
  /** Override the copy used for a 404. */
  notFoundTitle?: string;
  notFoundDescription?: string;
}

/**
 * Map any thrown value onto honest, actionable console copy.
 *
 * Every branch describes a real condition — nothing is guessed, and the raw
 * backend message is surfaced separately by <ErrorState error={…} /> rather
 * than being paraphrased here.
 */
export function describeApiError(
  error: unknown,
  options: DescribeOptions = {},
): ErrorDescription {
  const { resource = "data", endpoint, notFoundTitle, notFoundDescription } =
    options;
  const suffix = endpoint ? ` (${endpoint})` : "";
  const status = statusOf(error);

  if (status === null) {
    return {
      title: "Backend unavailable",
      description: `Unable to reach the ReForge backend${suffix}. ${BACKEND_HINT}`,
    };
  }

  if (status === 400) {
    return {
      title: "Request rejected",
      description: `The backend rejected this request as invalid (400)${suffix}. Check the values you supplied and try again.`,
    };
  }

  if (status === 404) {
    return {
      title: notFoundTitle ?? `${capitalize(resource)} not found`,
      description:
        notFoundDescription ??
        `The requested ${resource} does not exist on this backend (404)${suffix}.`,
    };
  }

  if (status === 413) {
    return {
      title: "Archive too large",
      description: `The backend rejected the upload because it exceeds the accepted size limit (413)${suffix}.`,
    };
  }

  if (status === 429) {
    return {
      title: "Too many requests",
      description: `The backend is rate-limiting requests (429)${suffix}. Wait a moment, then retry.`,
    };
  }

  if (status === 503) {
    return {
      title: "Capability unavailable",
      description: `The backend is running but this capability is not configured (503)${suffix}. No result has been fabricated.`,
    };
  }

  if (status >= 500) {
    return {
      title: `Backend error (${status})`,
      description: `The backend failed while processing this request${suffix}. Retry, and check the backend logs if it persists.`,
    };
  }

  return {
    title: `Request failed (${status})`,
    description: `The backend could not complete this request${suffix}.`,
  };
}

/**
 * TanStack Query retry predicate: retry transport failures once, never retry
 * a backend that has already given a definitive 4xx answer.
 *
 * Typed against `Error` so TanStack keeps inferring `Error` for query errors
 * rather than widening them to `unknown`.
 */
export function retryPolicy(failureCount: number, error: Error): boolean {
  if (isClientError(error)) return false;
  return failureCount < 1;
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
