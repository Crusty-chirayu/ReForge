"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  FileText,
  Loader2,
  Lock,
  Play,
  ShieldCheck,
  Trash2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, runPipeline } from "@/lib/api";
import { formatBytes } from "@/lib/utils/format";
import { MAX_ARCHIVE_LABEL, validateArchive } from "@/lib/utils/archive";
import { describeApiError } from "@/lib/utils/api-error";

const SAFETY_FACTS = [
  {
    title: "Disposable workspace",
    detail:
      "Your archive is extracted into a server-controlled temporary workspace that is cleaned up after the run.",
  },
  {
    title: "Safe extraction",
    detail:
      "ZIP traversal, symlinks, and oversized archives are rejected before any scanning begins.",
  },
  {
    title: "Patch validation",
    detail:
      "Proposed patches are validated against the server-generated snapshot before application.",
  },
  {
    title: "Expected-hash checks",
    detail:
      "MODIFY and RENAME operations must match the expected SHA-256 fingerprint of the snapshot file.",
  },
  {
    title: "Atomic rollback",
    detail:
      "If execution fails part-way, the receipt records the failure and rollback state.",
  },
  {
    title: "Controlled verification",
    detail:
      "Verification (when enabled) runs bounded commands with timeouts and truncated output.",
  },
  {
    title: "No shell access",
    detail:
      "The API rejects command, shell, exec, args, cwd, script, and environment overrides outright.",
  },
];

const NON_FACTS = [
  "Your host project files are never modified",
  "No arbitrary shell commands are ever executed",
  "No npm installs or external package installation",
  "Unreviewed patches are never silently trusted",
];

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

/** Id linking the submission error to the controls that produced it. */
const PIPELINE_ERROR_ID = "pipeline-submit-error";

export default function PipelineNewPage() {
  const router = useRouter();

  const [archive, setArchive] = useState<File | null>(null);
  const [goal, setGoal] = useState("");
  const [approved, setApproved] = useState(false);
  const [allowDelete, setAllowDelete] = useState(false);
  const [verify, setVerify] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const handleFile = useCallback((candidate: File | null | undefined) => {
    if (!candidate) return;
    const problem = validateArchive(candidate, {
      extensionMessage:
        "Only .zip archives are accepted for pipeline execution.",
    });
    if (problem) {
      setArchive(null);
      setError(new Error(problem));
      return;
    }
    setArchive(candidate);
    setError(null);
  }, []);

  const mode: "proposal" | "execution" = approved ? "execution" : "proposal";
  const canSubmit =
    archive !== null &&
    goal.trim().length > 0 &&
    !isSubmitting &&
    (mode === "proposal" || confirmed);

  const handleSubmit = useCallback(async () => {
    // A pipeline run is expensive and side-effecting: never allow a second
    // submission while one is already in flight.
    if (isSubmitting) return;
    if (!archive) return;
    if (!goal.trim()) return;
    if (mode === "execution" && !confirmed) return;

    setIsSubmitting(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await runPipeline(
        archive,
        {
          goal: goal.trim(),
          approved,
          allowDelete,
          verify,
        },
        controller.signal,
      );
      const pipelineId = res.pipeline?.pipelineId ?? res.result?.pipelineId;
      if (!pipelineId) {
        throw new Error("The backend did not return a pipeline ID.");
      }
      router.push(`/pipeline/${pipelineId}`);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(
        err instanceof ApiError
          ? err
          : err instanceof Error
            ? err
            : new Error(String(err)),
      );
      setIsSubmitting(false);
    } finally {
      abortRef.current = null;
    }
  }, [archive, goal, approved, allowDelete, verify, confirmed, mode, isSubmitting, router]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setArchive(null);
    setGoal("");
    setApproved(false);
    setAllowDelete(false);
    setVerify(false);
    setConfirmed(false);
    setError(null);
    setIsSubmitting(false);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-fg">
          Pipeline Execution
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          The end-to-end autonomous engineering workflow — ingest, analyze,
          plan, impact, build, execute, and verify inside a disposable
          server-controlled workspace.
        </p>
      </div>

      {isSubmitting ? (
        <Card padding="lg">
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 size={26} className="animate-spin text-forge" />
            <p className="text-sm text-ink-fg">
              {mode === "execution"
                ? "Executing pipeline in isolated workspace…"
                : "Generating pipeline proposal…"}
            </p>
            <p className="max-w-md text-center text-xs text-ink-muted">
              Ingesting archive, analyzing, planning, modeling impact,
              proposing a build, and{" "}
              {mode === "execution" ? "applying approved patches" : "preparing the proposal"}.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: configuration */}
          <div className="space-y-4 lg:col-span-3">
            {/* A. Source */}
            <Card padding="lg">
              <CardHeader
                title="A · Source"
                subtitle="ZIP archive to run the pipeline against"
              />
              <div
                className={[
                  "flex flex-col items-center gap-3 rounded border border-dashed border-ink-border/60 px-4 py-6 transition-colors",
                  dragActive
                    ? "border-forge/50 bg-forge/5"
                    : "hover:border-forge/30",
                ].join(" ")}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".zip,application/zip"
                  data-testid="pipeline-zip-input"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {archive ? (
                  <div className="flex w-full max-w-sm items-center gap-2 rounded border border-ink-border/40 bg-ink-1/50 px-3 py-2">
                    <FileText size={13} className="shrink-0 text-steel" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-fg">
                        {archive.name}
                      </p>
                      <p className="font-mono text-[10px] text-ink-subtle">
                        {formatBytes(archive.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setArchive(null)}
                      aria-label={`Remove ${archive.name}`}
                      className="shrink-0 text-ink-subtle transition-colors hover:text-rose-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-center text-sm text-ink-fg">
                      Drop a ZIP archive here, or{" "}
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="text-forge underline-offset-2 hover:underline"
                      >
                        browse
                      </button>
                    </p>
                    <p className="text-xs text-ink-muted">
                      Accepts .zip only · Maximum {MAX_ARCHIVE_LABEL}
                    </p>
                  </>
                )}
              </div>
            </Card>

            {/* B. Goal */}
            <Card padding="lg">
              <CardHeader
                title="B · Goal"
                subtitle="What the pipeline should accomplish"
              />
              <Textarea
                label="Pipeline Goal"
                placeholder="e.g. Add authentication middleware with refresh token rotation"
                value={goal}
                onChange={(e) => {
                  setGoal(e.target.value);
                  setError(null);
                }}
                className="min-h-[90px]"
                disabled={isSubmitting}
              />
            </Card>

            {/* C. Execution policy */}
            <Card padding="lg">
              <CardHeader
                title="C · Execution Policy"
                subtitle="Explicit, unambiguous controls"
              />
              <div className="space-y-3">
                <PolicyToggle
                  id="policy-approved"
                  label="Approved"
                  detail="Allow the pipeline to apply the proposed patches inside the disposable workspace."
                  checked={approved}
                  onChange={(v) => {
                    setApproved(v);
                    setError(null);
                  }}
                />
                <PolicyToggle
                  id="policy-delete"
                  label="Allow Delete"
                  detail="Permit DELETE operations if the generated build requires them."
                  checked={allowDelete}
                  onChange={setAllowDelete}
                />
                <PolicyToggle
                  id="policy-verify"
                  label="Verify"
                  detail="Run controlled verification after patch application and surface the results."
                  checked={verify}
                  onChange={setVerify}
                />
              </div>
            </Card>

            {/* D. Execution mode */}
            <Card
              padding="lg"
              className={
                mode === "execution"
                  ? "border-rose-500/30 bg-rose-500/5"
                  : "border-steel/30 bg-steel/5"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                    Execution mode
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge
                      variant={mode === "execution" ? "failed" : "info"}
                    >
                      {mode === "execution" ? "Execution Mode" : "Proposal Mode"}
                    </StatusBadge>
                    <span className="text-xs text-ink-muted">
                      approved = {String(approved)}
                    </span>
                  </div>
                </div>
                <p className="max-w-sm text-[10px] text-ink-muted">
                  {mode === "execution"
                    ? "Patches will be applied inside ReForge's disposable workspace — never your host project."
                    : "A full proposal is generated. Nothing is applied until you approve execution."}
                </p>
              </div>
            </Card>
          </div>

          {/* Right: review + trust */}
          <div className="space-y-4 lg:col-span-2">
            {/* Review */}
            <Card padding="lg">
              <CardHeader
                title="Review"
                subtitle="Confirm before submission"
              />
              <dl className="space-y-2">
                <ReviewRow label="Source" value={archive?.name ?? "—"} mono />
                <ReviewRow label="Goal" value={goal.trim() || "—"} />
                <ReviewRow
                  label="Mode"
                  value={mode === "execution" ? "EXECUTION" : "PROPOSAL"}
                  mono
                />
                <ReviewRow
                  label="Approval"
                  value={approved ? "YES — apply patches" : "NO — proposal only"}
                  mono
                />
                <ReviewRow
                  label="Delete policy"
                  value={allowDelete ? "ALLOW DELETE" : "DENY DELETE"}
                  mono
                />
                <ReviewRow
                  label="Verification"
                  value={verify ? "ON" : "OFF"}
                  mono
                />
              </dl>

              {mode === "execution" && (
                <label className="mt-4 flex cursor-pointer items-start gap-2 rounded border border-rose-500/25 bg-rose-500/5 px-3 py-2.5">
                  <input
                    type="checkbox"
                    data-testid="execution-confirm"
                    checked={confirmed}
                    onChange={(e) => {
                      setConfirmed(e.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5 h-3.5 w-3.5 accent-rose-500"
                  />
                  <span className="text-xs text-ink-muted">
                    I understand approved execution applies the proposed patches
                    inside ReForge&apos;s disposable workspace only — my host
                    project is never modified.
                  </span>
                </label>
              )}

              {error && (
                <div className="mt-4" id={PIPELINE_ERROR_ID}>
                  <ErrorState
                    title="Pipeline submission failed"
                    description={
                      describeApiError(error, {
                        resource: "pipeline",
                        endpoint: "POST /v1/pipeline",
                      }).description
                    }
                    error={error}
                    onRetry={() => void handleSubmit()}
                  />
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant={mode === "execution" ? "danger" : "forge"}
                  size="lg"
                  icon={
                    mode === "execution" ? (
                      <Play size={14} />
                    ) : (
                      <Zap size={14} />
                    )
                  }
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                  loading={isSubmitting}
                  aria-describedby={error ? PIPELINE_ERROR_ID : undefined}
                  className="w-full"
                >
                  {mode === "execution"
                    ? "Approve & Execute"
                    : "Generate Proposal"}
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} className="w-full">
                  Reset
                </Button>
              </div>
            </Card>

            {/* Trust / safety */}
            <Card padding="none">
              <CardHeader
                title="Trust & Safety"
                subtitle="Verified backend safeguards"
                action={<ShieldCheck size={14} className="text-emerald-400" />}
              />
              <div className="space-y-2 px-4 pb-4">
                {SAFETY_FACTS.map((fact) => (
                  <div key={fact.title} className="flex items-start gap-2">
                    <Lock size={10} className="mt-0.5 shrink-0 text-steel" />
                    <div>
                      <p className="text-xs font-medium text-ink-fg">
                        {fact.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-muted">
                        {fact.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-ink-border/40 px-4 py-3">
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                  ReForge never does
                </p>
                <ul className="space-y-1">
                  {NON_FACTS.map((fact) => (
                    <li
                      key={fact}
                      className="flex items-start gap-1.5 text-[10px] text-ink-muted"
                    >
                      <AlertTriangle
                        size={9}
                        className="mt-0.5 shrink-0 text-amber-400"
                      />
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function PolicyToggle({
  id,
  label,
  detail,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  detail: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded border border-ink-border/40 bg-ink-1/40 px-3 py-2.5"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-forge"
      />
      <div>
        <p className="text-sm font-medium text-ink-fg">{label}</p>
        <p className="mt-0.5 text-[10px] text-ink-muted">{detail}</p>
      </div>
    </label>
  );
}

function ReviewRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
        {label}
      </dt>
      <dd className="min-w-0 text-right">
        {mono ? (
          <Mono className="text-ink-fg">{value}</Mono>
        ) : (
          <span className="text-xs text-ink-fg">{value}</span>
        )}
      </dd>
    </div>
  );
}
