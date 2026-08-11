"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Wrench,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { describeApiError } from "@/lib/utils/api-error";
import { Mono } from "@/components/ui/mono";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { RequiresReport } from "@/components/workflow/requires-report";
import { WorkflowHeader } from "@/components/workflow/workflow-header";
import { generateBuild, validateExecution } from "@/lib/api";
import { useWorkflow } from "@/lib/context/workflow-context";
import { toError } from "@/lib/utils/workflow";
import type {
  AnalysisReport,
  BuildPlan,
  ExecutionResult,
  FileOperation,
} from "@/lib/api/types";

const operationStyles: Record<
  FileOperation,
  { icon: typeof Plus; label: string; chip: string; badge: StatusVariant }
> = {
  CREATE: {
    icon: Plus,
    label: "CREATE",
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    badge: "healthy",
  },
  MODIFY: {
    icon: Pencil,
    label: "MODIFY",
    chip: "border-steel/30 bg-steel/10 text-steel",
    badge: "info",
  },
  DELETE: {
    icon: Trash2,
    label: "DELETE",
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    badge: "failed",
  },
  RENAME: {
    icon: RotateCcw,
    label: "RENAME",
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    badge: "warning",
  },
};

type ValidationVerdict = "VALID" | "INVALID" | "BLOCKED";

function verdictOf(result: ExecutionResult): ValidationVerdict {
  if (result.validation.valid) return "VALID";
  const codes = result.validation.details?.map((d) => d.code) ?? [];
  if (
    codes.includes("APPROVAL_REQUIRED") ||
    codes.includes("DELETE_APPROVAL_REQUIRED")
  ) {
    return "BLOCKED";
  }
  return "INVALID";
}

const verdictBadge: Record<ValidationVerdict, StatusVariant> = {
  VALID: "healthy",
  INVALID: "failed",
  BLOCKED: "warning",
};

export default function BuildPage() {
  const { plan, impact, novelty, setBuild: saveBuild } = useWorkflow();
  const [goal, setGoal] = useState(
    () => plan?.objective ?? impact?.request.request ?? "",
  );
  const [includePlan, setIncludePlan] = useState(plan !== null);
  const [includeImpact, setIncludeImpact] = useState(impact !== null);
  const [includeNovelty, setIncludeNovelty] = useState(novelty !== null);

  const [build, setBuild] = useState<BuildPlan | null>(null);
  const [validation, setValidation] = useState<ExecutionResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const canGenerate = goal.trim().length > 0 && !isGenerating;

  const handleGenerate = useCallback(
    async (report: AnalysisReport) => {
      if (!goal.trim()) return;
      setIsGenerating(true);
      setError(null);
      setValidation(null);
      try {
        const res = await generateBuild(goal.trim(), report, {
          plan: includePlan && plan ? plan : undefined,
          impact: includeImpact && impact ? impact : undefined,
          noveltyCandidate:
            includeNovelty && novelty?.candidates[0] ? novelty.candidates[0] : undefined,
        });
        setBuild(res.build);
        saveBuild(res.build);
      } catch (err) {
        setError(toError(err));
      } finally {
        setIsGenerating(false);
      }
    },
    [goal, includePlan, plan, includeImpact, impact, includeNovelty, novelty, saveBuild],
  );

  const handleValidate = useCallback(async () => {
    if (!build) return;
    setIsValidating(true);
    setError(null);
    try {
      const result = await validateExecution({
        build,
        approved: true,
        allowDelete: true,
      });
      setValidation(result);
    } catch (err) {
      setError(toError(err));
    } finally {
      setIsValidating(false);
    }
  }, [build]);

  const contextChips = useMemo(
    () => [
      { label: "Plan", present: plan !== null, enabled: includePlan },
      { label: "Impact", present: impact !== null, enabled: includeImpact },
      { label: "Novelty", present: novelty !== null, enabled: includeNovelty },
    ],
    [plan, impact, novelty, includePlan, includeImpact, includeNovelty],
  );

  return (
    <RequiresReport>
      {(report) => (
        <div className="space-y-6">
          <WorkflowHeader
            current="Build"
            next={{ label: "Run Pipeline", href: "/pipeline/new" }}
          />

          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-fg">
              Build Plan
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Generate a proposed BuildPlan from your workflow context — a
              patch proposal only, never applied from this page.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Configuration */}
            <div className="space-y-4">
              <Card padding="lg">
                <CardHeader
                  title="Build Configuration"
                  subtitle="Goal + workflow context"
                />
                <div className="space-y-4">
                  <Textarea
                    label="Goal"
                    placeholder="e.g. Introduce caching for order lookups"
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value);
                      setError(null);
                    }}
                    className="min-h-[80px]"
                    disabled={isGenerating}
                  />

                  <div>
                    <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                      Workflow context
                    </p>
                    <div className="space-y-1.5">
                      {contextChips.map((chip) => (
                        <label
                          key={chip.label}
                          className="flex cursor-pointer items-center gap-2 rounded border border-ink-border/40 bg-ink-1/40 px-2.5 py-1.5"
                        >
                          <input
                            type="checkbox"
                            checked={chip.enabled}
                            disabled={!chip.present}
                            onChange={(e) => {
                              if (chip.label === "Plan") setIncludePlan(e.target.checked);
                              if (chip.label === "Impact") setIncludeImpact(e.target.checked);
                              if (chip.label === "Novelty") setIncludeNovelty(e.target.checked);
                            }}
                            className="h-3.5 w-3.5 accent-forge"
                          />
                          <span className="text-xs text-ink-fg">{chip.label}</span>
                          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-ink-subtle">
                            {chip.present
                              ? chip.enabled
                                ? "attached"
                                : "excluded"
                              : "not available"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="forge"
                    size="md"
                    icon={<Wrench size={14} />}
                    onClick={() => void handleGenerate(report)}
                    loading={isGenerating}
                    disabled={!canGenerate}
                  >
                    Generate Build
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
              {isGenerating && (
                <Card padding="lg">
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Loader2 size={24} className="animate-spin text-forge" />
                    <p className="text-sm text-ink-fg">Generating build plan…</p>
                    <p className="text-xs text-ink-muted">
                      Mapping workflow context to proposed file operations
                    </p>
                  </div>
                </Card>
              )}

              {!isGenerating && error && (
                <ErrorState
                  title="Unable to generate build"
                  description={
                describeApiError(error, {
                  resource: "build plan",
                  endpoint: "POST /v1/build",
                }).description
              }
                  error={error}
                  onRetry={() => void handleGenerate(report)}
                />
              )}

              {!isGenerating && !error && !build && (
                <Card padding="lg">
                  <EmptyState
                    title="No build plan yet"
                    description="Generate a proposed build from your goal and workflow context."
                  />
                </Card>
              )}

              {!isGenerating && !error && build && (
                <BuildView
                  build={build}
                  validation={validation}
                  isValidating={isValidating}
                  onValidate={() => void handleValidate()}
                  onNew={() => {
                    setBuild(null);
                    setValidation(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </RequiresReport>
  );
}

// ── Build view ────────────────────────────────────────────────────────────────

function FileOpCard({ change }: { change: BuildPlan["fileChanges"][number] }) {
  const op = operationStyles[change.operation];

  return (
    <div className="rounded border border-ink-border/30 bg-ink-1/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={[
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
            op.chip,
          ].join(" ")}
        >
          <op.icon size={10} />
          {op.label}
        </span>
        <Mono className="min-w-0 flex-1 text-ink-fg">{change.path}</Mono>
        {change.operation === "RENAME" && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-amber-400">
            rename target
          </span>
        )}
        <StatusBadge
          variant={change.status === "EXISTING_FILE" ? "info" : "proposal"}
          size="sm"
        >
          {change.status === "EXISTING_FILE" ? "existing" : "proposed"}
        </StatusBadge>
      </div>
      {change.expectedHash && (
        <p className="mt-1.5 font-mono text-[10px] text-ink-subtle">
          expected sha256:{" "}
          <span className="text-ink-muted">{change.expectedHash}</span>
        </p>
      )}
      {change.reason && (
        <p className="mt-1 text-xs text-ink-muted">{change.reason}</p>
      )}
      {change.evidence.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {change.evidence.map((ev, i) => (
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
      )}
    </div>
  );
}

function BuildView({
  build,
  validation,
  isValidating,
  onValidate,
  onNew,
}: {
  build: BuildPlan;
  validation: ExecutionResult | null;
  isValidating: boolean;
  onValidate: () => void;
  onNew: () => void;
}) {
  const verdict: ValidationVerdict | null = validation
    ? verdictOf(validation)
    : null;

  return (
    <div className="space-y-4">
      {/* Header — PROPOSED BUILD */}
      <Card padding="lg" className="border-l-4 border-l-forge">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-forge/20 bg-forge/10 text-forge">
              <Wrench size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-ink-fg">
                  {build.objective}
                </h2>
                <StatusBadge variant="proposal">Proposed Build</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                {build.fileChanges.length} file operation
                {build.fileChanges.length === 1 ? "" : "s"} ·{" "}
                {build.dependencyChanges.length} dependency change
                {build.dependencyChanges.length === 1 ? "" : "s"} ·{" "}
                {build.testChanges.length} test note
                {build.testChanges.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-[10px] text-ink-subtle">
                <AlertTriangle size={10} className="text-amber-400" />
                Nothing has been applied — this is a proposal only.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={build.validation.valid ? "healthy" : "failed"}>
              {build.validation.valid ? "Valid" : "Invalid"}
            </StatusBadge>
            <Button variant="ghost" size="sm" onClick={onNew}>
              New Build
            </Button>
          </div>
        </div>
        {!build.validation.valid && build.validation.errors.length > 0 && (
          <div className="mt-4 rounded border border-rose-500/20 bg-rose-500/5 p-3">
            <p className="mb-1.5 text-xs font-medium text-rose-400">
              Build validation issues
            </p>
            <ul className="space-y-1">
              {build.validation.errors.map((err) => (
                <li key={err} className="flex items-start gap-1.5 text-xs text-ink-muted">
                  <XCircle size={10} className="mt-0.5 shrink-0 text-rose-400" />
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Patch validation */}
      <Card padding="lg">
        <CardHeader
          title="Patch Validation"
          subtitle="Structural check of the proposed patch set — nothing is executed"
          action={
            <Button
              variant="steel"
              size="sm"
              icon={<ShieldCheck size={13} />}
              onClick={onValidate}
              loading={isValidating}
            >
              Validate Patches
            </Button>
          }
        />
        {!validation && !isValidating && (
          <p className="text-xs text-ink-subtle">
            Run validation against the proposed patch set to surface approval,
            path, hash, or content issues before moving to the pipeline.
          </p>
        )}
        {validation && verdict && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <StatusBadge variant={verdictBadge[verdict]}>{verdict}</StatusBadge>
              <span className="text-xs text-ink-muted">
                {validation.changes.length} proposed change
                {validation.changes.length === 1 ? "" : "s"} · 0 applied
              </span>
            </div>
            {validation.validation.errors.length > 0 && (
              <div className="space-y-1">
                {validation.validation.details?.map((detail, i) => (
                  <div
                    key={`${detail.code}-${i}`}
                    className="flex items-start gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2"
                  >
                    <XCircle size={11} className="mt-0.5 shrink-0 text-rose-400" />
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-wider text-rose-400">
                        {detail.code}
                        {detail.path ? ` · ${detail.path}` : ""}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {detail.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* File operations */}
      <Card padding="none">
        <CardHeader
          title="Proposed File Operations"
          subtitle={`${build.fileChanges.length} operation${build.fileChanges.length === 1 ? "" : "s"}`}
        />
        <div className="space-y-2 px-4 pb-4">
          {build.fileChanges.map((change) => (
            <FileOpCard key={`${change.operation}-${change.path}`} change={change} />
          ))}
          {build.fileChanges.length === 0 && (
            <p className="text-xs text-ink-subtle">No file operations proposed.</p>
          )}
        </div>
      </Card>

      {/* Dependency changes */}
      {build.dependencyChanges.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Dependency Changes"
            subtitle={`${build.dependencyChanges.length} change${build.dependencyChanges.length === 1 ? "" : "s"} · proposed only`}
          />
          <div className="space-y-1.5 px-4 pb-4">
            {build.dependencyChanges.map((dep) => (
              <div
                key={dep.name}
                className="flex items-center gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2"
              >
                <StatusBadge
                  variant={
                    dep.operation === "ADD"
                      ? "healthy"
                      : dep.operation === "REMOVE"
                        ? "failed"
                        : "warning"
                  }
                  size="sm"
                >
                  {dep.operation}
                </StatusBadge>
                <Mono className="min-w-0 flex-1 text-ink-fg">{dep.name}</Mono>
                <span className="text-xs text-ink-muted">{dep.reason}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Test changes */}
      {build.testChanges.length > 0 && (
        <Card padding="md">
          <CardHeader title="Test Notes" subtitle="Suggested test focus" />
          <ul className="space-y-1.5">
            {build.testChanges.map((t) => (
              <li key={t} className="flex items-start gap-2 text-xs text-ink-muted">
                <FileText size={10} className="mt-0.5 shrink-0 text-steel" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Risks */}
      {build.risks.length > 0 && (
        <Card padding="md">
          <CardHeader title="Risks" subtitle="Carried from workflow context" />
          <ul className="space-y-1.5">
            {build.risks.map((risk) => (
              <li key={risk} className="flex items-start gap-2 text-xs text-ink-muted">
                <AlertTriangle size={10} className="mt-0.5 shrink-0 text-amber-400" />
                {risk}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Assumptions */}
      {build.assumptions.length > 0 && (
        <Card padding="md" className="border-ink-border/30">
          <CardHeader title="Assumptions" subtitle="Build assumptions" />
          <ul className="space-y-1.5">
            {build.assumptions.map((a) => (
              <li key={a} className="flex items-start gap-2 text-xs text-ink-muted">
                <CheckCircle2 size={10} className="mt-0.5 shrink-0 text-steel" />
                {a}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
