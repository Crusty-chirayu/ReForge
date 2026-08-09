import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  DiffSummary,
  ExecutionReceipt,
  ExecutionRequest,
  ExecutionResult,
  OperationReceipt,
  PatchOperation,
  PatchValidationError,
} from "./domain.js";

const unsafe = (value: string) =>
  value.startsWith("/") ||
  value.startsWith("\\") ||
  /^[a-zA-Z]:/.test(value) ||
  value.split(/[\\/]/).includes("..");

const detail = (
  code: PatchValidationError["code"],
  message: string,
  path?: string,
): PatchValidationError => ({ code, message, path });

export function validateExecution(request: ExecutionRequest): ExecutionResult {
  const details: PatchValidationError[] = [];
  const add = (
    code: PatchValidationError["code"],
    message: string,
    path?: string,
  ) => details.push(detail(code, message, path));

  if (!request.approved)
    add("APPROVAL_REQUIRED", "Explicit approval is required before execution.");
  if (!request.snapshot || !request.snapshotId)
    add(
      "SNAPSHOT_REQUIRED",
      "A validated project snapshot and snapshotId are required.",
    );
  if (
    request.snapshot &&
    request.snapshotId &&
    request.snapshot.snapshotId !== request.snapshotId
  )
    add("SNAPSHOT_MISMATCH", "Snapshot identity does not match snapshotId.");
  if (!request.build.validation.valid)
    request.build.validation.errors.forEach((error) =>
      add("INVALID_OPERATION", error),
    );
  if (
    request.snapshot &&
    request.build.sourceSnapshotId !== request.snapshot.snapshotId
  )
    add(
      "SNAPSHOT_MISMATCH",
      "BuildPlan was not created against the supplied snapshot.",
    );

  const taskIds = new Set(request.build.buildTaskIds ?? []);
  const files = new Map(
    request.snapshot?.files.map((file) => [file.path, file]),
  );

  for (const patch of request.patches ?? []) {
    if (
      !(["CREATE", "MODIFY", "DELETE", "RENAME"] as const).includes(
        patch.operation,
      )
    )
      add("INVALID_OPERATION", "Unsupported patch operation.", patch.path);
    if (unsafe(patch.path) || (patch.fromPath && unsafe(patch.fromPath)))
      add(
        "UNSAFE_PATH",
        "Patch path must remain inside the snapshot workspace.",
        patch.path,
      );
    if (!patch.provenance?.source?.kind)
      add("INVALID_PROVENANCE", "Patch provenance is required.", patch.path);
    if (
      patch.originatingTaskId &&
      !taskIds.has(patch.originatingTaskId)
    )
      add(
        "UNKNOWN_BUILD_TASK",
        "Patch references a BuildTask unavailable in this compact BuildPlan.",
        patch.path,
      );
    if (
      (patch.operation === "CREATE" || patch.operation === "MODIFY") &&
      !patch.content
    )
      add(
        "MISSING_CONTENT",
        `${patch.operation} requires explicit replacement content.`,
        patch.path,
      );
    if (patch.operation === "MODIFY") {
      if (!patch.expectedExistingHash)
        add(
          "MISSING_EXPECTED_HASH",
          "MODIFY requires the expected existing SHA-256 hash.",
          patch.path,
        );
      else if (files.get(patch.path)?.hash !== patch.expectedExistingHash)
        add(
          "STALE_PLAN",
          "Expected file fingerprint does not match the snapshot.",
          patch.path,
        );
    }
    if (
      patch.operation === "RENAME" &&
      (!patch.fromPath || !patch.expectedExistingHash)
    )
      add(
        "MISSING_EXPECTED_HASH",
        "RENAME requires fromPath and its expected existing SHA-256 hash.",
        patch.path,
      );
    if (
      patch.operation === "RENAME" &&
      patch.fromPath &&
      patch.expectedExistingHash &&
      files.get(patch.fromPath)?.hash !== patch.expectedExistingHash
    )
      add(
        "STALE_PLAN",
        "Expected source fingerprint does not match the snapshot.",
        patch.fromPath,
      );
    if (patch.operation === "DELETE" && !request.allowDelete)
      add(
        "DELETE_APPROVAL_REQUIRED",
        "Delete operations require explicit delete approval.",
        patch.path,
      );
  }
  for (const change of request.build.fileChanges)
    if (unsafe(change.path))
      add("UNSAFE_PATH", `Unsafe proposed path: ${change.path}`, change.path);

  return {
    status: details.length ? "FAILED" : "APPROVED",
    changes: request.build.fileChanges.map((change) => ({
      path: change.path,
      operation: change.operation,
      applied: false,
      reason: change.reason,
      evidence: change.evidence,
    })),
    validation: {
      valid: !details.length,
      errors: details.map((item) => item.message),
      details,
    },
    provenance: request.build.provenance,
    rollback: { attempted: false, succeeded: false },
    limitations: [
      "This contract validates snapshot-bound patches only; it never modifies files, runs commands, deploys, or performs Git operations.",
    ],
  };
}

function sha256(data: Buffer | string): string {
  return createHash("sha256").update(data).digest("hex");
}

function isBinary(buffer: Buffer): boolean {
  const check = Math.min(buffer.length, 8000);
  for (let i = 0; i < check; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

function resolveSafePath(root: string, relPath: string): string {
  const normalized = relPath.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Unsafe path: ${relPath}`);
  }
  const rootResolved = path.resolve(root);
  const target = path.resolve(rootResolved, normalized);
  if (!target.startsWith(`${rootResolved}${path.sep}`) && target !== rootResolved) {
    throw new Error(`Unsafe path traversal: ${relPath}`);
  }
  return target;
}

export async function executePatchesInWorkspace(
  projectRoot: string,
  request: ExecutionRequest,
): Promise<ExecutionReceipt> {
  const createdAt = new Date().toISOString();
  const executionId = randomUUID();
  const buildTaskIds = request.build.buildTaskIds;

  const diffSummary: DiffSummary = {
    created: [],
    modified: [],
    renamed: [],
    deleted: [],
    unchanged: [],
    failed: [],
  };

  const validationResult = validateExecution(request);
  if (!validationResult.validation.valid) {
    const failedOp: OperationReceipt | undefined = request.patches?.[0]
      ? {
          path: request.patches[0].path,
          operation: request.patches[0].operation,
          applied: false,
          result: "FAILED",
          error: validationResult.validation.errors.join("; "),
        }
      : undefined;

    return {
      executionId,
      snapshotId: request.snapshot?.snapshotId ?? "",
      status: "FAILED",
      approved: request.approved,
      operations: request.patches ?? [],
      appliedOperations: [],
      failedOperation: failedOp,
      workspaceCleanupStatus: "SUCCESS",
      provenance: request.build.provenance,
      buildTaskIds,
      diffSummary,
      rollback: { attempted: false, succeeded: false },
      createdAt,
      completedAt: new Date().toISOString(),
    };
  }

  // 1. RE-HASH DISK SCAN VALIDATION BEFORE MUTATION
  if (request.snapshot?.files) {
    for (const snapFile of request.snapshot.files) {
      try {
        const fullPath = resolveSafePath(projectRoot, snapFile.path);
        const stat = await fs.lstat(fullPath);
        if (stat.isSymbolicLink()) {
          return createFailedReceipt(
            executionId,
            request,
            `Symlink detected in workspace: ${snapFile.path}`,
            diffSummary,
            createdAt,
          );
        }
        const diskContent = await fs.readFile(fullPath);
        const currentHash = sha256(diskContent);
        if (currentHash !== snapFile.hash) {
          return createFailedReceipt(
            executionId,
            request,
            `File ${snapFile.path} content changed on disk prior to patch application (expected ${snapFile.hash}, found ${currentHash}).`,
            diffSummary,
            createdAt,
          );
        }
      } catch (err) {
        return createFailedReceipt(
          executionId,
          request,
          `File ${snapFile.path} missing or unreadable on disk prior to patch application.`,
          diffSummary,
          createdAt,
        );
      }
    }
  }

  // 2. CREATE PRE-MUTATION BACKUP FOR ROLLBACK
  const backupRoot = path.join(path.dirname(projectRoot), `backup_${randomUUID()}`);
  let rollbackAttempted = false;
  let rollbackSucceeded = false;

  await fs.cp(projectRoot, backupRoot, { recursive: true });

  const appliedOperations: OperationReceipt[] = [];
  let failedOperation: OperationReceipt | undefined;
  let stopExecution = false;

  // 3. APPLY PATCHES ONE BY ONE
  for (const patch of request.patches ?? []) {
    if (stopExecution) break;

    const opReceipt: OperationReceipt = {
      path: patch.path,
      operation: patch.operation,
      applied: false,
      fromPath: patch.fromPath,
      expectedExistingHash: patch.expectedExistingHash,
      originatingTaskId: patch.originatingTaskId,
    };

    try {
      // Validate patch path safe
      const targetPath = resolveSafePath(projectRoot, patch.path);

      if (patch.operation === "CREATE") {
        let exists = false;
        try {
          await fs.lstat(targetPath);
          exists = true;
        } catch {}

        if (exists) {
          throw new Error(`Cannot CREATE file that already exists: ${patch.path}`);
        }
        if (patch.content === undefined) {
          throw new Error(`CREATE operation requires explicit content for ${patch.path}`);
        }

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.writeFile(targetPath, patch.content, "utf-8");

        opReceipt.applied = true;
        opReceipt.result = "SUCCESS";
        appliedOperations.push(opReceipt);
        diffSummary.created.push(patch.path);
      } else if (patch.operation === "MODIFY") {
        let stat;
        try {
          stat = await fs.lstat(targetPath);
        } catch {
          throw new Error(`Cannot MODIFY non-existent file: ${patch.path}`);
        }
        if (stat.isSymbolicLink()) {
          throw new Error(`Cannot MODIFY symbolic link: ${patch.path}`);
        }

        const currentContent = await fs.readFile(targetPath);
        if (isBinary(currentContent)) {
          throw new Error(`NOT_EXECUTABLE: Cannot apply text MODIFY to binary file ${patch.path}`);
        }
        if (patch.expectedExistingHash && sha256(currentContent) !== patch.expectedExistingHash) {
          throw new Error(`STALE_PLAN: Target file fingerprint mismatched on disk: ${patch.path}`);
        }
        if (patch.content === undefined) {
          throw new Error(`MODIFY operation requires explicit content for ${patch.path}`);
        }

        await fs.writeFile(targetPath, patch.content, "utf-8");

        opReceipt.applied = true;
        opReceipt.result = "SUCCESS";
        appliedOperations.push(opReceipt);
        diffSummary.modified.push(patch.path);
      } else if (patch.operation === "RENAME") {
        if (!patch.fromPath) {
          throw new Error(`RENAME requires fromPath for ${patch.path}`);
        }
        const fromTargetPath = resolveSafePath(projectRoot, patch.fromPath);
        let stat;
        try {
          stat = await fs.lstat(fromTargetPath);
        } catch {
          throw new Error(`SOURCE_NOT_FOUND: RENAME source file missing: ${patch.fromPath}`);
        }
        if (stat.isSymbolicLink()) {
          throw new Error(`Cannot RENAME symbolic link: ${patch.fromPath}`);
        }

        const sourceContent = await fs.readFile(fromTargetPath);
        if (patch.expectedExistingHash && sha256(sourceContent) !== patch.expectedExistingHash) {
          throw new Error(`STALE_PLAN: RENAME source fingerprint mismatched on disk: ${patch.fromPath}`);
        }

        let destExists = false;
        try {
          await fs.lstat(targetPath);
          destExists = true;
        } catch {}
        if (destExists) {
          throw new Error(`RENAME_COLLISION: Destination path already exists: ${patch.path}`);
        }

        await fs.mkdir(path.dirname(targetPath), { recursive: true });
        await fs.rename(fromTargetPath, targetPath);

        opReceipt.applied = true;
        opReceipt.result = "SUCCESS";
        appliedOperations.push(opReceipt);
        diffSummary.renamed.push({ from: patch.fromPath, to: patch.path });
      } else if (patch.operation === "DELETE") {
        if (!request.allowDelete) {
          throw new Error(`DELETE_APPROVAL_REQUIRED: Delete operation not authorized for ${patch.path}`);
        }
        let stat;
        try {
          stat = await fs.lstat(targetPath);
        } catch {
          throw new Error(`SOURCE_NOT_FOUND: Cannot DELETE non-existent file: ${patch.path}`);
        }
        if (stat.isSymbolicLink()) {
          throw new Error(`Cannot DELETE symbolic link: ${patch.path}`);
        }

        if (patch.expectedExistingHash) {
          const currentContent = await fs.readFile(targetPath);
          if (sha256(currentContent) !== patch.expectedExistingHash) {
            throw new Error(`STALE_PLAN: DELETE target fingerprint mismatched on disk: ${patch.path}`);
          }
        }

        await fs.rm(targetPath, { force: true });

        opReceipt.applied = true;
        opReceipt.result = "SUCCESS";
        appliedOperations.push(opReceipt);
        diffSummary.deleted.push(patch.path);
      }
    } catch (err: any) {
      stopExecution = true;
      opReceipt.applied = false;
      opReceipt.result = "FAILED";
      opReceipt.error = err instanceof Error ? err.message : String(err);
      failedOperation = opReceipt;
      appliedOperations.push(opReceipt);
      diffSummary.failed.push(patch.path);

      // Perform atomic rollback
      rollbackAttempted = true;
      try {
        await fs.rm(projectRoot, { recursive: true, force: true });
        await fs.cp(backupRoot, projectRoot, { recursive: true });
        rollbackSucceeded = true;
      } catch (rollbackErr) {
        rollbackSucceeded = false;
      }
    }
  }

  // Cleanup backup directory
  try {
    await fs.rm(backupRoot, { recursive: true, force: true });
  } catch {}

  // Determine unchanged files
  const mutatedPaths = new Set([
    ...diffSummary.created,
    ...diffSummary.modified,
    ...diffSummary.renamed.map((r) => r.from),
    ...diffSummary.renamed.map((r) => r.to),
    ...diffSummary.deleted,
  ]);

  if (request.snapshot?.files) {
    for (const snapFile of request.snapshot.files) {
      if (!mutatedPaths.has(snapFile.path)) {
        diffSummary.unchanged.push(snapFile.path);
      }
    }
  }

  const finalStatus = failedOperation ? "FAILED" : "SUCCEEDED";

  return {
    executionId,
    snapshotId: request.snapshot?.snapshotId ?? "",
    status: finalStatus,
    approved: request.approved,
    operations: request.patches ?? [],
    appliedOperations,
    failedOperation,
    workspaceCleanupStatus: "SUCCESS",
    provenance: request.build.provenance,
    buildTaskIds,
    diffSummary,
    rollback: { attempted: rollbackAttempted, succeeded: rollbackSucceeded },
    createdAt,
    completedAt: new Date().toISOString(),
  };
}

function createFailedReceipt(
  executionId: string,
  request: ExecutionRequest,
  errorMessage: string,
  diffSummary: DiffSummary,
  createdAt: string,
): ExecutionReceipt {
  const failedOp: OperationReceipt | undefined = request.patches?.[0]
    ? {
        path: request.patches[0].path,
        operation: request.patches[0].operation,
        applied: false,
        result: "FAILED",
        error: errorMessage,
      }
    : undefined;

  return {
    executionId,
    snapshotId: request.snapshot?.snapshotId ?? "",
    status: "FAILED",
    approved: request.approved,
    operations: request.patches ?? [],
    appliedOperations: [],
    failedOperation: failedOp,
    workspaceCleanupStatus: "SUCCESS",
    provenance: request.build.provenance,
    buildTaskIds: request.build.buildTaskIds,
    diffSummary,
    rollback: { attempted: false, succeeded: false },
    createdAt,
    completedAt: new Date().toISOString(),
  };
}

