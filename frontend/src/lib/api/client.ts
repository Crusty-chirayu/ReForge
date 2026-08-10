// ─────────────────────────────────────────────────────────────────────────────
// ReForge API client.
//
// Centralized, typed HTTP client for the frozen Fastify backend. All requests
// are same-origin by default (Next.js rewrites proxy /health and /v1/* to the
// backend — see next.config.ts). Set NEXT_PUBLIC_API_URL to bypass the proxy
// and hit a backend directly.
// ─────────────────────────────────────────────────────────────────────────────

import { API_PATHS, apiPath } from "./endpoints";
import type {
  AnalysisReport,
  BrainResponse,
  BuildPlan,
  BuildResponse,
  ChangeImpactReport,
  ErrorResponse,
  ExecuteResponse,
  ExecutionRequest,
  ExecutionResult,
  HealthResponse,
  IntelligenceResponse,
  NoveltyResponse,
  PatchOperation,
  PipelineHistoryResponse,
  PipelineItemResponse,
  PipelineRequest,
  PipelineResponse,
  Plan,
  PlanResponse,
  ProjectHistoryResponse,
  SnapshotCompareResponse,
  SnapshotResponse,
} from "./types";

// ── Configuration ─────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Resolve a path to an absolute URL. When NEXT_PUBLIC_API_URL is empty (the
 * local-dev default), requests hit the same origin and Next.js rewrites them
 * to the backend at http://127.0.0.1:3000.
 */
function resolve(path: string): string {
  return API_BASE ? `${API_BASE.replace(/\/$/, "")}${path}` : path;
}

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ── Low-level helpers ─────────────────────────────────────────────────────────

function errorMessage(
  status: number,
  body: unknown,
  fallback: string,
): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as ErrorResponse).error;
    if (typeof err === "string" && err.length > 0) return err;
  }
  if (typeof body === "string" && body.length > 0) return body;
  return fallback;
}

async function parseBody<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** JSON request/response wrapper. */
async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(resolve(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...init.headers,
    },
    credentials: "same-origin",
  });

  const body = await parseBody<T | ErrorResponse>(response);

  if (!response.ok) {
    throw new ApiError(
      errorMessage(response.status, body, `Request failed (${response.status})`),
      response.status,
      body,
    );
  }

  return body as T;
}

/** Multipart request/response wrapper. Content-Type is left to the browser. */
async function multipart<T>(
  path: string,
  form: FormData,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(resolve(path), {
    method: "POST",
    body: form,
    credentials: "same-origin",
    signal,
  });

  const body = await parseBody<T | ErrorResponse>(response);

  if (!response.ok) {
    throw new ApiError(
      errorMessage(response.status, body, `Request failed (${response.status})`),
      response.status,
      body,
    );
  }

  return body as T;
}

// ── Health ────────────────────────────────────────────────────────────────────

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>(API_PATHS.health);
}

// ── Brain ─────────────────────────────────────────────────────────────────────

export function brainQuery(
  question: string,
  report: AnalysisReport,
): Promise<BrainResponse> {
  return request<BrainResponse>(API_PATHS.brain, {
    method: "POST",
    body: JSON.stringify({ question, report }),
  });
}

// ── Planning ──────────────────────────────────────────────────────────────────

export interface PlanOptions {
  constraints?: string[];
  priorities?: string[];
  desiredTechnology?: string;
}

export function generatePlan(
  goal: string,
  report: AnalysisReport,
  options?: PlanOptions,
): Promise<PlanResponse> {
  return request<PlanResponse>(API_PATHS.plan, {
    method: "POST",
    body: JSON.stringify({ goal, report, ...options }),
  });
}

// ── Novelty ───────────────────────────────────────────────────────────────────

export function analyzeNovelty(
  report: AnalysisReport,
  goal?: string,
): Promise<NoveltyResponse> {
  return request<NoveltyResponse>(API_PATHS.novelty, {
    method: "POST",
    body: JSON.stringify({ report, goal }),
  });
}

// ── Impact ────────────────────────────────────────────────────────────────────

export function analyzeImpact(
  impactRequest: string,
  report: AnalysisReport,
  category?: string,
): Promise<ChangeImpactReport> {
  return request<ChangeImpactReport>(API_PATHS.impact, {
    method: "POST",
    body: JSON.stringify({ request: impactRequest, report, category }),
  });
}

// ── Build ─────────────────────────────────────────────────────────────────────

export interface BuildOptions {
  impact?: ChangeImpactReport;
  noveltyCandidate?: import("./types").NoveltyCandidate;
  plan?: Plan;
}

export function generateBuild(
  goal: string,
  report: AnalysisReport,
  options?: BuildOptions,
): Promise<BuildResponse> {
  return request<BuildResponse>(API_PATHS.build, {
    method: "POST",
    body: JSON.stringify({ goal, report, ...options }),
  });
}

// ── Execute (multipart) ───────────────────────────────────────────────────────

export interface ExecutePayload {
  approved: boolean;
  build: BuildPlan;
  patches?: PatchOperation[];
  allowDelete?: boolean;
  verify?: boolean;
}

export function executePipeline(
  archive: File,
  payload: ExecutePayload,
): Promise<ExecuteResponse> {
  const form = new FormData();
  form.set("archive", archive);
  form.set("request", JSON.stringify(payload));
  return multipart<ExecuteResponse>(API_PATHS.execute, form);
}

// ── Execute validation (JSON) ─────────────────────────────────────────────────

export function validateExecution(
  payload: ExecutionRequest,
): Promise<ExecutionResult> {
  return request<ExecutionResult>(API_PATHS.executeValidate, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Pipeline (multipart) ──────────────────────────────────────────────────────

export function runPipeline(
  archive: File,
  payload: PipelineRequest,
  signal?: AbortSignal,
): Promise<PipelineResponse> {
  const form = new FormData();
  form.set("archive", archive);
  form.set("request", JSON.stringify(payload));
  return multipart<PipelineResponse>(API_PATHS.pipeline, form, signal);
}

// ── Pipeline history ──────────────────────────────────────────────────────────

export function getPipelineHistory(
  limit = 50,
): Promise<PipelineHistoryResponse> {
  return request<PipelineHistoryResponse>(apiPath.pipelineHistory(limit));
}

export function getPipeline(
  pipelineId: string,
): Promise<PipelineItemResponse> {
  return request<PipelineItemResponse>(apiPath.pipelineDetail(pipelineId));
}

// ── Snapshots ────────────────────────────────────────────────────────────────

export function createSnapshot(archive: File): Promise<SnapshotResponse> {
  const form = new FormData();
  form.set("archive", archive);
  return multipart<SnapshotResponse>(API_PATHS.snapshotCreate, form);
}

export function getSnapshot(
  snapshotId: string,
): Promise<SnapshotResponse> {
  return request<SnapshotResponse>(apiPath.snapshotDetail(snapshotId));
}

export function compareSnapshots(
  beforeId: string,
  afterId: string,
): Promise<SnapshotCompareResponse> {
  return request<SnapshotCompareResponse>(
    apiPath.snapshotCompare(beforeId, afterId),
  );
}

export function getSnapshotIntelligence(
  snapshotId: string,
  historyLimit = 10,
): Promise<IntelligenceResponse> {
  const base = apiPath.snapshotIntelligence(snapshotId);
  return request<IntelligenceResponse>(
    `${base}?historyLimit=${encodeURIComponent(historyLimit)}`,
  );
}

// ── Project history ───────────────────────────────────────────────────────────

export function getProjectHistory(
  limit = 20,
): Promise<ProjectHistoryResponse> {
  return request<ProjectHistoryResponse>(apiPath.projectHistory(limit));
}

// ── Analysis ──────────────────────────────────────────────────────────────────

export function analyzeArchive(
  archive: File,
  signal?: AbortSignal,
): Promise<AnalysisReport> {
  const form = new FormData();
  form.set("archive", archive);
  return multipart<AnalysisReport>(API_PATHS.analyzeArchive, form, signal);
}

export function analyzeRepository(
  repositoryUrl: string,
  signal?: AbortSignal,
): Promise<AnalysisReport> {
  return request<AnalysisReport>(API_PATHS.analyzeRepository, {
    method: "POST",
    body: JSON.stringify({ repositoryUrl }),
    signal,
  });
}

export function analyzeLocal(path: string): Promise<AnalysisReport> {
  return request<AnalysisReport>(API_PATHS.analyzeLocal, {
    method: "POST",
    body: JSON.stringify({ path }),
  });
}

// ── Convenience re-exports ────────────────────────────────────────────────────

export type {
  AnalysisReport,
  BuildPlan,
  BuildResponse,
  ChangeImpactReport,
  ExecuteResponse,
  ExecutionRequest,
  ExecutionResult,
  HealthResponse,
  HistoricalProjectIntelligence,
  NoveltyResponse,
  PipelineHistoryResponse,
  PipelineItemResponse,
  PipelineRequest,
  PipelineResponse,
  Plan,
  PlanResponse,
  ProjectHistoryResponse,
  ProjectSnapshot,
  SnapshotCompareResponse,
  SnapshotResponse,
} from "./types";

export { API_PATHS, apiPath } from "./endpoints";
