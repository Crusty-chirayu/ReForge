// ─────────────────────────────────────────────────────────────────────────────
// Workflow error normalization.
// ─────────────────────────────────────────────────────────────────────────────

import { ApiError } from "@/lib/api";

/** Normalize any thrown value into a stable, user-facing error. */
export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  return new Error(String(err));
}

/** Extract the backend error message when available. */
export function toErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Split comma/newline-separated input into a trimmed list (for string[] fields). */
export function splitList(value: string): string[] {
  return value
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
