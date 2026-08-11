"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  FileText,
  GitBranch,
  Loader2,
  Lock,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Mono } from "@/components/ui/mono";
import { analyzeArchive, analyzeRepository } from "@/lib/api";
import { useReport } from "@/lib/context/report-context";
import { formatBytes, formatElapsed } from "@/lib/utils/format";
import {
  MAX_ARCHIVE_LABEL,
  validateArchive,
  validateRepositoryUrl,
} from "@/lib/utils/archive";
import { describeApiError, isAbortError } from "@/lib/utils/api-error";

type Mode = "zip" | "github";
type Phase = "idle" | "running";

const STAGES = ["INGEST", "ANALYZE", "INDEX", "DIAGNOSE", "REPORT"] as const;

/** Id linking the submit error to the inputs that produced it. */
const ANALYZE_ERROR_ID = "analyze-error";

/**
 * Surface the backend's own message when it gave one; otherwise explain the
 * transport failure honestly rather than inventing a cause.
 */
function analysisErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message && !(err instanceof TypeError)) {
    return err.message;
  }
  return describeApiError(err, { resource: "analysis" }).description;
}

export default function AnalyzePage() {
  const router = useRouter();
  const { setReport } = useReport();

  const [mode, setMode] = useState<Mode>("zip");
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Abort any in-flight request on unmount.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      stopTimers();
    },
    [stopTimers],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    stopTimers();
    setElapsed(0);
    setPhase("idle");
  }, [stopTimers]);

  const handleFileSelect = useCallback((candidate: File | null | undefined) => {
    if (!candidate) return;
    const problem = validateArchive(candidate);
    if (problem) {
      setFile(null);
      setError(problem);
      return;
    }
    setFile(candidate);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      handleFileSelect(e.dataTransfer.files?.[0]);
    },
    [handleFileSelect],
  );

  const runAnalysis = useCallback(async () => {
    // Guard against double submission (Enter + click, or an impatient retry).
    if (phase === "running") return;
    if (mode === "zip" && !file) return;

    if (mode === "github") {
      const problem = validateRepositoryUrl(repoUrl);
      if (problem) {
        setError(problem);
        return;
      }
    }

    setError(null);
    setPhase("running");
    setElapsed(0);

    const startedAt = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const report =
        mode === "zip"
          ? await analyzeArchive(file!, controller.signal)
          : await analyzeRepository(repoUrl.trim(), controller.signal);
      setReport(report);
      router.push("/analyze/report");
    } catch (err) {
      if (isAbortError(err)) return;
      setError(analysisErrorMessage(err));
      setPhase("idle");
    } finally {
      stopTimers();
      abortRef.current = null;
    }
  }, [mode, file, repoUrl, phase, router, setReport, stopTimers]);

  const resetForm = useCallback(() => {
    cancel();
    setError(null);
    setFile(null);
    setRepoUrl("");
  }, [cancel]);

  const canSubmit =
    phase === "idle" && (mode === "zip" ? file !== null : repoUrl.trim().length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink-fg">
          Analyze Project
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Ingest a ZIP archive or GitHub repository to generate a full static
          analysis report — real evidence, no black-box guesses.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex w-fit gap-1 rounded border border-ink-border/40 bg-ink-1 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("zip");
            setError(null);
          }}
          aria-pressed={mode === "zip"}
          className={[
            "flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "zip"
              ? "bg-forge text-forge-fg shadow-glow-sm"
              : "text-ink-muted hover:text-ink-fg",
          ].join(" ")}
        >
          <Upload size={13} />
          ZIP Upload
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("github");
            setError(null);
          }}
          aria-pressed={mode === "github"}
          className={[
            "flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            mode === "github"
              ? "bg-steel text-steel-fg"
              : "text-ink-muted hover:text-ink-fg",
          ].join(" ")}
        >
          <GitBranch size={13} />
          GitHub URL
        </button>
      </div>

      {phase === "running" ? (
        <RunningCard
          mode={mode}
          file={file}
          repoUrl={repoUrl}
          elapsed={elapsed}
          onCancel={cancel}
        />
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void runAnalysis();
          }}
        >
          {mode === "zip" ? (
            <ZipDropzone
              file={file}
              dragActive={dragActive}
              inputRef={inputRef}
              onDrop={handleDrop}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onFileSelect={handleFileSelect}
              onRemove={() => {
                setFile(null);
                setError(null);
              }}
            />
          ) : (
            <Card padding="lg">
              <CardHeader
                title="Repository URL"
                subtitle="HTTPS GitHub URL only — e.g. https://github.com/vercel/next.js"
              />
              <div className="flex flex-col gap-3">
                <Input
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(e) => {
                    setRepoUrl(e.target.value);
                    setError(null);
                  }}
                  icon={<GitBranch size={14} />}
                  aria-label="Repository URL"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? ANALYZE_ERROR_ID : undefined}
                />
                <p className="flex items-center gap-1 text-[10px] text-ink-subtle">
                  <Lock size={10} />
                  Public repositories only. Cloned in a temporary isolated
                  workspace.
                </p>
              </div>
            </Card>
          )}

          {error && (
            <div
              id={ANALYZE_ERROR_ID}
              role="alert"
              className="flex flex-wrap items-center gap-2 rounded border border-rose-500/25 bg-rose-500/5 px-3 py-2"
            >
              <AlertTriangle
                size={13}
                aria-hidden="true"
                className="shrink-0 text-rose-400"
              />
              <p className="min-w-0 flex-1 text-xs text-rose-400">{error}</p>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                Reset
              </Button>
            </div>
          )}

          <Button
            type="submit"
            variant="forge"
            size="lg"
            icon={mode === "zip" ? <Upload size={14} /> : <GitBranch size={14} />}
            disabled={!canSubmit}
            className="w-full sm:w-auto"
          >
            {mode === "zip" ? "Analyze Archive" : "Analyze Repository"}
          </Button>
        </form>
      )}

      {/* Trust indicators */}
      <div className="grid gap-3 rounded border border-ink-border/40 bg-ink-card/40 p-4 md:grid-cols-3">
        <TrustItem
          title="Isolated ingestion"
          detail="All inputs are extracted into temporary workspaces and deleted after analysis."
        />
        <TrustItem
          title="Safe extraction"
          detail="ZIP traversal, symlinks, and oversized archives are rejected before scanning."
        />
        <TrustItem
          title="Evidence-based reports"
          detail="Every finding is traceable to file paths and line evidence."
        />
      </div>
    </div>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function TrustItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" />
      <div>
        <p className="text-xs font-medium text-ink-fg">{title}</p>
        <p className="mt-0.5 text-[10px] text-ink-muted">{detail}</p>
      </div>
    </div>
  );
}

function ZipDropzone({
  file,
  dragActive,
  inputRef,
  onDrop,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onFileSelect,
  onRemove,
}: {
  file: File | null;
  dragActive: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onFileSelect: (f: File | null | undefined) => void;
  onRemove: () => void;
}) {
  return (
    <Card
      padding="lg"
      className={[
        "border-dashed border-ink-border/60 transition-colors",
        dragActive ? "border-forge/50 bg-forge/5" : "hover:border-forge/30",
      ].join(" ")}
    >
      <div
        className="flex flex-col items-center gap-4 py-6"
        onDrop={onDrop}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-forge/20 bg-forge/10 text-forge">
          <Upload size={22} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-ink-fg">
            {file
              ? "Archive selected — ready to analyze"
              : "Drop a ZIP archive here, or browse"}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Accepts .zip only · Maximum {MAX_ARCHIVE_LABEL}
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          data-testid="zip-input"
          className="hidden"
          onChange={(e) => {
            onFileSelect(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {file ? (
          <div className="flex w-full max-w-sm items-center gap-2 rounded border border-ink-border/40 bg-ink-1/50 px-3 py-2">
            <FileText size={13} className="shrink-0 text-steel" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-ink-fg">
                {file.name}
              </p>
              <p className="font-mono text-[10px] text-ink-subtle">
                {formatBytes(file.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Remove ${file.name}`}
              className="shrink-0 text-ink-subtle transition-colors hover:text-rose-400"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ) : (
          <Button
            variant="forge"
            size="sm"
            icon={<Upload size={13} />}
            onClick={() => inputRef.current?.click()}
          >
            Select Archive
          </Button>
        )}
      </div>
    </Card>
  );
}

function RunningCard({
  mode,
  file,
  repoUrl,
  elapsed,
  onCancel,
}: {
  mode: Mode;
  file: File | null;
  repoUrl: string;
  elapsed: number;
  onCancel: () => void;
}) {
  const label =
    mode === "zip" ? "Analyzing archive…" : "Cloning repository…";
  const detail =
    mode === "zip"
      ? file
        ? `Uploading and analyzing ${file.name}`
        : "Processing archive"
      : `Fetching ${repoUrl} and running the analysis pipeline`;

  return (
    <Card padding="lg">
      <div className="flex flex-col items-center gap-4 py-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-forge/20 bg-forge/10">
          <Loader2 size={22} className="animate-spin text-forge" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-ink-fg">{label}</p>
          <p className="mt-1 max-w-md text-xs text-ink-muted">{detail}</p>
        </div>

        {/* Indicative stage track — the backend reports completion only when analysis finishes */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {STAGES.map((stage) => (
            <span
              key={stage}
              className="flex items-center gap-1.5 rounded border border-ink-border/40 bg-ink-1/40 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle"
            >
              <span
                aria-hidden="true"
                className="inline-block h-1 w-1 animate-pulse rounded-full bg-forge"
              />
              {stage}
            </span>
          ))}
        </div>
        <p className="text-center text-[10px] text-ink-subtle">
          Stages are indicative — the backend reports completion when the
          analysis finishes.
        </p>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-ink-muted">
            elapsed <Mono className="text-ink-fg">{formatElapsed(elapsed)}</Mono>
          </span>
          <Button variant="ghost" size="sm" icon={<XCircle size={13} />} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
