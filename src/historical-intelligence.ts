import type {
  ArchitectureDrift,
  Evidence,
  FileChangeFrequency,
  HistoricalChurnSummary,
  HistoricalProjectIntelligence,
  ProjectHistoryItem,
  ProjectSnapshot,
} from "./domain.js";
import { compareSnapshots } from "./snapshot-diff.js";
import { StateStore } from "./state-store.js";

/**
 * Generates evidence-grounded historical project intelligence over persisted snapshot history.
 */
export async function generateHistoricalIntelligence(
  snapshotId: string,
  store: StateStore,
  historyLimit = 10,
): Promise<HistoricalProjectIntelligence> {
  const safeLimit = Math.min(Math.max(1, historyLimit), 50);
  const currentSnapshot = await store.getSnapshot(snapshotId);

  if (!currentSnapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  // Load snapshot history chain (sorted newest first)
  const allSnapshots = await store.getSnapshots(50);
  const targetIndex = allSnapshots.findIndex((s) => s.snapshotId === snapshotId);

  // Take up to safeLimit previous snapshots relative to target snapshot
  const window =
    targetIndex !== -1
      ? allSnapshots.slice(targetIndex, targetIndex + safeLimit + 1)
      : [currentSnapshot];

  // Chronological order (oldest first, ending with target snapshot)
  const chronologicalChain = [...window].reverse();

  const previousSnapshot: ProjectSnapshot | undefined =
    chronologicalChain.length > 1
      ? chronologicalChain[chronologicalChain.length - 2]
      : undefined;

  // Single transition comparison against immediate previous snapshot
  const immediateDiff = previousSnapshot
    ? compareSnapshots(previousSnapshot, currentSnapshot)
    : undefined;

  // Pairwise comparisons across the historical chain
  const transitions: ReturnType<typeof compareSnapshots>[] = [];
  for (let i = 0; i < chronologicalChain.length - 1; i++) {
    const before = chronologicalChain[i]!;
    const after = chronologicalChain[i + 1]!;
    transitions.push(compareSnapshots(before, after));
  }

  const transitionCount = transitions.length;

  // Compute file change frequency
  const fileChangeCounts = new Map<string, number>();

  for (const diff of transitions) {
    const changedInDiff = new Set<string>();
    for (const item of diff.created) changedInDiff.add(item.path);
    for (const item of diff.modified) changedInDiff.add(item.path);
    for (const item of diff.deleted) changedInDiff.add(item.path);
    for (const item of diff.renamed) {
      changedInDiff.add(item.path);
      if (item.fromPath) changedInDiff.add(item.fromPath);
    }

    for (const p of changedInDiff) {
      fileChangeCounts.set(p, (fileChangeCounts.get(p) ?? 0) + 1);
    }
  }

  const changeFrequency: FileChangeFrequency[] = Array.from(
    fileChangeCounts.entries(),
  ).map(([pathStr, count]) => ({
    path: pathStr,
    changeCount: count,
    transitionCount,
    changeRate: transitionCount > 0 ? Number((count / transitionCount).toFixed(4)) : 0,
  }));

  // Sort change frequency descending by changeRate, then path ascending
  changeFrequency.sort((a, b) => b.changeRate - a.changeRate || a.path.localeCompare(b.path));

  // Compute aggregate churn metrics
  const churnSummary: HistoricalChurnSummary = {
    totalAddedFiles: transitions.reduce((acc, t) => acc + t.summary.totalCreated, 0),
    totalDeletedFiles: transitions.reduce((acc, t) => acc + t.summary.totalDeleted, 0),
    totalModifiedFiles: transitions.reduce((acc, t) => acc + t.summary.totalModified, 0),
    totalRenamedFiles: transitions.reduce((acc, t) => acc + t.summary.totalRenamed, 0),
    totalAddedBytes: transitions.reduce((acc, t) => acc + t.summary.totalAddedBytes, 0),
    totalDeletedBytes: transitions.reduce((acc, t) => acc + t.summary.totalDeletedBytes, 0),
  };

  // Evaluate Architecture Drift
  const indicators: string[] = [];
  const evidenceList: Evidence[] = [];

  if (immediateDiff?.projectModelChanged) {
    indicators.push("Project model fingerprint changed from previous snapshot.");
    evidenceList.push({
      file: "projectModel",
      detail: `Model fingerprint shifted between ${immediateDiff.beforeSnapshotId} and ${immediateDiff.afterSnapshotId}`,
    });
  }

  if (immediateDiff && immediateDiff.dependencyChanges.length > 0) {
    indicators.push(
      `${immediateDiff.dependencyChanges.length} dependency changes detected since previous snapshot.`,
    );
    for (const dep of immediateDiff.dependencyChanges) {
      evidenceList.push({
        file: "package.json",
        detail: `${dep.operation} dependency ${dep.name} (${dep.beforeVersion ?? "none"} -> ${dep.afterVersion ?? "none"})`,
      });
    }
  }

  if (immediateDiff) {
    for (const [cat, dist] of Object.entries(immediateDiff.categoryDistribution)) {
      if (dist && Math.abs(dist.after - dist.before) >= 3) {
        indicators.push(
          `Significant file distribution change in category ${cat} (${dist.before} -> ${dist.after}).`,
        );
      }
    }
  }

  const architectureDrift: ArchitectureDrift = {
    detected: indicators.length > 0,
    indicators,
    moduleChanges: immediateDiff?.moduleChanges ?? { added: [], removed: [] },
    dependencyChanges: immediateDiff?.dependencyChanges ?? [],
    projectModelChanged: immediateDiff?.projectModelChanged ?? false,
    confidence:
      immediateDiff?.projectModelChanged
        ? "HIGH"
        : indicators.length > 0
          ? "MEDIUM"
          : "LOW",
    evidence: evidenceList,
    limitations:
      transitionCount === 0
        ? ["No previous snapshot available for historical comparison."]
        : [],
  };

  // Source and Test File counts
  const sourceFileCount = currentSnapshot.files.filter((f) => f.category === "SOURCE").length;
  const testFileCount = currentSnapshot.files.filter((f) => f.category === "TEST").length;

  return {
    projectSnapshotId: currentSnapshot.snapshotId,
    previousSnapshotId: previousSnapshot?.snapshotId,
    snapshotCount: chronologicalChain.length,
    totalFiles: currentSnapshot.files.length,
    sourceFileCount,
    testFileCount,
    dependencyCount: currentSnapshot.dependencies?.length ?? 0,
    filesAddedSincePrevious: immediateDiff?.summary.totalCreated ?? 0,
    filesModifiedSincePrevious: immediateDiff?.summary.totalModified ?? 0,
    filesDeletedSincePrevious: immediateDiff?.summary.totalDeleted ?? 0,
    filesRenamedSincePrevious: immediateDiff?.summary.totalRenamed ?? 0,
    dependencyChanges: immediateDiff?.dependencyChanges ?? [],
    moduleChanges: immediateDiff?.moduleChanges ?? { added: [], removed: [] },
    projectModelChanged: immediateDiff?.projectModelChanged ?? false,
    changeFrequency,
    churnSummary,
    architectureDrift,
    evidence: evidenceList,
  };
}

/**
 * Retrieves the deterministic historical timeline of project snapshots.
 */
export async function getProjectHistoryTimeline(
  store: StateStore,
  limit = 20,
): Promise<ProjectHistoryItem[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const snapshots = await store.getSnapshots(safeLimit);
  const executions = await store.listExecutions(safeLimit * 2);

  const executionBySnapshotId = new Map(
    executions.map((e) => [e.snapshotId, e]),
  );

  return snapshots.map((s) => {
    const exec = executionBySnapshotId.get(s.snapshotId);
    return {
      snapshotId: s.snapshotId,
      pipelineId: exec?.pipelineId,
      createdAt: s.createdAt,
      fileCount: s.files.length,
      dependencyFingerprint: s.dependencies?.map((d) => `${d.name}@${d.version}`).sort().join(";"),
      projectModelFingerprint: s.projectModelFingerprint,
      verificationStatus: exec?.verificationStatus,
    };
  });
}
