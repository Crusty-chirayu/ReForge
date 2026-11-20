import React from "react";

export interface RadioCardProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description: string;
  badge?: React.ReactNode;
  warning?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
  badge,
  warning,
  disabled = false,
  className = "",
}: RadioCardProps) {
  return (
    <label
      className={[
        "relative flex cursor-pointer flex-col rounded-[6px] border p-3.5 transition-all duration-120 outline-none select-none",
        "focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 focus-within:ring-offset-bg-canvas",
        checked
          ? "border-accent bg-accent-subtle/40"
          : "border-border-default bg-bg-surface hover:border-border-strong hover:bg-bg-raised",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        className,
      ].join(" ")}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="sr-only"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
              checked ? "border-accent" : "border-border-default"
            }`}
          >
            {checked && <div className="h-2 w-2 rounded-full bg-accent" />}
          </div>
          <span className="text-ui-dense font-semibold text-text-primary">
            {title}
          </span>
        </div>
        {badge}
      </div>

      <p className="mt-2 text-meta text-text-secondary leading-relaxed">
        {description}
      </p>

      {warning && checked && (
        <div className="mt-2.5 rounded-[4px] border border-high/30 bg-high/10 p-2 text-meta text-high font-mono">
          {warning}
        </div>
      )}
    </label>
  );
}
