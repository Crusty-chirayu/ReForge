"use client";

import { QueryProvider } from "@/lib/query/query-provider";
import { ReportProvider } from "@/lib/context/report-context";
import { ThemeProvider } from "@/lib/theme";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ReportProvider>{children}</ReportProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
