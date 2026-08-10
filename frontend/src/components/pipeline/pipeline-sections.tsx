import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Mono } from "@/components/ui/mono";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import type {
  AnalysisReport,
  BuildPlan,
  ChangeImpactReport,
  DiffSummary,
  ExecutionReceipt,
  FileOperation,
  Plan,
  PlanTask,
  VerificationResult,
} from "@/lib/api/types";
import { formatDateTime, shortId } from "@/lib/utils/format";
import {
  executionStatusLabel,
  executionStatusVariant,
  verificationLabel,
  verificationVariant,
} from "@/lib/utils/status";

// ── Shared primitives ─────────────────────────────────────────────────────────

export function SectionHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden="true" className="h-4 w-0.5 rounded bg-forge" />
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-widest text-forge">
          {kicker}
        </p>
        <h2 className="text-base font-semibold tracking-tight text-ink-fg">
          {title}
        </h2>
        {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
        {label}
      </dt>
      <dd className="min-w-0 text-right">{value}</dd>
    </div>
  );
}

function EvidenceList({ evidence }: { evidence: { file: string; detail: string }[] }) {
  if (evidence.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {evidence.map((ev, i) => (
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
  );
}

const fileOpStyles: Record<
  FileOperation,
  { chip: string; icon: typeof Plus; label: string }
> = {
  CREATE: {
    chip: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    icon: Plus,
    label: "CREATE",
  },
  MODIFY: {
    chip: "border-steel/30 bg-steel/10 text-steel",
    icon: Pencil,
    label: "MODIFY",
  },
  DELETE: {
    chip: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    icon: Trash2,
    label: "DELETE",
  },
  RENAME: {
    chip: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    icon: RotateCcw,
    label: "RENAME",
  },
};

// ── 1 · Analysis summary (collapsible) ────────────────────────────────────────

export function AnalysisSection({ report }: { report: AnalysisReport }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        kicker="04 · Analysis"
        title="Analysis Summary"
        subtitle="Deterministic report produced for this pipeline"
      />
      <Card padding="none">
        <CardHeader
          title="Analysis"
          subtitle={`${report.overview.fileCount} files · ${report.languages.length} languages · ${report.frameworks.length} frameworks`}
        />
        <div className="space-y-3 px-4 pb-4 text-sm">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Files" value={report.overview.fileCount} />
            <MiniStat
              label="Analyzable"
              value={report.overview.analyzableFileCount}
            />
            <MiniStat label="Languages" value={report.languages.length} />
            <MiniStat
              label="Doctor Score"
              value={report.doctor ? `${report.doctor.healthScore}/100` : "—"}
            />
          </div>
          <details className="rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
              Languages
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.languages.map((lang) => (
                <span
                  key={lang.name}
                  className="rounded border border-ink-border/30 bg-ink-1/40 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
                >
                  {lang.name}
                </span>
              ))}
            </div>
          </details>
          <details className="rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
              Frameworks
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {report.frameworks.map((fw) => (
                <span
                  key={fw.name}
                  className="rounded border border-ink-border/30 bg-ink-1/40 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
                >
                  {fw.name}
                </span>
              ))}
            </div>
          </details>
          {report.risks.length > 0 && (
            <details className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-amber-400">
                Risks ({report.risks.length})
              </summary>
              <ul className="mt-2 space-y-1">
                {report.risks.map((risk) => (
                  <li
                    key={risk.name}
                    className="flex items-start gap-1.5 text-xs text-ink-muted"
                  >
                    <AlertTriangle
                      size={10}
                      className="mt-0.5 shrink-0 text-amber-400"
                    />
                    {risk.name}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Card>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded border border-ink-border/40 bg-ink-card/60 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold leading-tight text-ink-fg">
        {value}
      </p>
    </div>
  );
}

// ── 2 · Plan ──────────────────────────────────────────────────────────────────

const priorityVariant: Record<PlanTask["priority"], StatusVariant> = {
  CRITICAL: "critical",
  HIGH: "failed",
  MEDIUM: "warning",
  LOW: "info",
};

export function PlanSection({ plan }: { plan: Plan }) {
  const orderMap = new Map(plan.orderedTaskIds.map((id, i) => [id, i + 1]));

  return (
    <section className="space-y-4">
      <SectionHeading
        kicker="05 · Plan"
        title="Improvement Plan"
        subtitle={`${plan.tasks.length} tasks · ${plan.risks.length} risks · ${plan.assumptions.length} assumptions`}
      />
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-ink-fg">
            {plan.objective}
          </h3>
          <StatusBadge variant={plan.validation.valid ? "healthy" : "failed"}>
            {plan.validation.valid ? "Valid" : "Invalid"}
          </StatusBadge>
        </div>
        {plan.orderedTaskIds.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {plan.orderedTaskIds.map((taskId, i) => {
              const task = plan.tasks.find((t) => t.id === taskId);
              return (
                <span
                  key={taskId}
                  className="flex items-center gap-1.5 rounded border border-ink-border/40 bg-ink-1/50 px-2 py-1 text-xs"
                >
                  <span className="font-mono text-forge">{i + 1}.</span>
                  <span className="max-w-[220px] truncate text-ink-fg">
                    {task?.title ?? taskId}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </Card>
      <div className="space-y-2">
        {plan.tasks.map((task) => (
          <TaskCard key={task.id} task={task} order={orderMap.get(task.id)} />
        ))}
      </div>
      {plan.risks.length > 0 && (
        <Card padding="md">
          <CardHeader title="Risks" subtitle={`${plan.risks.length} identified`} />
          <ul className="space-y-1.5">
            {plan.risks.map((risk) => (
              <li
                key={risk.title}
                className="flex items-start gap-2 text-xs text-ink-muted"
              >
                <AlertTriangle size={10} className="mt-0.5 shrink-0 text-amber-400" />
                <span>
                  {risk.title} — {risk.mitigation}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {plan.assumptions.length > 0 && (
        <Card padding="md" className="border-ink-border/30">
          <CardHeader title="Assumptions" subtitle="Plan assumptions" />
          <ul className="space-y-1">
            {plan.assumptions.map((a) => (
              <li
                key={a}
                className="flex items-start gap-1.5 text-xs text-ink-muted"
              >
                <ChevronRight size={10} className="mt-0.5 shrink-0 text-ink-subtle" />
                {a}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {plan.unresolvedQuestions.length > 0 && (
        <Card padding="md" className="border-amber-500/20">
          <CardHeader title="Open Questions" subtitle="Requires human judgment" />
          <ul className="space-y-1">
            {plan.unresolvedQuestions.map((q) => (
              <li
                key={q}
                className="flex items-start gap-1.5 text-xs text-amber-400"
              >
                <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                {q}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function TaskCard({ task, order }: { task: PlanTask; order?: number }) {
  return (
    <details className="group rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2">
      <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
        {order !== undefined && (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-forge/30 bg-forge/10 font-mono text-[10px] font-bold text-forge">
            {order}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink-fg">
          {task.title}
        </span>
        <Mono className="shrink-0 text-ink-subtle">{task.id}</Mono>
        <StatusBadge variant={priorityVariant[task.priority]} size="sm">
          {task.priority}
        </StatusBadge>
        <ChevronRight
          size={12}
          className="shrink-0 text-ink-subtle transition-transform group-open:rotate-90"
        />
      </summary>
      <div className="mt-2 space-y-3">
        <p className="text-xs leading-relaxed text-ink-muted">{task.objective}</p>
        {task.affectedModules.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.affectedModules.map((m) => (
              <Mono
                key={m}
                className="border border-steel/20 bg-steel/5 text-[10px] text-steel"
              >
                {m}
              </Mono>
            ))}
          </div>
        )}
        {task.dependencies.length > 0 && (
          <p className="text-xs text-ink-subtle">
            Depends on: {task.dependencies.join(", ")}
          </p>
        )}
        {task.acceptanceCriteria.length > 0 && (
          <ul className="space-y-1">
            {task.acceptanceCriteria.map((c) => (
              <li
                key={c}
                className="flex items-start gap-1.5 text-xs text-ink-muted"
              >
                <ShieldCheck size={10} className="mt-0.5 shrink-0 text-emerald-400" />
                {c}
              </li>
            ))}
          </ul>
        )}
        {task.verification.length > 0 && (
          <ul className="space-y-1">
            {task.verification.map((v) => (
              <li
                key={v}
                className="flex items-start gap-1.5 text-xs text-steel"
              >
                <FileText size={10} className="mt-0.5 shrink-0" />
                {v}
              </li>
            ))}
          </ul>
        )}
        <EvidenceList evidence={task.evidence} />
      </div>
    </details>
  );
}

// ── 3 · Impact ────────────────────────────────────────────────────────────────

const impactVariant: Record<
  ChangeImpactReport["impactLevel"],
  StatusVariant
> = {
  LOW: "info",
  MEDIUM: "warning",
  HIGH: "failed",
  CRITICAL: "critical",
};

export function ImpactSection({ impact }: { impact: ChangeImpactReport }) {
  return (
    <section className="space-y-4">
      <SectionHeading
        kicker="06 · Impact"
        title="Change Impact"
        subtitle={`${impact.impactLevel} impact · ${impact.confidence} confidence`}
      />
      <Card padding="lg">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant={impactVariant[impact.impactLevel]}>
            {impact.impactLevel} Impact
          </StatusBadge>
          <span className="text-xs text-ink-muted">
            Confidence: {impact.confidence}
          </span>
        </div>
        <p className="mt-4 mb-2 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
          Blast Radius
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <BlastMetric label="Direct" value={impact.blastRadius.directModules} />
          <BlastMetric label="Indirect" value={impact.blastRadius.indirectModules} />
          <BlastMetric label="API" value={impact.blastRadius.apiRoutes} />
          <BlastMetric label="Deps" value={impact.blastRadius.dependencies} />
          <BlastMetric label="Tests" value={impact.blastRadius.relatedTests} />
          <BlastMetric label="Doctor" value={impact.blastRadius.doctorFindings} />
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="none">
          <CardHeader
            title="Directly Affected"
            subtitle={`${impact.directModules.length} modules`}
          />
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {impact.directModules.map((m) => (
              <Mono key={m} className="border border-steel/30 bg-steel/10 text-[10px] text-steel">
                {m}
              </Mono>
            ))}
          </div>
        </Card>
        <Card padding="none">
          <CardHeader
            title="Indirectly Affected"
            subtitle={`${impact.indirectModules.length} modules`}
          />
          <div className="flex flex-wrap gap-1.5 px-4 pb-4">
            {impact.indirectModules.map((m) => (
              <Mono key={m} className="border border-ink-border/30 bg-ink-1/40 text-[10px] text-ink-muted">
                {m}
              </Mono>
            ))}
          </div>
        </Card>
      </div>
      {impact.relationships.length > 0 && (
        <Card padding="md">
          <CardHeader title="Relationships" subtitle="Modeled module graph" />
          <div className="space-y-1.5">
            {impact.relationships.map((rel, i) => (
              <div
                key={`${rel.from}-${rel.to}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-1.5 font-mono text-[11px]"
              >
                <span className="text-steel">{rel.from}</span>
                <ChevronRight size={10} className="text-ink-subtle" />
                <span className="text-ink-fg">{rel.to}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-ink-subtle">
                  {rel.type}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
      {impact.risks.length > 0 && (
        <Card padding="md">
          <CardHeader title="Risks" subtitle={`${impact.risks.length} identified`} />
          <div className="space-y-2">
            {impact.risks.map((risk, i) => (
              <div key={`${risk.title}-${i}`} className="flex items-start gap-2">
                <AlertTriangle size={11} className="mt-0.5 shrink-0 text-rose-400" />
                <div className="min-w-0">
                  <p className="text-sm text-ink-fg">{risk.title}</p>
                  <EvidenceList evidence={risk.evidence} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      {impact.recommendations.length > 0 && (
        <Card padding="md">
          <CardHeader title="Recommendations" subtitle="Suggested actions" />
          <div className="space-y-2">
            {impact.recommendations.map((rec) => (
              <div key={rec} className="flex items-start gap-2 text-sm text-ink-fg">
                <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-400" />
                {rec}
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

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

// ── 4 · Build (PROPOSED vs APPLIED) ───────────────────────────────────────────

export function BuildSection({
  build,
  receipt,
}: {
  build: BuildPlan;
  receipt?: ExecutionReceipt;
}) {
  const appliedPaths = new Set(
    (receipt?.appliedOperations ?? [])
      .filter((op) => op.applied)
      .map((op) => op.path),
  );

  return (
    <section className="space-y-4">
      <SectionHeading
        kicker="07 · Build"
        title="Build Plan"
        subtitle={
          receipt
            ? "Proposed vs applied operations"
            : "Proposed changes only — nothing executed"
        }
      />
      <Card padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={build.validation.valid ? "healthy" : "failed"}>
              {build.validation.valid ? "Valid Build" : "Invalid Build"}
            </StatusBadge>
            <span className="text-xs text-ink-muted">
              {build.fileChanges.length} file operation
              {build.fileChanges.length === 1 ? "" : "s"} ·{" "}
              {build.dependencyChanges.length} dependency change
              {build.dependencyChanges.length === 1 ? "" : "s"}
            </span>
          </div>
          {receipt && (
            <StatusBadge
              variant={receipt.status === "SUCCEEDED" ? "succeeded" : "failed"}
            >
              {receipt.status === "SUCCEEDED" ? "Applied" : "Not Applied"}
            </StatusBadge>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-muted">{build.objective}</p>
        {!build.validation.valid && build.validation.errors.length > 0 && (
          <ul className="mt-3 space-y-1">
            {build.validation.errors.map((err) => (
              <li key={err} className="flex items-start gap-1.5 text-xs text-rose-400">
                <XCircle size={10} className="mt-0.5 shrink-0" />
                {err}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="space-y-2">
        {build.fileChanges.map((change) => {
          const op = fileOpStyles[change.operation];
          const applied = appliedPaths.has(change.path);
          return (
            <div
              key={`${change.operation}-${change.path}`}
              className="rounded border border-ink-border/30 bg-ink-1/30 p-3"
            >
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
                <StatusBadge
                  variant={change.status === "EXISTING_FILE" ? "info" : "proposal"}
                  size="sm"
                >
                  {change.status === "EXISTING_FILE" ? "existing" : "proposed"}
                </StatusBadge>
                {receipt && (
                  <StatusBadge
                    variant={applied ? "succeeded" : "muted"}
                    size="sm"
                  >
                    {applied ? "applied" : "proposed"}
                  </StatusBadge>
                )}
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
              <EvidenceList evidence={change.evidence} />
            </div>
          );
        })}
        {build.fileChanges.length === 0 && (
          <p className="text-xs text-ink-subtle">No file operations proposed.</p>
        )}
      </div>

      {build.dependencyChanges.length > 0 && (
        <Card padding="md">
          <CardHeader
            title="Dependency Changes"
            subtitle={`${build.dependencyChanges.length} proposed`}
          />
          <div className="space-y-1.5">
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

      {build.testChanges.length > 0 && (
        <Card padding="md">
          <CardHeader title="Test Notes" subtitle="Suggested test focus" />
          <ul className="space-y-1">
            {build.testChanges.map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-xs text-ink-muted">
                <FileText size={10} className="mt-0.5 shrink-0 text-steel" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {build.risks.length > 0 && (
        <Card padding="md">
          <CardHeader title="Risks" subtitle="Carried from workflow context" />
          <ul className="space-y-1">
            {build.risks.map((risk) => (
              <li key={risk} className="flex items-start gap-1.5 text-xs text-ink-muted">
                <AlertTriangle size={10} className="mt-0.5 shrink-0 text-amber-400" />
                {risk}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {build.assumptions.length > 0 && (
        <Card padding="md" className="border-ink-border/30">
          <CardHeader title="Assumptions" subtitle="Build assumptions" />
          <ul className="space-y-1">
            {build.assumptions.map((a) => (
              <li key={a} className="flex items-start gap-1.5 text-xs text-ink-muted">
                <CheckCircle2 size={10} className="mt-0.5 shrink-0 text-steel" />
                {a}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

// ── 5 · Execution receipt ─────────────────────────────────────────────────────

export function ExecutionSection({ receipt }: { receipt: ExecutionReceipt }) {
  const executed =
    receipt.status === "SUCCEEDED" ||
    receipt.status === "FAILED" ||
    receipt.status === "ROLLED_BACK";

  return (
    <section className="space-y-4">
      <SectionHeading
        kicker="08 · Execution"
        title="Execution Receipt"
        subtitle={`${receipt.executionId} · snapshot ${shortId(receipt.snapshotId, 10)}`}
      />
      <Card padding="lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={executionStatusVariant(receipt.status)}>
              {executionStatusLabel(receipt.status)}
            </StatusBadge>
            <span className="text-xs text-ink-muted">
              approved = {String(receipt.approved)}
            </span>
          </div>
          <StatusBadge
            variant={receipt.workspaceCleanupStatus === "SUCCESS" ? "succeeded" : "failed"}
            size="sm"
          >
            cleanup {receipt.workspaceCleanupStatus}
          </StatusBadge>
        </div>
        <dl className="mt-4 space-y-2">
          <Detail
            label="Execution ID"
            value={<Mono className="text-ink-fg">{receipt.executionId}</Mono>}
          />
          <Detail
            label="Snapshot ID"
            value={<Mono className="text-ink-fg">{receipt.snapshotId}</Mono>}
          />
          <Detail
            label="Approval"
            value={
              <span
                className={
                  receipt.approved ? "text-emerald-400" : "text-ink-muted"
                }
              >
                {receipt.approved ? "Approved" : "Not approved"}
              </span>
            }
          />
          <Detail
            label="Operations"
            value={
              <span className="text-ink-fg">
                {receipt.appliedOperations.length} applied of{" "}
                {receipt.operations.length}
              </span>
            }
          />
          <Detail
            label="Started"
            value={<span className="text-ink-muted">{formatDateTime(receipt.createdAt)}</span>}
          />
          <Detail
            label="Completed"
            value={<span className="text-ink-muted">{formatDateTime(receipt.completedAt)}</span>}
          />
        </dl>
        {!executed && receipt.status === "PENDING" && (
          <p className="mt-4 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2 text-xs text-ink-muted">
            Patches were not applied — this run produced a proposal only.
          </p>
        )}
      </Card>

      {receipt.appliedOperations.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Applied Operations"
            subtitle={`${receipt.appliedOperations.length} operations`}
          />
          <div className="space-y-1.5 px-4 pb-4">
            {receipt.appliedOperations.map((op, i) => {
              const styles = fileOpStyles[op.operation];
              return (
                <div
                  key={`${op.path}-${i}`}
                  className={[
                    "flex flex-wrap items-center gap-2 rounded border px-3 py-2",
                    op.result === "SUCCESS"
                      ? "border-emerald-500/20 bg-emerald-500/5"
                      : "border-rose-500/20 bg-rose-500/5",
                  ].join(" ")}
                >
                  <styles.icon size={12} />
                  <Mono className="min-w-0 flex-1 text-xs text-ink-fg">
                    {op.path}
                  </Mono>
                  <StatusBadge
                    variant={op.result === "SUCCESS" ? "succeeded" : "failed"}
                    size="sm"
                  >
                    {op.result ?? (op.applied ? "APPLIED" : "SKIPPED")}
                  </StatusBadge>
                  {op.error && (
                    <span className="text-[10px] text-rose-400">{op.error}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </section>
  );
}

// ── 6 · Verification ──────────────────────────────────────────────────────────

export function VerificationSection({
  verification,
}: {
  verification?: VerificationResult;
}) {
  if (!verification) {
    return (
      <section className="space-y-4">
        <SectionHeading kicker="10 · Verification" title="Verification" />
        <Card padding="lg">
          <StatusBadge variant="muted">Not Run</StatusBadge>
          <p className="mt-2 text-xs text-ink-muted">
            Verification was not requested for this run.
          </p>
        </Card>
      </section>
    );
  }

  if (!verification.attempted) {
    return (
      <section className="space-y-4">
        <SectionHeading kicker="10 · Verification" title="Verification" />
        <Card padding="lg">
          <StatusBadge variant="muted">Not Run</StatusBadge>
          <p className="mt-2 text-xs text-ink-muted">
            Verification was not attempted.
          </p>
        </Card>
      </section>
    );
  }

  const status = verification.overallStatus;

  return (
    <section className="space-y-4">
      <SectionHeading
        kicker="10 · Verification"
        title="Verification"
        subtitle={verificationLabel(status)}
      />
      <Card padding="lg">
        <StatusBadge variant={verificationVariant(status)}>
          {status}
        </StatusBadge>
        <div className="mt-4 space-y-2">
          {verification.results.map((result) => (
            <div
              key={result.id}
              className="rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-ink-fg">
                  {result.label}
                </span>
                <StatusBadge variant={verificationVariant(result.status)} size="sm">
                  {result.status}
                </StatusBadge>
                <span className="ml-auto font-mono text-[10px] text-ink-subtle">
                  {result.durationMs}ms
                  {result.exitCode !== undefined &&
                    result.exitCode !== null &&
                    ` · exit ${result.exitCode}`}
                </span>
              </div>
              {result.error && (
                <p className="mt-1.5 text-xs text-rose-400">{result.error}</p>
              )}
              {result.stdout && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-wider text-ink-subtle">
                    stdout
                    {result.outputTruncated ? " (truncated)" : ""}
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto rounded border border-ink-border/20 bg-ink-0/60 p-2 font-mono text-[10px] text-ink-muted">
                    {result.stdout}
                  </pre>
                </details>
              )}
              {result.stderr && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-wider text-rose-400">
                    stderr
                    {result.outputTruncated ? " (truncated)" : ""}
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto rounded border border-rose-500/20 bg-ink-0/60 p-2 font-mono text-[10px] text-rose-400">
                    {result.stderr}
                  </pre>
                </details>
              )}
            </div>
          ))}
          {verification.results.length === 0 && (
            <p className="text-xs text-ink-subtle">
              No verification results were returned.
            </p>
          )}
        </div>
      </Card>
    </section>
  );
}

// ── 7 · Rollback ──────────────────────────────────────────────────────────────

export function RollbackSection({
  receipt,
}: {
  receipt?: ExecutionReceipt;
}) {
  const rolledBack = receipt?.status === "ROLLED_BACK";
  const attempted = receipt?.rollback.attempted ?? false;
  const succeeded = receipt?.rollback.succeeded ?? false;

  return (
    <section className="space-y-4">
      <SectionHeading kicker="09 · Rollback" title="Rollback" />
      {rolledBack ? (
        <Card padding="lg" className="border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <RotateCcw size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <StatusBadge variant="rolled-back">Rollback Performed</StatusBadge>
              <p className="mt-2 text-xs text-ink-muted">
                Execution failed part-way and the receipt records a rollback
                that {succeeded ? "succeeded" : "failed"} (
                {receipt?.failedOperation?.path ?? "unknown operation"}).
              </p>
              {receipt?.failedOperation?.error && (
                <p className="mt-2 font-mono text-[11px] text-rose-400">
                  {receipt.failedOperation.error}
                </p>
              )}
            </div>
          </div>
        </Card>
      ) : attempted ? (
        <Card padding="lg" className="border-amber-500/30 bg-amber-500/5">
          <p className="text-xs text-ink-muted">
            Rollback was attempted and {succeeded ? "succeeded" : "failed"}.
          </p>
        </Card>
      ) : (
        <Card padding="lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <p className="text-xs text-ink-muted">
              No rollback was required — the run completed without a rollback
              event.
            </p>
          </div>
        </Card>
      )}
    </section>
  );
}

// ── 8 · Diff summary ──────────────────────────────────────────────────────────

export function DiffSummarySection({ diff }: { diff: DiffSummary }) {
  const rows: { label: string; count: number; color: string; items: string[] }[] =
    [
      {
        label: "CREATE",
        count: diff.created.length,
        color: "text-emerald-400",
        items: diff.created,
      },
      {
        label: "MODIFY",
        count: diff.modified.length,
        color: "text-steel",
        items: diff.modified,
      },
      {
        label: "RENAME",
        count: diff.renamed.length,
        color: "text-amber-400",
        items: diff.renamed.map((r) => `${r.from} → ${r.to}`),
      },
      {
        label: "DELETE",
        count: diff.deleted.length,
        color: "text-rose-400",
        items: diff.deleted,
      },
    ];

  return (
    <section className="space-y-4">
      <SectionHeading kicker="11 · Diff" title="Diff Summary" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="diff-summary">
        {rows.map((row) => (
          <Card key={row.label} padding="md">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
              {row.label}
            </p>
            <p className={["mt-1 text-2xl font-bold", row.color].join(" ")}>
              {row.count}
            </p>
            {row.items.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer font-mono text-[9px] uppercase tracking-wider text-ink-subtle">
                  paths
                </summary>
                <div className="mt-1.5 max-h-32 space-y-0.5 overflow-y-auto">
                  {row.items.map((item) => (
                    <Mono key={item} className="block text-[10px] text-ink-muted">
                      {item}
                    </Mono>
                  ))}
                </div>
              </details>
            )}
          </Card>
        ))}
      </div>
      {diff.failed.length > 0 && (
        <Card padding="md" className="border-rose-500/20 bg-rose-500/5">
          <CardHeader
            title="Failed Operations"
            subtitle={`${diff.failed.length} failed`}
          />
          <div className="space-y-0.5">
            {diff.failed.map((path) => (
              <Mono key={path} className="block text-[10px] text-rose-400">
                {path}
              </Mono>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

// ── 9 · Provenance / audit ────────────────────────────────────────────────────

export function ProvenanceSection({
  pipelineId,
  result,
}: {
  pipelineId: string;
  result: {
    snapshot: { snapshotId: string };
    execution?: ExecutionReceipt;
    createdAt: string;
    completedAt: string;
  };
}) {
  const exec = result.execution;

  return (
    <section className="space-y-4">
      <SectionHeading kicker="12 · Provenance" title="Technical Details" />
      <Card padding="md">
        <details>
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
            Pipeline identifiers &amp; timestamps
          </summary>
          <dl className="mt-3 space-y-2">
            <Detail
              label="Pipeline ID"
              value={<Mono className="text-ink-fg">{pipelineId}</Mono>}
            />
            <Detail
              label="Snapshot ID"
              value={<Mono className="text-ink-fg">{result.snapshot.snapshotId}</Mono>}
            />
            {exec && (
              <Detail
                label="Execution ID"
                value={<Mono className="text-ink-fg">{exec.executionId}</Mono>}
              />
            )}
            {exec && (
              <Detail
                label="Source"
                value={
                  <Mono className="text-ink-fg">
                    {exec.provenance.source.kind}
                    {exec.provenance.source.reference
                      ? ` · ${exec.provenance.source.reference}`
                      : ""}
                  </Mono>
                }
              />
            )}
            <Detail
              label="Created"
              value={<span className="text-ink-muted">{formatDateTime(result.createdAt)}</span>}
            />
            <Detail
              label="Completed"
              value={<span className="text-ink-muted">{formatDateTime(result.completedAt)}</span>}
            />
          </dl>
        </details>
      </Card>
      <p className="flex items-center gap-1.5 text-[10px] text-ink-subtle">
        <Clock size={10} />
        Last refreshed at render time — use Refresh to re-fetch from the backend.
      </p>
    </section>
  );
}
