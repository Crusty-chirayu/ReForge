"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

/** Small icon button that copies `value` to the clipboard with feedback. */
export function CopyButton({
  value,
  label = "Copy",
  className = "",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={label}
      title={copied ? "Copied" : label}
      className={[
        "inline-flex h-6 w-6 items-center justify-center rounded border border-ink-border/40",
        "bg-ink-1 text-ink-subtle transition-colors hover:text-ink-fg",
        className,
      ].join(" ")}
    >
      {copied ? (
        <Check size={11} className="text-emerald-400" />
      ) : (
        <Copy size={11} />
      )}
    </button>
  );
}
