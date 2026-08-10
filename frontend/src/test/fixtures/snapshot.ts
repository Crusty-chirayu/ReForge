import type {
  HistoricalProjectIntelligence,
  ProjectHistoryItem,
  ProjectSnapshot,
  SnapshotDiff,
} from "@/lib/api/types";

const PROVENANCE = {
  source: { kind: "archive" as const, reference: "acme-app.zip" },
  licenses: [{ file: "LICENSE", detail: "MIT License" }],
  copyrightNotices: [],
};

/** Snapshot at the "before" point in history. */
export const mockSnapshotBefore: ProjectSnapshot = {
  snapshotId: "snap_before123",
  provenance: PROVENANCE,
  files: [
    { path: "src/index.ts", hash: "hash-index-before", size: 2048, category: "SOURCE" },
    { path: "src/legacy.ts", hash: "hash-legacy-before", size: 4096, category: "SOURCE" },
    { path: "src/old-name.ts", hash: "hash-same-content", size: 1024, category: "SOURCE" },
    { path: "package.json", hash: "hash-pkg-before", size: 512, category: "CONFIG" },
  ],
  projectModelFingerprint: "model-fp-before",
  dependencies: [
    { name: "react", version: "18.2.0", type: "production" },
    { name: "moment", version: "2.29.4", type: "production" },
  ],
  createdAt: "2026-08-01T10:00:00.000Z",
};

/** Snapshot at the "after" point in history. */
export const mockSnapshotAfter: ProjectSnapshot = {
  snapshotId: "snap_after456",
  provenance: PROVENANCE,
  files: [
    { path: "src/index.ts", hash: "hash-index-after", size: 2400, category: "SOURCE" },
    { path: "src/new-util.ts", hash: "hash-new-util", size: 1024, category: "SOURCE" },
    { path: "src/renamed.ts", hash: "hash-same-content", size: 1024, category: "SOURCE" },
    { path: "package.json", hash: "hash-pkg-after", size: 540, category: "CONFIG" },
  ],
  projectModelFingerprint: "model-fp-after",
  dependencies: [
    { name: "react", version: "19.0.0", type: "production" },
    { name: "dayjs", version: "1.11.10", type: "production" },
  ],
  createdAt: "2026-08-10T10:00:00.000Z",
};

/** Deterministic diff between the before/after snapshots above. */
export const mockSnapshotDiff: SnapshotDiff = {
  beforeSnapshotId: "snap_before123",
  afterSnapshotId: "snap_after456",
  created: [
    { path: "src/new-util.ts", operation: "CREATE", afterHash: "hash-new-util", afterSize: 1024, category: "SOURCE" },
  ],
  modified: [
    {
      path: "src/index.ts",
      operation: "MODIFY",
      beforeHash: "hash-index-before",
      afterHash: "hash-index-after",
      beforeSize: 2048,
      afterSize: 2400,
      category: "SOURCE",
    },
    {
      path: "package.json",
      operation: "MODIFY",
      beforeHash: "hash-pkg-before",
      afterHash: "hash-pkg-after",
      beforeSize: 512,
      afterSize: 540,
      category: "CONFIG",
    },
  ],
  deleted: [
    { path: "src/legacy.ts", operation: "DELETE", beforeHash: "hash-legacy-before", beforeSize: 4096, category: "SOURCE" },
  ],
  unchanged: [
    {
      path: "src/shared.ts",
      operation: "UNCHANGED",
      beforeHash: "hash-shared",
      afterHash: "hash-shared",
      beforeSize: 512,
      afterSize: 512,
      category: "SOURCE",
    },
  ],
  renamed: [
    {
      path: "src/renamed.ts",
      operation: "RENAME",
      fromPath: "src/old-name.ts",
      toPath: "src/renamed.ts",
      beforeHash: "hash-same-content",
      afterHash: "hash-same-content",
      beforeSize: 1024,
      afterSize: 1024,
      category: "SOURCE",
    },
  ],
  dependencyChanges: [
    { operation: "ADD", name: "dayjs", afterVersion: "1.11.10", type: "production" },
    { operation: "REMOVE", name: "moment", beforeVersion: "2.29.4", type: "production" },
    { operation: "VERSION_CHANGE", name: "react", beforeVersion: "18.2.0", afterVersion: "19.0.0", type: "production" },
  ],
  moduleChanges: { added: [], removed: [] },
  projectModelChanged: true,
  categoryDistribution: {
    SOURCE: { before: 3, after: 3 },
    CONFIG: { before: 1, after: 1 },
  },
  summary: {
    totalCreated: 1,
    totalModified: 2,
    totalDeleted: 1,
    totalUnchanged: 1,
    totalRenamed: 1,
    totalAddedBytes: 1024,
    totalDeletedBytes: 4096,
  },
};

/** Historical intelligence for the after snapshot. */
export const mockIntelligence: HistoricalProjectIntelligence = {
  projectSnapshotId: "snap_after456",
  previousSnapshotId: "snap_before123",
  snapshotCount: 2,
  totalFiles: 4,
  sourceFileCount: 3,
  testFileCount: 0,
  dependencyCount: 2,
  filesAddedSincePrevious: 1,
  filesModifiedSincePrevious: 2,
  filesDeletedSincePrevious: 1,
  filesRenamedSincePrevious: 1,
  dependencyChanges: mockSnapshotDiff.dependencyChanges,
  moduleChanges: { added: [], removed: [] },
  projectModelChanged: true,
  changeFrequency: [
    { path: "src/index.ts", changeCount: 1, transitionCount: 1, changeRate: 1 },
    { path: "src/new-util.ts", changeCount: 1, transitionCount: 1, changeRate: 1 },
    { path: "src/legacy.ts", changeCount: 1, transitionCount: 1, changeRate: 1 },
  ],
  churnSummary: {
    totalAddedFiles: 1,
    totalDeletedFiles: 1,
    totalModifiedFiles: 2,
    totalRenamedFiles: 1,
    totalAddedBytes: 1024,
    totalDeletedBytes: 4096,
  },
  architectureDrift: {
    detected: true,
    indicators: [
      "Project model fingerprint changed from previous snapshot.",
      "3 dependency changes detected since previous snapshot.",
    ],
    moduleChanges: { added: [], removed: [] },
    dependencyChanges: mockSnapshotDiff.dependencyChanges,
    projectModelChanged: true,
    confidence: "HIGH",
    evidence: [
      {
        file: "projectModel",
        detail: "Model fingerprint shifted between snap_before123 and snap_after456",
      },
    ],
    limitations: [],
  },
  evidence: [
    {
      file: "projectModel",
      detail: "Model fingerprint shifted between snap_before123 and snap_after456",
    },
  ],
};

/** Minimal intelligence — no previous snapshot, no drift, no changes. */
export const mockIntelligenceEmpty: HistoricalProjectIntelligence = {
  projectSnapshotId: "snap_solo",
  previousSnapshotId: undefined,
  snapshotCount: 1,
  totalFiles: 3,
  sourceFileCount: 2,
  testFileCount: 1,
  dependencyCount: 0,
  filesAddedSincePrevious: 0,
  filesModifiedSincePrevious: 0,
  filesDeletedSincePrevious: 0,
  filesRenamedSincePrevious: 0,
  dependencyChanges: [],
  moduleChanges: { added: [], removed: [] },
  projectModelChanged: false,
  changeFrequency: [],
  churnSummary: {
    totalAddedFiles: 0,
    totalDeletedFiles: 0,
    totalModifiedFiles: 0,
    totalRenamedFiles: 0,
    totalAddedBytes: 0,
    totalDeletedBytes: 0,
  },
  architectureDrift: {
    detected: false,
    indicators: [],
    moduleChanges: { added: [], removed: [] },
    dependencyChanges: [],
    projectModelChanged: false,
    confidence: "LOW",
    evidence: [],
    limitations: ["No previous snapshot available for historical comparison."],
  },
  evidence: [],
};

/** Project history timeline (used by the snapshot index). */
export const mockProjectHistory: ProjectHistoryItem[] = [
  {
    snapshotId: "snap_after456",
    pipelineId: "pl_01F6ABC",
    createdAt: "2026-08-10T10:00:00.000Z",
    fileCount: 4,
    dependencyFingerprint: "dayjs@1.11.10;react@19.0.0",
    projectModelFingerprint: "model-fp-after",
    verificationStatus: "PASSED",
  },
  {
    snapshotId: "snap_before123",
    createdAt: "2026-08-01T10:00:00.000Z",
    fileCount: 4,
    dependencyFingerprint: "moment@2.29.4;react@18.2.0",
    projectModelFingerprint: "model-fp-before",
    verificationStatus: undefined,
  },
];
