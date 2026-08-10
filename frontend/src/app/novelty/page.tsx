"use client";

import { useCallback, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { RequiresReport } from "@/components/workflow/requires-report";
import { WorkflowHeader } from "@/components/workflow/workflow-header";
import { analyzeNovelty } from "@/lib/api";
import { toError } from "@/lib/utils/workflow";
import type {
  AnalysisReport,
  NoveltyAnalysis,
  NoveltyCandidate,
  NoveltyCapability,
} from "@/lib/api/types";

const categoryLabels: Record<string, string> = {
  PRODUCT: "Product",
  FEATURE: "Feature",
  UX: "User Experience",
  ARCHITECTURE: "Architecture",
  AI: "AI / ML",
  AUTOMATION: "Automation",
  SECURITY: "Security",
  PERFORMANCE: "Performance",
  DEVELOPER_EXPERIENCE: "Developer Experience",
  BUSINESS_LOGIC: "Business Logic",
};

const strategyLabels: Record<string, string> = {
  COMBINATION: "Combination",
  GAP: "Gap Analysis",
  TRANSFORMATION: "Transformation",
  ARCHITECTURAL: "Architectural",
  AI_AUGMENTATION: "AI Augmentation",
  AUTOMATION: "Automation",
};

export default function NoveltyPage() {
  const [goal, setGoal] = useState("");
  const [analysis, setAnalysis] = useState<NoveltyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleAnalyze = useCallback(async (report: AnalysisReport) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await analyzeNovelty(report, goal.trim() || undefined);
      setAnalysis(res.novelty);
    } catch (err) {
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, [goal]);

  return (
    <RequiresReport>
      {(report) => (
        <div className="space-y-6">
          <WorkflowHeader
            current="Novelty"
            next={{ label: "Next: Impact", href: "/impact" }}
          />

          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink-fg">
              Novelty Analysis
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Identify potential novelty and evidence-backed differentiation in
              your project — for project evaluation, innovation review, and
              technical differentiation discussions.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Configuration */}
            <div className="space-y-4">
              <Card padding="lg">
                <CardHeader
                  title="Analysis Options"
                  subtitle="Optional goal focus"
                />
                <div className="space-y-4">
                  <Textarea
                    label="Goal Focus"
                    hint="Optional — narrow the analysis to a specific area. Leave empty for a full-project scan."
                    placeholder="e.g. Improve developer onboarding experience"
                    value={goal}
                    onChange={(e) => {
                      setGoal(e.target.value);
                      setError(null);
                    }}
                    className="min-h-[80px]"
                    disabled={isLoading}
                  />
                  <Button
                    variant="forge"
                    size="md"
                    icon={<Sparkles size={14} />}
                    onClick={() => void handleAnalyze(report)}
                    loading={isLoading}
                    disabled={isLoading}
                  >
                    Analyze Novelty
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
              <Card padding="md">
                <CardHeader title="About" subtitle="How to read this" />
                <div className="space-y-2 text-xs text-ink-muted">
                  <p>
                    Candidates are <span className="text-forge">candidate
                    opportunities</span> — potential novelty and differentiation
                    backed by project evidence, not patent claims.
                  </p>
                  <p className="text-ink-subtle">
                    &quot;Deterministic&quot; candidates are evidence-backed;
                    &quot;AI recommendation&quot; candidates are
                    suggestion-based.
                  </p>
                </div>
              </Card>
            </div>

            {/* Results */}
            <div className="space-y-4 lg:col-span-2">
              {isLoading && (
                <Card padding="lg">
                  <div className="flex flex-col items-center gap-4 py-8">
                    <Sparkles size={24} className="animate-pulse text-forge" />
                    <p className="text-sm text-ink-fg">Analyzing novelty…</p>
                    <p className="text-xs text-ink-muted">
                      Scoring candidate opportunities against project evidence
                    </p>
                  </div>
                </Card>
              )}

              {!isLoading && error && (
                <ErrorState
                  title="Unable to analyze novelty"
                  description="POST /v1/novelty failed."
                  error={error}
                  onRetry={() => void handleAnalyze(report)}
                />
              )}

              {!isLoading && !error && !analysis && (
                <Card padding="lg">
                  <EmptyState
                    title="No novelty analysis yet"
                    description="Run a novelty analysis to discover evidence-grounded candidate opportunities for your project."
                  />
                </Card>
              )}

              {!isLoading && !error && analysis && (
                <NoveltyView analysis={analysis} onNew={() => setAnalysis(null)} />
              )}
            </div>
          </div>
        </div>
      )}
    </RequiresReport>
  );
}

// ── Novelty view ──────────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 font-mono text-[9px] uppercase tracking-wider text-ink-subtle">
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-ink-2">
        <div
          className={["h-full rounded", color].join(" ")}
          style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[10px] text-ink-fg">
        {Math.round(value)}
      </span>
    </div>
  );
}

function CandidateCard({ candidate }: { candidate: NoveltyCandidate }) {
  return (
    <div className="space-y-3 rounded border border-ink-border/30 bg-ink-1/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-ink-fg">{candidate.title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {candidate.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge
            variant={candidate.source === "DETERMINISTIC" ? "healthy" : "proposal"}
            size="sm"
          >
            {candidate.source === "DETERMINISTIC"
              ? "Evidence-backed"
              : "AI recommendation"}
          </StatusBadge>
          <StatusBadge
            variant={
              candidate.confidence === "HIGH"
                ? "succeeded"
                : candidate.confidence === "MEDIUM"
                  ? "warning"
                  : "muted"
            }
            size="sm"
          >
            {candidate.confidence}
          </StatusBadge>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className="rounded border border-ink-border/30 bg-ink-1/40 px-1.5 py-0.5 font-mono uppercase tracking-wider text-ink-muted">
          {categoryLabels[candidate.category] ?? candidate.category}
        </span>
        <span className="rounded border border-ink-border/30 bg-ink-1/40 px-1.5 py-0.5 font-mono uppercase tracking-wider text-ink-muted">
          {strategyLabels[candidate.strategy] ?? candidate.strategy}
        </span>
        <Mono className="ml-auto text-ink-subtle">{candidate.id}</Mono>
      </div>

      <div className="space-y-1.5">
        <ScoreBar label="Novelty" value={candidate.noveltyScore} color="bg-forge" />
        <ScoreBar label="Value" value={candidate.valueScore} color="bg-emerald-400" />
        <ScoreBar label="Feasible" value={candidate.feasibilityScore} color="bg-steel" />
        <ScoreBar label="Fit" value={candidate.fitScore} color="bg-violet-400" />
        <ScoreBar label="Risk" value={candidate.riskScore} color="bg-rose-400" />
      </div>

      {candidate.affectedModules.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {candidate.affectedModules.map((m) => (
            <Mono key={m} className="border border-steel/20 bg-steel/5 text-[10px] text-steel">
              {m}
            </Mono>
          ))}
        </div>
      )}

      {candidate.prerequisites.length > 0 && (
        <div className="text-xs text-ink-muted">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
            Prerequisites:{" "}
          </span>
          {candidate.prerequisites.join(", ")}
        </div>
      )}

      {candidate.implementationDirection && (
        <div className="text-xs text-ink-muted">
          <span className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
            Direction:{" "}
          </span>
          {candidate.implementationDirection}
        </div>
      )}

      {candidate.tradeoffs.length > 0 && (
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
            Tradeoffs
          </p>
          <ul className="space-y-1">
            {candidate.tradeoffs.map((t) => (
              <li key={t} className="flex items-start gap-1.5 text-xs text-ink-muted">
                <AlertTriangle size={10} className="mt-0.5 shrink-0 text-amber-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {candidate.assumptions.length > 0 && (
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
            Assumptions
          </p>
          <ul className="space-y-1">
            {candidate.assumptions.map((a) => (
              <li key={a} className="flex items-start gap-1.5 text-xs text-ink-muted">
                <CheckCircle2 size={10} className="mt-0.5 shrink-0 text-steel" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {candidate.evidence.length > 0 && (
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
            Evidence
          </p>
          <div className="space-y-1">
            {candidate.evidence.map((ev, i) => (
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
  );
}

function CapabilityChip({ capability }: { capability: NoveltyCapability }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-steel/20 bg-steel/10 px-2 py-1 text-xs text-steel">
      <CheckCircle2 size={10} />
      {capability.name}
    </span>
  );
}

function NoveltyView({
  analysis,
  onNew,
}: {
  analysis: NoveltyAnalysis;
  onNew: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] text-ink-subtle">
          heuristic: <span className="text-steel">{analysis.heuristic}</span>
        </p>
        <Button variant="ghost" size="sm" onClick={onNew}>
          New Analysis
        </Button>
      </div>

      {analysis.capabilities.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Project Capabilities"
            subtitle={`${analysis.capabilities.length} existing capabilities detected`}
          />
          <div className="flex flex-wrap gap-2 px-4 pb-4">
            {analysis.capabilities.map((cap) => (
              <CapabilityChip key={cap.name} capability={cap} />
            ))}
          </div>
        </Card>
      )}

      <Card padding="none">
        <CardHeader
          title="Candidate Opportunities"
          subtitle={`${analysis.candidates.length} potential novelty candidates`}
        />
        <div className="space-y-3 px-4 pb-4">
          {analysis.candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
          {analysis.candidates.length === 0 && (
            <p className="text-xs text-ink-subtle">
              No candidate opportunities identified.
            </p>
          )}
        </div>
      </Card>

      {analysis.limitations.length > 0 && (
        <Card padding="md" className="border-ink-border/30">
          <CardHeader title="Limitations" subtitle="Analysis boundaries" />
          <ul className="space-y-1.5">
            {analysis.limitations.map((lim) => (
              <li key={lim} className="flex items-start gap-2 text-xs text-ink-muted">
                <AlertTriangle size={10} className="mt-0.5 shrink-0 text-ink-subtle" />
                {lim}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
