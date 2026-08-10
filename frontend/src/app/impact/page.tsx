"use client";

import { useCallback, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Link2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { RequiresReport } from "@/components/workflow/requires-report";
import { WorkflowHeader } from "@/components/workflow/workflow-header";
import { analyzeImpact } from "@/lib/api";
import { useWorkflow } from "@/lib/context/workflow-context";
import { toError } from "@/lib/utils/workflow";
import type {
  AnalysisReport,
  ChangeCategory,
  ChangeImpactReport,
} from "@/lib/api/types";

const CATEGORY_OPTIONS: { value: ChangeCategory | ""; label: string }[] = [
  { value: "", label: "Auto-detect" },
  { value: "DEPENDENCY", label: "Dependency Change" },
  { value: "DATABASE", label: "Database Change" },
  { value: "AUTHENTICATION", label: "Authentication Change" },
  { value: "API", label: "API Change" },
  { value: "ARCHITECTURE", label: "Architecture Change" },
  { value: "MODULE", label: "Module Change" },
  { value: "FEATURE", label: "Feature Change" },
  { value: "INFRASTRUCTURE", label: "Infrastructure Change" },
  { value: "PERFORMANCE", label: "Performance Change" },
  { value: "SECURITY", label: "Security Change" },
  { value: "TECHNOLOGY_MIGRATION", label: "Technology Migration" },
];

const levelStyles: Record<
  ChangeImpactReport["impactLevel"],
  { border: string; label: string; variant: StatusVariant }
> = {
  LOW: { border: "border-l-emerald-400", label: "Low", variant: "info" },
  MEDIUM: { border: "border-l-amber-400", label: "Medium", variant: "warning" },
  HIGH: { border: "border-l-rose-400", label: "High", variant: "failed" },
  CRITICAL: { border: "border-l-rose-500", label: "Critical", variant: "critical" },
};

const confidenceVariant: Record<
  ChangeImpactReport["confidence"],
  StatusVariant
> = {
  HIGH: "succeeded",
  MEDIUM: "warning",
  LOW: "muted",
};

export default function ImpactPage() {
  const { setImpact: saveImpact } = useWorkflow();
  const [request, setRequest] = useState("");
  const [category, setCategory] = useState<ChangeCategory | "">("");
  const [impact, setImpact] = useState<ChangeImpactReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleAnalyze = useCallback(
    async (report: AnalysisReport) => {
      if (!request.trim()) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await analyzeImpact(
          request.trim(),
          report,
          category || undefined,
        );
        setImpact(res);
        saveImpact(res);
      } catch (err) {
        setError(toError(err));
      } finally {
        setIsLoading(false);
      }
    },
    [request, category, saveImpact],
  );

  const canSubmit = request.trim().length > 0 && !isLoading;

  return (
    <RequiresReport>
      {(report) => (
        <div className="space-y-6">
          <WorkflowHeader
            current="Impact"
            next={{ label: "Next: Build", href: "/build" }}
          />

          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-fg">
              Change Impact Analysis
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Evaluate the likely effects of a proposed change across modules,
              APIs, dependencies, and tests — before you build it.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Configuration */}
            <div className="space-y-4">
              <Card padding="lg">
                <CardHeader
                  title="Change Description"
                  subtitle="Describe the proposed change"
                />
                <div className="space-y-4">
                  <Textarea
                    label="Proposed Change"
                    placeholder="e.g. Replace MongoDB with PostgreSQL in the data layer"
                    value={request}
                    onChange={(e) => {
                      setRequest(e.target.value);
                      setError(null);
                    }}
                    className="min-h-[90px]"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="impact-category"
                      className="text-xs font-medium uppercase tracking-wider text-ink-muted"
                    >
                      Category{" "}
                      <span className="font-normal normal-case text-ink-subtle">
                        (optional)
                      </span>
                    </label>
                    <select
                      id="impact-category"
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as ChangeCategory | "")
                      }
                      disabled={isLoading}
                      className="h-9 w-full cursor-pointer appearance-none rounded border border-ink-border/60 bg-ink-1 px-3 pr-8 text-sm text-ink-fg transition-colors focus:border-forge focus:outline-none focus:ring-2 focus:ring-forge/40 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        backgroundImage:
                          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2355637f' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                      }}
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="forge"
                    size="md"
                    icon={<Activity size={14} />}
                    onClick={() => void handleAnalyze(report)}
                    loading={isLoading}
                    disabled={!canSubmit}
                  >
                    Analyze Impact
                  </Button>
                  <p className="text-[10px] text-ink-subtle">
                    Context: report from{" "}
                    <Mono className="text-steel">
                      {report.provenance.source.kind}
                    </Mono>{" "}
                    · {report.overview.fileCount} files
                  </p>
                </div>
              </Card>
            </div>

            {/* Results */}
            <div className="space-y-4 lg:col-span-2">
              {isLoading && (
                <Card padding="lg">
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Loader2 size={24} className="animate-spin text-forge" />
                    <p className="text-sm text-ink-fg">Analyzing impact…</p>
                    <p className="text-xs text-ink-muted">
                      Modeling the blast radius across the dependency graph
                    </p>
                  </div>
                </Card>
              )}

              {!isLoading && error && (
                <ErrorState
                  title="Unable to analyze impact"
                  description="POST /v1/impact failed."
                  error={error}
                  onRetry={() => void handleAnalyze(report)}
                />
              )}

              {!isLoading && !error && !impact && (
                <Card padding="lg">
                  <EmptyState
                    title="No impact analysis yet"
                    description="Describe a proposed change to see its likely impact across your codebase."
                  />
                </Card>
              )}

              {!isLoading && !error && impact && (
                <ImpactView impact={impact} onNew={() => setImpact(null)} />
              )}
            </div>
          </div>
        </div>
      )}
    </RequiresReport>
  );
}

// ── Impact view ───────────────────────────────────────────────────────────────

function BlastMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-ink-border/30 bg-ink-1/30 p-2 text-center">
      <p className="text-lg font-bold text-forge">{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-wider text-ink-subtle">
        {label}
      </p>
    </div>
  );
}

function ModuleChip({ path, direct }: { path: string; direct: boolean }) {
  return (
    <Mono
      className={[
        "border px-1.5 py-0.5 text-[10px]",
        direct
          ? "border-steel/30 bg-steel/10 text-steel"
          : "border-ink-border/30 bg-ink-1/40 text-ink-muted",
      ].join(" ")}
    >
      {path}
    </Mono>
  );
}

function ImpactView({
  impact,
  onNew,
}: {
  impact: ChangeImpactReport;
  onNew: () => void;
}) {
  const level = levelStyles[impact.impactLevel];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card padding="lg" className={["border-l-4", level.border].join(" ")}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-ink-fg">
                {impact.request.request}
              </h2>
              <StatusBadge variant={level.variant}>
                {impact.impactLevel} Impact
              </StatusBadge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              Confidence:
              <StatusBadge variant={confidenceVariant[impact.confidence]} size="sm">
                {impact.confidence}
              </StatusBadge>
              {impact.request.category && (
                <>
                  <span className="text-ink-subtle">·</span>
                  <span className="font-mono uppercase tracking-wider">
                    {impact.request.category}
                  </span>
                </>
              )}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onNew}>
            New Analysis
          </Button>
        </div>
      </Card>

      {/* Blast radius */}
      <Card padding="lg">
        <CardHeader title="Blast Radius" subtitle="Scope of potential impact" />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <BlastMetric label="Direct" value={impact.blastRadius.directModules} />
          <BlastMetric label="Indirect" value={impact.blastRadius.indirectModules} />
          <BlastMetric label="API Routes" value={impact.blastRadius.apiRoutes} />
          <BlastMetric label="Deps" value={impact.blastRadius.dependencies} />
          <BlastMetric label="Tests" value={impact.blastRadius.relatedTests} />
          <BlastMetric label="Doctor" value={impact.blastRadius.doctorFindings} />
        </div>
      </Card>

      {/* Modules */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="none">
          <CardHeader
            title="Directly Affected"
            subtitle={`${impact.directModules.length} module${impact.directModules.length === 1 ? "" : "s"}`}
          />
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {impact.directModules.length === 0 ? (
              <p className="text-xs text-ink-subtle">None identified</p>
            ) : (
              impact.directModules.map((m) => (
                <ModuleChip key={m} path={m} direct />
              ))
            )}
          </div>
        </Card>
        <Card padding="none">
          <CardHeader
            title="Indirectly Affected"
            subtitle={`${impact.indirectModules.length} module${impact.indirectModules.length === 1 ? "" : "s"}`}
          />
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {impact.indirectModules.length === 0 ? (
              <p className="text-xs text-ink-subtle">None identified</p>
            ) : (
              impact.indirectModules.map((m) => (
                <ModuleChip key={m} path={m} direct={false} />
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Relationships */}
      {impact.relationships.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Module Relationships"
            subtitle={`${impact.relationships.length} modeled relationship${impact.relationships.length === 1 ? "" : "s"}`}
          />
          <div className="space-y-1.5 px-4 pb-4">
            {impact.relationships.map((rel, i) => (
              <div
                key={`${rel.from}-${rel.to}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2 font-mono text-[11px]"
              >
                <Link2 size={10} className="shrink-0 text-steel" />
                <span className="text-steel">{rel.from}</span>
                <ChevronRight size={10} className="shrink-0 text-ink-subtle" />
                <span className="text-ink-fg">{rel.to}</span>
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-ink-subtle">
                  {rel.type}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Risks */}
      {impact.risks.length > 0 && (
        <Card padding="none">
          <CardHeader title="Risks" subtitle={`${impact.risks.length} identified`} />
          <div className="space-y-2 px-4 pb-4">
            {impact.risks.map((risk, i) => (
              <div
                key={`${risk.title}-${i}`}
                className="flex items-start gap-3 rounded border border-rose-500/20 bg-rose-500/5 p-3"
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-rose-400" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-ink-fg">{risk.title}</p>
                    <StatusBadge
                      variant={risk.kind === "EVIDENCE_BACKED" ? "healthy" : "muted"}
                      size="sm"
                    >
                      {risk.kind === "EVIDENCE_BACKED"
                        ? "Evidence-backed"
                        : "General consideration"}
                    </StatusBadge>
                  </div>
                  {risk.evidence.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {risk.evidence.map((ev, j) => (
                        <div
                          key={`${ev.file}-${j}`}
                          className="rounded border border-ink-border/20 bg-ink-0/50 px-2 py-1 font-mono text-[11px] text-ink-muted"
                        >
                          <span className="text-steel">{ev.file}</span>
                          <span className="text-ink-subtle">: </span>
                          {ev.detail}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {impact.recommendations.length > 0 && (
        <Card padding="none">
          <CardHeader title="Recommendations" subtitle="Suggested actions" />
          <div className="space-y-2 px-4 pb-4">
            {impact.recommendations.map((rec) => (
              <div
                key={rec}
                className="flex items-start gap-2.5 text-sm text-ink-fg"
              >
                <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                {rec}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Verification */}
      {impact.verification.length > 0 && (
        <Card padding="md">
          <CardHeader title="Verification" subtitle="Recommended verification steps" />
          <ul className="space-y-1.5">
            {impact.verification.map((v) => (
              <li key={v} className="flex items-start gap-2 text-xs text-ink-muted">
                <ShieldCheck size={10} className="mt-0.5 shrink-0 text-steel" />
                {v}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Assumptions */}
      {impact.assumptions.length > 0 && (
        <Card padding="md" className="border-ink-border/30">
          <CardHeader title="Assumptions" subtitle="Analysis assumptions" />
          <ul className="space-y-1.5">
            {impact.assumptions.map((a) => (
              <li key={a} className="flex items-start gap-2 text-xs text-ink-muted">
                <ChevronRight size={10} className="mt-0.5 shrink-0 text-ink-subtle" />
                {a}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Evidence */}
      {impact.evidence.length > 0 && (
        <Card padding="md">
          <CardHeader title="Evidence" subtitle="Supporting evidence" />
          <div className="space-y-1.5">
            {impact.evidence.map((ev, i) => (
              <div
                key={`${ev.file}-${i}`}
                className="rounded border border-ink-border/20 bg-ink-0/50 px-2 py-1 font-mono text-[11px] text-ink-muted"
              >
                <span className="text-steel">{ev.file}</span>
                <span className="text-ink-subtle">: </span>
                {ev.detail}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
