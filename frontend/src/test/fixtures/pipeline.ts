import type {
  ExecutionReceipt,
  PipelineResult,
  VerificationResult,
} from "@/lib/api/types";
import { mockAnalysisReport } from "./analysis-report";
import { mockPlan } from "./plan";
import { mockImpact } from "./impact";
import { mockBuildPlan } from "./build";

const PROVENANCE = {
  source: { kind: "archive" as const, reference: "acme-app.zip" },
  licenses: [],
  copyrightNotices: [],
};

function baseReceipt(overrides: Partial<ExecutionReceipt>): ExecutionReceipt {
  return {
    executionId: "exec_f6abc",
    snapshotId: "snap_f6abc",
    status: "SUCCEEDED",
    approved: true,
    operations: [],
    appliedOperations: [
      { path: "src/cache.ts", operation: "CREATE", applied: true, result: "SUCCESS" },
      { path: "src/orders.ts", operation: "MODIFY", applied: true, result: "SUCCESS" },
    ],
    workspaceCleanupStatus: "SUCCESS",
    provenance: PROVENANCE,
    diffSummary: {
      created: ["src/cache.ts", "src/new-util.ts"],
      modified: ["src/orders.ts"],
      renamed: [{ from: "src/old-name.ts", to: "src/renamed.ts" }],
      deleted: ["src/legacy.ts"],
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
          stdout: "no type errors",
          stderr: "",
          outputTruncated: false,
        },
      ],
    },
    rollback: { attempted: false, succeeded: false },
    createdAt: "2026-08-10T12:00:00.000Z",
    completedAt: "2026-08-10T12:01:00.000Z",
    ...overrides,
  };
}

function baseResult(overrides: Partial<PipelineResult>): PipelineResult {
  return {
    pipelineId: "pl_01F6ABC",
    status: "PASSED",
    goal: "Add authentication middleware",
    report: mockAnalysisReport,
    plan: mockPlan,
    impact: mockImpact,
    build: mockBuildPlan,
    execution: baseReceipt({}),
    snapshot: {
      snapshotId: "snap_f6abc",
      provenance: PROVENANCE,
      files: [],
      dependencies: [],
      createdAt: "2026-08-10T12:00:00.000Z",
    },
    workspaceCleanupStatus: "SUCCESS",
    createdAt: "2026-08-10T12:00:00.000Z",
    completedAt: "2026-08-10T12:01:00.000Z",
    ...overrides,
  };
}

/** Fully successful pipeline with verification PASSED. */
export const mockPipelinePassed: PipelineResult = baseResult({});

/** Proposal-mode pipeline — no execution occurred. */
export const mockPipelineProposal: PipelineResult = baseResult({
  pipelineId: "pl_01F6PROP",
  status: "PASSED",
  execution: undefined,
});

/** Execution failed part-way and rolled back. */
export const mockPipelineRolledBack: PipelineResult = baseResult({
  pipelineId: "pl_01F6ROLL",
  status: "FAILED",
  execution: baseReceipt({
    status: "ROLLED_BACK",
    rollback: { attempted: true, succeeded: true },
    appliedOperations: [
      { path: "src/cache.ts", operation: "CREATE", applied: true, result: "SUCCESS" },
    ],
    failedOperation: {
      path: "src/orders.ts",
      operation: "MODIFY",
      applied: false,
      result: "FAILED",
      error: "expected hash mismatch",
    },
    diffSummary: {
      created: ["src/cache.ts"],
      modified: [],
      renamed: [],
      deleted: [],
      unchanged: [],
      failed: ["src/orders.ts"],
    },
  }),
});

/** Execution succeeded but verification FAILED. */
export const mockPipelineVerifyFailed: PipelineResult = baseResult({
  pipelineId: "pl_01F6VFAIL",
  status: "FAILED",
  execution: baseReceipt({
    verification: {
      attempted: true,
      overallStatus: "FAILED",
      results: [
        {
          id: "v1",
          label: "typecheck",
          status: "FAILED",
          exitCode: 1,
          durationMs: 800,
          stdout: "",
          stderr: "src/orders.ts:14:3 - error TS2322",
          outputTruncated: false,
        },
      ],
    } as VerificationResult,
  }),
});

/** Verification TIMEOUT. */
export const mockPipelineVerifyTimeout: PipelineResult = baseResult({
  pipelineId: "pl_01F6VTIM",
  status: "FAILED",
  execution: baseReceipt({
    verification: {
      attempted: true,
      overallStatus: "TIMEOUT",
      results: [
        {
          id: "v1",
          label: "integration",
          status: "TIMEOUT",
          exitCode: null,
          durationMs: 30_000,
          stdout: "",
          stderr: "command exceeded 30s timeout",
          outputTruncated: false,
        },
      ],
    } as VerificationResult,
  }),
});

export { baseReceipt, baseResult };
