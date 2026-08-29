import type {
  BuildPlan,
  ExecutionResult,
  PipelineResult,
} from "@/lib/api/types";
import { mockAnalysisReport } from "./analysis-report";
import { mockPlan } from "./plan";
import { mockImpact } from "./impact";

const PROVENANCE = {
  source: { kind: "archive" as const, reference: "acme-app.zip" },
  licenses: [],
  copyrightNotices: [],
};

/** Realistic build plan exercising every file operation union member. */
export const mockBuildPlan: BuildPlan = {
  objective: "Introduce caching for order lookups",
  provenance: PROVENANCE,
  sourceSnapshotId: "snap_f5abc",
  buildTaskIds: ["TASK-001"],
  fileChanges: [
    {
      path: "src/cache.ts",
      operation: "CREATE",
      status: "PROPOSED_NEW_FILE",
      reason: "New in-memory cache module.",
      evidence: [{ file: "src/cache.ts", detail: "proposed new module" }],
    },
    {
      path: "src/orders.ts",
      operation: "MODIFY",
      status: "EXISTING_FILE",
      expectedHash: "sha256:abc123",
      reason: "Wire the cache into order lookups.",
      evidence: [{ file: "src/orders.ts", detail: "lookup path" }],
    },
    {
      path: "src/legacy.ts",
      operation: "DELETE",
      status: "EXISTING_FILE",
      reason: "Superseded by the cache module.",
      evidence: [],
    },
    {
      path: "src/renamed.ts",
      operation: "RENAME",
      status: "EXISTING_FILE",
      expectedHash: "sha256:def456",
      reason: "Clarify the module name.",
      evidence: [],
    },
  ],
  dependencyChanges: [
    {
      operation: "ADD",
      name: "caching-lib",
      reason: "In-memory cache implementation.",
      evidence: [{ file: "package.json", detail: '"caching-lib": "^2.0.0"' }],
    },
  ],
  testChanges: ["Add focused regression tests for the cache module."],
  risks: ["Cache invalidation is the highest-risk area."],
  validation: { valid: true, errors: [] },
  assumptions: [
    "All operations are proposed only — Builder never modifies files, dependencies, databases, or Git.",
    "Existing license and provenance information must be preserved.",
  ],
};

/** Structural validation that blocks on delete approval. */
export const mockValidationBlocked: ExecutionResult = {
  status: "FAILED",
  changes: mockBuildPlan.fileChanges.map((change) => ({
    path: change.path,
    operation: change.operation,
    applied: false,
    reason: change.reason,
    evidence: change.evidence,
  })),
  validation: {
    valid: false,
    errors: ["Delete operations require explicit delete approval."],
    details: [
      {
        code: "DELETE_APPROVAL_REQUIRED",
        path: "src/legacy.ts",
        message: "Delete operations require explicit delete approval.",
      },
    ],
  },
  provenance: PROVENANCE,
  rollback: { attempted: false, succeeded: false },
  limitations: ["Validation only — nothing is executed."],
};

/** Structural validation that passes. */
export const mockValidationValid: ExecutionResult = {
  status: "APPROVED",
  changes: mockBuildPlan.fileChanges.map((change) => ({
    path: change.path,
    operation: change.operation,
    applied: false,
    reason: change.reason,
    evidence: change.evidence,
  })),
  validation: { valid: true, errors: [], details: [] },
  provenance: PROVENANCE,
  rollback: { attempted: false, succeeded: false },
  limitations: ["Validation only — nothing is executed."],
};

/** Realistic pipeline result mirroring the backend contract. */
export const mockPipelineResult: PipelineResult = {
  pipelineId: "pl_01F5ABC",
  status: "PASSED",
  goal: "Add authentication middleware",
  report: mockAnalysisReport,
  plan: mockPlan,
  impact: mockImpact,
  build: mockBuildPlan,
  execution: {
    executionId: "exec_f5abc",
    snapshotId: "snap_f5abc",
    status: "SUCCEEDED",
    approved: true,
    operations: [],
    appliedOperations: [
      {
        path: "src/cache.ts",
        operation: "CREATE",
        applied: true,
        result: "SUCCESS",
      },
    ],
    workspaceCleanupStatus: "SUCCESS",
    provenance: PROVENANCE,
    diffSummary: {
      created: ["src/cache.ts"],
      modified: ["src/orders.ts"],
      renamed: [],
      deleted: [],
      unchanged: [],
      failed: [],
    },
    verification: {
      attempted: true,
      overallStatus: "PASSED",
      results: [
        {
          id: "v1",
          label: "typecheck",
          status: "PASSED",
          exitCode: 0,
          durationMs: 1200,
          stdout: "",
          stderr: "",
          outputTruncated: false,
        },
      ],
    },
    rollback: { attempted: false, succeeded: false },
    createdAt: "2026-08-10T12:00:00.000Z",
    completedAt: "2026-08-10T12:01:00.000Z",
  },
  snapshot: {
    snapshotId: "snap_f5abc",
    provenance: PROVENANCE,
    files: [],
    dependencies: [],
    createdAt: "2026-08-10T12:00:00.000Z",
  },
  workspaceCleanupStatus: "SUCCESS",
  createdAt: "2026-08-10T12:00:00.000Z",
  completedAt: "2026-08-10T12:01:00.000Z",
};
