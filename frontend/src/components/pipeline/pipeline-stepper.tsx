import { CheckCircle2, MinusCircle, RotateCcw, XCircle } from "lucide-react";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import type { PipelineResult } from "@/lib/api/types";

type StageState =
  | "complete"
  | "running"
  | "failed"
  | "rolled-back"
  | "not-executed"
  | "not-run";

export interface PipelineStage {
  key: string;
  label: string;
  state: StageState;
  detail?: string;
}

function stageBadge(state: StageState): {
  variant: StatusVariant;
  label: string;
} {
  switch (state) {
    case "complete":
      return { variant: "succeeded", label: "Complete" };
    case "running":
      return { variant: "running", label: "Running" };
    case "failed":
      return { variant: "failed", label: "Failed" };
    case "rolled-back":
      return { variant: "rolled-back", label: "Rolled Back" };
    case "not-executed":
      return { variant: "muted", label: "Not Executed" };
    default:
      return { variant: "muted", label: "Not Run" };
  }
}

/**
 * Derive the lifecycle stage states from the actual pipeline result. A stage
 * is only marked complete when the backend result supports that conclusion.
 */
export function deriveStages(result: PipelineResult): PipelineStage[] {
  const stages: PipelineStage[] = [];

  const hasReport = Boolean(result.report);
  stages.push({
    key: "ingest",
    label: "Ingested",
    state: hasReport ? "complete" : "failed",
  });
  stages.push({
    key: "analyze",
    label: "Analyzed",
    state: hasReport ? "complete" : "failed",
  });
  stages.push({
    key: "plan",
    label: "Planned",
    state: result.plan ? "complete" : "not-run",
  });
  stages.push({
    key: "impact",
    label: "Impact Evaluated",
    state: result.impact ? "complete" : "not-run",
  });
  stages.push({
    key: "build",
    label: "Build Proposed",
    state: result.build ? "complete" : "not-run",
  });

  const exec = result.execution;
  if (exec) {
    const state: StageState =
      exec.status === "SUCCEEDED"
        ? "complete"
        : exec.status === "FAILED"
          ? "failed"
          : exec.status === "ROLLED_BACK"
            ? "rolled-back"
            : exec.status === "CANCELLED"
              ? "not-executed"
              : "running";
    stages.push({
      key: "execute",
      label: "Patches Applied",
      state,
      detail: exec.status,
    });
  } else {
    stages.push({
      key: "execute",
      label: "Patches Applied",
      state: "not-executed",
      detail: "proposal mode",
    });
  }

  const verification = exec?.verification;
  if (verification?.attempted) {
    const state: StageState =
      verification.overallStatus === "PASSED"
        ? "complete"
        : verification.overallStatus === "FAILED" ||
            verification.overallStatus === "TIMEOUT" ||
            verification.overallStatus === "BLOCKED" ||
            verification.overallStatus === "ERROR"
          ? "failed"
          : "not-run";
    stages.push({
      key: "verify",
      label: "Verification Completed",
      state,
      detail: verification.overallStatus,
    });
  } else {
    stages.push({
      key: "verify",
      label: "Verification Completed",
      state: "not-run",
      detail: "not attempted",
    });
  }

  return stages;
}

function StageIcon({ state }: { state: StageState }) {
  if (state === "complete")
    return <CheckCircle2 size={12} className="text-emerald-400" />;
  if (state === "failed") return <XCircle size={12} className="text-rose-400" />;
  if (state === "rolled-back")
    return <RotateCcw size={12} className="text-amber-400" />;
  return <MinusCircle size={12} className="text-ink-subtle" />;
}

/** Visual pipeline lifecycle stepper — real stage states only. */
export function PipelineStepper({ result }: { result: PipelineResult }) {
  const stages = deriveStages(result);

  return (
    <div
      className="flex flex-wrap items-stretch gap-1.5"
      data-testid="pipeline-stepper"
    >
      {stages.map((stage, i) => {
        const badge = stageBadge(stage.state);
        return (
          <div
            key={stage.key}
            className="flex flex-1 flex-col items-start gap-1.5 rounded border border-ink-border/40 bg-ink-1/40 px-3 py-2 min-w-[120px]"
            data-stage={stage.key}
            data-state={stage.state}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span
                aria-hidden="true"
                className="font-mono text-[9px] text-ink-subtle"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <StageIcon state={stage.state} />
            </div>
            <span className="text-xs font-medium text-ink-fg">
              {stage.label}
            </span>
            <StatusBadge variant={badge.variant} size="sm">
              {badge.label}
            </StatusBadge>
            {stage.detail && (
              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-subtle">
                {stage.detail}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
