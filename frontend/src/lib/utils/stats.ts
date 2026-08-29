// ─────────────────────────────────────────────────────────────────────────────
// Dashboard statistics — derived strictly from loaded API data.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PipelineExecutionSummary,
  ProjectHistoryItem,
} from "@/lib/api/types";

export interface DashboardStats {
  snapshotCount: number;
  pipelineCount: number;
  passedCount: number;
  failedCount: number;
  filesTracked: number;
  latestSnapshotAt: string | null;
}

export function deriveDashboardStats(
  project: ProjectHistoryItem[],
  pipeline: PipelineExecutionSummary[],
): DashboardStats {
  const latestSnapshotAt =
    project.length > 0
      ? project.reduce((latest, item) =>
          new Date(item.createdAt).getTime() >
          new Date(latest.createdAt).getTime()
            ? item
            : latest,
        ).createdAt
      : null;

  return {
    snapshotCount: project.length,
    pipelineCount: pipeline.length,
    passedCount: pipeline.filter((p) => p.status === "PASSED").length,
    failedCount: pipeline.filter(
      (p) => p.status === "FAILED" || p.status === "ERROR",
    ).length,
    filesTracked: project.reduce((sum, item) => sum + (item.fileCount ?? 0), 0),
    latestSnapshotAt,
  };
}
