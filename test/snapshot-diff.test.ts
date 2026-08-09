import assert from "node:assert/strict";
import test from "node:test";
import { compareSnapshots } from "../src/snapshot-diff.js";
import type { ProjectSnapshot } from "../src/domain.js";

const provenance = {
  source: { kind: "archive" as const, reference: "test.zip" },
  licenses: [],
  copyrightNotices: [],
};

const createMockSnapshot = (
  id: string,
  files: { path: string; hash: string; size: number; category?: any }[],
  dependencies: { name: string; version: string; type: "production" | "development" | "peer" }[] = [],
  projectModelFingerprint?: string,
): ProjectSnapshot => ({
  snapshotId: id,
  provenance,
  files: files.map((f) => ({
    path: f.path,
    hash: f.hash,
    size: f.size,
    category: f.category ?? "SOURCE",
  })),
  dependencies,
  projectModelFingerprint,
  createdAt: new Date().toISOString(),
});

test("1. Identical snapshots produce zero changes", () => {
  const snap = createMockSnapshot("s1", [
    { path: "src/a.ts", hash: "h1", size: 10 },
  ]);
  const diff = compareSnapshots(snap, snap);

  assert.equal(diff.summary.totalCreated, 0);
  assert.equal(diff.summary.totalModified, 0);
  assert.equal(diff.summary.totalDeleted, 0);
  assert.equal(diff.summary.totalRenamed, 0);
  assert.equal(diff.unchanged.length, 1);
  assert.equal(diff.projectModelChanged, false);
});

test("2, 3, 4: CREATE, MODIFY, and DELETE detection", () => {
  const s1 = createMockSnapshot("s1", [
    { path: "src/keep.ts", hash: "h1", size: 10 },
    { path: "src/mod.ts", hash: "h2_old", size: 10 },
    { path: "src/del.ts", hash: "h3", size: 10 },
  ]);

  const s2 = createMockSnapshot("s2", [
    { path: "src/keep.ts", hash: "h1", size: 10 },
    { path: "src/mod.ts", hash: "h2_new", size: 20 },
    { path: "src/add.ts", hash: "h4", size: 15 },
  ]);

  const diff = compareSnapshots(s1, s2);

  assert.equal(diff.created.length, 1);
  assert.equal(diff.created[0]?.path, "src/add.ts");
  assert.equal(diff.modified.length, 1);
  assert.equal(diff.modified[0]?.path, "src/mod.ts");
  assert.equal(diff.deleted.length, 1);
  assert.equal(diff.deleted[0]?.path, "src/del.ts");
  assert.equal(diff.unchanged.length, 1);
  assert.equal(diff.unchanged[0]?.path, "src/keep.ts");
});

test("5. Deterministic RENAME detection for 1-to-1 match", () => {
  const s1 = createMockSnapshot("s1", [
    { path: "src/oldName.ts", hash: "unique_content_hash", size: 100 },
  ]);
  const s2 = createMockSnapshot("s2", [
    { path: "src/newName.ts", hash: "unique_content_hash", size: 100 },
  ]);

  const diff = compareSnapshots(s1, s2);

  assert.equal(diff.renamed.length, 1);
  assert.equal(diff.renamed[0]?.fromPath, "src/oldName.ts");
  assert.equal(diff.renamed[0]?.toPath, "src/newName.ts");
  assert.equal(diff.created.length, 0);
  assert.equal(diff.deleted.length, 0);
});

test("6. Ambiguous rename stays conservative (multiple deleted/created with same hash)", () => {
  const s1 = createMockSnapshot("s1", [
    { path: "src/a.ts", hash: "shared_hash", size: 50 },
    { path: "src/b.ts", hash: "shared_hash", size: 50 },
  ]);
  const s2 = createMockSnapshot("s2", [
    { path: "src/c.ts", hash: "shared_hash", size: 50 },
    { path: "src/d.ts", hash: "shared_hash", size: 50 },
  ]);

  const diff = compareSnapshots(s1, s2);

  assert.equal(diff.renamed.length, 0);
  assert.equal(diff.created.length, 2);
  assert.equal(diff.deleted.length, 2);
});

test("7, 8, 9: Dependency ADD, REMOVE, and VERSION_CHANGE detection", () => {
  const s1 = createMockSnapshot(
    "s1",
    [],
    [
      { name: "fastify", version: "4.0.0", type: "production" },
      { name: "zod", version: "3.20.0", type: "production" },
    ],
  );

  const s2 = createMockSnapshot(
    "s2",
    [],
    [
      { name: "fastify", version: "4.20.0", type: "production" },
      { name: "typescript", version: "5.0.0", type: "development" },
    ],
  );

  const diff = compareSnapshots(s1, s2);

  assert.equal(diff.dependencyChanges.length, 3);

  const add = diff.dependencyChanges.find((d) => d.operation === "ADD");
  assert.ok(add);
  assert.equal(add.name, "typescript");

  const remove = diff.dependencyChanges.find((d) => d.operation === "REMOVE");
  assert.ok(remove);
  assert.equal(remove.name, "zod");

  const versionChange = diff.dependencyChanges.find(
    (d) => d.operation === "VERSION_CHANGE",
  );
  assert.ok(versionChange);
  assert.equal(versionChange.name, "fastify");
  assert.equal(versionChange.beforeVersion, "4.0.0");
  assert.equal(versionChange.afterVersion, "4.20.0");
});

test("10, 11: File category distribution and projectModelFingerprint change", () => {
  const s1 = createMockSnapshot(
    "s1",
    [{ path: "src/app.ts", hash: "h1", size: 10, category: "SOURCE" }],
    [],
    "model_v1",
  );

  const s2 = createMockSnapshot(
    "s2",
    [
      { path: "src/app.ts", hash: "h1", size: 10, category: "SOURCE" },
      { path: "test/app.test.ts", hash: "h2", size: 20, category: "TEST" },
    ],
    [],
    "model_v2",
  );

  const diff = compareSnapshots(s1, s2);

  assert.equal(diff.projectModelChanged, true);
  assert.deepEqual(diff.categoryDistribution.TEST, { before: 0, after: 1 });
  assert.deepEqual(diff.categoryDistribution.SOURCE, { before: 1, after: 1 });
});
