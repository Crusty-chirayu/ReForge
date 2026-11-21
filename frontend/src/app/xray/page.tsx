"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Layers, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/lib/context/report-context";
import { XRayViewer } from "@/components/xray/xray-viewer";

export default function XRayPage() {
  const router = useRouter();
  const { report, reportLoading } = useReport();

  if (reportLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading Project X-Ray">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton rows={4} height="5rem" className="w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-meta text-text-secondary">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} />}
            onClick={() => router.push("/analyze")}
          >
            Back to Ingest
          </Button>
          <ChevronRight size={11} className="text-text-tertiary" />
          <span className="font-mono text-text-primary">X-Ray</span>
        </div>
        <Card padding="lg">
          <EmptyState
            title="No project model available for X-Ray"
            description="Project X-Ray visualizes the internal architecture, coupling matrix, and module dependency graph of an analyzed project. Ingest a project to enable X-Ray."
            action={{ label: "Analyze Project", onClick: () => router.push("/analyze") }}
          />
        </Card>
      </div>
    );
  }

  const model = report.projectModel;
  const moduleCount = model?.modules?.length ?? 0;
  const fileCount = report.overview.fileCount;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-meta text-text-secondary">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} />}
            onClick={() => router.push("/analyze/report")}
          >
            Report
          </Button>
          <ChevronRight size={11} className="text-text-tertiary" />
          <span className="font-mono text-text-primary">Project X-Ray</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={<FileText size={12} />}
          onClick={() => router.push("/analyze/report")}
        >
          View Full Report
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded border border-accent/30 bg-accent-subtle text-accent">
              <Layers size={15} />
            </span>
            <h1 className="text-h2-dense font-semibold text-text-primary tracking-tight">
              Project X-Ray
            </h1>
          </div>
          <p className="mt-1 text-ui-dense text-text-secondary">
            Interactive structural analysis, focus neighborhood graph, and module coupling matrix for{" "}
            <span className="font-mono font-medium text-text-primary">
              {report.provenance.source.reference ?? report.provenance.source.kind}
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-meta">
          <span className="rounded border border-border-subtle bg-bg-surface px-2.5 py-1 text-text-secondary">
            <strong className="text-text-primary tabular-nums">{moduleCount}</strong> modules
          </span>
          <span className="rounded border border-border-subtle bg-bg-surface px-2.5 py-1 text-text-secondary">
            <strong className="text-text-primary tabular-nums">{fileCount}</strong> files
          </span>
        </div>
      </div>

      {/* Main XRayViewer */}
      <XRayViewer
        model={model}
        doctorFindings={report.doctor?.findings}
      />
    </div>
  );
}
