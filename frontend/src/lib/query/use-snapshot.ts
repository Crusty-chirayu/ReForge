import { useQuery } from "@tanstack/react-query";
import {
  compareSnapshots,
  getSnapshot,
  getSnapshotIntelligence,
} from "@/lib/api/client";
import { queryKeys } from "./keys";

/** GET /v1/snapshot/:snapshotId — full project snapshot. */
export function useSnapshot(snapshotId: string) {
  return useQuery({
    queryKey: queryKeys.snapshot(snapshotId),
    queryFn: () => getSnapshot(snapshotId),
    enabled: Boolean(snapshotId),
    retry: 1,
  });
}

/** GET /v1/snapshot/:snapshotId/intelligence?historyLimit= — historical intelligence. */
export function useSnapshotIntelligence(snapshotId: string, historyLimit = 10) {
  return useQuery({
    queryKey: queryKeys.snapshotIntelligence(snapshotId, historyLimit),
    queryFn: () => getSnapshotIntelligence(snapshotId, historyLimit),
    enabled: Boolean(snapshotId),
    retry: 1,
  });
}

/** GET /v1/snapshots/:beforeId/compare/:afterId — deterministic snapshot diff. */
export function useSnapshotCompare(beforeId: string, afterId: string) {
  return useQuery({
    queryKey: queryKeys.snapshotCompare(beforeId, afterId),
    queryFn: () => compareSnapshots(beforeId, afterId),
    enabled: Boolean(beforeId && afterId),
    retry: 1,
  });
}
