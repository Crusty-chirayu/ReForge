"use client";

import { QueryProvider } from "@/lib/query/query-provider";
import { ReportProvider } from "@/lib/context/report-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ReportProvider>{children}</ReportProvider>
    </QueryProvider>
  );
}
