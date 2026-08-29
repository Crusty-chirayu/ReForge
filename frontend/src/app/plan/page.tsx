"use client";

import { useCallback, useState } from "react";
import {
  AlertTriangle,
  ChevronRight,
  FileText,
  Loader2,
  ShieldCheck,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { describeApiError } from "@/lib/utils/api-error";
import { Input } from "@/components/ui/input";
import { Mono } from "@/components/ui/mono";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { RequiresReport } from "@/components/workflow/requires-report";
import { WorkflowHeader } from "@/components/workflow/workflow-header";
import { generatePlan } from "@/lib/api";
import { useWorkflow } from "@/lib/context/workflow-context";
import { splitList, toError } from "@/lib/utils/workflow";
import type {
  AnalysisReport,
  Plan,
  PlanRisk,
  PlanTask,
} from "@/lib/api/types";

const priorityVariant: Record<PlanTask["priority"], StatusVariant> = {
  CRITICAL: "critical",
  HIGH: "failed",
  MEDIUM: "warning",
  LOW: "info",
};

const riskVariant: Record<PlanRisk["probability" | "impact"], StatusVariant> = {
  HIGH: "failed",
  MEDIUM: "warning",
  LOW: "info",
};

export default function PlanPage() {
  const { setPlan: savePlan } = useWorkflow();
  const [goal, setGoal] = useState("");
  const [constraints, setConstraints] = useState("");
  const [priorities, setPriorities] = useState("");
  const [desiredTechnology, setDesiredTechnology] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleGenerate = useCallback(
    async (report: AnalysisReport) => {
      if (!goal.trim()) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await generatePlan(goal.trim(), report, {
          constraints: splitList(constraints),
          priorities: splitList(priorities),
          desiredTechnology: desiredTechnology.trim() || undefined,
        });
        setPlan(res.plan);
        savePlan(res.plan);
      } catch (err) {
        setError(toError(err));
      } finally {
        setIsLoading(false);
      }
    },
    [goal, constraints, priorities, desiredTechnology, savePlan],
  );

  const canGenerate = goal.trim().length > 0 && !isLoading;

  return (
    <RequiresReport>
      {(report) => (
        <div className="space-y-6">
          <WorkflowHeader
            current="Plan"
            next={{ label: "Next: Impact", href: "/impact" }}
          />

          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-fg">
              Improvement Planning
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Generate a deterministic, evidence-backed improvement plan from
              your project analysis report.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Configuration */}
            <div className="space-y-4">
              <Card padding="lg">
                <CardHeader
                  title="Plan Configuration"
                  subtitle="Define the improvement goal"
                />
                <div className="space-y-4">
                  <Textarea
                    label="Improvement Goal"
                    placeholder="e.g. Reduce technical debt in the authentication module"
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value);
                      setError(null);
                    }}
                    className="min-h-[90px]"
                    disabled={isLoading}
                  />
                  <Input
                    label="Constraints"
                    hint="Comma or newline separated"
                    placeholder="e.g. No new dependencies, TypeScript only"
                    value={constraints}
                    onChange={(e) => setConstraints(e.target.value)}
                    disabled={isLoading}
                  />
                  <Input
                    label="Priorities"
                    hint="Comma or newline separated"
                    placeholder="e.g. Security, Performance"
                    value={priorities}
                    onChange={(e) => setPriorities(e.target.value)}
                    disabled={isLoading}
                  />
                  <Input
                    label="Desired Technology"
                    placeholder="e.g. PostgreSQL, Redis"
                    value={desiredTechnology}
                    onChange={(e) => setDesiredTechnology(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button
                    variant="forge"
                    size="md"
                    icon={<Target size={14} />}
                    onClick={() => void handleGenerate(report)}
                    loading={isLoading}
                    disabled={!canGenerate}
                  >
                    Generate Plan
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
                    <p className="text-sm text-ink-fg">Generating plan…</p>
                    <p className="text-xs text-ink-muted">
                      Mapping report findings to ordered improvement tasks
                    </p>
                  </div>
                </Card>
              )}

              {!isLoading && error && (
                <ErrorState
                  title="Unable to generate plan"
                  description={
                describeApiError(error, {
                  resource: "plan",
                  endpoint: "POST /v1/plan",
                }).description
              }
                  error={error}
                  onRetry={() => void handleGenerate(report)}
                />
              )}

              {!isLoading && !error && !plan && (
                <Card padding="lg">
                  <EmptyState
                    title="No plan generated yet"
                    description="Enter an improvement goal and generate a plan based on your analysis report."
                  />
                </Card>
              )}

              {!isLoading && !error && plan && (
                <PlanView plan={plan} onNew={() => setPlan(null)} />
              )}
            </div>
          </div>
        </div>
      )}
    </RequiresReport>
  );
}

// ── Plan view ─────────────────────────────────────────────────────────────────

function PlanView({ plan, onNew }: { plan: Plan; onNew: () => void }) {
  const orderMap = new Map(plan.orderedTaskIds.map((id, i) => [id, i + 1]));

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-forge/20 bg-forge/10 text-forge">
              <Target size={16} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink-fg">
                {plan.objective}
              </h2>
              <p className="mt-1 text-xs text-ink-muted">
                {plan.tasks.length} task{plan.tasks.length === 1 ? "" : "s"} ·{" "}
                {plan.risks.length} risk{plan.risks.length === 1 ? "" : "s"} ·{" "}
                {plan.assumptions.length} assumption
                {plan.assumptions.length === 1 ? "" : "s"}
                {plan.unresolvedQuestions.length > 0 &&
                  ` · ${plan.unresolvedQuestions.length} open question${
                    plan.unresolvedQuestions.length === 1 ? "" : "s"
                  }`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={plan.validation.valid ? "healthy" : "failed"}>
              {plan.validation.valid ? "Valid" : "Invalid"}
            </StatusBadge>
            <Button variant="ghost" size="sm" onClick={onNew}>
              New Plan
            </Button>
          </div>
        </div>
        {!plan.validation.valid && plan.validation.errors.length > 0 && (
          <div className="mt-4 rounded border border-rose-500/20 bg-rose-500/5 p-3">
            <p className="mb-1.5 text-xs font-medium text-rose-400">
              Validation issues
            </p>
            <ul className="space-y-1">
              {plan.validation.errors.map((err) => (
                <li key={err} className="flex items-start gap-1.5 text-xs text-ink-muted">
                  <AlertTriangle size={10} className="mt-0.5 shrink-0 text-rose-400" />
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Execution order */}
      {plan.orderedTaskIds.length > 0 && (
        <Card padding="md">
          <CardHeader title="Execution Order" subtitle="Recommended task sequence" />
          <div className="flex flex-wrap gap-1.5">
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
        </Card>
      )}

      {/* Tasks */}
      <Card padding="none">
        <CardHeader
          title="Tasks"
          subtitle={`${plan.tasks.length} task${plan.tasks.length === 1 ? "" : "s"} · ordered by priority`}
        />
        <div className="space-y-2 px-4 pb-4">
          {plan.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              order={orderMap.get(task.id)}
            />
          ))}
        </div>
      </Card>

      {/* Risks */}
      {plan.risks.length > 0 && (
        <Card padding="none">
          <CardHeader title="Risks" subtitle={`${plan.risks.length} identified`} />
          <div className="space-y-2 px-4 pb-4">
            {/*
              PlanRisk has no id, and risks are derived straight from Doctor
              findings — one rule reporting against several modules yields
              repeated titles (e.g. two "High fan-out module" risks). Keying on
              the title alone collides. The list is rendered in backend order
              and is never sorted or filtered client-side, so the index safely
              disambiguates duplicates.
            */}
            {plan.risks.map((risk, i) => (
              <div
                key={`${risk.title}-${i}`}
                className="flex items-start gap-3 rounded border border-amber-500/20 bg-amber-500/5 p-3"
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-fg">{risk.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">{risk.mitigation}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] text-ink-subtle">
                      Probability
                      <StatusBadge variant={riskVariant[risk.probability]} size="sm">
                        {risk.probability}
                      </StatusBadge>
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-ink-subtle">
                      Impact
                      <StatusBadge variant={riskVariant[risk.impact]} size="sm">
                        {risk.impact}
                      </StatusBadge>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Assumptions */}
      {plan.assumptions.length > 0 && (
        <Card padding="md">
          <CardHeader title="Assumptions" subtitle="Plan assumptions" />
          <ul className="space-y-1.5">
            {plan.assumptions.map((a) => (
              <li key={a} className="flex items-start gap-2 text-xs text-ink-muted">
                <ChevronRight size={10} className="mt-0.5 shrink-0 text-ink-subtle" />
                {a}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Open questions */}
      {plan.unresolvedQuestions.length > 0 && (
        <Card padding="md" className="border-amber-500/20">
          <CardHeader title="Open Questions" subtitle="Requires human judgment" />
          <ul className="space-y-1.5">
            {plan.unresolvedQuestions.map((q) => (
              <li key={q} className="flex items-start gap-2 text-xs text-amber-400">
                <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                {q}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
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
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
              Affected modules
            </p>
            <div className="flex flex-wrap gap-1.5">
              {task.affectedModules.map((m) => (
                <Mono key={m} className="border border-steel/20 bg-steel/5 text-[10px] text-steel">
                  {m}
                </Mono>
              ))}
            </div>
          </div>
        )}

        {task.dependencies.length > 0 && (
          <div className="text-xs text-ink-subtle">
            <span className="font-mono text-[9px] uppercase tracking-widest">
              Depends on:{" "}
            </span>
            {task.dependencies.join(", ")}
          </div>
        )}

        {task.acceptanceCriteria.length > 0 && (
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
              Acceptance criteria
            </p>
            <ul className="space-y-1">
              {task.acceptanceCriteria.map((c) => (
                <li key={c} className="flex items-start gap-1.5 text-xs text-ink-muted">
                  <ShieldCheck size={10} className="mt-0.5 shrink-0 text-emerald-400" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.verification.length > 0 && (
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
              Verification
            </p>
            <ul className="space-y-1">
              {task.verification.map((v) => (
                <li key={v} className="flex items-start gap-1.5 text-xs text-steel">
                  <FileText size={10} className="mt-0.5 shrink-0" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        )}

        {task.evidence.length > 0 && (
          <div>
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
              Evidence
            </p>
            <div className="space-y-1">
              {task.evidence.map((ev, i) => (
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
          </div>
        )}
      </div>
    </details>
  );
}
