"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { HeroPanel } from "@/components/dashboard/hero-panel";
import { OverviewStats } from "@/components/dashboard/overview-stats";
import { PipelineHistorySection } from "@/components/dashboard/pipeline-history-section";
import { ProjectHistorySection } from "@/components/dashboard/project-history-section";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import {
  usePipelineHistory,
  useProjectHistory,
} from "@/lib/query";
import { deriveLatestActivity } from "@/lib/utils/activity";
import { deriveDashboardStats } from "@/lib/utils/stats";

export default function DashboardPage() {
  const router = useRouter();
  const projectHistoryQuery = useProjectHistory(20);
  const pipelineHistoryQuery = usePipelineHistory(50);

  const projectItems = useMemo(
    () => projectHistoryQuery.data?.history ?? [],
    [projectHistoryQuery.data],
  );
  const pipelineItems = useMemo(
    () => pipelineHistoryQuery.data?.history ?? [],
    [pipelineHistoryQuery.data],
  );

  const latestActivity = useMemo(
    () => deriveLatestActivity(projectItems, pipelineItems),
    [projectItems, pipelineItems],
  );

  const stats = useMemo(
    () => deriveDashboardStats(projectItems, pipelineItems),
    [projectItems, pipelineItems],
  );

  const statsLoading =
    projectHistoryQuery.isLoading || pipelineHistoryQuery.isLoading;

  return (
    <div className="space-y-6">
      <HeroPanel latestActivity={latestActivity} />

      <OverviewStats stats={stats} isLoading={statsLoading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ProjectHistorySection
          items={projectItems}
          isLoading={projectHistoryQuery.isLoading}
          error={projectHistoryQuery.error}
          onRetry={() => void projectHistoryQuery.refetch()}
          onNavigate={(snapshotId) => router.push(`/snapshot/${snapshotId}`)}
          onAnalyze={() => router.push("/analyze")}
        />
        <PipelineHistorySection
          items={pipelineItems}
          isLoading={pipelineHistoryQuery.isLoading}
          error={pipelineHistoryQuery.error}
          onRetry={() => void pipelineHistoryQuery.refetch()}
          onNavigate={(pipelineId) => router.push(`/pipeline/${pipelineId}`)}
          onAnalyze={() => router.push("/pipeline")}
        />
      </div>

      <RecentActivity projectItems={projectItems} pipelineItems={pipelineItems} />
    </div>
  );
}
