import type { ExecutionRequest, ExecutionResult, PatchValidationError, PatchOperation } from "./domain.js";
const unsafe = (value: string) => value.startsWith("/") || value.startsWith("\\") || /^[a-zA-Z]:/.test(value) || value.split(/[\\/]/).includes("..");
const detail = (code: PatchValidationError["code"], message: string, path?: string): PatchValidationError => ({ code, message, path });
export function validateExecution(request: ExecutionRequest): ExecutionResult {
  const details: PatchValidationError[] = [];
  const add = (code: PatchValidationError["code"], message: string, path?: string) => details.push(detail(code, message, path));
  if (!request.approved) add("APPROVAL_REQUIRED", "Explicit approval is required before execution.");
  if (!request.snapshot || !request.snapshotId) add("SNAPSHOT_REQUIRED", "A validated project snapshot and snapshotId are required.");
  if (request.snapshot && request.snapshotId && request.snapshot.snapshotId !== request.snapshotId) add("SNAPSHOT_MISMATCH", "Snapshot identity does not match snapshotId.");
  if (!request.build.validation.valid) request.build.validation.errors.forEach((error) => add("INVALID_OPERATION", error));
  if (request.snapshot && request.build.sourceSnapshotId !== request.snapshot.snapshotId) add("SNAPSHOT_MISMATCH", "BuildPlan was not created against the supplied snapshot.");
  const taskIds = new Set(request.build.buildTaskIds ?? []);
  const files = new Map(request.snapshot?.files.map((file) => [file.path, file]));
  for (const patch of request.patches ?? []) {
    if (!(["CREATE", "MODIFY", "DELETE", "RENAME"] as const).includes(patch.operation)) add("INVALID_OPERATION", "Unsupported patch operation.", patch.path);
    if (unsafe(patch.path) || (patch.fromPath && unsafe(patch.fromPath))) add("UNSAFE_PATH", "Patch path must remain inside the snapshot workspace.", patch.path);
    if (!patch.provenance?.source?.kind) add("INVALID_PROVENANCE", "Patch provenance is required.", patch.path);
    if (patch.originatingTaskId && !taskIds.has(patch.originatingTaskId)) add("UNKNOWN_BUILD_TASK", "Patch references a BuildTask unavailable in this compact BuildPlan.", patch.path);
    if ((patch.operation === "CREATE" || patch.operation === "MODIFY") && !patch.content) add("MISSING_CONTENT", `${patch.operation} requires explicit replacement content.`, patch.path);
    if (patch.operation === "MODIFY") {
      if (!patch.expectedExistingHash) add("MISSING_EXPECTED_HASH", "MODIFY requires the expected existing SHA-256 hash.", patch.path);
      else if (files.get(patch.path)?.hash !== patch.expectedExistingHash) add("STALE_PLAN", "Expected file fingerprint does not match the snapshot.", patch.path);
    }
    if (patch.operation === "RENAME" && (!patch.fromPath || !patch.expectedExistingHash)) add("MISSING_EXPECTED_HASH", "RENAME requires fromPath and its expected existing SHA-256 hash.", patch.path);
    if (patch.operation === "RENAME" && patch.fromPath && patch.expectedExistingHash && files.get(patch.fromPath)?.hash !== patch.expectedExistingHash) add("STALE_PLAN", "Expected source fingerprint does not match the snapshot.", patch.fromPath);
    if (patch.operation === "DELETE" && !request.allowDelete) add("DELETE_APPROVAL_REQUIRED", "Delete operations require explicit delete approval.", patch.path);
  }
  for (const change of request.build.fileChanges) if (unsafe(change.path)) add("UNSAFE_PATH", `Unsafe proposed path: ${change.path}`, change.path);
  return { status: details.length ? "FAILED" : "APPROVED", changes: request.build.fileChanges.map((change) => ({ path: change.path, operation: change.operation, applied: false, reason: change.reason, evidence: change.evidence })), validation: { valid: !details.length, errors: details.map((item) => item.message), details }, provenance: request.build.provenance, rollback: { attempted: false, succeeded: false }, limitations: ["This contract validates snapshot-bound patches only; it never modifies files, runs commands, deploys, or performs Git operations."] };
}
