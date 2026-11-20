"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const widthMap = {
  sm: "w-80",
  md: "w-96",
  lg: "w-[480px]",
  xl: "w-[640px]",
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  width = "md",
  className = "",
}: DrawerProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      };
      document.addEventListener("keydown", onKeyDown);
      return () => {
        document.removeEventListener("keydown", onKeyDown);
        previousActiveElement.current?.focus();
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : "Drawer"}
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-180"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface */}
      <aside
        className={[
          "relative z-10 flex h-full max-w-[90vw] flex-col border-l border-border-default bg-bg-surface text-text-primary shadow-overlay transition-transform duration-180",
          widthMap[width],
          className,
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            {typeof title === "string" ? (
              <h2 className="text-ui-dense font-semibold text-text-primary truncate">
                {title}
              </h2>
            ) : (
              title
            )}
            {description && (
              <p className="text-meta text-text-secondary truncate">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-[4px] p-1 text-text-tertiary hover:bg-bg-raised hover:text-text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
