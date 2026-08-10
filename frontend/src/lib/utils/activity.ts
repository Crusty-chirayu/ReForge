// ─────────────────────────────────────────────────────────────────────────────
// Activity derivation — merges real project/pipeline history into a
// chronological event feed. No fabricated events.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  PipelineExecutionSummary,
  ProjectHistoryItem,
} from "@/lib/api/types";
import { shortId } from "./format";

export type ActivityKind = "snapshot" | "pipeline";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  label: string;
  createdAt: string;
}

function toEvents(
  project: ProjectHistoryItem[],
  pipeline: PipelineExecutionSummary[],
): ActivityEvent[] {
  const snapshotEvents: ActivityEvent[] = project.map((item) => ({
    id: item.snapshotId,
    kind: "snapshot",
    label: `Snapshot ${shortId(item.snapshotId, 14)}`,
    createdAt: item.createdAt,
  }));

  const pipelineEvents: ActivityEvent[] = pipeline.map((item) => ({
    id: item.pipelineId,
    kind: "pipeline",
    label: item.goal,
    createdAt: item.createdAt,
  }));

  return [...snapshotEvents, ...pipelineEvents].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

/** Most recent activity across snapshots and pipelines (or null). */
export function deriveLatestActivity(
  project: ProjectHistoryItem[],
  pipeline: PipelineExecutionSummary[],
): ActivityEvent | null {
  return toEvents(project, pipeline)[0] ?? null;
}

/** Chronological activity feed, most recent first. */
export function deriveActivityFeed(
  project: ProjectHistoryItem[],
  pipeline: PipelineExecutionSummary[],
  limit = 6,
): ActivityEvent[] {
  return toEvents(project, pipeline).slice(0, limit);
}
