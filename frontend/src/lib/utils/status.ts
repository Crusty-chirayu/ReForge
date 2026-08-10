// ─────────────────────────────────────────────────────────────────────────────
// Status → badge variant mapping for backend status enums.
// ─────────────────────────────────────────────────────────────────────────────

import type { StatusVariant } from "@/components/ui/status-badge";
import type { VerificationStatus } from "@/lib/api/types";

export function verificationVariant(
  status: VerificationStatus | undefined,
): StatusVariant {
  switch (status) {
    case "PASSED":
      return "succeeded";
    case "FAILED":
      return "failed";
    case "BLOCKED":
      return "blocked";
    case "ERROR":
      return "error";
    case "TIMEOUT":
      return "warning";
    case "NOT_EXECUTABLE":
      return "muted";
    case "NOT_AVAILABLE":
      return "muted";
    default:
      return "muted";
  }
}

export function pipelineStatusVariant(
  status: "PASSED" | "FAILED" | "BLOCKED" | "ERROR",
): StatusVariant {
  switch (status) {
    case "PASSED":
      return "succeeded";
    case "FAILED":
      return "failed";
    case "BLOCKED":
      return "blocked";
    default:
      return "error";
  }
}

/** Human label for a verification status (falls back to an em dash). */
export function verificationLabel(status: VerificationStatus | undefined): string {
  return status ?? "—";
}
