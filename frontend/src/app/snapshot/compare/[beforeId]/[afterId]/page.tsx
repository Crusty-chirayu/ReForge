"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  GitCompare,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api";
import { useSnapshotCompare } from "@/lib/query";
import { formatBytes, shortId } from "@/lib/utils/format";
import type {
  FileCategory,
  SnapshotDependencyDiff,
  SnapshotFileDiff,
} from "@/lib/api/types";

const CATEGORY_ORDER: FileCategory[] = [
  "SOURCE",
  "TEST",
  "CONFIG",
  "DOCUMENTATION",
  "ASSET",
  "GENERATED",
  "DEPENDENCY",
  "UNKNOWN",
];

export default function SnapshotComparePage({
  params,
}: {
  params: Promise<{ beforeId: string; afterId: string }>;
}) {
  const { beforeId, afterId } = use(params);
  const router = useRouter();
  const query = useSnapshotCompare(beforeId, afterId);

  if (query.isLoading) {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-label="Loading snapshot comparison"
      >
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24 w-full rounded border border-ink-border/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded border border-ink-border/40" />
          ))}
        </div>
        <Skeleton rows={4} height="3rem" className="w-full" />
      </div>
    );
  }

  if (query.error || !query.data?.diff) {
    const is404 =
      query.error instanceof ApiError && query.error.status === 404;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-ink-muted">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} />}
            onClick={() => router.push("/snapshots")}
          >
            Snapshots
          </Button>
          <ChevronRight size={11} className="text-ink-subtle" />
          <span className="font-mono text-ink-fg">Compare</span>
        </div>
        <Card padding="lg">
          {query.error ? (
            <ErrorState
              title={is404 ? "Snapshots not found" : "Unable to compare snapshots"}
              description={
                is404
                  ? "One or both of the requested snapshots do not exist (404)."
                  : "GET /v1/snapshots/:beforeId/compare/:afterId failed."
              }
              error={query.error}
              onRetry={() => void query.refetch()}
            />
          ) : (
            <EmptyState
              title="Comparison unavailable"
              description="The requested snapshot comparison could not be loaded."
              action={{
                label: "Back to Snapshots",
                onClick: () => router.push("/snapshots"),
              }}
            />
          )}
        </Card>
      </div>
    );
  }

  const diff = query.data.diff;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={12} />}
          onClick={() => router.push("/snapshots")}
        >
          Snapshots
        </Button>
        <ChevronRight size={11} className="text-ink-subtle" />
        <Mono className="text-ink-fg">{shortId(beforeId, 10)}</Mono>
        <ChevronRight size={11} className="text-ink-subtle" />
        <Mono className="text-ink-fg">{shortId(afterId, 10)}</Mono>
      </div>

      {/* Header */}
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-forge/20 bg-forge/10 text-forge">
              <GitCompare size={16} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-ink-fg">
                Snapshot Comparison
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-ink-muted">
                <span className="text-steel">{shortId(beforeId, 14)}</span>
                <span className="text-ink-subtle">→</span>
                <span className="text-forge">{shortId(afterId, 14)}</span>
              </p>
            </div>
          </div>
          <StatusBadge variant={diff.projectModelChanged ? "warning" : "healthy"}>
            {diff.projectModelChanged
              ? "Project Model Changed"
              : "Project Model Unchanged"}
          </StatusBadge>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="diff-summary">
        <CountTile label="Created" value={diff.summary.totalCreated} color="text-emerald-400" icon={<Plus size={12} />} />
        <CountTile label="Modified" value={diff.summary.totalModified} color="text-steel" icon={<Pencil size={12} />} />
        <CountTile label="Deleted" value={diff.summary.totalDeleted} color="text-rose-400" icon={<Trash2 size={12} />} />
        <CountTile label="Renamed" value={diff.summary.totalRenamed} color="text-amber-400" icon={<RotateCcw size={12} />} />
        <CountTile label="Unchanged" value={diff.summary.totalUnchanged} color="text-ink-muted" icon={<FileText size={12} />} />
      </div>

      {/* Bytes */}
      <Card padding="md">
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
          <span className="text-emerald-400">
            +{formatBytes(diff.summary.totalAddedBytes)} added
          </span>
          <span className="text-rose-400">
            −{formatBytes(diff.summary.totalDeletedBytes)} deleted
          </span>
        </div>
      </Card>

      {/* Category distribution */}
      {Object.keys(diff.categoryDistribution).length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Category Distribution"
            subtitle="File category shifts"
          />
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORY_ORDER.filter(
              (cat) => diff.categoryDistribution[cat] !== undefined,
            ).map((cat) => {
              const dist = diff.categoryDistribution[cat]!;
              const delta = dist.after - dist.before;
              return (
                <div
                  key={cat}
                  className="rounded border border-ink-border/30 bg-ink-1/30 p-3"
                >
                  <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                    {cat}
                  </p>
                  <p className="mt-1 font-mono text-sm text-ink-fg">
                    {dist.before} <span className="text-ink-subtle">→</span>{" "}
                    {dist.after}
                    {delta !== 0 && (
                      <span
                        className={
                          delta > 0 ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        {" "}
                        {delta > 0 ? `+${delta}` : delta}
                      </span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Dependency changes */}
      {diff.dependencyChanges.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Dependency Changes"
            subtitle={`${diff.dependencyChanges.length} change${diff.dependencyChanges.length === 1 ? "" : "s"}`}
          />
          <div className="space-y-1.5 px-4 pb-4">
            {diff.dependencyChanges.map((dep) => (
              <DependencyRow key={`${dep.operation}-${dep.name}`} dep={dep} />
            ))}
          </div>
        </Card>
      )}

      {/* File changes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FileGroup
          title="Added Files"
          count={diff.created.length}
          items={diff.created}
          variant="created"
        />
        <FileGroup
          title="Removed Files"
          count={diff.deleted.length}
          items={diff.deleted}
          variant="deleted"
        />
        <FileGroup
          title="Modified Files"
          count={diff.modified.length}
          items={diff.modified}
          variant="modified"
        />
        <FileGroup
          title="Renamed Files"
          count={diff.renamed.length}
          items={diff.renamed}
          variant="renamed"
        />
      </div>

      {/* Unchanged */}
      {diff.unchanged.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Unchanged Files"
            subtitle={`${diff.unchanged.length} files identical in both snapshots`}
          />
          <div className="px-4 pb-4">
            <details>
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                Show {diff.unchanged.length} unchanged files
              </summary>
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                {diff.unchanged.map((file) => (
                  <Mono key={file.path} className="block text-[10px] text-ink-muted">
                    {file.path}
                  </Mono>
                ))}
              </div>
            </details>
          </div>
        </Card>
      )}

      {/* Module changes (backend supplies empty lists; render defensively) */}
      {(diff.moduleChanges.added.length > 0 ||
        diff.moduleChanges.removed.length > 0) && (
        <Card padding="md">
          <CardHeader title="Module Changes" subtitle="Structural module shifts" />
          <div className="space-y-2 text-xs">
            {diff.moduleChanges.added.map((m) => (
              <Mono key={m} className="block text-emerald-400">
                + {m}
              </Mono>
            ))}
            {diff.moduleChanges.removed.map((m) => (
              <Mono key={m} className="block text-rose-400">
                − {m}
              </Mono>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function CountTile({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded border border-ink-border/40 bg-ink-card/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true" className={color}>
          {icon}
        </span>
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
          {label}
        </p>
      </div>
      <p className={["mt-1 text-2xl font-bold leading-none", color].join(" ")}>
        {value}
      </p>
    </div>
  );
}

function DependencyRow({ dep }: { dep: SnapshotDependencyDiff }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2">
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
      {dep.beforeVersion && (
        <Mono className="text-[9px] text-ink-subtle">{dep.beforeVersion}</Mono>
      )}
      {dep.afterVersion && (
        <Mono className="text-[9px] text-ink-fg">→ {dep.afterVersion}</Mono>
      )}
    </div>
  );
}

function FileGroup({
  title,
  count,
  items,
  variant,
}: {
  title: string;
  count: number;
  items: SnapshotFileDiff[];
  variant: "created" | "deleted" | "modified" | "renamed";
}) {
  if (count === 0) return null;

  const accent =
    variant === "created"
      ? "text-emerald-400"
      : variant === "deleted"
        ? "text-rose-400"
        : variant === "modified"
          ? "text-steel"
          : "text-amber-400";

  return (
    <Card padding="none">
      <CardHeader title={title} subtitle={`${count} file${count === 1 ? "" : "s"}`} />
      <div className="px-4 pb-4">
        <details>
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
            Show {count} file{count === 1 ? "" : "s"}
          </summary>
          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {items.map((file) => (
              <FileRow key={`${file.operation}-${file.path}`} file={file} accent={accent} />
            ))}
          </div>
        </details>
      </div>
    </Card>
  );
}

function FileRow({
  file,
  accent,
}: {
  file: SnapshotFileDiff;
  accent: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded border border-ink-border/20 bg-ink-0/40 px-2 py-1.5">
      {file.operation === "RENAME" ? (
        <Mono className="min-w-0 flex-1 text-ink-fg">
          <span className="text-ink-subtle line-through">{file.fromPath}</span>
          <span className="text-ink-subtle"> → </span>
          <span className={accent}>{file.toPath}</span>
        </Mono>
      ) : (
        <Mono className={["min-w-0 flex-1", accent].join(" ")}>
          {file.path}
        </Mono>
      )}
      {file.operation !== "CREATE" && file.beforeSize !== undefined && (
        <span className="font-mono text-[9px] text-ink-subtle">
          {formatBytes(file.beforeSize)}
        </span>
      )}
      {file.afterSize !== undefined && (
        <span className="font-mono text-[9px] text-ink-muted">
          {file.operation !== "CREATE" ? "→ " : ""}
          {formatBytes(file.afterSize)}
        </span>
      )}
      {file.beforeHash && file.afterHash && file.beforeHash !== file.afterHash && (
        <span className="font-mono text-[9px] text-ink-subtle">
          {shortId(file.beforeHash, 6)} → {shortId(file.afterHash, 6)}
        </span>
      )}
    </div>
  );
}
