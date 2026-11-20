import React from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { EvidenceChip } from "./evidence-chip";
import type { Evidence } from "@/lib/api/types";

export interface FactInferenceBlockProps {
  type: "fact" | "inference";
  statement: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  evidence?: Evidence[];
  onEvidenceClick?: (evidence: Evidence) => void;
  className?: string;
}

export function FactInferenceBlock({
  type,
  statement,
  confidence,
  evidence,
  onEvidenceClick,
  className = "",
}: FactInferenceBlockProps) {
  const isFact = type === "fact";

  return (
    <div
      className={[
        "rounded-[6px] p-3 text-ui-dense transition-colors duration-120",
        isFact
          ? "border border-border-default bg-bg-surface text-text-primary"
          : "border border-border-subtle bg-bg-raised text-text-secondary border-dashed",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5 select-none font-mono text-[10px] uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          {isFact ? (
            <span className="inline-flex items-center gap-1 text-success font-semibold">
              <CheckCircle2 size={12} aria-hidden="true" />
              <span>Repository Fact</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-low font-semibold">
              <Sparkles size={12} aria-hidden="true" />
              <span>Inference (Unverified)</span>
            </span>
          )}
        </div>

        {confidence && (
          <span className="text-text-tertiary">
            Confidence: <span className="text-text-secondary">{confidence}</span>
          </span>
        )}
      </div>

      <p className="leading-relaxed font-sans">{statement}</p>

      {evidence && evidence.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-border-subtle/50 flex flex-wrap gap-1.5 items-center">
          <span className="text-meta font-mono text-text-tertiary">Citations:</span>
          {evidence.map((ev, i) => (
            <EvidenceChip key={i} evidence={ev} onClick={onEvidenceClick} />
          ))}
        </div>
      )}
    </div>
  );
}
