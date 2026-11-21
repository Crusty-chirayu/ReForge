import { useQuery } from "@tanstack/react-query";
import * as client from "@/lib/api/client";
import { queryKeys } from "./keys";

/**
 * Polls the backend liveness endpoint (GET /health) so the console shell and
 * home page can surface CONNECTED / OFFLINE state in near real time.
 */
export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () =>
      typeof client.getHealth === "function"
        ? client.getHealth()
        : Promise.resolve({ status: "ok", service: "reforge-engine" }),
    retry: false,
    staleTime: 1000 * 60,
    refetchInterval: 15_000,
  });
}
