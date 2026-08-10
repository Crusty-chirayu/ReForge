import { isValidElement, type ReactNode } from "react";
import { AlertCircle, FileQuestion, Loader2 } from "lucide-react";
import { Button } from "./button";

export type EmptyStateVariant = "default" | "error" | "loading" | "no-results";

export interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: ReactNode;
  className?: string;
}

const iconMap: Record<EmptyStateVariant, typeof FileQuestion> = {
  default: FileQuestion,
  error: AlertCircle,
  loading: Loader2,
  "no-results": FileQuestion,
};

export function EmptyState({
  variant = "default",
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  const Icon = iconMap[variant];

  return (
    <div
      className={[
        "flex flex-col items-center justify-center gap-3 rounded border border-ink-border/40",
        "bg-ink-card/50 p-8 text-center",
        className,
      ].join(" ")}
    >
      {variant === "loading" ? (
        <div
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-border/60"
        >
          <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
        </div>
      ) : (
        <div
          aria-hidden="true"
          className={[
            "flex h-12 w-12 items-center justify-center rounded-full",
            "bg-ink-2/60 border border-ink-border/40",
            variant === "error" ? "text-rose-400" : "text-ink-muted",
          ].join(" ")}
        >
          {isValidElement(icon) ? (
            <span className="h-6 w-6">{icon}</span>
          ) : (
            <Icon className="h-6 w-6" />
          )}
        </div>
      )}
      <div className="text-center">
        <h3 className="text-sm font-semibold text-ink-fg">{title}</h3>
        {description && (
          <p className="mt-1 max-w-sm text-xs text-ink-muted">{description}</p>
        )}
      </div>
      {action && (
        <Button
          variant="forge"
          size="sm"
          onClick={action.onClick}
          className="mt-1"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
