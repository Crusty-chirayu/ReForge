// ─────────────────────────────────────────────────────────────────────────────
// ReForge API — public entry point.
// ─────────────────────────────────────────────────────────────────────────────

export {
  ApiError,
  getHealth,
  brainQuery,
  generatePlan,
  analyzeNovelty,
  analyzeImpact,
  generateBuild,
  executePipeline,
  validateExecution,
  runPipeline,
  getPipelineHistory,
  getPipeline,
  createSnapshot,
  getSnapshot,
  compareSnapshots,
  getSnapshotIntelligence,
  getProjectHistory,
  analyzeArchive,
  analyzeRepository,
  analyzeLocal,
  API_PATHS,
  apiPath,
  type PlanOptions,
  type BuildOptions,
  type ExecutePayload,
} from "./client";

export type * from "./types";
export { ENDPOINT_INVENTORY } from "./endpoints";
