import React from "react";
import { FileCode } from "lucide-react";
import type { Evidence } from "@/lib/api/types";

export interface EvidenceChipProps {
  evidence: Evidence;
  onClick?: (evidence: Evidence) => void;
  className?: string;
}

export function EvidenceChip({ evidence, onClick, className = "" }: EvidenceChipProps) {
  const isClickable = Boolean(onClick);

  const content = (
    <>
      <FileCode size={11} className="text-text-tertiary shrink-0" aria-hidden="true" />
      <span className="truncate max-w-[240px] text-text-primary">{evidence.file}</span>
      {evidence.detail && (
        <span className="text-text-tertiary truncate max-w-[160px]">
          ({evidence.detail})
        </span>
      )}
    </>
  );

  if (isClickable) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(evidence)}
        className={[
          "inline-flex items-center gap-1.5 rounded-[4px] border border-border-default bg-bg-raised px-2 py-0.5 font-mono text-[11px] leading-tight text-text-primary transition-colors hover:border-border-strong hover:bg-bg-overlay focus-visible:ring-2 focus-visible:ring-accent",
          className,
        ].join(" ")}
      >
        {content}
      </button>
    );
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-[4px] border border-border-subtle bg-bg-surface px-2 py-0.5 font-mono text-[11px] leading-tight text-text-secondary select-none",
        className,
      ].join(" ")}
    >
      {content}
    </span>
  );
}
