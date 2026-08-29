"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { FileSearch } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/lib/context/report-context";
import type { AnalysisReport } from "@/lib/api/types";

export interface RequiresReportProps {
  children: (report: AnalysisReport) => ReactNode;
  /** Workflow name, used to explain precisely what needs the report. */
  workflow?: string;
}

/**
 * Guards workflow pages that need an analysis report.
 *
 * The report lives in a per-tab store (see report-context). When it is absent —
 * typically a deep link or a new tab — this renders an honest recovery state
 * that explains why the page is empty and links to the one action that fixes
 * it. No placeholder report is ever synthesized.
 */
export function RequiresReport({ children, workflow }: RequiresReportProps) {
  const { report, reportLoading } = useReport();

  if (reportLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading report context">
        <Skeleton className="h-10 w-full rounded border border-ink-border/40" />
        <Skeleton rows={4} height="3rem" className="w-full" />
        <span className="sr-only">Restoring analysis report…</span>
      </div>
    );
  }

  if (!report) {
    return <MissingReport workflow={workflow} />;
  }

  return <>{children(report)}</>;
}

/**
 * Shared "no analysis report" recovery surface. Exported so pages that render
 * their own heading above the guard can reuse the exact same copy.
 */
export function MissingReport({ workflow }: { workflow?: string }) {
  const router = useRouter();
  const subject = workflow ? `The ${workflow} workflow` : "This workflow";

  return (
    <Card padding="lg">
      <EmptyState
        title="Run an analysis first"
        description={`${subject} reasons over a project analysis report, and none is loaded in this tab. Analyze a project to generate one — every workflow then reuses it automatically.`}
        icon={<FileSearch className="h-6 w-6" />}
        action={{
          label: "Analyze Project",
          onClick: () => router.push("/analyze"),
        }}
      />
      <p className="mt-3 text-center text-[10px] text-ink-subtle">
        Reports are held for the current browser tab only and are never written
        to long-term storage, so a new tab starts fresh.
      </p>
    </Card>
  );
}
