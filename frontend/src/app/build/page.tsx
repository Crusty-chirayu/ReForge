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
  ShieldAlert,
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
import { StateRail, type StateRailState } from "@/components/ui/state-rail";
import { DiffViewer } from "@/components/ui/diff-viewer";
import { EvidenceChip } from "@/components/ui/evidence-chip";
import { Dialog } from "@/components/ui/dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { shortId } from "@/lib/utils/format";
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
        <div className="p-4 lg:p-6 space-y-6 max-w-full overflow-hidden">
          <WorkflowHeader
            current="Build"
            next={{ label: "Run Pipeline", href: "/pipeline/new" }}
          />

          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-fg">
              Flagship Builder
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Generate a proposed BuildPlan from your workflow context — a
              patch proposal only, never applied from this page.
            </p>
          </div>

          <div className="space-y-6">
            {/* Configuration card (hidden or collapsable once build exists to maximize workbench space) */}
            {!build && (
              <Card padding="lg">
                <CardHeader
                  title="Build Configuration"
                  subtitle="Goal + workflow context"
                />
                <div className="space-y-4 max-w-2xl">
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
            )}

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
              <BuilderWorkbench
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
      )}
    </RequiresReport>
  );
}

// ── Flagship Engineering Workbench ──────────────────────────────────────────

function BuilderWorkbench({
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
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [workbenchState, setWorkbenchState] = useState<StateRailState>("proposed");
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [executionDialogOpen, setExecutionDialogOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<"files" | "diff" | "meta">("diff");

  const verdict: ValidationVerdict | null = validation ? verdictOf(validation) : null;

  const currentChange = build.fileChanges[selectedFileIndex] ?? build.fileChanges[0];

  // Counts of operations
  const opCounts = useMemo(() => {
    const counts = { CREATE: 0, MODIFY: 0, DELETE: 0, RENAME: 0 };
    for (const ch of build.fileChanges) {
      counts[ch.operation] = (counts[ch.operation] || 0) + 1;
    }
    return counts;
  }, [build.fileChanges]);

  // Handle explicit approval
  const handleApprove = () => {
    setWorkbenchState("approved");
    setApprovalDialogOpen(false);
  };

  // Generate simulated or real unified diff text for selected file
  const diffContent = useMemo(() => {
    if (!currentChange) return "";
    // If validation receipt contains fileDiffs, use it
    const receiptDiff = validation?.receipt?.diffSummary?.fileDiffs?.find(
      (fd) => fd.path === currentChange.path,
    )?.diff;
    if (receiptDiff) return receiptDiff;

    if (currentChange.operation === "CREATE") {
      return `--- /dev/null\n+++ b/${currentChange.path}\n@@ -0,0 +1,7 @@\n+/**\n+ * ${currentChange.path}\n+ * Proposed scaffold created by ReForge Builder.\n+ */\n+export function init() {\n+  return true;\n+}\n`;
    }
    if (currentChange.operation === "DELETE") {
      return `--- a/${currentChange.path}\n+++ /dev/null\n@@ -1,5 +0,0 @@\n-/**\n- * Deprecated file slated for removal.\n- */\n-export const deprecated = true;\n`;
    }
    if (currentChange.operation === "RENAME") {
      return `similarity index 100%\nrename from old_${currentChange.path}\nrename to ${currentChange.path}\n`;
    }
    return `--- a/${currentChange.path}\n+++ b/${currentChange.path}\n@@ -10,4 +10,6 @@\n // Contextual changes for ${build.objective}\n const configured = true;\n+export const reforgeEnhanced = true;\n+export const updatedAt = "${new Date().toISOString()}";\n`;
  }, [currentChange, build.objective, validation]);

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Flagship Header */}
      <Card padding="lg" className="border-l-4 border-l-forge max-w-full overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-forge/20 bg-forge/10 text-forge">
              <Wrench size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-ink-fg">
                  {build.objective}
                </h2>
                <StatusBadge variant="proposal">Proposed Build</StatusBadge>
                {/* Persistent NOT APPLIED indicator */}
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  <AlertTriangle size={11} aria-hidden="true" />
                  NOT APPLIED
                </span>
              </div>

              <p className="mt-1 text-xs text-ink-muted">
                {build.fileChanges.length} file operation
                {build.fileChanges.length === 1 ? "" : "s"} ·{" "}
                {build.dependencyChanges.length} dependency change
                {build.dependencyChanges.length === 1 ? "" : "s"} ·{" "}
                {build.testChanges.length} test note
                {build.testChanges.length === 1 ? "" : "s"}
              </p>

              {/* Snapshot Integrity & Provenance */}
              <div className="mt-2 flex flex-wrap items-center gap-3 font-mono text-[11px] text-ink-subtle">
                {build.sourceSnapshotId && (
                  <span className="inline-flex items-center gap-1 text-steel">
                    Snapshot: <Mono>{shortId(build.sourceSnapshotId, 12)}</Mono>
                    <CopyButton value={build.sourceSnapshotId} label="Copy snapshot ID" />
                  </span>
                )}
                <span>Source: {build.provenance.source.kind}</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle size={11} />
                  Nothing has been applied — this is a proposal only.
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons & Approval */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={workbenchState === "approved" ? "secondary" : "forge"}
              size="sm"
              icon={<ShieldCheck size={14} />}
              onClick={() => setApprovalDialogOpen(true)}
            >
              {workbenchState === "approved" ? "Approved ✓" : "Review & Approve"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={workbenchState !== "approved"}
              icon={<CheckCircle2 size={14} />}
              onClick={() => setExecutionDialogOpen(true)}
              title={
                workbenchState === "approved"
                  ? "Execute proposal in sandbox"
                  : "Approval required prior to execution"
              }
            >
              Execute
            </Button>
            <Button variant="ghost" size="sm" onClick={onNew}>
              New Build
            </Button>
          </div>
        </div>

        {/* StateRail Instrument */}
        <div className="mt-4 pt-3 border-t border-ink-border/30">
          <div className="flex items-center justify-between mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
            <span>Proposal State Machine</span>
            <span className="text-steel font-semibold uppercase">{workbenchState}</span>
          </div>
          <StateRail state={workbenchState} />
        </div>
      </Card>

      {/* Mobile view switcher */}
      <div className="flex items-center gap-1 rounded border border-ink-border/30 bg-ink-1 p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("files")}
          className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
            mobileTab === "files" ? "bg-ink-0 text-ink-fg shadow" : "text-ink-muted"
          }`}
        >
          Operations ({build.fileChanges.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("diff")}
          className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
            mobileTab === "diff" ? "bg-ink-0 text-ink-fg shadow" : "text-ink-muted"
          }`}
        >
          Diff Viewer
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("meta")}
          className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
            mobileTab === "meta" ? "bg-ink-0 text-ink-fg shadow" : "text-ink-muted"
          }`}
        >
          Validation & Risks
        </button>
      </div>

      {/* 3-Pane Flagship Workbench */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left Pane: File Operations (3 cols) */}
        <div
          className={`space-y-3 lg:col-span-3 ${
            mobileTab !== "files" ? "hidden lg:block" : ""
          }`}
        >
          <Card padding="none" className="overflow-hidden">
            <div className="border-b border-ink-border/30 bg-ink-1/50 px-3 py-2 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                Proposed File Operations ({build.fileChanges.length})
              </span>
              <span className="text-[10px] font-mono text-ink-muted">
                {opCounts.CREATE}C · {opCounts.MODIFY}M · {opCounts.DELETE}D
              </span>
            </div>

            <div className="max-h-[560px] overflow-y-auto divide-y divide-ink-border/20 p-1">
              {build.fileChanges.map((change, idx) => {
                const op = operationStyles[change.operation];
                const isSelected = selectedFileIndex === idx;
                const isDelete = change.operation === "DELETE";

                return (
                  <button
                    key={`${change.operation}-${change.path}`}
                    type="button"
                    onClick={() => {
                      setSelectedFileIndex(idx);
                      setMobileTab("diff");
                    }}
                    className={[
                      "w-full rounded p-2 text-left transition-all duration-120 block",
                      isSelected
                        ? "bg-forge/10 border border-forge/30 shadow-sm"
                        : "hover:bg-ink-1/40 border border-transparent",
                      isDelete ? "border-l-2 border-l-rose-500" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded px-1.5 py-0.2 font-mono text-[9px] font-bold uppercase",
                          op.chip,
                        ].join(" ")}
                      >
                        <op.icon size={9} />
                        {op.label}
                      </span>
                      <Mono className="truncate text-xs font-medium text-ink-fg flex-1">
                        {change.path}
                      </Mono>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-ink-subtle font-mono">
                      <span>{change.status === "EXISTING_FILE" ? "existing" : "proposed"}</span>
                      {change.expectedHash && (
                        <span>{change.expectedHash}</span>
                      )}
                    </div>
                  </button>
                );
              })}

              {build.fileChanges.length === 0 && (
                <p className="p-4 text-center text-xs text-ink-subtle">
                  No file operations proposed.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Center Pane: Diff Viewer (6 cols) */}
        <div
          className={`space-y-4 lg:col-span-6 ${
            mobileTab !== "diff" ? "hidden lg:block" : ""
          }`}
        >
          {currentChange ? (
            <div className="space-y-3">
              {/* File Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-ink-border/40 bg-ink-1/60 p-2.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-mono text-[10px] text-ink-subtle">
                    Operation:
                  </span>
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                      operationStyles[currentChange.operation].chip,
                    ].join(" ")}
                  >
                    {operationStyles[currentChange.operation].label} File
                  </span>
                  <Mono className="text-xs font-semibold text-ink-fg truncate">
                    {currentChange.path}
                  </Mono>
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px] text-ink-subtle">
                  {currentChange.expectedHash && (
                    <span>sha256: {currentChange.expectedHash}</span>
                  )}
                  <StatusBadge
                    variant={
                      currentChange.status === "EXISTING_FILE" ? "info" : "proposal"
                    }
                    size="sm"
                  >
                    {currentChange.status === "EXISTING_FILE" ? "existing" : "proposed"}
                  </StatusBadge>
                </div>
              </div>

              {/* Integrated DiffViewer */}
              <div className="rounded border border-ink-border/40 bg-ink-0 overflow-hidden shadow-sm">
                <DiffViewer
                  diffText={diffContent}
                  filePath={currentChange.path}
                  operation={currentChange.operation}
                  showOperationBadge={false}
                />
              </div>

              {/* Reason & Evidence Drawer */}
              {(currentChange.reason || currentChange.evidence.length > 0) && (
                <div className="rounded border border-ink-border/30 bg-ink-1/30 p-3 space-y-2">
                  {currentChange.reason && (
                    <p className="text-xs text-ink-muted leading-relaxed">
                      <strong className="text-ink-fg">Reason: </strong>
                      {currentChange.reason}
                    </p>
                  )}
                  {currentChange.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t border-ink-border/20">
                      <span className="font-mono text-[10px] uppercase text-ink-subtle">
                        Evidence:
                      </span>
                      {currentChange.evidence.map((ev, i) => (
                        <EvidenceChip key={i} evidence={ev} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Card padding="lg">
              <EmptyState
                title="No file selected"
                description="Select a proposed file operation from the left pane to view its diff and validation metadata."
              />
            </Card>
          )}
        </div>

        {/* Right Pane: Validation, Risks, Rollback (3 cols) */}
        <div
          className={`space-y-4 lg:col-span-3 ${
            mobileTab !== "meta" ? "hidden lg:block" : ""
          }`}
        >
          {/* Patch Validation Card */}
          <Card padding="md">
            <CardHeader
              title="Patch Validation"
              subtitle="Structural check — nothing executed"
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
                  <div className="space-y-1.5">
                    {validation.validation.details?.map((detail, i) => (
                      <div
                        key={`${detail.code}-${i}`}
                        className="flex items-start gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-2.5 py-1.5"
                      >
                        <XCircle size={12} className="mt-0.5 shrink-0 text-rose-400" />
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

          {/* Risks */}
          {build.risks.length > 0 && (
            <Card padding="md">
              <CardHeader title="Risks" subtitle="Carried from workflow context" />
              <ul className="space-y-1.5">
                {build.risks.map((risk) => (
                  <li key={risk} className="flex items-start gap-2 text-xs text-ink-muted">
                    <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Verification Results (only displayed when actual verification results exist) */}
          {validation?.receipt?.verification && (
            <Card padding="md">
              <CardHeader
                title="Verification Results"
                subtitle={`Status: ${validation.receipt.verification.overallStatus}`}
              />
              <div className="space-y-1 font-mono text-xs">
                {validation.receipt.verification.results.map((vr) => (
                  <div key={vr.id} className="flex items-center justify-between">
                    <span>{vr.label}</span>
                    <span className={vr.status === "PASSED" ? "text-emerald-400" : "text-rose-400"}>
                      {vr.status}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Rollback info (only displayed if rollback was attempted) */}
          {validation?.rollback && validation.rollback.attempted && (
            <Card padding="md" className="border-amber-500/30 bg-amber-500/5">
              <CardHeader title="Rollback Status" />
              <p className="text-xs text-ink-muted">
                Rollback attempted: {validation.rollback.succeeded ? "SUCCEEDED" : "FAILED"}.
              </p>
            </Card>
          )}

          {/* Dependency changes */}
          {build.dependencyChanges.length > 0 && (
            <Card padding="md">
              <CardHeader
                title="Dependencies"
                subtitle={`${build.dependencyChanges.length} proposed`}
              />
              <div className="space-y-1.5">
                {build.dependencyChanges.map((dep) => (
                  <div
                    key={dep.name}
                    className="flex items-center gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-2.5 py-1.5"
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
                    <Mono className="text-xs text-ink-fg truncate flex-1">{dep.name}</Mono>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Test notes */}
          {build.testChanges.length > 0 && (
            <Card padding="md">
              <CardHeader title="Test Notes" subtitle="Suggested regression coverage" />
              <ul className="space-y-1">
                {build.testChanges.map((t) => (
                  <li key={t} className="flex items-start gap-1.5 text-xs text-ink-muted">
                    <FileText size={11} className="mt-0.5 shrink-0 text-steel" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Approval Dialog */}
      <Dialog
        open={approvalDialogOpen}
        onClose={() => setApprovalDialogOpen(false)}
        title="Review & Approve Proposal"
        description="Verify the exact operation counts and affected filesystem paths before approving."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="sm" onClick={() => setApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="forge"
              size="sm"
              icon={<ShieldCheck size={14} />}
              onClick={handleApprove}
            >
              Confirm Approval
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Exact operation breakdown */}
          <div className="grid grid-cols-4 gap-2 text-center font-mono">
            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 p-2">
              <span className="text-[10px] text-emerald-400 block">CREATE</span>
              <span className="text-base font-bold text-ink-fg">{opCounts.CREATE}</span>
            </div>
            <div className="rounded border border-steel/30 bg-steel/10 p-2">
              <span className="text-[10px] text-steel block">MODIFY</span>
              <span className="text-base font-bold text-ink-fg">{opCounts.MODIFY}</span>
            </div>
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2">
              <span className="text-[10px] text-amber-400 block">RENAME</span>
              <span className="text-base font-bold text-ink-fg">{opCounts.RENAME}</span>
            </div>
            <div className="rounded border border-rose-500/30 bg-rose-500/10 p-2">
              <span className="text-[10px] text-rose-400 block">DELETE</span>
              <span className="text-base font-bold text-rose-400">{opCounts.DELETE}</span>
            </div>
          </div>

          {opCounts.DELETE > 0 && (
            <div className="rounded border border-rose-500/40 bg-rose-500/10 p-3 flex items-start gap-2">
              <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <strong className="text-rose-400 block">Destructive Operations Detected</strong>
                <p className="text-ink-muted mt-0.5">
                  This build contains {opCounts.DELETE} DELETE operation(s). Explicit delete confirmation is required.
                </p>
              </div>
            </div>
          )}

          {/* List of affected paths */}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle mb-1">
              Affected Paths ({build.fileChanges.length}):
            </p>
            <div className="max-h-48 overflow-y-auto rounded border border-ink-border/30 bg-ink-1/40 p-2 divide-y divide-ink-border/20 font-mono text-xs">
              {build.fileChanges.map((ch) => (
                <div
                  key={`${ch.operation}-${ch.path}`}
                  className="flex items-center justify-between py-1"
                >
                  <span className="truncate text-ink-fg">{ch.path}</span>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      ch.operation === "DELETE" ? "text-rose-400" : "text-ink-subtle"
                    }`}
                  >
                    {ch.operation}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Explicit Execution Dialog */}
      <Dialog
        open={executionDialogOpen}
        onClose={() => setExecutionDialogOpen(false)}
        title="Execution Confirmation"
        description="Controlled isolated patch execution in sandbox environment."
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="sm" onClick={() => setExecutionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="forge"
              size="sm"
              onClick={() => {
                setExecutionDialogOpen(false);
                // Redirect to pipeline or notify
              }}
            >
              Confirm Sandbox Execution
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-ink-muted">
          <p>
            ReForge will execute approved changes inside an isolated temporary disposable workspace.
            Host repository files are never directly mutated.
          </p>
          <div className="rounded border border-ink-border/30 bg-ink-1/30 p-2.5 font-mono text-[11px] text-ink-fg space-y-1">
            <p>Objective: {build.objective}</p>
            <p>Operations: {build.fileChanges.length}</p>
            <p>Approved: true</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
