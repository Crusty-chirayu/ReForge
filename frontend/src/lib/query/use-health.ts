import { useQuery } from "@tanstack/react-query";
import { getHealth } from "@/lib/api/client";
import { queryKeys } from "./keys";

/**
 * Polls the backend liveness endpoint (GET /health) so the console shell and
 * home page can surface CONNECTED / OFFLINE state in near real time.
 */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: getHealth,
    retry: false,
    staleTime: 1000 * 60,
    refetchInterval: 15_000,
  });
}
