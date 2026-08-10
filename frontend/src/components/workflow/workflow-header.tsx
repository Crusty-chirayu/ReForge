"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WorkflowHeaderProps {
  current: string;
  next?: { label: string; href: string };
}

/**
 * Shared header for the Plan → Novelty → Impact workflow pages: breadcrumb
 * back to the analysis report, current-workflow indicator, and an optional
 * "next workflow" action.
 */
export function WorkflowHeader({ current, next }: WorkflowHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={12} />}
          onClick={() => router.push("/analyze/report")}
        >
          Back to Report
        </Button>
        <ChevronRight size={11} className="text-ink-subtle" />
        <span className="font-mono text-ink-fg">{current}</span>
      </div>
      {next && (
        <Button
          variant="steel"
          size="sm"
          iconRight={<ChevronRight size={12} />}
          onClick={() => router.push(next.href)}
        >
          {next.label}
        </Button>
      )}
    </div>
  );
}
