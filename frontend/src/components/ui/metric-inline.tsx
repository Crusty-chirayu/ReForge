import React from "react";

export interface MetricInlineProps {
  label: string;
  value: number | string;
  delta?: { value: number | string; positive?: boolean };
  unit?: string;
  className?: string;
}

export function MetricInline({
  label,
  value,
  delta,
  unit,
  className = "",
}: MetricInlineProps) {
  return (
    <div className={`inline-flex flex-col select-none ${className}`}>
      <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-h3-dense font-mono font-semibold text-text-primary tabular-nums">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-meta text-text-secondary font-mono">{unit}</span>}
        {delta && (
          <span
            className={`text-meta font-mono tabular-nums ${
              delta.positive ? "text-success" : "text-critical"
            }`}
          >
            {delta.positive ? "+" : ""}
            {delta.value}
          </span>
        )}
      </div>
    </div>
  );
}
