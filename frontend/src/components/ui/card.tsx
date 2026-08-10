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

const glowStyles = {
  forge: "hover:shadow-glow transition-shadow duration-300",
  steel: "hover:shadow-steel transition-shadow duration-300",
  none: "",
} as const;

export function Card({
  children,
  className = "",
  hover = false,
  glow = "none",
  padding = "md",
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded border border-ink-border/60 bg-ink-card/80 backdrop-blur-sm",
        paddingMap[padding],
        hover ? "cursor-pointer" : "",
        glowStyles[glow],
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
        "flex items-start justify-between gap-4 pb-3",
        className,
      ].join(" ")}
    >
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight text-ink-fg">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
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
      className={["text-sm font-semibold tracking-tight text-ink-fg", className].join(
        " ",
      )}
    >
      {title}
    </h3>
  );
}
