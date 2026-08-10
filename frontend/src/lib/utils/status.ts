// ─────────────────────────────────────────────────────────────────────────────
// Status → badge variant mapping for backend status enums.
// ─────────────────────────────────────────────────────────────────────────────

import type { StatusVariant } from "@/components/ui/status-badge";
import type { ExecutionStatus, VerificationStatus } from "@/lib/api/types";

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

export function executionStatusVariant(
  status: ExecutionStatus | undefined,
): StatusVariant {
  switch (status) {
    case "SUCCEEDED":
      return "succeeded";
    case "FAILED":
      return "failed";
    case "ROLLED_BACK":
      return "rolled-back";
    case "CANCELLED":
      return "cancelled";
    case "VERIFYING":
      return "verifying";
    case "RUNNING":
      return "running";
    case "APPROVED":
      return "approved";
    case "PENDING":
      return "pending";
    default:
      return "muted";
  }
}

/** Human label for an execution status. */
export function executionStatusLabel(status: ExecutionStatus | undefined): string {
  switch (status) {
    case "SUCCEEDED":
      return "Succeeded";
    case "FAILED":
      return "Failed";
    case "ROLLED_BACK":
      return "Rolled Back";
    case "CANCELLED":
      return "Cancelled";
    case "VERIFYING":
      return "Verifying";
    case "RUNNING":
      return "Running";
    case "APPROVED":
      return "Approved";
    case "PENDING":
      return "Pending";
    default:
      return "Not Executed";
  }
}
