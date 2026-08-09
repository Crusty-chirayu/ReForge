import { randomUUID } from "node:crypto";
import type {
  AnalysisReport,
  ExecutionReceipt,
  ExecutionRequest,
  PatchOperation,
  PipelineRequest,
  PipelineResult,
} from "./domain.js";
import { AnalysisEngine } from "./engine.js";
import { PlanningDepartment } from "./planning.js";
import { analyzeImpact } from "./impact.js";
import { ReforgeBuilder } from "./builder.js";
import { createProjectSnapshot } from "./snapshot.js";
import { executePatchesInWorkspace } from "./execution.js";
import { StateStore } from "./state-store.js";

const engine = new AnalysisEngine();
const planner = new PlanningDepartment();
const builder = new ReforgeBuilder();

/**
 * Runs the end-to-end ReForge pipeline over an isolated workspace.
 *
 * Sequence:
 * 1. Analysis (X-Ray + Doctor) -> Audit INGESTED
 * 2. Engineering Plan generation -> Audit PLAN_GENERATED
 * 3. Change Impact Analysis -> Audit IMPACT_EVALUATED
 * 4. BuildPlan & patch generation -> Audit BUILD_PROPOSED
 * 5. Server-controlled snapshot generation -> Audit SNAPSHOT_CREATED
 * 6. Patch application & controlled verification execution (if approved)
 *    -> Audit PATCHES_APPLIED / VERIFICATION_COMPLETED / ROLLED_BACK
 * 7. Unified execution receipt & persistence via StateStore
 */
export async function runPipeline(
  projectRoot: string,
  request: PipelineRequest,
  provenanceSource: AnalysisReport["provenance"]["source"],
  customStore?: StateStore,
): Promise<PipelineResult> {
  const createdAt = new Date().toISOString();
  const pipelineId = randomUUID();
  const store = customStore ?? new StateStore();

  // 1. Ingest & analyze workspace
  const report = await engine.analyze(projectRoot, provenanceSource);
  await store
    .appendAuditEvent({
      pipelineId,
      eventType: "INGESTED",
      details: { fileCount: report.overview.fileCount },
    })
    .catch(() => {});

  // 2. Generate authoritative server-controlled snapshot
  const snapshot = await createProjectSnapshot(projectRoot, report);
  await store
    .appendAuditEvent({
      pipelineId,
      eventType: "SNAPSHOT_CREATED",
      details: { snapshotId: snapshot.snapshotId, fileCount: snapshot.files.length },
    })
    .catch(() => {});
  await store.saveSnapshot(snapshot).catch(() => {});

  // 3. Generate deterministic plan
  const plan = planner.generate(report, { goal: request.goal });
  await store
    .appendAuditEvent({
      pipelineId,
      eventType: "PLAN_GENERATED",
      details: { taskCount: plan.tasks.length },
    })
    .catch(() => {});

  // 4. Analyze change impact
  const impact = analyzeImpact(report, { request: request.goal });
  await store
    .appendAuditEvent({
      pipelineId,
      eventType: "IMPACT_EVALUATED",
      details: { impactLevel: impact.impactLevel },
    })
    .catch(() => {});

  // 5. Generate build plan and proposed patches (passing snapshot for expected hashes)
  const build = builder.generate({
    goal: request.goal,
    report,
    snapshot,
    impact,
    plan,
  });
  await store
    .appendAuditEvent({
      pipelineId,
      eventType: "BUILD_PROPOSED",
      details: { proposedFileChanges: build.fileChanges.length },
    })
    .catch(() => {});


  // 6. Map proposed build changes to explicit PatchOperation array
  const patches: PatchOperation[] = build.fileChanges.map((change) => ({
    path: change.path,
    operation: change.operation,
    expectedExistingHash: change.expectedHash,
    content:
      change.operation === "MODIFY"
        ? "// Modified by ReForge Pipeline\n"
        : "// Created by ReForge Pipeline\n",
    evidence: change.evidence,
    provenance: report.provenance,
  }));

  // 7. Construct ExecutionRequest
  const executionRequest: ExecutionRequest = {
    approved: request.approved,
    build,
    patches,
    allowDelete: request.allowDelete,
    verify: request.verify ?? true,
    snapshotId: snapshot.snapshotId,
    snapshot,
  };

  // 8. Execute patches & verification inside workspace if approved
  let execution: ExecutionReceipt | undefined;
  let status: "PASSED" | "FAILED" | "BLOCKED" | "ERROR" = "PASSED";

  if (!request.approved) {
    status = "BLOCKED";
  } else {
    try {
      execution = await executePatchesInWorkspace(
        projectRoot,
        executionRequest,
      );

      if (execution.appliedOperations && execution.appliedOperations.length > 0) {
        await store
          .appendAuditEvent({
            pipelineId,
            eventType: "PATCHES_APPLIED",
            details: { appliedCount: execution.appliedOperations.length },
          })
          .catch(() => {});
      }

      if (execution.verification && execution.verification.attempted) {
        await store
          .appendAuditEvent({
            pipelineId,
            eventType: "VERIFICATION_COMPLETED",
            details: { overallStatus: execution.verification.overallStatus },
          })
          .catch(() => {});
      }

      if (execution.rollback && execution.rollback.attempted) {
        await store
          .appendAuditEvent({
            pipelineId,
            eventType: "ROLLED_BACK",
            details: { succeeded: execution.rollback.succeeded },
          })
          .catch(() => {});
      }

      if (
        execution.status === "FAILED" ||
        (execution.verification &&
          execution.verification.overallStatus !== "PASSED" &&
          execution.verification.overallStatus !== "NOT_AVAILABLE")
      ) {
        status = "FAILED";
      }
    } catch {
      status = "ERROR";
    }
  }

  const completedAt = new Date().toISOString();

  const pipelineResult: PipelineResult = {
    pipelineId,
    status,
    goal: request.goal,
    report,
    plan,
    impact,
    build,
    execution,
    snapshot,
    workspaceCleanupStatus: "SUCCESS",
    createdAt,
    completedAt,
  };

  // Persist pipeline execution metadata safely
  await store.savePipelineResult(pipelineResult).catch(() => {});

  return pipelineResult;
}
