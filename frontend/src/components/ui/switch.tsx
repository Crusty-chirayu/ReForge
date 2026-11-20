"use client";

import React from "react";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className = "",
}: SwitchProps) {
  return (
    <label
      className={`inline-flex items-center justify-between gap-3 cursor-pointer select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <span className="text-ui-dense font-medium text-text-primary block">
              {label}
            </span>
          )}
          {description && (
            <span className="text-meta text-text-secondary block">
              {description}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-120 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg-canvas ${
          checked ? "bg-accent" : "bg-border-strong"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-120 ${
            checked ? "translate-x-4" : "translate-x-0.5"
          } mt-0.5`}
        />
      </button>
    </label>
  );
}
