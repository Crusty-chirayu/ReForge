"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/lib/context/report-context";
import type { AnalysisReport } from "@/lib/api/types";

export interface RequiresReportProps {
  children: (report: AnalysisReport) => ReactNode;
}

/**
 * Guards workflow pages that need the analysis report from the F3 store.
 * Shows a skeleton while the store hydrates and a clear "Run an analysis
 * first" state when no report is available.
 */
export function RequiresReport({ children }: RequiresReportProps) {
  const router = useRouter();
  const { report, reportLoading } = useReport();

  if (reportLoading) {
    return (
      <div
        className="space-y-4"
        role="status"
        aria-label="Loading report context"
      >
        <Skeleton className="h-10 w-full rounded border border-ink-border/40" />
        <Skeleton rows={4} height="3rem" className="w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card padding="lg">
        <EmptyState
          title="Run an analysis first"
          description="This workflow needs a project analysis report. Analyze a project to generate one, then return here — your report is preserved for the next workflow automatically."
          action={{ label: "Analyze Project", onClick: () => router.push("/analyze") }}
        />
      </Card>
    );
  }

  return <>{children(report)}</>;
}
