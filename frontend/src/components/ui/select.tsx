import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, className = "", id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-meta font-medium uppercase tracking-wider text-text-secondary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={[
              "w-full h-8 rounded-[4px] bg-bg-surface border px-2.5 pr-8 text-ui-dense text-text-primary appearance-none cursor-pointer",
              "transition-colors duration-120 outline-none",
              "focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-canvas focus:border-accent",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-bg-canvas",
              error
                ? "border-critical text-critical"
                : "border-border-default hover:border-border-strong",
              className,
            ].join(" ")}
            aria-invalid={error ? true : undefined}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary flex items-center"
          >
            <ChevronDown size={14} />
          </span>
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

Select.displayName = "Select";
