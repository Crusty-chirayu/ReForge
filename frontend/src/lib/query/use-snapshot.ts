import { useQuery } from "@tanstack/react-query";
import {
  compareSnapshots,
  getSnapshot,
  getSnapshotIntelligence,
} from "@/lib/api/client";
import { retryPolicy } from "@/lib/utils/api-error";
import { queryKeys } from "./keys";

/** GET /v1/snapshot/:snapshotId — full project snapshot. */
export function useSnapshot(snapshotId: string) {
  return useQuery({
    queryKey: queryKeys.snapshot(snapshotId),
    queryFn: () => getSnapshot(snapshotId),
    enabled: Boolean(snapshotId),
    retry: retryPolicy,
  });
}

/** GET /v1/snapshot/:snapshotId/intelligence?historyLimit= — historical intelligence. */
export function useSnapshotIntelligence(
  snapshotId: string,
  historyLimit = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.snapshotIntelligence(snapshotId, historyLimit),
    queryFn: async () => {
      const res = await getSnapshotIntelligence(snapshotId, historyLimit);
      return res ?? null;
    },
    enabled: Boolean(snapshotId) && enabled,
    retry: retryPolicy,
  });
}

/** GET /v1/snapshots/:beforeId/compare/:afterId — deterministic snapshot diff. */
export function useSnapshotCompare(beforeId: string, afterId: string) {
  return useQuery({
    queryKey: queryKeys.snapshotCompare(beforeId, afterId),
    queryFn: () => compareSnapshots(beforeId, afterId),
    enabled: Boolean(beforeId && afterId),
    retry: retryPolicy,
  });
}
