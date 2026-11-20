"use client";

import { ChevronRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { describeApiError } from "@/lib/utils/api-error";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ProjectHistoryItem } from "@/lib/api/types";
import { formatDateTime, shortId } from "@/lib/utils/format";
import { verificationLabel, verificationVariant } from "@/lib/utils/status";

export interface ProjectHistorySectionProps {
  items: ProjectHistoryItem[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  onNavigate: (snapshotId: string) => void;
  onAnalyze: () => void;
}

function LoadingRows() {
  return (
    <div
      className="space-y-1.5"
      role="status"
      aria-label="Loading project history"
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

export function ProjectHistorySection({
  items,
  isLoading,
  error,
  onRetry,
  onNavigate,
  onAnalyze,
}: ProjectHistorySectionProps) {
  return (
    <Card padding="none" className="overflow-hidden">
      <CardHeader
        title="Project History"
        subtitle={`${items.length} snapshot event${items.length === 1 ? "" : "s"} · most recent first`}
      />
      <div className="px-4 pb-4" data-testid="project-history-section">
        {isLoading ? (
          <LoadingRows />
        ) : error ? (
          <ErrorState
            title="Unable to load project history"
            description={
              describeApiError(error, {
                resource: "project history",
                endpoint: "GET /v1/project/history",
              }).description
            }
            error={error}
            onRetry={onRetry}
          />
        ) : items.length === 0 ? (
          <EmptyState
            title="No snapshots yet"
            description="Analyze a project or run a pipeline to create your first snapshot."
            action={{ label: "Analyze Project", onClick: onAnalyze }}
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[780px] space-y-1">
              {/* Header */}
              <div className="flex items-center gap-3 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest text-text-tertiary border-b border-border-subtle">
                <span className="w-2 shrink-0" aria-hidden="true" />
                <span className="w-36 shrink-0">Snapshot</span>
                <span className="w-28 shrink-0">Pipeline</span>
                <span className="w-32 shrink-0">Created</span>
                <span className="w-14 shrink-0 text-right">Files</span>
                <span className="w-24 shrink-0">Verify</span>
                <span className="min-w-0 flex-1">Model FP</span>
                <span className="w-4 shrink-0" aria-hidden="true" />
              </div>
              {/* Rows */}
              {items.map((item) => (
                <button
                  key={item.snapshotId}
                  type="button"
                  onClick={() => onNavigate(item.snapshotId)}
                  aria-label={`View snapshot ${item.snapshotId}`}
                  className="group flex w-full items-center gap-3 rounded-[4px] border border-transparent px-3 py-2 text-left transition-colors hover:border-border-default hover:bg-bg-raised text-ui-dense"
                >
                  <span
                    aria-hidden="true"
                    className={[
                      "h-2 w-2 shrink-0 rounded-full",
                      item.pipelineId ? "bg-accent" : "bg-low",
                    ].join(" ")}
                  />
                  <Mono className="w-36 shrink-0 text-text-primary group-hover:text-accent font-medium">
                    {shortId(item.snapshotId, 14)}
                  </Mono>
                  <span className="w-28 shrink-0">
                    {item.pipelineId ? (
                      <Mono className="text-text-secondary text-meta">
                        {shortId(item.pipelineId, 12)}
                      </Mono>
                    ) : (
                      <span className="text-[10px] text-text-tertiary">—</span>
                    )}
                  </span>
                  <span className="w-32 shrink-0 text-meta text-text-secondary font-mono">
                    {formatDateTime(item.createdAt)}
                  </span>
                  <span className="w-14 shrink-0 text-right font-mono text-meta text-text-primary tabular-nums font-medium">
                    {item.fileCount}
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
                  <Mono
                    truncate
                    className="min-w-0 flex-1 text-[10px] text-text-tertiary"
                  >
                    {item.projectModelFingerprint ?? "—"}
                  </Mono>
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
