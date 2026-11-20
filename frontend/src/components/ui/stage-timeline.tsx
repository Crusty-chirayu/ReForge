import React from "react";
import { Check, X, RotateCcw, Loader2 } from "lucide-react";

export type StageStatus = "pending" | "running" | "completed" | "failed" | "skipped" | "rolled_back";

export interface TimelineStage {
  id: string;
  name: string;
  status: StageStatus;
  durationMs?: number;
  error?: string;
  artifactSummary?: string;
}

export interface StageTimelineProps {
  stages: TimelineStage[];
  activeStageId?: string;
  onSelectStage?: (stageId: string) => void;
  className?: string;
}

export function StageTimeline({
  stages,
  activeStageId,
  onSelectStage,
  className = "",
}: StageTimelineProps) {
  return (
    <div
      className={`w-full overflow-x-auto py-2 select-none ${className}`}
      role="region"
      aria-label="Pipeline Stage Timeline"
    >
      <div className="flex items-center min-w-max gap-1">
        {stages.map((stage, idx) => {
          const isSelected = activeStageId === stage.id;
          const isLast = idx === stages.length - 1;

          const statusColor =
            stage.status === "completed"
              ? "border-border-strong bg-bg-raised text-text-primary"
              : stage.status === "running"
              ? "border-accent bg-accent-subtle text-accent"
              : stage.status === "failed"
              ? "border-critical bg-critical/10 text-critical"
              : stage.status === "rolled_back"
              ? "border-dashed border-medium bg-medium/10 text-medium"
              : "border-border-subtle bg-bg-surface text-text-tertiary";

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => onSelectStage?.(stage.id)}
                className={[
                  "flex items-center gap-2 rounded-[4px] border px-2.5 py-1.5 transition-all duration-120 outline-none text-left",
                  "focus-visible:ring-2 focus-visible:ring-accent",
                  statusColor,
                  isSelected ? "ring-2 ring-accent" : "",
                ].join(" ")}
              >
                {/* Status Icon */}
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {stage.status === "completed" ? (
                    <Check size={12} strokeWidth={3} className="text-success" aria-hidden="true" />
                  ) : stage.status === "running" ? (
                    <Loader2 size={12} className="animate-spin text-accent" aria-hidden="true" />
                  ) : stage.status === "failed" ? (
                    <X size={12} strokeWidth={3} className="text-critical" aria-hidden="true" />
                  ) : stage.status === "rolled_back" ? (
                    <RotateCcw size={12} className="text-medium" aria-hidden="true" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-border-strong" aria-hidden="true" />
                  )}
                </div>

                {/* Stage Info */}
                <div className="min-w-0">
                  <span className="text-meta font-mono font-semibold uppercase tracking-wider block">
                    {stage.name}
                  </span>
                  {stage.durationMs !== undefined && (
                    <span className="text-[10px] font-mono text-text-tertiary block tabular-nums">
                      {stage.durationMs}ms
                    </span>
                  )}
                </div>
              </button>

              {!isLast && (
                <div
                  className={`h-0.5 w-4 shrink-0 ${
                    stage.status === "completed" ? "bg-border-strong" : "bg-border-subtle"
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
