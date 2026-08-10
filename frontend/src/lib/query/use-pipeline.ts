import { useQuery } from "@tanstack/react-query";
import { getPipeline } from "@/lib/api/client";
import { queryKeys } from "./keys";

/** GET /v1/pipeline/:pipelineId — full pipeline result. */
export function usePipeline(pipelineId: string) {
  return useQuery({
    queryKey: queryKeys.pipeline(pipelineId),
    queryFn: () => getPipeline(pipelineId),
    enabled: Boolean(pipelineId),
    retry: 1,
  });
}
