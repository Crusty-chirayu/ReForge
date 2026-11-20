"use client";

import { ChevronRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { describeApiError } from "@/lib/utils/api-error";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { StateRail, type StateRailState } from "@/components/ui/state-rail";
import type { PipelineExecutionSummary } from "@/lib/api/types";
import { formatDateTime, shortId } from "@/lib/utils/format";
import {
  pipelineStatusVariant,
  verificationLabel,
  verificationVariant,
} from "@/lib/utils/status";

export interface PipelineHistorySectionProps {
  items: PipelineExecutionSummary[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onNavigate: (pipelineId: string) => void;
  onAnalyze: () => void;
}

function deriveStateRailState(item: PipelineExecutionSummary): StateRailState {
  if (item.status === "FAILED" || item.status === "ERROR") return "failed";
  if (item.verificationStatus === "PASSED") return "verified";
  if (item.status === "PASSED" && item.approved) return "executed";
  if (item.approved) return "approved";
  return "proposed";
}

function LoadingRows() {
  return (
    <div
      className="space-y-1.5"
      role="status"
      aria-label="Loading pipeline history"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-10 w-full rounded-[4px] border border-border-subtle bg-bg-raised"
        />
      ))}
    </div>
  );
}

export function PipelineHistorySection({
  items,
  isLoading,
  error,
  onRetry,
  onNavigate,
  onAnalyze,
}: PipelineHistorySectionProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <CardHeader
        title="Pipeline History"
        subtitle={`${items.length} execution${items.length === 1 ? "" : "s"} · most recent first`}
      />
      <div className="px-4 pb-4" data-testid="pipeline-history-section">
        {isLoading ? (
          <LoadingRows />
        ) : error ? (
          <ErrorState
            title="Unable to load pipeline history"
            description={
              describeApiError(error, {
                resource: "pipeline history",
                endpoint: "GET /v1/pipeline/history",
              }).description
            }
            error={error}
            onRetry={onRetry}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No pipelines yet"
            description="Run your first pipeline to see execution history here."
            action={{ label: "Run Pipeline", onClick: onAnalyze }}
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[920px] space-y-1">
              {/* Header */}
              <div className="flex items-center gap-3 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border-subtle">
                <span className="w-24 shrink-0">Status</span>
                <span className="w-28 shrink-0">State Rail</span>
                <span className="w-32 shrink-0">Pipeline</span>
                <span className="min-w-[160px] flex-1">Goal</span>
                <span className="w-28 shrink-0">Snapshot</span>
                <span className="w-16 shrink-0">Approved</span>
                <span className="w-12 shrink-0 text-right">Patches</span>
                <span className="w-24 shrink-0">Verify</span>
                <span className="w-32 shrink-0">Created</span>
                <span className="w-4 shrink-0" aria-hidden="true" />
              </div>
              {/* Rows */}
              {items.map((item) => (
                <button
                  key={item.pipelineId}
                  type="button"
                  onClick={() => onNavigate(item.pipelineId)}
                  aria-label={`View pipeline ${item.pipelineId}`}
                  className="group flex w-full items-center gap-3 rounded-[4px] border border-transparent px-3 py-2 text-left transition-colors hover:border-border-default hover:bg-bg-raised text-ui-dense"
                >
                  <span className="w-24 shrink-0">
                    <StatusBadge variant={pipelineStatusVariant(item.status)} size="sm">
                      {item.status}
                    </StatusBadge>
                  </span>
                  <span className="w-28 shrink-0">
                    <StateRail compact state={deriveStateRailState(item)} />
                  </span>
                  <Mono className="w-32 shrink-0 text-text-primary group-hover:text-accent font-medium">
                    {shortId(item.pipelineId, 12)}
                  </Mono>
                  <span className="min-w-[160px] flex-1 truncate text-ui-dense text-text-primary">
                    {item.goal}
                  </span>
                  <span className="w-28 shrink-0">
                    <Mono className="text-[10px] text-text-secondary">
                      {shortId(item.snapshotId, 12)}
                    </Mono>
                  </span>
                  <span
                    className={[
                      "w-16 shrink-0 font-mono text-meta font-medium",
                      item.approved ? "text-success" : "text-text-tertiary",
                    ].join(" ")}
                  >
                    {item.approved ? "YES" : "NO"}
                  </span>
                  <span className="w-12 shrink-0 text-right font-mono text-meta text-text-primary tabular-nums">
                    {item.appliedPatchCount}
                  </span>
                  <span className="w-24 shrink-0">
                    {item.verificationStatus ? (
                      <StatusBadge
                        variant={verificationVariant(item.verificationStatus)}
                        size="sm"
                      >
                        {verificationLabel(item.verificationStatus)}
                      </StatusBadge>
                    ) : (
                      <span className="text-[10px] text-text-tertiary">—</span>
                    )}
                  </span>
                  <span className="w-32 shrink-0 font-mono">
                    <span className="block text-[10px] text-text-secondary">
                      {formatDateTime(item.createdAt)}
                    </span>
                    {item.completedAt && (
                      <span className="block text-[9px] text-text-tertiary">
                        done {formatDateTime(item.completedAt)}
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    size={12}
                    aria-hidden="true"
                    className="w-4 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
