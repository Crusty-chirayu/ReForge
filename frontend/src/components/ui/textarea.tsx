import { forwardRef, type TextareaHTMLAttributes } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-medium uppercase tracking-wider text-ink-muted"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            "w-full min-h-[100px] rounded bg-ink-1 border px-3 py-2 text-sm text-ink-fg placeholder:text-ink-subtle",
            "transition-colors duration-150 resize-y",
            "focus:outline-none focus:ring-2 focus:ring-forge/40 focus:border-forge",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-ink-0",
            error
              ? "border-rose-500/50 focus:ring-rose/40 focus:border-rose"
              : "border-ink-border/60 hover:border-ink-border",
            className,
          ].join(" ")}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {error ? (
          <p role="alert" className="text-xs text-rose-400">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-ink-subtle">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
