"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  FolderArchive,
  GitCompare,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { createSnapshot } from "@/lib/api";
import { useProjectHistory } from "@/lib/query/use-project-history";
import { formatBytes, formatDateTime, shortId } from "@/lib/utils/format";
import { verificationVariant } from "@/lib/utils/status";
import { MAX_ARCHIVE_LABEL, validateArchive } from "@/lib/utils/archive";
import { describeApiError } from "@/lib/utils/api-error";
import type { ProjectHistoryItem } from "@/lib/api/types";

export default function SnapshotsPage() {
  const router = useRouter();
  const history = useProjectHistory(50);
  const items = useMemo(
    () => history.data?.history ?? [],
    [history.data],
  );

  // Compare selection
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");
  const compareError =
    beforeId && afterId && beforeId === afterId
      ? "Before and After must be different snapshots."
      : null;
  const canCompare = Boolean(beforeId && afterId) && !compareError;

  // Upload
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  const options = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [items],
  );

  const handleFile = useCallback((candidate: File | null | undefined) => {
    if (!candidate) return;
    const problem = validateArchive(candidate);
    if (problem) {
      setFile(null);
      setUploadError(new Error(problem));
      return;
    }
    setFile(candidate);
    setUploadError(null);
  }, []);

  const handleUpload = useCallback(async () => {
    // Guard against a second click while the first upload is still in flight.
    if (!file || isUploading) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await createSnapshot(file);
      setCreatedId(res.snapshot.snapshotId);
      setFile(null);
      void history.refetch();
    } catch (err) {
      setUploadError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsUploading(false);
    }
  }, [file, isUploading, history]);

  /** Return the upload panel to a clean state for a second snapshot. */
  const resetUpload = useCallback(() => {
    setFile(null);
    setUploadError(null);
    setCreatedId(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-fg">
            Snapshot Explorer
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Versioned project state captures — browse, compare, and inspect
            historical intelligence.
          </p>
        </div>
        <Button
          variant="forge"
          size="sm"
          icon={<Plus size={13} />}
          onClick={() => setUploadOpen((v) => !v)}
        >
          New Snapshot
        </Button>
      </div>

      {/* Upload */}
      {uploadOpen && (
        <Card padding="lg" data-testid="snapshot-upload">
          <CardHeader
            title="Create Snapshot"
            subtitle="Capture project state from a ZIP archive — analysis and state capture only, nothing is executed"
          />
          {createdId ? (
            <div className="flex flex-wrap items-center gap-3 rounded border border-emerald-500/25 bg-emerald-500/5 px-3 py-2.5">
              <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-emerald-400">
                  Snapshot created
                </p>
                <Mono className="text-ink-fg">{createdId}</Mono>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="steel"
                  size="sm"
                  onClick={() => router.push(`/snapshot/${createdId}`)}
                >
                  View Snapshot
                </Button>
                <Button variant="ghost" size="sm" onClick={resetUpload}>
                  Create another
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
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
                  ref={zipInputRef}
                  type="file"
                  accept=".zip,application/zip"
                  data-testid="snapshot-zip-input"
                  aria-label="Snapshot ZIP archive"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0]);
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
                      onClick={() => setFile(null)}
                      aria-label="Remove archive"
                      className="shrink-0 text-ink-subtle transition-colors hover:text-rose-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ) : (
                  <p className="text-center text-sm text-ink-fg">
                    Drop a ZIP archive here, or{" "}
                    <button
                      type="button"
                      className="text-forge underline-offset-2 hover:underline"
                      onClick={() => zipInputRef.current?.click()}
                    >
                      browse
                    </button>
                  </p>
                )}
              </div>
              {uploadError && (
                <div
                  id="snapshot-upload-error"
                  role="alert"
                  className="flex flex-wrap items-start gap-2 rounded border border-rose-500/25 bg-rose-500/5 px-3 py-2"
                >
                  <AlertTriangle
                    size={12}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-rose-400"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-rose-400">{uploadError.message}</p>
                    <p className="mt-0.5 text-[10px] text-ink-subtle">
                      {
                        describeApiError(uploadError, {
                          resource: "snapshot",
                          endpoint: "POST /v1/snapshot",
                        }).description
                      }
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="forge"
                  size="sm"
                  icon={<Upload size={13} />}
                  onClick={() => void handleUpload()}
                  loading={isUploading}
                  disabled={!file || isUploading}
                  aria-describedby={uploadError ? "snapshot-upload-error" : undefined}
                >
                  Create Snapshot
                </Button>
                <p className="font-mono text-[10px] text-ink-subtle">
                  .zip only · max {MAX_ARCHIVE_LABEL}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Compare selection */}
      <Card padding="lg">
        <CardHeader
          title="Compare Snapshots"
          subtitle="Select a before and after snapshot to view the deterministic diff"
          action={<GitCompare size={15} className="text-steel" />}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor="compare-before"
              className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle"
            >
              Before
            </label>
            <select
              id="compare-before"
              data-testid="compare-before"
              value={beforeId}
              onChange={(e) => setBeforeId(e.target.value)}
              className="h-9 w-full cursor-pointer appearance-none rounded border border-ink-border/60 bg-ink-1 px-3 text-sm text-ink-fg focus:border-forge focus:outline-none focus:ring-2 focus:ring-forge/40"
            >
              <option value="">Select snapshot…</option>
              {options.map((item) => (
                <option key={item.snapshotId} value={item.snapshotId}>
                  {shortId(item.snapshotId, 14)} ·{" "}
                  {formatDateTime(item.createdAt)}
                </option>
              ))}
            </select>
          </div>
          <span className="hidden pb-2 font-mono text-xs text-ink-subtle sm:block">
            →
          </span>
          <div className="flex flex-1 flex-col gap-1.5">
            <label
              htmlFor="compare-after"
              className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle"
            >
              After
            </label>
            <select
              id="compare-after"
              data-testid="compare-after"
              value={afterId}
              onChange={(e) => setAfterId(e.target.value)}
              className="h-9 w-full cursor-pointer appearance-none rounded border border-ink-border/60 bg-ink-1 px-3 text-sm text-ink-fg focus:border-forge focus:outline-none focus:ring-2 focus:ring-forge/40"
            >
              <option value="">Select snapshot…</option>
              {options.map((item) => (
                <option key={item.snapshotId} value={item.snapshotId}>
                  {shortId(item.snapshotId, 14)} ·{" "}
                  {formatDateTime(item.createdAt)}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="steel"
            size="md"
            icon={<GitCompare size={14} />}
            disabled={!canCompare}
            onClick={() =>
              router.push(`/snapshot/compare/${beforeId}/${afterId}`)
            }
          >
            Compare
          </Button>
        </div>
        {compareError && (
          <p role="alert" className="mt-2 text-xs text-rose-400">
            {compareError}
          </p>
        )}
      </Card>

      {/* History list */}
      {history.isLoading ? (
        <div
          className="space-y-2"
          role="status"
          aria-label="Loading snapshots"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-12 w-full rounded border border-ink-border/30 bg-ink-1/30"
            />
          ))}
        </div>
      ) : history.error ? (
        <ErrorState
          title="Unable to load snapshots"
          description={
            describeApiError(history.error, {
              resource: "snapshot history",
              endpoint: "GET /v1/project/history",
            }).description
          }
          error={history.error}
          onRetry={() => void history.refetch()}
        />
      ) : items.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            title="No snapshots yet"
            description="Create a snapshot from a ZIP archive to start building versioned project history."
            action={{
              label: "New Snapshot",
              onClick: () => setUploadOpen(true),
            }}
          />
        </Card>
      ) : (
        <Card padding="none">
          <CardHeader
            title="Snapshots"
            subtitle={`${items.length} captured · most recent first`}
          />
          <div className="space-y-1.5 px-4 pb-4">
            {items.map((item) => (
              <SnapshotRow
                key={item.snapshotId}
                item={item}
                onClick={() => router.push(`/snapshot/${item.snapshotId}`)}
              />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SnapshotRow({
  item,
  onClick,
}: {
  item: ProjectHistoryItem;
  onClick: () => void;
}) {
  return (
    /*
     * The row wrapper is a plain container: the navigation affordance is a real
     * <button> that spans the row, and the copy control sits beside it rather
     * than nested inside it. Nesting one button inside another is invalid HTML
     * and makes both unreliable for keyboard and screen-reader users.
     */
    <div className="group relative flex flex-wrap items-center gap-3 rounded border border-transparent px-3 py-2 transition-colors hover:border-ink-border/40 hover:bg-ink-1/50 focus-within:border-forge/40">
      <span
        aria-hidden="true"
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded border",
          item.pipelineId
            ? "border-forge/20 bg-forge/10 text-forge"
            : "border-steel/20 bg-steel/10 text-steel",
        ].join(" ")}
      >
        <FolderArchive size={13} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Stretched link target — covers the row without wrapping the copy button. */}
          <button
            type="button"
            onClick={onClick}
            aria-label={`View snapshot ${item.snapshotId}`}
            className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            <Mono className="text-ink-fg group-hover:text-forge">
              {shortId(item.snapshotId, 16)}
            </Mono>
          </button>
          {/* Raised above the stretched hit area so it stays clickable. */}
          <span className="relative z-10">
            <CopyButton value={item.snapshotId} label="Copy snapshot ID" />
          </span>
          {item.pipelineId && (
            <span className="font-mono text-[10px] text-ink-subtle">
              pipeline {shortId(item.pipelineId, 10)}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[10px] text-ink-muted">
          {formatDateTime(item.createdAt)} · {item.fileCount} files
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {item.verificationStatus && (
          <StatusBadge
            variant={verificationVariant(item.verificationStatus)}
            size="sm"
          >
            {item.verificationStatus}
          </StatusBadge>
        )}
        <ChevronRight
          size={12}
          aria-hidden="true"
          className="text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-forge"
        />
      </div>
    </div>
  );
}
