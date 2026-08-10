// ─────────────────────────────────────────────────────────────────────────────
// ReForge API endpoint registry.
//
// Single source of truth for backend route paths. Mirrors `src/server.ts`.
// The client and any UI surfaces that need to display endpoint metadata import
// from here — never hard-code path strings.
// ─────────────────────────────────────────────────────────────────────────────

export const API_PATHS = {
  /** GET → { status: "ok", service: "reforge-analysis-engine" } */
  health: "/health",

  /** POST { question, report } → BrainResponse */
  brain: "/v1/brain/query",

  /** POST { goal, report, constraints?, priorities?, desiredTechnology? } → { plan } */
  plan: "/v1/plan",

  /** POST { goal?, report } → { novelty } */
  novelty: "/v1/novelty",

  /** POST { request, report, category? } → ChangeImpactReport (direct) */
  impact: "/v1/impact",

  /** POST { goal, report, impact?, noveltyCandidate?, plan? } → { build } */
  build: "/v1/build",

  /** POST multipart (archive + request) → { execution, receipt, snapshot } */
  execute: "/v1/execute",

  /** POST JSON → ExecutionResult (validation only) */
  executeValidate: "/v1/execute/validate",

  /** POST multipart (archive + request) → { pipeline, result } */
  pipeline: "/v1/pipeline",

  /** GET ?limit= → { history, limit, count } */
  pipelineHistory: "/v1/pipeline/history",

  /** POST multipart (archive) → { snapshot } */
  snapshotCreate: "/v1/snapshot",

  /** POST multipart (archive) → AnalysisReport (direct) */
  analyzeArchive: "/v1/analyze/archive",

  /** POST { repositoryUrl } → AnalysisReport (direct) */
  analyzeRepository: "/v1/analyze/repository",

  /** POST { path } → AnalysisReport (direct; only when REFORGE_ENABLE_LOCAL_INGESTION=true) */
  analyzeLocal: "/v1/analyze/local",
} as const;

export type ApiPathKey = keyof typeof API_PATHS;

/** Path builders for parameterized routes. */
export const apiPath = {
  pipelineDetail: (pipelineId: string) =>
    `/v1/pipeline/${encodeURIComponent(pipelineId)}`,

  snapshotDetail: (snapshotId: string) =>
    `/v1/snapshot/${encodeURIComponent(snapshotId)}`,

  snapshotCompare: (beforeId: string, afterId: string) =>
    `/v1/snapshots/${encodeURIComponent(beforeId)}/compare/${encodeURIComponent(afterId)}`,

  snapshotIntelligence: (snapshotId: string) =>
    `/v1/snapshot/${encodeURIComponent(snapshotId)}/intelligence`,

  projectHistory: (limit?: number) =>
    limit === undefined ? "/v1/project/history" : `/v1/project/history?limit=${limit}`,

  pipelineHistory: (limit?: number) =>
    limit === undefined ? "/v1/pipeline/history" : `/v1/pipeline/history?limit=${limit}`,
} as const;

/** Static, human-readable endpoint inventory (for the foundation console panel). */
export const ENDPOINT_INVENTORY: { method: string; path: string; description: string }[] = [
  { method: "GET", path: "/health", description: "Backend liveness" },
  { method: "POST", path: "/v1/analyze/archive", description: "Analyze ZIP archive" },
  { method: "POST", path: "/v1/analyze/repository", description: "Analyze GitHub repository" },
  { method: "POST", path: "/v1/snapshot", description: "Create project snapshot" },
  { method: "POST", path: "/v1/brain/query", description: "Project Brain query" },
  { method: "POST", path: "/v1/plan", description: "Generate improvement plan" },
  { method: "POST", path: "/v1/novelty", description: "Novelty analysis" },
  { method: "POST", path: "/v1/impact", description: "Change impact analysis" },
  { method: "POST", path: "/v1/build", description: "Generate build plan" },
  { method: "POST", path: "/v1/execute", description: "Execute approved patches" },
  { method: "POST", path: "/v1/pipeline", description: "Run end-to-end pipeline" },
  { method: "GET", path: "/v1/pipeline/history", description: "Pipeline execution history" },
  { method: "GET", path: "/v1/pipeline/:id", description: "Pipeline result detail" },
  { method: "GET", path: "/v1/snapshot/:id", description: "Snapshot detail" },
  { method: "GET", path: "/v1/snapshots/:a/compare/:b", description: "Snapshot comparison" },
  { method: "GET", path: "/v1/snapshot/:id/intelligence", description: "Historical intelligence" },
  { method: "GET", path: "/v1/project/history", description: "Project timeline" },
];
