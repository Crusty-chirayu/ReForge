import React from "react";
import { AlertOctagon, AlertTriangle, AlertCircle, Info, HelpCircle } from "lucide-react";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  size?: "sm" | "md";
}

const severityConfig: Record<
  SeverityLevel,
  {
    icon: React.ComponentType<{ size: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  CRITICAL: {
    icon: AlertOctagon,
    bgClass: "bg-critical/10",
    textClass: "text-critical",
    borderClass: "border-critical/30",
  },
  HIGH: {
    icon: AlertTriangle,
    bgClass: "bg-high/10",
    textClass: "text-high",
    borderClass: "border-high/30",
  },
  MEDIUM: {
    icon: AlertCircle,
    bgClass: "bg-medium/10",
    textClass: "text-medium",
    borderClass: "border-medium/30",
  },
  LOW: {
    icon: Info,
    bgClass: "bg-low/10",
    textClass: "text-low",
    borderClass: "border-low/30",
  },
  INFO: {
    icon: HelpCircle,
    bgClass: "bg-info/10",
    textClass: "text-info",
    borderClass: "border-info/30",
  },
};

export function SeverityBadge({
  severity,
  className = "",
  size = "md",
}: SeverityBadgeProps) {
  const normalized = (severity?.toUpperCase() as SeverityLevel) || "INFO";
  const config = severityConfig[normalized] ?? severityConfig.INFO;
  const IconComponent = config.icon;
  const iconSize = size === "sm" ? 11 : 13;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-mono uppercase font-semibold leading-none rounded-[4px] border select-none",
        config.bgClass,
        config.textClass,
        config.borderClass,
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-meta",
        className,
      ].join(" ")}
      role="status"
      aria-label={`Severity: ${normalized}`}
    >
      <IconComponent size={iconSize} aria-hidden="true" className="shrink-0" />
      <span>{normalized}</span>
    </span>
  );
}
