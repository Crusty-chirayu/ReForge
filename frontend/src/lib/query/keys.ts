// ─────────────────────────────────────────────────────────────────────────────
// TanStack Query key factory — single source of truth for cache keys.
// ─────────────────────────────────────────────────────────────────────────────

export const queryKeys = {
  /** Backend liveness (GET /health) */
  health: ["health"] as const,

  /** Project timeline (GET /v1/project/history) */
  projectHistory: (limit?: number) =>
    ["project-history", limit ?? 20] as const,

  /** Pipeline execution history (GET /v1/pipeline/history) */
  pipelineHistory: (limit?: number) =>
    ["pipeline-history", limit ?? 50] as const,

  /** Single pipeline result (GET /v1/pipeline/:id) */
  pipeline: (pipelineId: string) => ["pipeline", pipelineId] as const,

  /** Single snapshot (GET /v1/snapshot/:id) */
  snapshot: (snapshotId: string) => ["snapshot", snapshotId] as const,

  /** Snapshot intelligence (GET /v1/snapshot/:id/intelligence) */
  snapshotIntelligence: (snapshotId: string, historyLimit?: number) =>
    ["snapshot-intelligence", snapshotId, historyLimit ?? 10] as const,

  /** Snapshot comparison (GET /v1/snapshots/:a/compare/:b) */
  snapshotCompare: (beforeId: string, afterId: string) =>
    ["snapshot-compare", beforeId, afterId] as const,

  /** Analysis report stored client-side */
  analysis: (id?: string) => ["analysis", id ?? "latest"] as const,
} as const;

/** Alias kept for brevity. */
export const QUERY_KEYS = queryKeys;
