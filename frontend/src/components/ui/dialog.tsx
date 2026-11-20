"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "md",
  className = "",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
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
      aria-labelledby="dialog-title"
      aria-describedby={description ? "dialog-description" : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 transition-opacity duration-180"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Surface (bottom sheet on mobile, centered modal on desktop) */}
      <div
        ref={dialogRef}
        className={[
          "relative z-10 w-full rounded-t-[10px] sm:rounded-[10px] border border-border-default bg-bg-surface p-5 text-text-primary shadow-overlay transition-all duration-240",
          maxWidthMap[maxWidth],
          className,
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-border-subtle">
          <div>
            <h2 id="dialog-title" className="text-h3-dense font-semibold text-text-primary">
              {title}
            </h2>
            {description && (
              <p id="dialog-description" className="mt-1 text-meta text-text-secondary">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-[4px] p-1 text-text-tertiary hover:bg-bg-raised hover:text-text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="py-4 max-h-[70vh] overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-subtle">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AlertDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "danger";
  loading?: boolean;
}

export function AlertDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  loading = false,
}: AlertDialogProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      // Default focus is Cancel button for safety
      setTimeout(() => cancelBtnRef.current?.focus(), 50);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button
            ref={cancelBtnRef}
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-ui-dense text-text-secondary">{description}</div>
    </Dialog>
  );
}
