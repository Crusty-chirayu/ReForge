"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/lib/context/report-context";
import { ReportActions } from "@/components/report/report-actions";
import { ReportNav } from "@/components/report/report-nav";
import { ReportSections } from "@/components/report/sections";
import { formatDateTime } from "@/lib/utils/format";

function ReportSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading analysis report">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded border border-ink-border/40" />
      <Skeleton className="h-24 w-full rounded border border-ink-border/40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-20 rounded border border-ink-border/40 bg-ink-card/60"
          />
        ))}
      </div>
      <Skeleton rows={3} height="3.5rem" className="w-full" />
    </div>
  );
}

export default function AnalysisReportPage() {
  const router = useRouter();
  const { report, reportLoading } = useReport();

  if (reportLoading) {
    return <ReportSkeleton />;
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} />}
            onClick={() => router.push("/analyze")}
          >
            Back to Analyze
          </Button>
          <ChevronRight size={11} className="text-ink-subtle" />
          <span className="font-mono text-ink-fg">Analysis Report</span>
        </div>
        <Card padding="lg">
          <EmptyState
            title="No analysis report available"
            description="Run an analysis first — the report produced by the backend will appear here."
            action={{ label: "Analyze Project", onClick: () => router.push("/analyze") }}
          />
        </Card>
      </div>
    );
  }

  const kind = report.provenance.source.kind;
  const reference =
    report.provenance.source.reference ?? report.provenance.source.kind;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={12} />}
          onClick={() => router.push("/analyze")}
        >
          Back to Analyze
        </Button>
        <ChevronRight size={11} className="text-ink-subtle" />
        <span className="font-mono text-ink-fg">Analysis Report</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-ink-fg">
              Analysis Report
            </h1>
            <span className="rounded border border-ink-border/40 bg-ink-1 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-ink-muted">
              {kind}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-muted">
            <span className="truncate">{reference}</span>
            <span className="text-ink-subtle">·</span>
            <span>{formatDateTime(report.generatedAt)}</span>
            <span className="text-ink-subtle">·</span>
            <span>schema v{report.schemaVersion}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CopyButton value={reference} label="Copy report reference" />
        </div>
      </div>

      <ReportNav />
      <ReportSections report={report} />
      <ReportActions />
    </div>
  );
}
