import {
  CheckCircle2,
  Clock,
  FileText,
  FolderArchive,
  XCircle,
  Zap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "./stat-card";
import { formatNumber, formatRelativeTime } from "@/lib/utils/format";
import type { DashboardStats } from "@/lib/utils/stats";

export interface OverviewStatsProps {
  stats: DashboardStats;
  isLoading: boolean;
}

function PassRateBar({ percent }: { percent: number }) {
  return (
    <div>
      <div className="h-1 overflow-hidden rounded bg-ink-2">
        <div
          className="h-full rounded bg-emerald-400"
          style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        />
      </div>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
        Pass rate {percent}%
      </p>
    </div>
  );
}

/** Overview stat grid — every value is derived from loaded API data. */
export function OverviewStats({ stats, isLoading }: OverviewStatsProps) {
  if (isLoading) {
    return (
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
        role="status"
        aria-label="Loading overview statistics"
      >
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-[76px] rounded border border-ink-border/40 bg-ink-card/60"
        />
      ))}
      </div>
    );
  }

  const passRate =
    stats.pipelineCount > 0
      ? Math.round((stats.passedCount / stats.pipelineCount) * 100)
      : null;

  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6"
      data-testid="overview-stats"
    >
      <StatCard
        label="Snapshots"
        value={stats.snapshotCount}
        hint="loaded (limit 20)"
        icon={<FolderArchive size={14} />}
        accent="steel"
      />
      <StatCard
        label="Files Tracked"
        value={formatNumber(stats.filesTracked)}
        hint="across loaded snapshots"
        icon={<FileText size={14} />}
        accent="forge"
      />
      <StatCard
        label="Pipeline Runs"
        value={stats.pipelineCount}
        hint="loaded (limit 50)"
        icon={<Zap size={14} />}
        accent="muted"
        footer={
          passRate !== null ? <PassRateBar percent={passRate} /> : undefined
        }
      />
      <StatCard
        label="Passed"
        value={stats.passedCount}
        icon={<CheckCircle2 size={14} />}
        accent="emerald"
      />
      <StatCard
        label="Failed"
        value={stats.failedCount}
        icon={<XCircle size={14} />}
        accent="rose"
      />
      <StatCard
        label="Latest Snapshot"
        value={stats.latestSnapshotAt ? formatRelativeTime(stats.latestSnapshotAt) : "—"}
        hint="most recent event"
        icon={<Clock size={14} />}
        accent="muted"
      />
    </div>
  );
}
