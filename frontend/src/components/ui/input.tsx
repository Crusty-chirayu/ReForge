import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconRight, className = "", id, ...props }, ref) => {
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
        <div className="relative">
          {icon && (
            <span
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              "w-full h-9 rounded bg-ink-1 border px-3 text-sm text-ink-fg placeholder:text-ink-subtle",
              "transition-colors duration-150",
              "focus:outline-none focus:ring-2 focus:ring-forge/40 focus:border-forge",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-ink-0",
              icon ? "pl-9" : "",
              iconRight ? "pr-9" : "",
              error
                ? "border-rose-500/50 focus:ring-rose/40 focus:border-rose"
                : "border-ink-border/60 hover:border-ink-border",
              className,
            ].join(" ")}
            aria-invalid={error ? true : undefined}
            {...props}
          />
          {iconRight && (
            <span
              aria-hidden="true"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-subtle"
            >
              {iconRight}
            </span>
          )}
        </div>
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

Input.displayName = "Input";
