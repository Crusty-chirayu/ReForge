"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  GitCompare,
  Layers,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Mono } from "@/components/ui/mono";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { ApiError } from "@/lib/api";
import {
  useSnapshot,
  useSnapshotIntelligence,
} from "@/lib/query";
import { formatBytes, formatDateTime, shortId } from "@/lib/utils/format";
import type { FileCategory, ProjectSnapshot } from "@/lib/api/types";

type Tab = "overview" | "intelligence";

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

function categoryColor(category: FileCategory): string {
  switch (category) {
    case "SOURCE":
      return "border-steel/30 bg-steel/10 text-steel";
    case "TEST":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
    case "CONFIG":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "DOCUMENTATION":
      return "border-violet-500/30 bg-violet-500/10 text-violet-400";
    default:
      return "border-ink-border/40 bg-ink-1/40 text-ink-muted";
  }
}

export default function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ snapshotId: string }>;
}) {
  const { snapshotId } = use(params);
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const snapshotQuery = useSnapshot(snapshotId);
  const intelligenceQuery = useSnapshotIntelligence(snapshotId, 10);

  if (snapshotQuery.isLoading) {
    return (
      <div
        className="space-y-6"
        role="status"
        aria-label="Loading snapshot"
      >
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-28 w-full rounded border border-ink-border/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded border border-ink-border/40" />
          ))}
        </div>
        <Skeleton rows={4} height="3rem" className="w-full" />
      </div>
    );
  }

  if (snapshotQuery.error || !snapshotQuery.data?.snapshot) {
    const is404 =
      snapshotQuery.error instanceof ApiError &&
      snapshotQuery.error.status === 404;
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
          <Mono className="text-ink-fg">{shortId(snapshotId, 12)}</Mono>
        </div>
        <Card padding="lg">
          {snapshotQuery.error ? (
            <ErrorState
              title={is404 ? "Snapshot not found" : "Unable to load snapshot"}
              description={
                is404
                  ? "The requested snapshot does not exist (404)."
                  : "GET /v1/snapshot/:snapshotId failed."
              }
              error={snapshotQuery.error}
              onRetry={() => void snapshotQuery.refetch()}
            />
          ) : (
            <EmptyState
              title="Snapshot not found"
              description="The requested snapshot could not be loaded."
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

  const snapshot = snapshotQuery.data.snapshot;

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
        <Mono className="text-ink-fg">{shortId(snapshotId, 16)}</Mono>
        <span className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<GitCompare size={12} />}
            onClick={() => router.push("/snapshots")}
          >
            Compare
          </Button>
        </span>
      </div>

      {/* Header */}
      <SnapshotHeader snapshot={snapshot} />

      {/* Tabs */}
      <div className="flex w-fit gap-1 rounded border border-ink-border/40 bg-ink-1 p-1">
        <button
          type="button"
          onClick={() => setTab("overview")}
          aria-pressed={tab === "overview"}
          className={[
            "flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "overview"
              ? "bg-forge text-forge-fg shadow-glow-sm"
              : "text-ink-muted hover:text-ink-fg",
          ].join(" ")}
        >
          <Layers size={13} />
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab("intelligence")}
          aria-pressed={tab === "intelligence"}
          className={[
            "flex items-center gap-2 rounded px-3 py-1.5 text-xs font-medium transition-colors",
            tab === "intelligence"
              ? "bg-steel text-steel-fg"
              : "text-ink-muted hover:text-ink-fg",
          ].join(" ")}
        >
          <RotateCcw size={13} />
          Intelligence
        </button>
      </div>

      {tab === "overview" ? (
        <OverviewTab snapshot={snapshot} />
      ) : (
        <IntelligenceTab
          loading={intelligenceQuery.isLoading}
          error={intelligenceQuery.error}
          data={intelligenceQuery.data?.intelligence}
          onRetry={() => void intelligenceQuery.refetch()}
        />
      )}
    </div>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function SnapshotHeader({ snapshot }: { snapshot: ProjectSnapshot }) {
  const source = snapshot.provenance.source;
  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold tracking-tight text-ink-fg">
              Snapshot Details
            </h1>
            <StatusBadge variant="info">Snapshot</StatusBadge>
          </div>
          <p className="mt-1 font-mono text-[11px] text-ink-muted">
            {formatDateTime(snapshot.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded border border-ink-border/40 bg-ink-1 px-2.5 py-1.5">
          <Mono className="text-ink-fg">{shortId(snapshot.snapshotId, 12)}</Mono>
          <CopyButton value={snapshot.snapshotId} label="Copy snapshot ID" />
        </div>
      </div>
      <dl className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        <HeaderFact
          label="Source"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Mono className="text-steel">{source.kind}</Mono>
              {source.reference && (
                <Mono className="text-ink-muted">{source.reference}</Mono>
              )}
            </span>
          }
        />
        <HeaderFact
          label="Files"
          value={<span className="text-ink-fg">{snapshot.files.length}</span>}
        />
        <HeaderFact
          label="Dependencies"
          value={
            <span className="text-ink-fg">{snapshot.dependencies.length}</span>
          }
        />
        <HeaderFact
          label="Model Fingerprint"
          value={
            snapshot.projectModelFingerprint ? (
              <span className="inline-flex items-center gap-1.5">
                <Mono className="text-ink-muted">
                  {shortId(snapshot.projectModelFingerprint, 16)}
                </Mono>
                <CopyButton
                  value={snapshot.projectModelFingerprint}
                  label="Copy model fingerprint"
                />
              </span>
            ) : (
              <span className="text-ink-subtle">—</span>
            )
          }
        />
      </dl>
    </Card>
  );
}

function HeaderFact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
        {label}
      </dt>
      <dd className="min-w-0 text-right text-xs">{value}</dd>
    </div>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ snapshot }: { snapshot: ProjectSnapshot }) {
  const totalBytes = snapshot.files.reduce((sum, f) => sum + f.size, 0);
  const categoryCounts = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    count: snapshot.files.filter((f) => f.category === cat).length,
  })).filter((c) => c.count > 0);

  return (
    <div className="space-y-6">
      {/* File statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Files" value={snapshot.files.length} />
        <StatTile label="Total Size" value={formatBytes(totalBytes)} />
        <StatTile label="Dependencies" value={snapshot.dependencies.length} />
        <StatTile
          label="Categories"
          value={categoryCounts.length}
        />
      </div>

      {/* Category breakdown */}
      {categoryCounts.length > 0 && (
        <Card padding="md">
          <CardHeader title="File Categories" subtitle="Distribution by category" />
          <div className="flex flex-wrap gap-1.5">
            {categoryCounts.map((c) => (
              <span
                key={c.category}
                className={[
                  "inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10px]",
                  categoryColor(c.category),
                ].join(" ")}
              >
                {c.category}
                <span className="font-bold">{c.count}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Files */}
      <Card padding="none">
        <CardHeader
          title="Files"
          subtitle={`${snapshot.files.length} files captured in this snapshot`}
        />
        {snapshot.files.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-ink-subtle">
            No files were captured in this snapshot.
          </p>
        ) : (
          <div className="px-4 pb-4">
            <details>
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                Show all {snapshot.files.length} files
              </summary>
              <div className="mt-2 max-h-96 space-y-1 overflow-y-auto">
                {snapshot.files.map((file) => (
                  <div
                    key={file.path}
                    className="flex flex-wrap items-center gap-2 rounded border border-ink-border/20 bg-ink-0/40 px-2 py-1.5"
                  >
                    <Mono className="min-w-0 flex-1 text-ink-fg">
                      {file.path}
                    </Mono>
                    <span
                      className={[
                        "rounded border px-1 py-px font-mono text-[9px] uppercase tracking-wider",
                        categoryColor(file.category),
                      ].join(" ")}
                    >
                      {file.category}
                    </span>
                    <span className="font-mono text-[10px] text-ink-subtle">
                      {formatBytes(file.size)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mono className="text-[9px] text-ink-subtle">
                        {shortId(file.hash, 10)}
                      </Mono>
                      <CopyButton value={file.hash} label="Copy file hash" />
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </Card>

      {/* Dependencies */}
      <Card padding="none">
        <CardHeader
          title="Dependencies"
          subtitle={`${snapshot.dependencies.length} resolved`}
        />
        {snapshot.dependencies.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-ink-subtle">
            No dependencies recorded in this snapshot.
          </p>
        ) : (
          <div className="px-4 pb-4">
            <table className="w-full text-left text-xs">
              <thead className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                <tr>
                  <th className="py-2 pr-3">Name</th>
                  <th className="pr-3">Version</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-border/20">
                {snapshot.dependencies.map((dep) => (
                  <tr key={`${dep.name}:${dep.type}`}>
                    <td className="py-1.5 pr-3 font-mono text-steel">
                      {dep.name}
                    </td>
                    <td className="pr-3 font-mono text-ink-muted">
                      {dep.version}
                    </td>
                    <td>
                      <StatusBadge
                        variant={
                          dep.type === "production"
                            ? "info"
                            : dep.type === "development"
                              ? "proposal"
                              : "muted"
                        }
                        size="sm"
                      >
                        {dep.type}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Provenance */}
      <Card padding="md">
        <CardHeader title="Provenance" subtitle="Capture metadata" />
        <dl className="space-y-2">
          <HeaderFact
            label="Snapshot ID"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Mono className="text-ink-fg">{snapshot.snapshotId}</Mono>
                <CopyButton value={snapshot.snapshotId} label="Copy snapshot ID" />
              </span>
            }
          />
          <HeaderFact
            label="Source"
            value={
              <Mono className="text-steel">
                {snapshot.provenance.source.kind}
                {snapshot.provenance.source.reference
                  ? ` · ${snapshot.provenance.source.reference}`
                  : ""}
              </Mono>
            }
          />
          <HeaderFact
            label="Created"
            value={
              <span className="text-ink-muted">
                {formatDateTime(snapshot.createdAt)}
              </span>
            }
          />
        </dl>
        {snapshot.provenance.licenses.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
              Licenses
            </p>
            <div className="space-y-1">
              {snapshot.provenance.licenses.map((lic) => (
                <div
                  key={`${lic.file}-${lic.detail}`}
                  className="rounded border border-ink-border/20 bg-ink-0/40 px-2 py-1 font-mono text-[11px] text-ink-muted"
                >
                  <span className="text-steel">{lic.file}</span>
                  <span className="text-ink-subtle">: </span>
                  {lic.detail}
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-ink-border/40 bg-ink-card/60 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold leading-tight text-ink-fg">
        {value}
      </p>
    </div>
  );
}

// ── Intelligence tab ──────────────────────────────────────────────────────────

function IntelligenceTab({
  loading,
  error,
  data,
  onRetry,
}: {
  loading: boolean;
  error: Error | null;
  data: import("@/lib/api/types").HistoricalProjectIntelligence | undefined;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading intelligence">
        <Skeleton className="h-16 w-full rounded border border-ink-border/40" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded border border-ink-border/40" />
          ))}
        </div>
        <Skeleton rows={4} height="3rem" className="w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Unable to load snapshot intelligence"
        description="GET /v1/snapshot/:snapshotId/intelligence failed."
        error={error}
        onRetry={onRetry}
      />
    );
  }

  if (!data) {
    return (
      <Card padding="lg">
        <EmptyState
          title="No intelligence available"
          description="Historical intelligence could not be computed for this snapshot."
        />
      </Card>
    );
  }

  const drift = data.architectureDrift;
  const hasHistory = data.snapshotCount > 1;

  return (
    <div className="space-y-6" data-testid="intelligence-section">
      {/* Header stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <StatTile label="Snapshots" value={data.snapshotCount} />
        <StatTile label="Total Files" value={data.totalFiles} />
        <StatTile label="Source" value={data.sourceFileCount} />
        <StatTile label="Tests" value={data.testFileCount} />
        <StatTile label="Deps" value={data.dependencyCount} />
        <StatTile
          label="Model Changed"
          value={
            data.projectModelChanged ? (
              <span className="text-amber-400">YES</span>
            ) : (
              <span className="text-ink-muted">no</span>
            )
          }
        />
      </div>

      {!hasHistory && (
        <Card padding="lg" className="border-ink-border/30">
          <p className="text-xs text-ink-muted">
            This is the only snapshot in history — no previous snapshot is
            available for comparison. Create another snapshot to unlock churn,
            drift, and change-frequency intelligence.
          </p>
        </Card>
      )}

      {/* Churn summary */}
      {hasHistory && (
        <Card padding="lg">
          <CardHeader title="Churn Summary" subtitle="Changes since the previous snapshot" />
          <div className="space-y-2">
            <ChurnBar label="Added" value={data.filesAddedSincePrevious} color="bg-emerald-400" />
            <ChurnBar label="Modified" value={data.filesModifiedSincePrevious} color="bg-steel" />
            <ChurnBar label="Deleted" value={data.filesDeletedSincePrevious} color="bg-rose-400" />
            <ChurnBar label="Renamed" value={data.filesRenamedSincePrevious} color="bg-amber-400" />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 border-t border-ink-border/20 pt-2 font-mono text-[10px] text-ink-muted">
            <span>
              +{formatBytes(data.churnSummary.totalAddedBytes)} added
            </span>
            <span className="text-rose-400">
              −{formatBytes(data.churnSummary.totalDeletedBytes)} deleted
            </span>
          </div>
        </Card>
      )}

      {/* Change frequency */}
      {hasHistory && data.changeFrequency.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Change Frequency"
            subtitle={`${data.changeFrequency.length} files changed across ${data.snapshotCount - 1} transition${data.snapshotCount === 2 ? "" : "s"}`}
          />
          <div className="space-y-1.5 px-4 pb-4">
            {data.changeFrequency.slice(0, 10).map((f) => (
              <FrequencyBar key={f.path} file={f} />
            ))}
          </div>
        </Card>
      )}

      {/* Architecture drift */}
      <Card padding="none">
        <CardHeader
          title="Architecture Drift"
          subtitle={
            drift.detected ? "Drift detected" : "No drift detected"
          }
        />
        <div className="px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={drift.detected ? "warning" : "healthy"}>
              {drift.detected ? "Detected" : "Not Detected"}
            </StatusBadge>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
              confidence {drift.confidence}
            </span>
          </div>
          {drift.indicators.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {drift.indicators.map((ind) => (
                <li
                  key={ind}
                  className="flex items-start gap-2 text-xs text-ink-muted"
                >
                  <AlertTriangle size={10} className="mt-0.5 shrink-0 text-amber-400" />
                  {ind}
                </li>
              ))}
            </ul>
          )}
          {drift.limitations.length > 0 && (
            <p className="mt-3 text-[10px] text-ink-subtle">
              {drift.limitations.join(" ")}
            </p>
          )}
          {drift.evidence.length > 0 && (
            <div className="mt-3 space-y-1">
              {drift.evidence.map((ev, i) => (
                <div
                  key={`${ev.file}-${i}`}
                  className="rounded border border-ink-border/20 bg-ink-0/40 px-2 py-1 font-mono text-[11px] text-ink-muted"
                >
                  <span className="text-steel">{ev.file}</span>
                  <span className="text-ink-subtle">: </span>
                  {ev.detail}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Dependency changes */}
      {data.dependencyChanges.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Dependency Changes"
            subtitle={`${data.dependencyChanges.length} since previous snapshot`}
          />
          <div className="space-y-1.5 px-4 pb-4">
            {data.dependencyChanges.map((dep) => (
              <div
                key={`${dep.operation}-${dep.name}`}
                className="flex flex-wrap items-center gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2"
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
                {dep.beforeVersion && (
                  <Mono className="text-[9px] text-ink-subtle">
                    {dep.beforeVersion}
                  </Mono>
                )}
                {dep.afterVersion && (
                  <Mono className="text-[9px] text-ink-fg">
                    → {dep.afterVersion}
                  </Mono>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Evidence */}
      {data.evidence.length > 0 && (
        <Card padding="md">
          <CardHeader title="Evidence" subtitle="Supporting intelligence evidence" />
          <div className="space-y-1">
            {data.evidence.map((ev, i) => (
              <div
                key={`${ev.file}-${i}`}
                className="rounded border border-ink-border/20 bg-ink-0/40 px-2 py-1 font-mono text-[11px] text-ink-muted"
              >
                <span className="text-steel">{ev.file}</span>
                <span className="text-ink-subtle">: </span>
                {ev.detail}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function ChurnBar({
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
      <span className="w-20 shrink-0 text-xs text-ink-muted">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded bg-ink-2">
        <div
          className={["h-full rounded", color].join(" ")}
          style={{ width: `${Math.min(value * 25, 100)}%` }}
        />
      </div>
      <Mono className="w-6 text-right text-ink-fg">{value}</Mono>
    </div>
  );
}

function FrequencyBar({
  file,
}: {
  file: import("@/lib/api/types").FileChangeFrequency;
}) {
  const pct = Math.min(Math.round(file.changeRate * 100), 100);
  return (
    <div className="flex items-center gap-2">
      <Mono truncate className="w-56 shrink-0 text-ink-fg">
        {file.path}
      </Mono>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-ink-2">
        <div className="h-full rounded bg-forge" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[10px] text-ink-subtle">
        {file.changeCount}×
      </span>
    </div>
  );
}
