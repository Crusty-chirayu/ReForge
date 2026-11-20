import React from "react";

export interface ProgressProps {
  value?: number; // 0 to 100. If undefined, renders honest indeterminate.
  max?: number;
  label?: string;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  label,
  className = "",
}: ProgressProps) {
  const isDeterminate = typeof value === "number" && !isNaN(value);
  const clampedValue = isDeterminate
    ? Math.min(Math.max(0, value), max)
    : undefined;
  const percentage = clampedValue !== undefined ? (clampedValue / max) * 100 : undefined;

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-meta mb-1 font-mono">
          <span className="text-text-secondary">{label}</span>
          {isDeterminate ? (
            <span className="text-text-primary tabular-nums">
              {Math.round(percentage!)}%
            </span>
          ) : (
            <span className="text-text-tertiary">In progress</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? "Progress"}
        className="h-1.5 w-full overflow-hidden rounded-full bg-border-subtle"
      >
        {isDeterminate ? (
          <div
            className="h-full bg-accent transition-all duration-180"
            style={{ width: `${percentage}%` }}
          />
        ) : (
          <div className="h-full w-1/3 rounded-full bg-accent animate-pulse" />
        )}
      </div>
    </div>
  );
}
