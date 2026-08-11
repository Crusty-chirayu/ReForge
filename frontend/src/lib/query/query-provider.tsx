"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { retryPolicy } from "@/lib/utils/api-error";

/**
 * TanStack Query provider.
 *
 * The client is created once per provider instance via lazy `useState`, which
 * (unlike `useMemo`) is guaranteed never to be discarded and recreated — a
 * recreated client would silently drop every in-flight request and cached
 * result.
 *
 * Defaults are deliberately conservative: no polling anywhere, no refetch on
 * focus, and no retrying of definitive 4xx answers. Pipeline and snapshot
 * results are immutable once stored, so background churn would only produce
 * duplicate load against the backend.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: retryPolicy,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
