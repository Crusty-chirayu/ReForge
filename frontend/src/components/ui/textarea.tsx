import { forwardRef, type TextareaHTMLAttributes } from "react";

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  mono?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, mono = false, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-meta font-medium uppercase tracking-wider text-text-secondary"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            "w-full rounded-[4px] bg-bg-surface border p-2.5 text-ui-dense text-text-primary placeholder:text-text-tertiary",
            "transition-colors duration-120 outline-none resize-y min-h-[80px]",
            "focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-canvas focus:border-accent",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-canvas",
            mono ? "font-mono text-meta" : "font-sans",
            error
              ? "border-critical text-critical focus:ring-critical/40 focus:border-critical"
              : "border-border-default hover:border-border-strong",
            className,
          ].join(" ")}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {error ? (
          <p role="alert" className="text-meta text-critical">
            {error}
          </p>
        ) : hint ? (
          <p className="text-meta text-text-tertiary">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
