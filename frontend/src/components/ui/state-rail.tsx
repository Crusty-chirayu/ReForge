import React from "react";
import { Check, X, RotateCcw, Loader2 } from "lucide-react";

export type StateRailState =
  | "proposed"
  | "approved"
  | "executing"
  | "executed"
  | "verifying"
  | "verified"
  | "failed"
  | "rolled_back"
  | "rolled-back";

export interface StateRailProps {
  state: StateRailState;
  compact?: boolean;
  className?: string;
  /** Optional override for which terminal state to show if known */
  terminalReason?: string;
}

interface StepNode {
  key: string;
  label: string;
  symbol: string;
}

const PRIMARY_STEPS: StepNode[] = [
  { key: "proposed", label: "Proposed", symbol: "○" },
  { key: "approved", label: "Approved", symbol: "◐" },
  { key: "executed", label: "Executed", symbol: "●" },
  { key: "verified", label: "Verified", symbol: "✔" },
];

/**
 * Maps raw state string into node status.
 */
function getNodeStatus(
  stepKey: string,
  currentState: StateRailState,
): "pending" | "current" | "completed" | "failed" | "rolled_back" {
  const normState = currentState === "rolled-back" ? "rolled_back" : currentState;

  if (normState === "failed") {
    // If failed, mark previous as completed, and current failing step as failed
    return stepKey === "executed" || stepKey === "verified" ? "failed" : "completed";
  }
  if (normState === "rolled_back") {
    return stepKey === "executed" || stepKey === "verified" ? "rolled_back" : "completed";
  }

  const order = ["proposed", "approved", "executing", "executed", "verifying", "verified"];
  const stepIndices: Record<string, number> = {
    proposed: 0,
    approved: 1,
    executed: 3,
    verified: 5,
  };

  const currentIndex = order.indexOf(normState);
  const thisStepTargetIndex = stepIndices[stepKey] ?? 0;

  if (currentIndex > thisStepTargetIndex) {
    return "completed";
  }
  if (
    currentIndex === thisStepTargetIndex ||
    (stepKey === "executed" && normState === "executing") ||
    (stepKey === "verified" && normState === "verifying")
  ) {
    return "current";
  }
  return "pending";
}

export function StateRail({
  state,
  compact = false,
  className = "",
  terminalReason,
}: StateRailProps) {
  const normState = state === "rolled-back" ? "rolled_back" : state;
  const isFailed = normState === "failed";
  const isRolledBack = normState === "rolled_back";

  if (compact) {
    // Compact row representation: badge-like instrument display with icon + text
    return (
      <div
        className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-medium leading-none ${className}`}
        role="status"
        aria-label={`State: ${normState}`}
      >
        {isFailed ? (
          <span className="inline-flex items-center gap-1 rounded border border-critical/30 bg-critical/10 px-2 py-0.5 text-critical">
            <X size={12} strokeWidth={2.5} aria-hidden="true" />
            <span>FAILED</span>
          </span>
        ) : isRolledBack ? (
          <span className="inline-flex items-center gap-1 rounded border border-medium/30 bg-medium/10 px-2 py-0.5 text-medium border-dashed">
            <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
            <span>ROLLED BACK</span>
          </span>
        ) : (
          <div className="flex items-center gap-1 rounded border border-border-default bg-bg-surface px-2 py-0.5 text-text-secondary">
            {normState === "executing" ? (
              <Loader2 size={12} className="animate-spin text-accent" aria-hidden="true" />
            ) : normState === "verifying" ? (
              <Loader2 size={12} className="animate-spin text-low" aria-hidden="true" />
            ) : normState === "verified" ? (
              <Check size={12} strokeWidth={2.5} className="text-success" aria-hidden="true" />
            ) : normState === "executed" ? (
              <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
            ) : normState === "approved" ? (
              <span className="text-accent" aria-hidden="true">◐</span>
            ) : (
              <span className="text-text-tertiary" aria-hidden="true">○</span>
            )}
            <span className="uppercase text-[10px] tracking-wider text-text-primary">
              {normState.replace("_", " ")}
            </span>
          </div>
        )}
      </div>
    );
  }

  // Full 4-node instrument rail
  return (
    <div
      className={`flex items-center gap-2 font-mono text-xs ${className}`}
      role="region"
      aria-label={`State Rail: ${normState}`}
    >
      <div className="flex items-center">
        {PRIMARY_STEPS.map((step, idx) => {
          const status = getNodeStatus(step.key, normState);
          const isLast = idx === PRIMARY_STEPS.length - 1;
          const isActive = status === "current";
          const isDone = status === "completed";
          const isStepFailed = status === "failed";
          const isStepRolledBack = status === "rolled_back";

          return (
            <React.Fragment key={step.key}>
              <div
                className="flex items-center gap-1.5"
                aria-current={isActive ? "step" : undefined}
                aria-label={`${step.label}: ${status}`}
              >
                {/* Node Symbol */}
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isStepFailed
                      ? "border-critical bg-critical/15 text-critical"
                      : isStepRolledBack
                      ? "border-dashed border-medium bg-medium/15 text-medium"
                      : isDone
                      ? "border-border-strong bg-bg-raised text-text-primary"
                      : isActive
                      ? "border-accent bg-accent-subtle text-accent font-bold"
                      : "border-border-subtle bg-bg-surface text-text-tertiary"
                  }`}
                >
                  {isStepFailed ? (
                    <X size={12} strokeWidth={2.5} aria-hidden="true" />
                  ) : isStepRolledBack ? (
                    <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
                  ) : isDone || (step.key === "verified" && normState === "verified") ? (
                    <Check size={12} strokeWidth={2.5} className="text-success" aria-hidden="true" />
                  ) : isActive && (normState === "executing" || normState === "verifying") ? (
                    <Loader2 size={12} className="animate-spin text-accent" aria-hidden="true" />
                  ) : step.key === "approved" && (isActive || isDone) ? (
                    <span className="text-[11px]" aria-hidden="true">◐</span>
                  ) : (
                    <span className="text-[11px]" aria-hidden="true">{step.symbol}</span>
                  )}
                </div>

                {/* Node Label */}
                <span
                  className={`text-meta uppercase tracking-wider ${
                    isStepFailed
                      ? "text-critical font-semibold"
                      : isStepRolledBack
                      ? "text-medium font-semibold"
                      : isActive
                      ? "text-text-primary font-semibold"
                      : isDone
                      ? "text-text-secondary"
                      : "text-text-tertiary"
                  }`}
                >
                  {isStepFailed
                    ? "Failed"
                    : isStepRolledBack
                    ? "Rolled Back"
                    : step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`mx-2 h-0.5 w-6 sm:w-10 transition-colors ${
                    isDone
                      ? "bg-border-strong"
                      : isActive
                      ? "bg-accent/60"
                      : "bg-border-subtle"
                  }`}
                  aria-hidden="true"
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {terminalReason && (
        <span className="ml-2 font-mono text-[11px] text-text-tertiary">
          ({terminalReason})
        </span>
      )}
    </div>
  );
}
