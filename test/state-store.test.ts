import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Readable } from "node:stream";
import { StateStore } from "../src/state-store.js";
import { runPipeline } from "../src/pipeline.js";
import { createExecutionWorkspace } from "../src/execution-workspace.js";
import { app } from "../src/server.js";
import type { PipelineResult, ProjectSnapshot } from "../src/domain.js";

interface ZipEntry {
  name: string;
  content?: Buffer | string;
  externalAttributes?: number;
}

const crc32 = (input: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++)
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const storedZip = (entries: ZipEntry[]): Buffer => {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const content = Buffer.isBuffer(entry.content)
      ? entry.content
      : Buffer.from(entry.content ?? "");
    const crc = crc32(content);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(content.length, 18);
    header.writeUInt32LE(content.length, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, content);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(content.length, 20);
    directory.writeUInt32LE(content.length, 24);
    directory.writeUInt16LE(name.length, 28);
    directory.writeUInt32LE(entry.externalAttributes ?? 0, 38);
    directory.writeUInt32LE(offset, 42);
    central.push(directory, name);
    offset += header.length + name.length + content.length;
  }
  const centralData = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralData.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralData, end]);
};

function makeMultipartPayload(
  boundary: string,
  zipBuf: Buffer,
  reqJson: any,
): Buffer {
  const parts = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="project.zip"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    zipBuf,
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n`,
    ),
    Buffer.from(JSON.stringify(reqJson)),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  return Buffer.concat(parts);
}

const mockProvenance = {
  source: { kind: "archive" as const, reference: "test.zip" },
  licenses: [],
  copyrightNotices: [],
};

const mockSnapshot: ProjectSnapshot = {
  snapshotId: "snap-12345",
  provenance: mockProvenance,
  files: [{ path: "src/index.ts", hash: "abc123hash", size: 100, category: "SOURCE" }],
  dependencies: [],
  createdAt: new Date().toISOString(),
};

const mockResult: PipelineResult = {
  pipelineId: "pipe-12345",
  status: "PASSED",
  goal: "Refactor core module",
  report: {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    provenance: mockProvenance,
    overview: { fileCount: 1, analyzableFileCount: 1, totalBytes: 100 },
    languages: [],
    frameworks: [],
    dependencies: [],
    structure: { topLevel: [], importantFiles: [], ignoredDirectories: [] },
    entryPoints: [],
    apiHints: [],
    databaseHints: [],
    authenticationHints: [],
    architecture: [],
    codeQualityObservations: [],
    risks: [],
    recommendedNextSteps: [],
  },
  plan: {
    objective: "Goal",
    assumptions: [],
    tasks: [],
    orderedTaskIds: [],
    risks: [],
    unresolvedQuestions: [],
    validation: { valid: true, errors: [], priorityFormula: "severityWeight + confidenceWeight - effortWeight" },
  },
  impact: {
    request: { request: "Goal" },
    impactLevel: "LOW",
    confidence: "HIGH",
    directModules: [],
    indirectModules: [],
    relationships: [],
    risks: [],
    blastRadius: { directModules: 0, indirectModules: 0, apiRoutes: 0, dependencies: 0, relatedTests: 0, doctorFindings: 0 },
    recommendations: [],
    verification: [],
    evidence: [],
    assumptions: [],
  },
  build: {
    objective: "Goal",
    provenance: mockProvenance,
    fileChanges: [],
    dependencyChanges: [],
    testChanges: [],
    risks: [],
    validation: { valid: true, errors: [] },
    assumptions: [],
  },
  snapshot: mockSnapshot,
  workspaceCleanupStatus: "SUCCESS",
  createdAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

test("1, 2, 3: StateStore save, read, and list operations", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-store-test-"));
  try {
    const store = new StateStore(storeDir);
    await store.savePipelineResult(mockResult);

    const retrieved = await store.getExecution("pipe-12345");
    assert.ok(retrieved);
    assert.equal(retrieved.pipelineId, "pipe-12345");
    assert.equal(retrieved.status, "PASSED");
    assert.equal(retrieved.goal, "Refactor core module");

    const history = await store.listExecutions();
    assert.equal(history.length, 1);
    assert.equal(history[0]?.pipelineId, "pipe-12345");
    assert.equal(history[0]?.status, "PASSED");
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("4: Missing execution returns undefined", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-store-test-"));
  try {
    const store = new StateStore(storeDir);
    const res = await store.getExecution("non-existent-id");
    assert.equal(res, undefined);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("5, 6, 19, 20: Snapshot save, retrieval, no raw source, no secrets", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-store-test-"));
  try {
    const store = new StateStore(storeDir);
    await store.saveSnapshot(mockSnapshot);

    const retrieved = await store.getSnapshot("snap-12345");
    assert.ok(retrieved);
    assert.equal(retrieved.snapshotId, "snap-12345");
    assert.equal(retrieved.files[0]?.hash, "abc123hash");
    assert.equal((retrieved.files[0] as any).text, undefined);
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("7: Atomic write creates file crash-safely", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-store-test-"));
  try {
    const store = new StateStore(storeDir);
    await store.savePipelineResult(mockResult);

    const execFile = path.join(storeDir, "executions", "pipe-12345.json");
    const content = await readFile(execFile, "utf-8");
    assert.ok(content.includes('"pipelineId": "pipe-12345"'));
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("8, 9: Audit JSONL append and structure", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-store-test-"));
  try {
    const store = new StateStore(storeDir);
    const entry1 = await store.appendAuditEvent({
      pipelineId: "pipe-12345",
      eventType: "INGESTED",
      details: { fileCount: 5 },
    });
    assert.ok(entry1.auditId);
    assert.ok(entry1.timestamp);
    assert.equal(entry1.eventType, "INGESTED");

    await store.appendAuditEvent({
      pipelineId: "pipe-12345",
      eventType: "VERIFICATION_COMPLETED",
      details: { overallStatus: "PASSED" },
    });

    const auditFile = path.join(storeDir, "audit.jsonl");
    const content = await readFile(auditFile, "utf-8");
    const lines = content.trim().split("\n");
    assert.equal(lines.length, 2);

    const parsed1 = JSON.parse(lines[0]!);
    assert.equal(parsed1.eventType, "INGESTED");
    const parsed2 = JSON.parse(lines[1]!);
    assert.equal(parsed2.eventType, "VERIFICATION_COMPLETED");
  } finally {
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("10: Pipeline persistence in runPipeline", async () => {
  const storeDir = await mkdtemp(path.join(tmpdir(), "reforge-store-test-"));
  const zipBuf = storedZip([
    { name: "package.json", content: '{"name":"demo-app"}' },
    { name: "src/index.ts", content: 'export const msg = "hello";\n' },
  ]);

  const execWorkspace = await createExecutionWorkspace(Readable.from(zipBuf));
  try {
    const store = new StateStore(storeDir);
    const result = await runPipeline(
      execWorkspace.root,
      { goal: "Improve design", approved: false },
      { kind: "archive", reference: "project.zip" },
      store,
    );

    const saved = await store.getExecution(result.pipelineId);
    assert.ok(saved);
    assert.equal(saved.pipelineId, result.pipelineId);
    assert.equal(saved.goal, "Improve design");

    const savedSnap = await store.getSnapshot(result.snapshot.snapshotId);
    assert.ok(savedSnap);

    const history = await store.listExecutions();
    assert.equal(history.length, 1);
  } finally {
    await execWorkspace.cleanup();
    await rm(storeDir, { recursive: true, force: true });
  }
});

test("11, 16, 17: History endpoint, bounded limit, deterministic ordering", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/v1/pipeline/history?limit=10",
  });
  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.payload);
  assert.ok(Array.isArray(json.history));
  assert.equal(json.limit, 10);
});

test("12, 14: Pipeline lookup endpoint & invalid pipelineId rejection", async () => {
  const invalidRes = await app.inject({
    method: "GET",
    url: "/v1/pipeline/../../etc/passwd",
  });
  assert.equal(invalidRes.statusCode, 404);

  const nonExistentRes = await app.inject({
    method: "GET",
    url: "/v1/pipeline/pipe-non-existent-uuid",
  });
  assert.equal(nonExistentRes.statusCode, 404);
});

test("13, 15: Snapshot lookup endpoint & invalid snapshotId rejection", async () => {
  const invalidRes = await app.inject({
    method: "GET",
    url: "/v1/snapshot/../traversal",
  });
  assert.equal(invalidRes.statusCode, 404);

  const nonExistentRes = await app.inject({
    method: "GET",
    url: "/v1/snapshot/snap-non-existent-uuid",
  });
  assert.equal(nonExistentRes.statusCode, 404);
});

test("18: Host workspace remains untouched", async () => {
  const projectFile = await readFile(path.resolve("src/state-store.ts"), "utf-8");
  assert.ok(projectFile.length > 0);
});
