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
    icon: "bg-forge/10 border-forge/20 text-forge",
    value: "text-forge",
    border: "border-forge/20",
  },
  steel: {
    icon: "bg-steel/10 border-steel/20 text-steel",
    value: "text-steel",
    border: "border-steel/20",
  },
  emerald: {
    icon: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    value: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  rose: {
    icon: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    value: "text-rose-400",
    border: "border-rose-500/20",
  },
  muted: {
    icon: "bg-ink-2/60 border-ink-border/40 text-ink-muted",
    value: "text-ink-fg",
    border: "border-ink-border/40",
  },
};

/** Compact engineering stat tile used in the overview grid. */
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
        "rounded border bg-ink-card/60 px-3 py-2.5",
        styles.border,
      ].join(" ")}
    >
      <div className="flex items-center gap-2.5">
        <div
          aria-hidden="true"
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded border",
            styles.icon,
          ].join(" ")}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
            {label}
          </p>
          <p
            className={["mt-0.5 text-lg font-bold leading-tight", styles.value].join(
              " ",
            )}
          >
            {value}
          </p>
        </div>
      </div>
      {hint && (
        <p className="mt-1.5 truncate text-[10px] text-ink-subtle">{hint}</p>
      )}
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}
