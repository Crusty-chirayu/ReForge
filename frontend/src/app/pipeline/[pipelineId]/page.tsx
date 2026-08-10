"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { usePipeline } from "@/lib/query/use-pipeline";
import { pipelineStatusVariant } from "@/lib/utils/status";
import { formatDateTime, shortId } from "@/lib/utils/format";

export default function PipelineDetailPage({
  params,
}: {
  params: Promise<{ pipelineId: string }>;
}) {
  const { pipelineId } = use(params);
  const router = useRouter();
  const { data, isLoading, error } = usePipeline(pipelineId);

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading pipeline result">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full rounded border border-ink-border/40" />
        <Skeleton rows={4} height="3rem" className="w-full" />
      </div>
    );
  }

  if (error || !data) {
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
          {error ? (
            <ErrorState
              title="Unable to load pipeline result"
              description="GET /v1/pipeline/:pipelineId failed."
              error={error}
              onRetry={() => router.refresh()}
            />
          ) : (
            <EmptyState
              title="Pipeline not found"
              description="The requested pipeline result could not be found."
              action={{ label: "Back to Dashboard", onClick: () => router.push("/") }}
            />
          )}
        </Card>
      </div>
    );
  }

  const result = data.result ?? data.execution;
  const exec = result.execution;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
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
        <span className="font-mono text-ink-fg">Pipeline</span>
        <ChevronRight size={11} className="text-ink-subtle" />
        <Mono className="text-ink-fg">{shortId(pipelineId, 14)}</Mono>
      </div>

      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
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
            <div className="mt-1 flex flex-wrap items-center gap-3 font-mono text-[10px] text-ink-subtle">
              <span>{formatDateTime(result.createdAt)}</span>
              <span className="text-ink-border">·</span>
              <span>completed {formatDateTime(result.completedAt)}</span>
              <span className="text-ink-border">·</span>
              <span>cleanup {result.workspaceCleanupStatus}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded border border-ink-border/40 bg-ink-1 px-2.5 py-1.5">
              <Zap size={11} className="text-forge" />
              <Mono className="text-ink-fg">{pipelineId}</Mono>
            </div>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryTile label="Plan Tasks" value={result.plan?.tasks.length ?? 0} />
        <SummaryTile
          label="Impact"
          value={result.impact?.impactLevel ?? "—"}
          mono
        />
        <SummaryTile
          label="Build Ops"
          value={result.build?.fileChanges.length ?? 0}
        />
        <SummaryTile
          label="Execution"
          value={exec?.status ?? "N/A"}
          mono
        />
        <SummaryTile
          label="Patches"
          value={exec?.appliedOperations.length ?? 0}
        />
        <SummaryTile
          label="Verify"
          value={exec?.verification?.overallStatus ?? "—"}
          mono
        />
      </div>

      {/* Receipt snapshot */}
      {exec && (
        <Card padding="none">
          <CardHeader
            title="Execution Receipt"
            subtitle={`${exec.executionId} · snapshot ${shortId(exec.snapshotId, 10)}`}
          />
          <div className="space-y-2 px-4 pb-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                variant={
                  exec.status === "SUCCEEDED"
                    ? "succeeded"
                    : exec.status === "FAILED" || exec.status === "ROLLED_BACK"
                      ? "failed"
                      : "running"
                }
              >
                {exec.status}
              </StatusBadge>
              <span className="text-ink-muted">
                {exec.appliedOperations.length} applied ·{" "}
                {exec.diffSummary.created.length} created ·{" "}
                {exec.diffSummary.modified.length} modified ·{" "}
                {exec.diffSummary.deleted.length} deleted
              </span>
            </div>
            <div className="flex items-center gap-2 text-ink-muted">
              <Clock size={10} className="text-steel" />
              <span>
                {formatDateTime(exec.createdAt)} → {formatDateTime(exec.completedAt)}
              </span>
            </div>
            {exec.rollback.attempted && (
              <p
                className={
                  exec.rollback.succeeded
                    ? "text-emerald-400"
                    : "text-rose-400"
                }
              >
                Rollback {exec.rollback.succeeded ? "succeeded" : "failed"} after
                partial failure.
              </p>
            )}
            {exec.verification?.attempted && (
              <p className="text-ink-muted">
                Verification:{" "}
                <StatusBadge
                  variant={
                    exec.verification.overallStatus === "PASSED"
                      ? "succeeded"
                      : "failed"
                  }
                  size="sm"
                >
                  {exec.verification.overallStatus}
                </StatusBadge>
              </p>
            )}
          </div>
        </Card>
      )}

      <Card padding="md" className="border-ink-border/30">
        <p className="flex items-center gap-2 text-xs text-ink-muted">
          <Zap size={11} className="text-forge" />
          The full pipeline experience — plan, impact, build, execution, and
          verification detail views — arrives in the next phase. This summary is
          powered by the real pipeline result.
        </p>
      </Card>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div className="rounded border border-ink-border/40 bg-ink-card/60 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
        {label}
      </p>
      {mono ? (
        <Mono className="mt-1 block text-ink-fg">{value}</Mono>
      ) : (
        <p className="mt-1 text-lg font-bold leading-tight text-ink-fg">
          {value}
        </p>
      )}
    </div>
  );
}
