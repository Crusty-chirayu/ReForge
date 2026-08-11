"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
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
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded border border-ink-border/40 bg-ink-1 px-2.5 py-1.5">
            <Zap size={11} className="text-forge" />
            <Mono className="text-ink-fg">{shortId(pipelineId, 12)}</Mono>
          </div>
        </div>
      </Card>

      {/* Stage stepper */}
      <PipelineStepper result={result} />

      {/* Analysis */}
      <AnalysisSection report={result.report} />

      {/* Plan */}
      <PlanSection plan={result.plan} />

      {/* Impact */}
      <ImpactSection impact={result.impact} />

      {/* Build */}
      <BuildSection build={result.build} receipt={exec} />

      {/* Execution */}
      {exec ? (
        <>
          <ExecutionSection receipt={exec} />
          {exec.diffSummary && <DiffSummarySection diff={exec.diffSummary} />}
          <RollbackSection receipt={exec} />
        </>
      ) : (
        <NotExecutedCard />
      )}

      {/* Verification */}
      <VerificationSection verification={exec?.verification} />

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
