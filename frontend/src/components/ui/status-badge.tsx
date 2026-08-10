import type { ReactNode } from "react";

export type StatusVariant =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "pending"
  | "running"
  | "verifying"
  | "succeeded"
  | "failed"
  | "rolled-back"
  | "cancelled"
  | "blocked"
  | "error"
  | "approved"
  | "proposal"
  | "muted"
  | "info"
  | "warning"
  | "critical";

export interface StatusBadgeProps {
  variant: StatusVariant;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
}

const variantStyles: Record<StatusVariant, string> = {
  healthy: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  degraded: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  unhealthy: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  pending: "bg-slate-500/15 text-slate-400 border-slate-500/25",
  running: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  verifying: "bg-violet-500/15 text-violet-400 border-violet-500/25",
  succeeded: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  failed: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  "rolled-back": "bg-amber-500/15 text-amber-400 border-amber-500/25",
  cancelled: "bg-slate-500/15 text-slate-400 border-slate-500/25",
  blocked: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  error: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  proposal: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  muted: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  info: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  critical: "bg-rose-500/15 text-rose-400 border-rose-500/25",
};

const dotStyles: Record<StatusVariant, string> = {
  healthy: "bg-emerald-400",
  degraded: "bg-amber-400",
  unhealthy: "bg-rose-400",
  pending: "bg-slate-400",
  running: "bg-blue-400",
  verifying: "bg-violet-400",
  succeeded: "bg-emerald-400",
  failed: "bg-rose-400",
  "rolled-back": "bg-amber-400",
  cancelled: "bg-slate-400",
  blocked: "bg-rose-400",
  error: "bg-rose-400",
  approved: "bg-emerald-400",
  proposal: "bg-amber-400",
  muted: "bg-slate-500",
  info: "bg-blue-400",
  warning: "bg-amber-400",
  critical: "bg-rose-400",
};

const pulsingVariants: ReadonlySet<StatusVariant> = new Set([
  "running",
  "verifying",
  "pending",
]);

export function StatusBadge({
  variant,
  children,
  className = "",
  size = "md",
}: StatusBadgeProps) {
  const isSm = size === "sm";
  const pulse = pulsingVariants.has(variant);

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded border font-mono leading-none uppercase tracking-wider",
        variantStyles[variant],
        isSm ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "inline-block h-1.5 w-1.5 rounded-full",
          dotStyles[variant],
          pulse ? "pulse-dot" : "",
        ].join(" ")}
      />
      {children}
    </span>
  );
}
