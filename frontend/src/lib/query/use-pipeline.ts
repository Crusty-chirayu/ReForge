import { useQuery } from "@tanstack/react-query";
import { getPipeline } from "@/lib/api/client";
import { retryPolicy } from "@/lib/utils/api-error";
import { queryKeys } from "./keys";

/**
 * GET /v1/pipeline/:pipelineId — a stored, terminal pipeline result.
 *
 * Pipeline results are immutable once written, so this never polls: it is
 * fetched on mount and refetched only when the user explicitly asks.
 */
export function usePipeline(pipelineId: string) {
  return useQuery({
    queryKey: queryKeys.pipeline(pipelineId),
    queryFn: () => getPipeline(pipelineId),
    enabled: Boolean(pipelineId),
    retry: retryPolicy,
  });
}
