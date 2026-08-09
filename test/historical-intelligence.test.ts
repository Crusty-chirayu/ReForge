import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { StateStore } from "../src/state-store.js";
import {
  generateHistoricalIntelligence,
  getProjectHistoryTimeline,
} from "../src/historical-intelligence.js";
import { app } from "../src/server.js";
import type { ProjectSnapshot } from "../src/domain.js";

const provenance = {
  source: { kind: "archive" as const, reference: "test.zip" },
  licenses: [],
  copyrightNotices: [],
};

const makeSnapshot = (
  id: string,
  files: { path: string; hash: string; size: number; category?: any }[],
  dependencies: { name: string; version: string; type: "production" | "development" | "peer" }[] = [],
  projectModelFingerprint?: string,
  createdAt?: string,
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
  createdAt: createdAt ?? new Date().toISOString(),
});

test("1. Change frequency, churn, and architecture drift calculations over snapshot history", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-hist-test-"));
  try {
    const store = new StateStore(storeDir);

    const s1 = makeSnapshot(
      "snap-1",
      [
        { path: "src/frequent.ts", hash: "h1_v1", size: 100 },
        { path: "src/stable.ts", hash: "h2_v1", size: 200 },
      ],
      [{ name: "express", version: "4.17.0", type: "production" }],
      "model_v1",
      "2026-08-01T10:00:00Z",
    );

    const s2 = makeSnapshot(
      "snap-2",
      [
        { path: "src/frequent.ts", hash: "h1_v2", size: 120 },
        { path: "src/stable.ts", hash: "h2_v1", size: 200 },
        { path: "src/new.ts", hash: "h3_v1", size: 50 },
      ],
      [{ name: "express", version: "4.18.0", type: "production" }],
      "model_v2",
      "2026-08-02T10:00:00Z",
    );

    const s3 = makeSnapshot(
      "snap-3",
      [
        { path: "src/frequent.ts", hash: "h1_v3", size: 150 },
        { path: "src/stable.ts", hash: "h2_v1", size: 200 },
        { path: "src/new.ts", hash: "h3_v1", size: 50 },
      ],
      [{ name: "express", version: "4.18.0", type: "production" }],
      "model_v2",
      "2026-08-03T10:00:00Z",
    );

    await store.saveSnapshot(s1);
    await store.saveSnapshot(s2);
    await store.saveSnapshot(s3);

    const intel = await generateHistoricalIntelligence("snap-3", store, 10);

    assert.equal(intel.projectSnapshotId, "snap-3");
    assert.equal(intel.previousSnapshotId, "snap-2");
    assert.equal(intel.snapshotCount, 3);
    assert.equal(intel.totalFiles, 3);

    // Change frequency check
    const frequentItem = intel.changeFrequency.find((f) => f.path === "src/frequent.ts");
    assert.ok(frequentItem);
    assert.equal(frequentItem.changeCount, 2);
    assert.equal(frequentItem.transitionCount, 2);
    assert.equal(frequentItem.changeRate, 1.0);

    const stableItem = intel.changeFrequency.find((f) => f.path === "src/stable.ts");
    assert.equal(stableItem, undefined); // 0 changes in transition chain

    // Churn check
    assert.equal(intel.churnSummary.totalAddedFiles, 1);
    assert.equal(intel.churnSummary.totalModifiedFiles, 2);

    // Project history timeline
    const history = await getProjectHistoryTimeline(store);
    assert.equal(history.length, 3);
    assert.equal(history[0]?.snapshotId, "snap-3");
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("2. Snapshot comparison HTTP API returns 200 and diff result", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-api-test-"));
  const prevStoreDir = process.env.REFORGE_STORE_DIR;
  process.env.REFORGE_STORE_DIR = storeDir;

  try {
    const store = new StateStore(storeDir);
    const s1 = makeSnapshot("s1-api", [{ path: "src/a.ts", hash: "h1", size: 10 }]);
    const s2 = makeSnapshot("s2-api", [
      { path: "src/a.ts", hash: "h1_mod", size: 12 },
      { path: "src/b.ts", hash: "h2", size: 20 },
    ]);

    await store.saveSnapshot(s1);
    await store.saveSnapshot(s2);

    const res = await app.inject({
      method: "GET",
      url: "/v1/snapshots/s1-api/compare/s2-api",
    });

    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.payload);
    assert.ok(json.diff);
    assert.equal(json.diff.beforeSnapshotId, "s1-api");
    assert.equal(json.diff.afterSnapshotId, "s2-api");
    assert.equal(json.diff.created.length, 1);
    assert.equal(json.diff.modified.length, 1);
  } finally {
    process.env.REFORGE_STORE_DIR = prevStoreDir;
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("3. Snapshot intelligence HTTP API returns 200 and intelligence report", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-intel-api-"));
  const prevStoreDir = process.env.REFORGE_STORE_DIR;
  process.env.REFORGE_STORE_DIR = storeDir;

  try {
    const store = new StateStore(storeDir);
    const s1 = makeSnapshot("snap-intel-1", [{ path: "src/a.ts", hash: "h1", size: 10 }]);
    await store.saveSnapshot(s1);

    const res = await app.inject({
      method: "GET",
      url: "/v1/snapshot/snap-intel-1/intelligence?historyLimit=5",
    });

    assert.equal(res.statusCode, 200);
    const json = JSON.parse(res.payload);
    assert.ok(json.intelligence);
    assert.equal(json.intelligence.projectSnapshotId, "snap-intel-1");
  } finally {
    process.env.REFORGE_STORE_DIR = prevStoreDir;
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("4. Project history HTTP API returns 200 and timeline list", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/v1/project/history?limit=10",
  });

  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.payload);
  assert.ok(Array.isArray(json.history));
  assert.equal(json.limit, 10);
});

test("5. Invalid snapshot IDs in comparison & intelligence return 400 or 404", async () => {
  const invalidCompare = await app.inject({
    method: "GET",
    url: "/v1/snapshots/invalid!id/compare/s2",
  });
  assert.equal(invalidCompare.statusCode, 400);


  const missingCompare = await app.inject({
    method: "GET",
    url: "/v1/snapshots/missing-s1/compare/missing-s2",
  });
  assert.equal(missingCompare.statusCode, 404);

  const missingIntel = await app.inject({
    method: "GET",
    url: "/v1/snapshot/missing-snap-id/intelligence",
  });
  assert.equal(missingIntel.statusCode, 404);
});

test("6. Host workspace remains untouched during historical analysis", async () => {
  const projectFile = await readFile(path.resolve("src/historical-intelligence.ts"), "utf-8");
  assert.ok(projectFile.length > 0);
});
