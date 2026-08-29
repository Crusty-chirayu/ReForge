import { useQuery } from "@tanstack/react-query";
import { getPipelineHistory } from "@/lib/api/client";
import { retryPolicy } from "@/lib/utils/api-error";
import { queryKeys } from "./keys";

/** GET /v1/pipeline/history?limit= — pipeline execution history. */
export function usePipelineHistory(limit = 50) {
  return useQuery({
    queryKey: queryKeys.pipelineHistory(limit),
    queryFn: () => getPipelineHistory(limit),
    retry: retryPolicy,
  });
}
