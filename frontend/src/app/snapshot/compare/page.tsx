"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, GitCompare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Mono } from "@/components/ui/mono";
import { useProjectHistory } from "@/lib/query/use-project-history";
import { formatDateTime, shortId } from "@/lib/utils/format";

export default function SnapshotCompareHubPage() {
  const router = useRouter();
  const { data, isLoading, error } = useProjectHistory(50);
  const items = useMemo(() => data?.history ?? [], [data]);

  const [beforeId, setBeforeId] = useState<string>(() => items[1]?.snapshotId ?? "");
  const [afterId, setAfterId] = useState<string>(() => items[0]?.snapshotId ?? "");

  // Update defaults when items load
  const effectiveBefore = beforeId || items[1]?.snapshotId || "";
  const effectiveAfter = afterId || items[0]?.snapshotId || "";

  const canCompare =
    effectiveBefore &&
    effectiveAfter &&
    effectiveBefore !== effectiveAfter;

  const handleCompare = () => {
    if (!canCompare) return;
    router.push(`/snapshot/compare/${encodeURIComponent(effectiveBefore)}/${encodeURIComponent(effectiveAfter)}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading snapshots for comparison">
        <Skeleton className="h-8 w-64" />
        <Skeleton rows={3} height="4rem" className="w-full" />
      </div>
    );
  }

  if (error || items.length < 2) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-meta text-text-secondary">
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowLeft size={12} />}
            onClick={() => router.push("/snapshots")}
          >
            Snapshots
          </Button>
          <ChevronRight size={11} className="text-text-tertiary" />
          <span className="font-mono text-text-primary">Compare</span>
        </div>
        <Card padding="lg">
          <EmptyState
            title="At least two snapshots required"
            description="Comparing snapshots requires at least two snapshots in the project timeline. Create new snapshots or run a pipeline to build comparison history."
            action={{ label: "View Snapshots", onClick: () => router.push("/snapshots") }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-meta text-text-secondary">
        <Button
          variant="ghost"
          size="sm"
          icon={<ArrowLeft size={12} />}
          onClick={() => router.push("/snapshots")}
        >
          Snapshots
        </Button>
        <ChevronRight size={11} className="text-text-tertiary" />
        <span className="font-mono text-text-primary">Snapshot Comparison</span>
      </div>

      {/* Header */}
      <div className="border-b border-border-subtle pb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded border border-accent/30 bg-accent-subtle text-accent">
            <GitCompare size={15} />
          </span>
          <h1 className="text-h2-dense font-semibold text-text-primary tracking-tight">
            Compare Project Snapshots
          </h1>
        </div>
        <p className="mt-1 text-ui-dense text-text-secondary">
          Select any baseline snapshot and comparison target to inspect deterministic file modifications, additions, deletions, and dependency transitions.
        </p>
      </div>

      {/* Comparison Selector */}
      <Card padding="lg">
        <CardHeader
          title="Select Snapshot Pair"
          subtitle="Choose the baseline (before) and target (after) snapshots to compare"
        />
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {/* Baseline Before */}
          <div className="space-y-2">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
              Baseline Snapshot (Before)
            </label>
            <select
              value={effectiveBefore}
              onChange={(e) => setBeforeId(e.target.value)}
              className="w-full rounded-[4px] border border-border-default bg-bg-surface px-3 py-2 font-mono text-ui-dense text-text-primary outline-none focus:border-accent"
              aria-label="Baseline snapshot"
            >
              {items.map((item) => (
                <option key={item.snapshotId} value={item.snapshotId}>
                  {shortId(item.snapshotId, 16)} · {item.fileCount} files · {formatDateTime(item.createdAt)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-tertiary">
              The earlier point in time or pre-change snapshot state.
            </p>
          </div>

          {/* Target After */}
          <div className="space-y-2">
            <label className="block font-mono text-[11px] uppercase tracking-wider text-text-secondary font-semibold">
              Comparison Target (After)
            </label>
            <select
              value={effectiveAfter}
              onChange={(e) => setAfterId(e.target.value)}
              className="w-full rounded-[4px] border border-border-default bg-bg-surface px-3 py-2 font-mono text-ui-dense text-text-primary outline-none focus:border-accent"
              aria-label="Target snapshot"
            >
              {items.map((item) => (
                <option key={item.snapshotId} value={item.snapshotId}>
                  {shortId(item.snapshotId, 16)} · {item.fileCount} files · {formatDateTime(item.createdAt)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-text-tertiary">
              The later point in time or post-change snapshot state.
            </p>
          </div>
        </div>

        {effectiveBefore === effectiveAfter && (
          <p className="mt-4 rounded border border-medium/30 bg-medium/10 px-3 py-2 font-mono text-[11px] text-medium">
            Please select two different snapshots to perform comparison.
          </p>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4">
          <div className="flex items-center gap-2 text-ui-dense">
            <Mono className="text-text-secondary">{shortId(effectiveBefore, 12)}</Mono>
            <ArrowRight size={13} className="text-text-tertiary" />
            <Mono className="text-accent">{shortId(effectiveAfter, 12)}</Mono>
          </div>
          <Button
            variant="forge"
            size="md"
            icon={<GitCompare size={14} />}
            disabled={!canCompare}
            onClick={handleCompare}
          >
            Launch Comparison
          </Button>
        </div>
      </Card>
    </div>
  );
}
