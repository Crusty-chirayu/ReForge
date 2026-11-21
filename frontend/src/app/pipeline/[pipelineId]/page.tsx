"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, ExternalLink, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { StateRail, type StateRailState } from "@/components/ui/state-rail";
import { StageTimeline, type TimelineStage } from "@/components/ui/stage-timeline";
import {
  AnalysisSection,
  BuildSection,
  DiffSummarySection,
  ExecutionSection,
  ImpactSection,
  PlanSection,
  ProvenanceSection,
  RollbackSection,
  VerificationSection,
} from "@/components/pipeline/pipeline-sections";
import { PipelineStepper } from "@/components/pipeline/pipeline-stepper";
import { ApiError } from "@/lib/api";
import { describeApiError } from "@/lib/utils/api-error";
import { usePipeline } from "@/lib/query/use-pipeline";
import { pipelineStatusVariant, verificationVariant } from "@/lib/utils/status";
import { formatDateTime, shortId } from "@/lib/utils/format";
import type { PipelineResult } from "@/lib/api/types";

function PageSkeleton() {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading pipeline result"
    >
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-28 w-full rounded border border-ink-border/40" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-36 rounded border border-ink-border/40" />
        ))}
      </div>
      <Skeleton rows={4} height="3rem" className="w-full" />
    </div>
  );
}

function derivePipelineStateRail(result: PipelineResult): StateRailState {
  const exec = result.execution;
  if (!exec) return "proposed";
  if (exec.status === "FAILED" || result.status === "FAILED") return "failed";
  if (exec.status === "ROLLED_BACK") return "rolled_back";
  if (exec.verification?.attempted) {
    if (exec.verification.overallStatus === "PASSED") return "verified";
    return "failed";
  }
  if (exec.status === "SUCCEEDED") return "executed";
  if (exec.status === "CANCELLED") return "failed";
  if (exec.approved) return "approved";
  return "proposed";
}

function deriveTimelineStages(result: PipelineResult): TimelineStage[] {
  const exec = result.execution;
  return [
    {
      id: "ingest",
      name: "Ingest",
      status: result.report ? "completed" : "failed",
      artifactSummary: result.report?.overview
        ? `${result.report.overview.fileCount} files`
        : undefined,
    },
    {
      id: "analyze",
      name: "Analyze",
      status: result.report ? "completed" : "failed",
      artifactSummary: result.report?.doctor?.summary?.findingCount !== undefined
        ? `${result.report.doctor.summary.findingCount} findings`
        : undefined,
    },
    {
      id: "plan",
      name: "Plan",
      status: result.plan ? "completed" : "skipped",
      artifactSummary: result.plan?.tasks
        ? `${result.plan.tasks.length} tasks`
        : undefined,
    },
    {
      id: "impact",
      name: "Impact",
      status: result.impact ? "completed" : "skipped",
      artifactSummary: result.impact
        ? `${result.impact.impactLevel} risk`
        : undefined,
    },
    {
      id: "build",
      name: "Build",
      status: result.build ? "completed" : "skipped",
      artifactSummary: result.build?.fileChanges
        ? `${result.build.fileChanges.length} changes`
        : undefined,
    },
    {
      id: "execution",
      name: "Execute",
      status: !exec
        ? "skipped"
        : exec.status === "SUCCEEDED"
        ? "completed"
        : exec.status === "FAILED"
        ? "failed"
        : exec.status === "ROLLED_BACK"
        ? "rolled_back"
        : "running",
    },
    {
      id: "verification",
      name: "Verify",
      status: !exec?.verification?.attempted
        ? "skipped"
        : exec.verification.overallStatus === "PASSED"
        ? "completed"
        : "failed",
    },
  ];
}

/**
 * Map a failed pipeline fetch onto honest console copy. Delegates to the
 * shared classifier so every page describes 404 / 503 / transport failures
 * the same way.
 */
function errorTitle(error: unknown): { title: string; description: string } {
  if (error instanceof ApiError && error.status === 400) {
    return {
      title: "Invalid pipeline ID",
      description:
        "The pipeline ID failed backend validation (400). Open the run from Pipeline History to get a valid link.",
    };
  }
  return describeApiError(error, {
    resource: "pipeline",
    endpoint: "GET /v1/pipeline/:id",
    notFoundTitle: "Pipeline not found",
    notFoundDescription:
      "The requested pipeline result does not exist (404).",
  });
}

export default function PipelineDetailPage({
  params,
}: {
  params: Promise<{ pipelineId: string }>;
}) {
  const { pipelineId } = use(params);
  const router = useRouter();
  const { data, isLoading, error, refetch, dataUpdatedAt } =
    usePipeline(pipelineId);
  const [activeStage, setActiveStage] = useState<string | undefined>(undefined);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (error || !data) {
    const mapped = errorTitle(error);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} />}
            onClick={() => router.push("/")}
          >
            Dashboard
          </Button>
          <ChevronRight size={11} className="text-ink-subtle" />
          <Mono className="text-ink-fg">{shortId(pipelineId, 12)}</Mono>
        </div>
        <Card padding="lg">
          <ErrorState
            title={mapped.title}
            description={mapped.description}
            error={error}
            onRetry={() => void refetch()}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              variant="muted"
              size="sm"
              icon={<Zap size={12} />}
              onClick={() => router.push("/")}
            >
              Pipeline History
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/pipeline/new")}
            >
              Start a new run
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const result = data.result ?? data.execution;
  const exec = result.execution;

  const timelineStages = deriveTimelineStages(result);
  const railState = derivePipelineStateRail(result);

  const handleStageSelect = (stageId: string) => {
    setActiveStage(stageId);
    const targetMap: Record<string, string> = {
      ingest: "section-analysis",
      analyze: "section-analysis",
      plan: "section-plan",
      impact: "section-impact",
      build: "section-build",
      execution: "section-execution",
      verify: "section-verification",
      verification: "section-verification",
    };
    const el = document.getElementById(targetMap[stageId] ?? `section-${stageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const approvalState = exec
    ? exec.approved
      ? "Approved"
      : "Not approved"
    : "Not executed";
  const verificationState = exec?.verification?.attempted
    ? exec.verification.overallStatus
    : "Not run";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={12} />}
          onClick={() => router.push("/")}
        >
          Dashboard
        </Button>
        <ChevronRight size={11} className="text-ink-subtle" />
        <span className="font-mono text-ink-fg">Pipeline</span>
        <ChevronRight size={11} className="text-ink-subtle" />
        <Mono className="text-ink-fg">{shortId(pipelineId, 14)}</Mono>
        <span className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[9px] text-ink-subtle">
            updated{" "}
            {dataUpdatedAt > 0
              ? formatDateTime(new Date(dataUpdatedAt).toISOString())
              : "—"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={12} />}
            onClick={() => void refetch()}
          >
            Refresh
          </Button>
        </span>
      </div>

      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-ink-fg">
                Pipeline Result
              </h1>
              <StatusBadge variant={pipelineStatusVariant(result.status)}>
                {result.status}
              </StatusBadge>
            </div>
            <p className="mt-1 text-sm text-ink-fg">{result.goal}</p>
            <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              <HeaderFact
                label="Pipeline"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Mono className="text-ink-fg">{pipelineId}</Mono>
                    <CopyButton value={pipelineId} label="Copy pipeline ID" />
                  </span>
                }
              />
              <HeaderFact
                label="Snapshot"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Mono className="text-steel">{result.snapshot.snapshotId}</Mono>
                    <CopyButton value={result.snapshot.snapshotId} label="Copy snapshot ID" />
                  </span>
                }
              />
              <HeaderFact
                label="Approval"
                value={
                  <span
                    className={
                      approvalState === "Approved"
                        ? "text-emerald-400"
                        : "text-ink-muted"
                    }
                  >
                    {approvalState}
                  </span>
                }
              />
              <HeaderFact
                label="Execution"
                value={
                  <StatusBadge
                    variant={
                      exec
                        ? exec.status === "SUCCEEDED"
                          ? "succeeded"
                          : exec.status === "FAILED" || exec.status === "ROLLED_BACK"
                            ? "failed"
                            : "running"
                        : "muted"
                    }
                    size="sm"
                  >
                    {exec ? exec.status : "NOT EXECUTED"}
                  </StatusBadge>
                }
              />
              <HeaderFact
                label="Verification"
                value={
                  <StatusBadge
                    variant={verificationVariant(
                      exec?.verification?.attempted
                        ? exec.verification.overallStatus
                        : undefined,
                    )}
                    size="sm"
                  >
                    {verificationState}
                  </StatusBadge>
                }
              />
              <HeaderFact
                label="Cleanup"
                value={
                  <span
                    className={
                      result.workspaceCleanupStatus === "SUCCESS"
                        ? "text-emerald-400"
                        : "text-rose-400"
                    }
                  >
                    {result.workspaceCleanupStatus}
                  </span>
                }
              />
              <HeaderFact
                label="Created"
                value={
                  <span className="text-ink-muted">
                    {formatDateTime(result.createdAt)}
                  </span>
                }
              />
              <HeaderFact
                label="Completed"
                value={
                  <span className="text-ink-muted">
                    {formatDateTime(result.completedAt)}
                  </span>
                }
              />
            </dl>
            <div className="mt-4 pt-3 border-t border-ink-border/20">
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-subtle block mb-1">
                State Rail Lifecycle
              </span>
              <StateRail state={railState} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded border border-ink-border/40 bg-ink-1 px-2.5 py-1.5">
            <Zap size={11} className="text-forge" />
            <Mono className="text-ink-fg">{shortId(pipelineId, 12)}</Mono>
          </div>
        </div>
      </Card>

      {/* Stage timeline with interactive stage selection */}
      <Card padding="md" className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
            Execution Stage Timeline
          </span>
          <span className="text-[11px] font-mono text-text-tertiary hidden sm:inline">
            Click a stage to navigate to details
          </span>
        </div>
        <StageTimeline
          stages={timelineStages}
          activeStageId={activeStage}
          onSelectStage={handleStageSelect}
        />
      </Card>

      {/* Stage stepper */}
      <PipelineStepper result={result} />

      {/* Analysis */}
      <div id="section-analysis" className="scroll-mt-16 space-y-2">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={11} />}
            onClick={() => router.push("/analyze/report")}
          >
            Open Report
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={11} />}
            onClick={() => router.push("/xray")}
          >
            X-Ray
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={11} />}
            onClick={() => router.push("/doctor")}
          >
            Doctor
          </Button>
        </div>
        <AnalysisSection report={result.report} />
      </div>

      {/* Plan */}
      <div id="section-plan" className="scroll-mt-16 space-y-2">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={11} />}
            onClick={() => router.push("/plan")}
          >
            Open Plan
          </Button>
        </div>
        <PlanSection plan={result.plan} />
      </div>

      {/* Impact */}
      <div id="section-impact" className="scroll-mt-16 space-y-2">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={11} />}
            onClick={() => router.push("/impact")}
          >
            Open Impact
          </Button>
        </div>
        <ImpactSection impact={result.impact} />
      </div>

      {/* Build */}
      <div id="section-build" className="scroll-mt-16 space-y-2">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={11} />}
            onClick={() => router.push("/build")}
          >
            Open Builder
          </Button>
        </div>
        <BuildSection build={result.build} receipt={exec} />
      </div>

      {/* Execution */}
      <div id="section-execution" className="scroll-mt-16">
        {exec ? (
          <>
            <ExecutionSection receipt={exec} />
            {exec.diffSummary && <DiffSummarySection diff={exec.diffSummary} />}
            <RollbackSection receipt={exec} />
          </>
        ) : (
          <NotExecutedCard />
        )}
      </div>

      {/* Verification */}
      <div id="section-verification" className="scroll-mt-16">
        <VerificationSection verification={exec?.verification} />
      </div>

      {/* Provenance */}
      <ProvenanceSection pipelineId={pipelineId} result={result} />
    </div>
  );
}

function HeaderFact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-xs">{value}</dd>
    </div>
  );
}

function NotExecutedCard() {
  return (
    <Card padding="lg" className="border-ink-border/30">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded border border-ink-border/40 bg-ink-1">
          <Zap size={14} className="text-ink-muted" />
        </span>
        <div>
          <StatusBadge variant="muted">Not Executed</StatusBadge>
          <p className="mt-2 text-xs text-ink-muted">
            This pipeline ran in proposal mode — a full analysis, plan, impact
            model, and proposed build were produced, but no patches were
            applied. This is a complete proposal, not a failure.
          </p>
        </div>
      </div>
    </Card>
  );
}
