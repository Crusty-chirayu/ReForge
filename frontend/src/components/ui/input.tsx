import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  iconRight?: ReactNode;
  mono?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, icon, iconRight, mono = false, className = "", id, ...props },
    ref,
  ) => {
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
        <div className="relative">
          {icon && (
            <span
              aria-hidden="true"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary flex items-center justify-center pointer-events-none"
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={[
              "w-full h-8 rounded-[4px] bg-bg-surface border px-2.5 text-ui-dense text-text-primary placeholder:text-text-tertiary",
              "transition-colors duration-120 outline-none",
              "focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-canvas focus:border-accent",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-canvas",
              mono ? "font-mono text-meta" : "font-sans",
              icon ? "pl-8" : "",
              iconRight ? "pr-8" : "",
              error
                ? "border-critical text-critical focus:ring-critical/40 focus:border-critical"
                : "border-border-default hover:border-border-strong",
              className,
            ].join(" ")}
            aria-invalid={error ? true : undefined}
            {...props}
          />
          {iconRight && (
            <span
              aria-hidden="true"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary flex items-center justify-center"
            >
              {iconRight}
            </span>
          )}
        </div>
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

Input.displayName = "Input";
