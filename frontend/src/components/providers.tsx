"use client";

import { QueryProvider } from "@/lib/query/query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryProvider>{children}</QueryProvider>;
}
