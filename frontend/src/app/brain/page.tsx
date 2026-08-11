"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  ChevronRight,
  Eraser,
  Send,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { describeApiError } from "@/lib/utils/api-error";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { BrainResponseView } from "@/components/brain/brain-response";
import { brainQuery } from "@/lib/api";
import { useReport } from "@/lib/context/report-context";
import type { AnalysisReport, BrainResponse } from "@/lib/api/types";

const MAX_QUESTION_LENGTH = 4_000; // backend: z.string().min(1).max(4_000)

const SUGGESTED_QUESTIONS = [
  "What are the highest-risk areas of this project?",
  "Explain the current architecture.",
  "Which parts of the project would be safest to change first?",
  "What dependencies deserve attention?",
  "What should I understand before modifying this project?",
  "What are the most important Doctor findings and what should I do about them?",
];

interface QueryEntry {
  id: number;
  question: string;
  status: "loading" | "success" | "error";
  response?: BrainResponse;
  error?: Error;
}

let nextId = 1;

function isProviderUnavailable(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    (err as { status?: unknown }).status === 503
  );
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Special 503 state — the engine is up but no Brain provider is configured. */
function BrainUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <Card padding="lg" className="border-amber-500/20 bg-amber-500/5">
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400">
          <WifiOff size={24} />
        </div>
        <div className="max-w-md">
          <h2 className="text-lg font-semibold text-ink-fg">
            Project Brain is unavailable
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Your ReForge analysis engine is running, but no Brain provider is
            currently configured.
          </p>
          <p className="mt-2 text-xs text-ink-subtle">
            The Brain endpoint returns 503 until an LLM provider is configured
            on the backend. No AI response has been fabricated.
          </p>
        </div>
        <Button variant="steel" size="sm" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </Card>
  );
}

export default function BrainPage() {
  const router = useRouter();
  const { report, reportLoading } = useReport();

  const [question, setQuestion] = useState("");
  const [entries, setEntries] = useState<QueryEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const runQuery = useCallback(
    async (raw: string, reportContext: AnalysisReport) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      const id = nextId++;
      setEntries((prev) => [
        ...prev,
        { id, question: trimmed, status: "loading" },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await brainQuery(trimmed, reportContext);
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === id ? { ...entry, status: "success", response } : entry,
          ),
        );
      } catch (err) {
        if (isAbortError(err)) {
          setEntries((prev) => prev.filter((entry) => entry.id !== id));
          return;
        }
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === id
              ? { ...entry, status: "error", error: err instanceof Error ? err : new Error(String(err)) }
              : entry,
          ),
        );
      } finally {
        abortRef.current = null;
      }
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!report) return;
    void runQuery(question, report);
    setQuestion("");
  }, [question, report, runQuery]);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setQuestion("");
    setEntries([]);
  }, []);

  const providerUnavailable = useMemo(
    () => entries.some((e) => e.status === "error" && isProviderUnavailable(e.error)),
    [entries],
  );

  const isBusy = entries.some((e) => e.status === "loading");

  if (reportLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading Project Brain">
        <Skeleton className="h-8 w-56" />
        <Skeleton rows={4} height="4rem" className="w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <PageHeading />
        <Card padding="lg">
          <EmptyState
            title="Run an analysis first"
            description="Project Brain reasons over a project analysis report. Analyze a project to generate one, then return here to ask questions."
            action={{ label: "Analyze Project", onClick: () => router.push("/analyze") }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading />

      {providerUnavailable && (
        <BrainUnavailable
          onRetry={() => {
            if (entries.length > 0) {
              const last = entries[entries.length - 1]!;
              if (last.status === "error" && last.question) {
                void runQuery(last.question, report);
              }
            }
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Composer */}
        <div className="space-y-4 lg:col-span-2">
          <Card padding="lg">
            <CardHeader
              title="Ask Project Brain"
              subtitle="Evidence-grounded AI reasoning over your analysis report"
            />
            <div className="space-y-4">
              <Textarea
                label="Question"
                placeholder="e.g. What are the highest-risk areas of this project?"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                }}
                maxLength={MAX_QUESTION_LENGTH}
                className="min-h-[110px] resize-y"
                disabled={isBusy}
                hint={`${question.length}/${MAX_QUESTION_LENGTH} characters`}
              />
              <Button
                variant="steel"
                size="md"
                icon={<Send size={14} />}
                onClick={handleSubmit}
                loading={isBusy}
                disabled={!question.trim() || isBusy}
              >
                Ask Brain
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Eraser size={12} />}
                onClick={handleClear}
                disabled={entries.length === 0 && !question}
              >
                Clear conversation
              </Button>
              <p className="text-[10px] text-ink-subtle">
                Answers are AI inference over the deterministic report — the
                report remains authoritative.
              </p>
            </div>
          </Card>

          {/* Suggested questions */}
          <Card padding="none">
            <CardHeader
              title="Suggested Questions"
              subtitle="Click to ask — suggestions only, no fabricated facts"
              action={<Sparkles size={14} className="text-forge" />}
            />
            <div className="space-y-1.5 px-4 pb-4">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void runQuery(q, report)}
                  disabled={isBusy}
                  className="group flex w-full items-start gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2 text-left transition-colors hover:border-steel/30 hover:bg-steel/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronRight
                    size={11}
                    className="mt-0.5 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-steel"
                  />
                  <span className="text-xs text-ink-muted group-hover:text-ink-fg">
                    {q}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Investigation log */}
        <div className="space-y-4 lg:col-span-3">
          <Card padding="none">
            <CardHeader
              title="Investigation Log"
              subtitle={`${entries.length} quer${entries.length === 1 ? "y" : "ies"} this session · in-memory only, cleared on refresh`}
            />
            <div className="space-y-4 px-4 pb-4" data-testid="investigation-log">
              {entries.length === 0 && (
                <EmptyState
                  title="Ask your first question"
                  description="Ask about architecture, risks, dependencies, or where to start. Every answer cites the evidence it relies on."
                  icon={<Brain size={24} />}
                />
              )}
              {entries.map((entry) => (
                <div key={entry.id} className="space-y-2">
                  {/* User question */}
                  <div className="rounded border border-ink-border/40 bg-ink-1/50 px-3 py-2">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                      Question
                    </p>
                    <p className="mt-1 text-sm text-ink-fg">{entry.question}</p>
                  </div>
                  {/* Brain response / states */}
                  {entry.status === "loading" && (
                    <div className="flex items-center gap-3 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-3">
                      <Brain size={15} className="animate-pulse text-steel" />
                      <p className="text-xs text-ink-muted">
                        Brain is reasoning over the report…
                      </p>
                    </div>
                  )}
                  {entry.status === "success" && entry.response && (
                    <BrainResponseView response={entry.response} />
                  )}
                  {entry.status === "error" && entry.error && (
                    <div className="space-y-2">
                      {!isProviderUnavailable(entry.error) && (
                        <ErrorState
                          title="Brain query failed"
                          description={
                            describeApiError(entry.error, {
                              resource: "Brain answer",
                              endpoint: "POST /v1/brain/query",
                            }).description
                          }
                          error={entry.error}
                          onRetry={() => void runQuery(entry.question, report)}
                        />
                      )}
                      {isProviderUnavailable(entry.error) && (
                        <BrainUnavailable
                          onRetry={() => void runQuery(entry.question, report)}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Report context */}
      <ReportContextCard report={report} />
    </div>
  );
}

function PageHeading() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-steel/20 bg-steel/10 text-steel">
        <Brain size={16} />
      </div>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-fg">
          Project Brain
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          An AI engineering investigation console — ask questions, read the
          evidence, weigh the limitations.
        </p>
      </div>
    </div>
  );
}

function ReportContextCard({ report }: { report: AnalysisReport }) {
  const items: { label: string; value: string }[] = [
    {
      label: "Source",
      value: report.provenance.source.kind,
    },
    {
      label: "Files",
      value: String(report.overview.fileCount),
    },
    {
      label: "Languages",
      value: String(report.languages.length),
    },
    {
      label: "Dependencies",
      value: String(report.dependencies.length),
    },
    {
      label: "Doctor Score",
      value: report.doctor ? `${report.doctor.healthScore}/100` : "—",
    },
  ];

  return (
    <Card padding="md" data-testid="report-context">
      <CardHeader
        title="Report Context"
        subtitle="The deterministic analysis report used for Brain queries"
      />
      <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-2">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
              {item.label}
            </dt>
            <dd className="text-right">
              <Mono className="text-ink-fg">{item.value}</Mono>
            </dd>
          </div>
        ))}
      </dl>
      {report.recommendedNextSteps.length > 0 && (
        <div className="mt-3 border-t border-ink-border/20 pt-2">
          <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
            Recommended next steps
          </p>
          <ul className="space-y-0.5">
            {report.recommendedNextSteps.slice(0, 3).map((step) => (
              <li key={step} className="text-xs text-ink-muted">
                — {step}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
