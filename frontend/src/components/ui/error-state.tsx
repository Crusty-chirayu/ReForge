import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./button";
import { Mono } from "./mono";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

function messageOf(error: unknown): string | null {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.length > 0) return error;
  return null;
}

/**
 * Full-width error surface for page/panel failures. Renders a retry action
 * when `onRetry` is provided and a mono error line when an error is present.
 */
export function ErrorState({
  title = "Something went wrong",
  description,
  error,
  onRetry,
  className = "",
}: ErrorStateProps) {
  const detail = messageOf(error);

  return (
    <div
      role="alert"
      className={[
        "flex flex-col items-start gap-3 rounded border border-rose-500/25",
        "bg-rose-500/5 p-6",
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden="true"
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border border-rose-500/30 bg-rose-500/10 text-rose-400"
        >
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-rose-400">{title}</h3>
          {description && (
            <p className="mt-1 text-xs text-ink-muted">{description}</p>
          )}
        </div>
      </div>
      {detail && (
        <div className="w-full rounded border border-ink-border/40 bg-ink-0/60 px-3 py-2">
          <Mono className="text-rose-400">{detail}</Mono>
        </div>
      )}
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          onClick={onRetry}
        >
          Retry
        </Button>
      )}
    </div>
  );
}
