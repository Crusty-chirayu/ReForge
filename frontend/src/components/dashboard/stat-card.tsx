import type { ReactNode } from "react";

export type StatAccent = "forge" | "steel" | "emerald" | "rose" | "muted";

export interface StatCardProps {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent: StatAccent;
  hint?: string;
  footer?: ReactNode;
}

const accentClasses: Record<StatAccent, { icon: string; value: string; border: string }> = {
  forge: {
    icon: "bg-accent/10 border-accent/20 text-accent",
    value: "text-accent",
    border: "border-border-subtle",
  },
  steel: {
    icon: "bg-low/10 border-low/20 text-low",
    value: "text-text-primary",
    border: "border-border-subtle",
  },
  emerald: {
    icon: "bg-success/10 border-success/20 text-success",
    value: "text-success",
    border: "border-border-subtle",
  },
  rose: {
    icon: "bg-critical/10 border-critical/20 text-critical",
    value: "text-critical",
    border: "border-border-subtle",
  },
  muted: {
    icon: "bg-bg-raised border-border-default text-text-secondary",
    value: "text-text-primary",
    border: "border-border-subtle",
  },
};

export function StatCard({
  label,
  value,
  icon,
  accent,
  hint,
  footer,
}: StatCardProps) {
  const styles = accentClasses[accent];
  const testId = `stat-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div
      data-testid={testId}
      className={[
        "rounded-[6px] border bg-bg-surface px-3 py-2.5 transition-colors duration-120",
        styles.border,
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden="true"
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border",
            styles.icon,
          ].join(" ")}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
            {label}
          </p>
          <p
            className={["mt-0.5 text-h3-dense font-mono font-semibold leading-tight tabular-nums", styles.value].join(
              " ",
            )}
          >
            {value}
          </p>
        </div>
      </div>
      {hint && (
        <p className="mt-1.5 truncate text-meta text-text-tertiary font-mono">{hint}</p>
      )}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
