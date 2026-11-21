"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Stethoscope, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/lib/context/report-context";
import { DoctorViewer } from "@/components/doctor/doctor-viewer";

export default function DoctorPage() {
  const router = useRouter();
  const { report, reportLoading } = useReport();

  if (reportLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading Project Doctor">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-28 w-full" />
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
          <span className="font-mono text-text-primary">Doctor</span>
        </div>
        <Card padding="lg">
          <EmptyState
            title="No diagnostic findings available"
            description="Project Doctor performs deterministic architectural triage, anti-pattern checks, and health scoring. Ingest a project to run Doctor."
            action={{ label: "Analyze Project", onClick: () => router.push("/analyze") }}
          />
        </Card>
      </div>
    );
  }

  const doctor = report.doctor;
  const score = doctor?.healthScore ?? 100;
  const findingsCount = doctor?.findings?.length ?? 0;

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
          <span className="font-mono text-text-primary">Project Doctor</span>
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
            <span className="flex h-7 w-7 items-center justify-center rounded border border-medium/30 bg-medium/10 text-medium">
              <Stethoscope size={15} />
            </span>
            <h1 className="text-h2-dense font-semibold text-text-primary tracking-tight">
              Project Doctor
            </h1>
          </div>
          <p className="mt-1 text-ui-dense text-text-secondary">
            Deterministic architectural triage, code smell detection, and automated hygiene rules for{" "}
            <span className="font-mono font-medium text-text-primary">
              {report.provenance.source.reference ?? report.provenance.source.kind}
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-meta">
          <span
            className={`rounded border px-2.5 py-1 ${
              score >= 70
                ? "border-success/30 bg-success/10 text-success"
                : score >= 50
                  ? "border-medium/30 bg-medium/10 text-medium"
                  : "border-critical/30 bg-critical/10 text-critical"
            }`}
          >
            Health Score: <strong className="tabular-nums">{score}</strong>/100
          </span>
          <span className="rounded border border-border-subtle bg-bg-surface px-2.5 py-1 text-text-secondary">
            <strong className="text-text-primary tabular-nums">{findingsCount}</strong> findings
          </span>
        </div>
      </div>

      {/* Main DoctorViewer */}
      <section aria-label="Project Doctor Triage Workbench">
        <DoctorViewer doctor={doctor} />
      </section>
    </div>
  );
}
