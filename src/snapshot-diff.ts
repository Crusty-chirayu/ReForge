import type {
  FileCategory,
  ProjectSnapshot,
  SnapshotDependencyDiff,
  SnapshotDiff,
  SnapshotFileDiff,
} from "./domain.js";

/**
 * Deterministically compares two ProjectSnapshots.
 *
 * Rules:
 * - Compares file paths, SHA-256 content hashes, byte sizes, and file categories.
 * - Detects renames conservatively: only when a deleted file and created file share an
 *   unambiguous 1-to-1 identical content hash. Ambiguous duplicate hashes remain CREATE + DELETE.
 * - Compares dependency entries for ADD, REMOVE, and VERSION_CHANGE.
 * - Categorizes distribution changes.
 * - Deterministic alphabetical sorting on all lists.
 */
export function compareSnapshots(
  before: ProjectSnapshot,
  after: ProjectSnapshot,
): SnapshotDiff {
  const beforeFilesMap = new Map(before.files.map((f) => [f.path, f]));
  const afterFilesMap = new Map(after.files.map((f) => [f.path, f]));

  const rawCreated: SnapshotFileDiff[] = [];
  const modified: SnapshotFileDiff[] = [];
  const rawDeleted: SnapshotFileDiff[] = [];
  const unchanged: SnapshotFileDiff[] = [];

  // Categorize files present in both or modified/created/deleted by path
  for (const afterFile of after.files) {
    const beforeFile = beforeFilesMap.get(afterFile.path);
    if (!beforeFile) {
      rawCreated.push({
        path: afterFile.path,
        operation: "CREATE",
        afterHash: afterFile.hash,
        afterSize: afterFile.size,
        category: afterFile.category,
      });
    } else if (beforeFile.hash === afterFile.hash) {
      unchanged.push({
        path: afterFile.path,
        operation: "UNCHANGED",
        beforeHash: beforeFile.hash,
        afterHash: afterFile.hash,
        beforeSize: beforeFile.size,
        afterSize: afterFile.size,
        category: afterFile.category,
      });
    } else {
      modified.push({
        path: afterFile.path,
        operation: "MODIFY",
        beforeHash: beforeFile.hash,
        afterHash: afterFile.hash,
        beforeSize: beforeFile.size,
        afterSize: afterFile.size,
        category: afterFile.category,
      });
    }
  }

  for (const beforeFile of before.files) {
    if (!afterFilesMap.has(beforeFile.path)) {
      rawDeleted.push({
        path: beforeFile.path,
        operation: "DELETE",
        beforeHash: beforeFile.hash,
        beforeSize: beforeFile.size,
        category: beforeFile.category,
      });
    }
  }

  // Deterministic Rename Detection
  // Group rawCreated and rawDeleted by hash to find unambiguous 1-to-1 hash matches
  const createdByHash = new Map<string, SnapshotFileDiff[]>();
  for (const item of rawCreated) {
    if (!item.afterHash) continue;
    const list = createdByHash.get(item.afterHash) ?? [];
    list.push(item);
    createdByHash.set(item.afterHash, list);
  }

  const deletedByHash = new Map<string, SnapshotFileDiff[]>();
  for (const item of rawDeleted) {
    if (!item.beforeHash) continue;
    const list = deletedByHash.get(item.beforeHash) ?? [];
    list.push(item);
    deletedByHash.set(item.beforeHash, list);
  }

  const renamed: SnapshotFileDiff[] = [];
  const created: SnapshotFileDiff[] = [];
  const deleted: SnapshotFileDiff[] = [];

  const matchedCreatedPaths = new Set<string>();
  const matchedDeletedPaths = new Set<string>();

  // Only match when hash occurs exactly once in deleted AND exactly once in created
  for (const [hash, delList] of deletedByHash.entries()) {
    const createList = createdByHash.get(hash);
    if (delList.length === 1 && createList && createList.length === 1) {
      const delItem = delList[0]!;
      const createItem = createList[0]!;

      renamed.push({
        path: createItem.path,
        operation: "RENAME",
        fromPath: delItem.path,
        toPath: createItem.path,
        beforeHash: hash,
        afterHash: hash,
        beforeSize: delItem.beforeSize,
        afterSize: createItem.afterSize,
        category: createItem.category ?? delItem.category,
      });

      matchedDeletedPaths.add(delItem.path);
      matchedCreatedPaths.add(createItem.path);
    }
  }

  for (const item of rawCreated) {
    if (!matchedCreatedPaths.has(item.path)) {
      created.push(item);
    }
  }

  for (const item of rawDeleted) {
    if (!matchedDeletedPaths.has(item.path)) {
      deleted.push(item);
    }
  }

  // Deterministic sorting by path
  created.sort((a, b) => a.path.localeCompare(b.path));
  modified.sort((a, b) => a.path.localeCompare(b.path));
  deleted.sort((a, b) => a.path.localeCompare(b.path));
  unchanged.sort((a, b) => a.path.localeCompare(b.path));
  renamed.sort((a, b) => a.path.localeCompare(b.path));

  // Dependency comparison
  const beforeDepsMap = new Map((before.dependencies ?? []).map((d) => [`${d.name}:${d.type}`, d]));
  const afterDepsMap = new Map((after.dependencies ?? []).map((d) => [`${d.name}:${d.type}`, d]));

  const dependencyChanges: SnapshotDependencyDiff[] = [];

  for (const [key, afterDep] of afterDepsMap.entries()) {
    const beforeDep = beforeDepsMap.get(key);
    if (!beforeDep) {
      dependencyChanges.push({
        operation: "ADD",
        name: afterDep.name,
        afterVersion: afterDep.version,
        type: afterDep.type,
      });
    } else if (beforeDep.version !== afterDep.version) {
      dependencyChanges.push({
        operation: "VERSION_CHANGE",
        name: afterDep.name,
        beforeVersion: beforeDep.version,
        afterVersion: afterDep.version,
        type: afterDep.type,
      });
    }
  }

  for (const [key, beforeDep] of beforeDepsMap.entries()) {
    if (!afterDepsMap.has(key)) {
      dependencyChanges.push({
        operation: "REMOVE",
        name: beforeDep.name,
        beforeVersion: beforeDep.version,
        type: beforeDep.type,
      });
    }
  }

  dependencyChanges.sort((a, b) => a.name.localeCompare(b.name));

  // Category distribution calculation
  const allCategories: FileCategory[] = [
    "SOURCE",
    "TEST",
    "CONFIG",
    "DOCUMENTATION",
    "ASSET",
    "GENERATED",
    "DEPENDENCY",
    "UNKNOWN",
  ];

  const categoryDistribution: Partial<Record<FileCategory, { before: number; after: number }>> = {};

  for (const cat of allCategories) {
    const beforeCount = before.files.filter((f) => f.category === cat).length;
    const afterCount = after.files.filter((f) => f.category === cat).length;
    if (beforeCount > 0 || afterCount > 0) {
      categoryDistribution[cat] = { before: beforeCount, after: afterCount };
    }
  }

  // Summary statistics
  const totalAddedBytes = created.reduce((acc, f) => acc + (f.afterSize ?? 0), 0);
  const totalDeletedBytes = deleted.reduce((acc, f) => acc + (f.beforeSize ?? 0), 0);

  const projectModelChanged =
    Boolean(before.projectModelFingerprint || after.projectModelFingerprint) &&
    before.projectModelFingerprint !== after.projectModelFingerprint;

  return {
    beforeSnapshotId: before.snapshotId,
    afterSnapshotId: after.snapshotId,
    created,
    modified,
    deleted,
    unchanged,
    renamed,
    dependencyChanges,
    moduleChanges: { added: [], removed: [] },
    projectModelChanged,
    categoryDistribution,
    summary: {
      totalCreated: created.length,
      totalModified: modified.length,
      totalDeleted: deleted.length,
      totalUnchanged: unchanged.length,
      totalRenamed: renamed.length,
      totalAddedBytes,
      totalDeletedBytes,
    },
  };
}
