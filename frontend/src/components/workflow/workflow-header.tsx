"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORKFLOW_STEPS } from "@/lib/utils/workflow";

export interface WorkflowHeaderProps {
  /** Label of the current workflow step, e.g. "Plan". */
  current: string;
  next?: { label: string; href: string };
}

/**
 * Shared header for the workflow pages.
 *
 * Provides a breadcrumb back to the analysis report, a rail showing the whole
 * Analyze → Build → Pipeline journey with the current step marked, and the
 * next action. The rail is built from real <Link>s so the whole workflow is
 * reachable by keyboard, middle-click, and browser history.
 */
export function WorkflowHeader({ current, next }: WorkflowHeaderProps) {
  const router = useRouter();
  const currentIndex = WORKFLOW_STEPS.findIndex(
    (step) => step.label.toLowerCase() === current.toLowerCase(),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-ink-muted">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} />}
            onClick={() => router.push("/analyze/report")}
          >
            Back to Report
          </Button>
          <ChevronRight size={11} aria-hidden="true" className="text-ink-subtle" />
          <span className="truncate font-mono text-ink-fg">{current}</span>
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

      {/* Workflow rail — where you are, and every step you can jump to. */}
      <nav aria-label="Workflow progress" className="-mx-1 overflow-x-auto px-1 pb-1">
        <ol className="flex min-w-max items-center gap-1">
          {WORKFLOW_STEPS.map((step, index) => {
            const isCurrent = index === currentIndex;
            const isComplete = currentIndex >= 0 && index < currentIndex;
            return (
              <li key={step.href} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight
                    size={10}
                    aria-hidden="true"
                    className="shrink-0 text-ink-subtle"
                  />
                )}
                <Link
                  href={step.href}
                  aria-current={isCurrent ? "step" : undefined}
                  className={[
                    "block rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-widest transition-colors",
                    isCurrent
                      ? "border-forge/30 bg-forge/10 text-forge"
                      : isComplete
                        ? "border-ink-border/40 bg-ink-1/40 text-ink-muted hover:text-ink-fg"
                        : "border-ink-border/30 text-ink-subtle hover:text-ink-muted",
                  ].join(" ")}
                >
                  {step.label}
                  {isCurrent && <span className="sr-only"> (current step)</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
