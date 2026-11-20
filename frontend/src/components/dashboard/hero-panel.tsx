"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Radio, Search, Zap, ArrowRight, ShieldAlert, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Mono } from "@/components/ui/mono";
import { useHealth } from "@/lib/query/use-health";
import { reportStore } from "@/lib/context/report-context";
import { formatRelativeTime } from "@/lib/utils/format";
import type { ActivityEvent } from "@/lib/utils/activity";

export interface HeroPanelProps {
  latestActivity: ActivityEvent | null;
}

export function HeroPanel({ latestActivity }: HeroPanelProps) {
  const router = useRouter();
  const { data: health, isLoading, refetch } = useHealth();
  const reportSnapshot = useSyncExternalStore(
    reportStore.subscribe,
    reportStore.getSnapshot,
    reportStore.getServerSnapshot,
  );
  const report = reportSnapshot.report;

  const isHealthy = health?.status === "ok";
  const state = isLoading
    ? ("checking" as const)
    : isHealthy
    ? ("connected" as const)
    : ("offline" as const);

  const statusVariant =
    state === "connected"
      ? "healthy"
      : state === "offline"
      ? "failed"
      : "running";

  const statusLabel =
    state === "connected"
      ? "CONNECTED"
      : state === "offline"
      ? "OFFLINE"
      : "CHECKING";

  const projectName =
    report?.provenance?.source?.reference ??
    (report ? "Active Workspace" : "No project ingested");

  const doctorFindingCount = report?.doctor?.findings?.length ?? 0;

  return (
    <section className="space-y-4">
      {/* Project Header Banner */}
      <div className="rounded-[6px] border border-border-default bg-bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
                CURRENT WORKSPACE
              </span>
              {report && (
                <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">
                  ACTIVE REPORT
                </span>
              )}
            </div>
            <h1 className="text-h2-dense font-semibold text-text-primary tracking-tight">
              {report ? projectName : "ReForge Engineering System"}
            </h1>
            <p className="max-w-2xl text-ui-dense text-text-secondary leading-relaxed">
              {report
                ? `Analyzed ${report.overview.analyzableFileCount} files (${(report.overview.totalBytes / (1024 * 1024)).toFixed(1)} MB). Evidence-grounded intelligence for analysis, planning, diff proposal, execution, and verification.`
                : "Deterministic analysis engine with AI-augmented engineering workflows — ingest archives and repositories, generate evidence-backed plans, model change impact, and drive pipelines from proposal to verified execution."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 select-none">
            <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>
            <Mono className="text-text-secondary border border-border-subtle bg-bg-raised px-2 py-0.5 rounded text-meta">
              {health?.service ?? "reforge-analysis-engine"}
            </Mono>
          </div>
        </div>

        {/* Action strip */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle/60">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="forge"
              size="sm"
              icon={<Search size={13} />}
              onClick={() => router.push("/analyze")}
            >
              Analyze Project
            </Button>
            <Button
              variant="steel"
              size="sm"
              icon={<Zap size={13} />}
              onClick={() => router.push("/pipeline")}
            >
              Run Pipeline
            </Button>
            {report && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ArrowRight size={13} />}
                onClick={() => router.push("/analyze/report")}
              >
                View Full Report
              </Button>
            )}
          </div>

          {latestActivity && (
            <span className="flex min-w-0 items-center gap-2 text-meta text-text-secondary font-mono">
              <Radio size={12} className="shrink-0 text-accent" />
              <span className="truncate">
                Latest activity:{" "}
                <span className="text-text-primary">{latestActivity.label}</span>
                <span className="text-text-tertiary">
                  {" "}
                  · {formatRelativeTime(latestActivity.createdAt)}
                </span>
              </span>
            </span>
          )}
        </div>

        {state === "offline" && (
          <div
            role="alert"
            className="mt-4 flex flex-wrap items-center gap-3 rounded-[4px] border border-critical/30 bg-critical/10 px-3 py-2 text-ui-dense"
          >
            <AlertTriangle size={14} className="shrink-0 text-critical" />
            <p className="min-w-0 flex-1 text-meta text-text-secondary">
              Backend unreachable — GET /health failed. Data sections below may
              be unavailable.
            </p>
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Next Actions Derived from Real State */}
      <div className="rounded-[6px] border border-border-subtle bg-bg-raised/50 p-4">
        <h2 className="font-mono text-meta font-semibold uppercase tracking-wider text-text-tertiary mb-2.5">
          Next Recommended Actions
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {!report ? (
            <div className="rounded-[4px] border border-border-default bg-bg-surface p-3 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] text-accent uppercase font-bold">1. Ingest Codebase</span>
                <p className="text-ui-dense font-medium text-text-primary mt-1">Upload Archive or Repository</p>
                <p className="text-meta text-text-secondary mt-0.5">Start by ingesting a project to generate structural and health intelligence.</p>
              </div>
              <Button variant="secondary" size="sm" className="mt-3 w-fit" onClick={() => router.push("/analyze")}>
                Go to Ingest
              </Button>
            </div>
          ) : (
            <div className="rounded-[4px] border border-border-default bg-bg-surface p-3 flex flex-col justify-between">
              <div>
                <span className="font-mono text-[10px] text-success uppercase font-bold flex items-center gap-1">
                  <CheckCircle size={11} /> Analysis Ready
                </span>
                <p className="text-ui-dense font-medium text-text-primary mt-1">{report.overview.fileCount} Files Analyzed</p>
                <p className="text-meta text-text-secondary mt-0.5">Explore structure, dependencies, and architecture insights.</p>
              </div>
              <Button variant="secondary" size="sm" className="mt-3 w-fit" onClick={() => router.push("/analyze/report")}>
                Explore Report
              </Button>
            </div>
          )}

          <div className="rounded-[4px] border border-border-default bg-bg-surface p-3 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] text-high uppercase font-bold flex items-center gap-1">
                <ShieldAlert size={11} /> Project Health
              </span>
              <p className="text-ui-dense font-medium text-text-primary mt-1">
                {doctorFindingCount > 0 ? `${doctorFindingCount} Open Findings` : "No Findings Active"}
              </p>
              <p className="text-meta text-text-secondary mt-0.5">
                {doctorFindingCount > 0
                  ? "Examine high-severity findings and send targeted mitigations to Plan."
                  : "Review rule categories and automated quality observations."}
              </p>
            </div>
            <Button variant="secondary" size="sm" className="mt-3 w-fit" onClick={() => router.push("/analyze/report")}>
              Review Findings
            </Button>
          </div>

          <div className="rounded-[4px] border border-border-default bg-bg-surface p-3 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] text-low uppercase font-bold">Autonomous Execution</span>
              <p className="text-ui-dense font-medium text-text-primary mt-1">Run Verified Pipeline</p>
              <p className="text-meta text-text-secondary mt-0.5">Execute end-to-end ingest, plan, build proposal, and sandbox verification.</p>
            </div>
            <Button variant="secondary" size="sm" className="mt-3 w-fit" onClick={() => router.push("/pipeline")}>
              Configure Run
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
