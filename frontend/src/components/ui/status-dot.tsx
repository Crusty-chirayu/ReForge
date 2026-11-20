import React from "react";

export type StatusDotColor = "success" | "critical" | "high" | "medium" | "low" | "info" | "accent";

export interface StatusDotProps {
  color?: StatusDotColor;
  pulse?: boolean;
  size?: number;
  label?: string;
  className?: string;
}

const colorMap: Record<StatusDotColor, string> = {
  success: "bg-success",
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
  info: "bg-info",
  accent: "bg-accent",
};

export function StatusDot({
  color = "info",
  pulse = false,
  size = 6,
  label,
  className = "",
}: StatusDotProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 ${className}`}
      role={label ? "status" : undefined}
      aria-label={label}
    >
      <span
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-full ${colorMap[color]} ${pulse ? "pulse-dot" : ""}`}
        aria-hidden="true"
      />
      {label && <span className="text-meta text-text-secondary">{label}</span>}
    </span>
  );
}
