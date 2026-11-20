import { forwardRef, type InputHTMLAttributes } from "react";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, checked, disabled, className = "", id, ...props }, ref) => {
    const inputId = id ?? (typeof label === "string" ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <label
        htmlFor={inputId}
        className={`flex items-start gap-2.5 cursor-pointer select-none ${
          disabled ? "opacity-50 cursor-not-allowed" : ""
        } ${className}`}
      >
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={checked}
            disabled={disabled}
            className="sr-only peer"
            {...props}
          />
          <div
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-canvas ${
              checked
                ? "border-accent bg-accent text-on-accent"
                : "border-border-default bg-bg-surface hover:border-border-strong"
            }`}
          >
            {checked && <Check size={12} strokeWidth={3} aria-hidden="true" />}
          </div>
        </div>

        {(label || description) && (
          <div className="min-w-0">
            {label && (
              <span className="text-ui-dense font-medium text-text-primary block">
                {label}
              </span>
            )}
            {description && (
              <span className="text-meta text-text-secondary block mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
