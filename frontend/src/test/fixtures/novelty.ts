import type { NoveltyAnalysis } from "@/lib/api/types";

/** Realistic novelty analysis mirroring the backend contract. */
export const mockNovelty: NoveltyAnalysis = {
  heuristic: "differentiation + fit + value + feasibility - risk",
  capabilities: [
    {
      name: "Deterministic static analysis",
      evidence: [{ file: "src/engine.ts", detail: "rule-based project model" }],
      existing: true,
    },
  ],
  candidates: [
    {
      id: "NOV-001",
      title: "Patch-safety scoring for autonomous pipelines",
      description:
        "Score every proposed patch for safety before execution, surfacing risky operations early.",
      category: "AI",
      strategy: "AI_AUGMENTATION",
      noveltyScore: 82,
      valueScore: 74,
      feasibilityScore: 68,
      fitScore: 70,
      riskScore: 20,
      confidence: "HIGH",
      source: "DETERMINISTIC",
      evidence: [
        { file: "src/execution.ts", detail: "patch validation pipeline exists" },
      ],
      affectedModules: ["src/execution.ts"],
      prerequisites: ["Execution receipt telemetry"],
      tradeoffs: ["Adds latency to pipeline approval"],
      implementationDirection:
        "Extend the existing validation layer with a scored risk model.",
      assumptions: ["Execution receipts are already persisted"],
    },
    {
      id: "NOV-002",
      title: "Diff-aware test selection",
      description:
        "Select the minimal test set impacted by a change using the module relationship graph.",
      category: "AUTOMATION",
      strategy: "GAP",
      noveltyScore: 64,
      valueScore: 70,
      feasibilityScore: 76,
      fitScore: 62,
      riskScore: 15,
      confidence: "MEDIUM",
      source: "AI_RECOMMENDATION",
      evidence: [
        { file: "src/snapshot-diff.ts", detail: "file-level diff model exists" },
      ],
      affectedModules: ["src/snapshot-diff.ts"],
      prerequisites: ["Test file index"],
      tradeoffs: ["Risk of missing cross-module test dependencies"],
      implementationDirection:
        "Combine snapshot diffs with the module import graph to rank tests.",
      assumptions: ["Tests are colocated with source"],
    },
  ],
  limitations: [
    "Analysis is based on a single project snapshot",
    "Novelty scores are relative to the analyzed project only",
  ],
};
