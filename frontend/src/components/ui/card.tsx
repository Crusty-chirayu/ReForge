import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glow?: "forge" | "steel" | "none";
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

export function Card({
  children,
  className = "",
  hover = false,
  glow: _glow,
  padding = "md",
  ...props
}: CardProps) {
  void _glow;
  return (
    <div
      className={[
        "rounded-[6px] border border-border-subtle bg-bg-surface transition-colors duration-120",
        paddingMap[padding],
        hover ? "cursor-pointer hover:border-border-default hover:bg-bg-raised" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = "",
}: CardHeaderProps) {
  return (
    <div
      className={[
        "flex items-start justify-between gap-4 pb-3 border-b border-border-subtle/50 mb-3",
        className,
      ].join(" ")}
    >
      <div className="min-w-0">
        <h3 className="text-ui-dense font-semibold tracking-tight text-text-primary">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-meta text-text-secondary">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <h3
      className={["text-ui-dense font-semibold tracking-tight text-text-primary", className].join(
        " ",
      )}
    >
      {title}
    </h3>
  );
}
