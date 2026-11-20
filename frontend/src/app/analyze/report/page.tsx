"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Layers,
  Activity,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/lib/context/report-context";
import { ReportActions } from "@/components/report/report-actions";
import { ReportNav } from "@/components/report/report-nav";
import { ReportSections } from "@/components/report/sections";
import { XRayViewer } from "@/components/xray/xray-viewer";
import { DoctorViewer } from "@/components/doctor/doctor-viewer";
import { formatDateTime, formatBytes } from "@/lib/utils/format";

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
      <Skeleton className="h-10 w-full rounded border border-border-subtle" />
      <Skeleton className="h-24 w-full rounded border border-border-subtle" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-20 rounded border border-border-subtle bg-bg-surface"
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
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["overview", "xray", "doctor"].includes(tabParam)) {
        return tabParam;
      }
    }
    return "overview";
  });

  if (reportLoading) {
    return <ReportSkeleton />;
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-meta text-text-secondary">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} />}
            onClick={() => router.push("/analyze")}
          >
            Back to Analyze
          </Button>
          <ChevronRight size={11} className="text-text-tertiary" />
          <span className="font-mono text-text-primary">Analysis Report</span>
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
      <div className="flex items-center gap-2 text-meta text-text-secondary">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={12} />}
          onClick={() => router.push("/analyze")}
        >
          Back to Analyze
        </Button>
        <ChevronRight size={11} className="text-text-tertiary" />
        <span className="font-mono text-text-primary">Analysis Report</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-h2-dense font-semibold text-text-primary tracking-tight">
              Analysis Report
            </h1>
            <span className="rounded-[4px] border border-border-default bg-bg-raised px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-text-secondary">
              {kind}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-meta text-text-secondary">
            <span className="truncate text-text-primary font-medium">{reference}</span>
            <span className="text-text-tertiary">·</span>
            <span>{formatDateTime(report.generatedAt)}</span>
            <span className="text-text-tertiary">·</span>
            <span>schema v{report.schemaVersion}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CopyButton value={reference} label="Copy report reference" />
        </div>
      </div>

      {/* Sticky Summary Strip */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border-default bg-bg-surface/95 px-4 py-2.5 shadow-sm backdrop-blur-sm select-none font-mono text-meta">
        <div className="flex items-center gap-4 divide-x divide-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-text-tertiary uppercase text-[10px]">Files:</span>
            <span className="text-text-primary font-semibold tabular-nums">{report.overview.fileCount}</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-text-tertiary uppercase text-[10px]">Analyzable:</span>
            <span className="text-text-primary font-semibold tabular-nums">{report.overview.analyzableFileCount} files</span>
          </div>
          <div className="pl-4 flex items-center gap-2">
            <span className="text-text-tertiary uppercase text-[10px]">Size:</span>
            <span className="text-text-primary font-semibold tabular-nums">{formatBytes(report.overview.totalBytes)} total</span>
          </div>
          {report.doctor && (
            <div className="pl-4 flex items-center gap-2">
              <span className="text-text-tertiary uppercase text-[10px]">Health:</span>
              <span
                className={`font-semibold tabular-nums ${
                  report.doctor.healthScore >= 70
                    ? "text-success"
                    : report.doctor.healthScore >= 50
                    ? "text-medium"
                    : "text-critical"
                }`}
              >
                {report.doctor.healthScore}/100
              </span>
            </div>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 rounded border border-border-default bg-bg-raised p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-meta font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <FileText size={12} />
            <span>Overview Report</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("xray")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-meta font-medium transition-colors ${
              activeTab === "xray"
                ? "bg-bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Layers size={12} />
            <span>Project X-Ray</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("doctor")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-meta font-medium transition-colors ${
              activeTab === "doctor"
                ? "bg-bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Activity size={12} />
            <span>Project Doctor</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === "xray" ? (
        <section aria-label="Project X-Ray Interactive Visualizer">
          <XRayViewer
            model={report.projectModel}
            doctorFindings={report.doctor?.findings}
          />
        </section>
      ) : activeTab === "doctor" ? (
        <section aria-label="Project Doctor Triage Workbench">
          <DoctorViewer doctor={report.doctor} />
        </section>
      ) : (
        <div className="space-y-6">
          <ReportNav />
          <ReportSections report={report} />
          <ReportActions />
        </div>
      )}
    </div>
  );
}
