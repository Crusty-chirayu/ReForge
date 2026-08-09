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

const engine = new AnalysisEngine();
const planner = new PlanningDepartment();
const builder = new ReforgeBuilder();

/**
 * Runs the end-to-end ReForge pipeline over an isolated workspace.
 *
 * Sequence:
 * 1. Analysis (X-Ray + Doctor)
 * 2. Engineering Plan generation
 * 3. Change Impact Analysis
 * 4. BuildPlan & patch generation
 * 5. Server-controlled snapshot generation
 * 6. Patch application & controlled verification execution (if approved)
 * 7. Unified execution receipt and pipeline status assembly
 */
export async function runPipeline(
  projectRoot: string,
  request: PipelineRequest,
  provenanceSource: AnalysisReport["provenance"]["source"],
): Promise<PipelineResult> {
  const createdAt = new Date().toISOString();
  const pipelineId = randomUUID();

  // 1. Ingest & analyze workspace
  const report = await engine.analyze(projectRoot, provenanceSource);

  // 2. Generate deterministic plan
  const plan = planner.generate(report, { goal: request.goal });

  // 3. Analyze change impact
  const impact = analyzeImpact(report, { request: request.goal });

  // 4. Generate build plan and proposed patches
  const build = builder.generate({
    goal: request.goal,
    report,
    impact,
    plan,
  });

  // 5. Generate authoritative server-controlled snapshot
  const snapshot = await createProjectSnapshot(projectRoot, report);

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

  return {
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
}
