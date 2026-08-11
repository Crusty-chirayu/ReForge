import { useQuery } from "@tanstack/react-query";
import { getProjectHistory } from "@/lib/api/client";
import { retryPolicy } from "@/lib/utils/api-error";
import { queryKeys } from "./keys";

/** GET /v1/project/history?limit= — chronological project timeline. */
export function useProjectHistory(limit = 20) {
  return useQuery({
    queryKey: queryKeys.projectHistory(limit),
    queryFn: () => getProjectHistory(limit),
    retry: retryPolicy,
  });
}
