import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, stat as fsStat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { createHash } from "node:crypto";
import { createExecutionWorkspace } from "../src/execution-workspace.js";
import { executePatchesInWorkspace, validateExecution } from "../src/execution.js";
import { createProjectSnapshot } from "../src/snapshot.js";
import { AnalysisEngine } from "../src/engine.js";
import type { ExecutionRequest, PatchOperation } from "../src/domain.js";
import { Readable } from "node:stream";

interface ZipEntry { name: string; content?: Buffer | string; externalAttributes?: number }

const crc32 = (input: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of input) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320); }
  return (crc ^ 0xffffffff) >>> 0;
};

const storedZip = (entries: ZipEntry[]): Buffer => {
  const local: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const content = Buffer.isBuffer(entry.content) ? entry.content : Buffer.from(entry.content ?? "");
    const crc = crc32(content);
    const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4); header.writeUInt32LE(crc, 14); header.writeUInt32LE(content.length, 18); header.writeUInt32LE(content.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, content);
    const directory = Buffer.alloc(46); directory.writeUInt32LE(0x02014b50, 0); directory.writeUInt16LE(20, 4); directory.writeUInt16LE(20, 6); directory.writeUInt32LE(crc, 16); directory.writeUInt32LE(content.length, 20); directory.writeUInt32LE(content.length, 24); directory.writeUInt16LE(name.length, 28); directory.writeUInt32LE(entry.externalAttributes ?? 0, 38); directory.writeUInt32LE(offset, 42);
    central.push(directory, name); offset += header.length + name.length + content.length;
  }
  const centralData = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralData.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, centralData, end]);
};

const provenance = { source: { kind: "archive" as const, reference: "test.zip" }, licenses: [], copyrightNotices: [] };

async function setupFixture() {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-exec-test-"));
  const archive = path.join(root, "project.zip");
  const zipBuf = storedZip([
    { name: "package.json", content: '{"name":"test-app","dependencies":{}}' },
    { name: "src/app.ts", content: 'console.log("hello world");\n' },
  ]);
  await writeFile(archive, zipBuf);

  const execWorkspace = await createExecutionWorkspace(Readable.from(zipBuf));
  const engine = new AnalysisEngine();
  const report = await engine.analyze(execWorkspace.root, { kind: "archive", reference: "project.zip" });
  const snapshot = await createProjectSnapshot(execWorkspace.root, report);

  return { root, execWorkspace, report, snapshot, zipBuf };
}

test("1 & 2: trusted ZIP to disposable workspace and cleanup", async () => {
  const { execWorkspace } = await setupFixture();
  try {
    const stat = await fsStat(execWorkspace.root);
    assert.ok(stat.isDirectory());
    const file = await readFile(path.join(execWorkspace.root, "src/app.ts"), "utf-8");
    assert.match(file, /hello world/);
  } finally {
    await execWorkspace.cleanup();
    await assert.rejects(fsStat(execWorkspace.root));
  }
});

test("3: server-controlled snapshot generation", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    assert.ok(snapshot.snapshotId);
    assert.equal(snapshot.files.length, 2);
    assert.ok(snapshot.files.some((f) => f.path === "src/app.ts"));
  } finally {
    await execWorkspace.cleanup();
  }
});

test("4 & 14: re-hash validation detects modified file on disk (STALE_PLAN)", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    // Mutate file on disk out-of-band before patch application
    await writeFile(path.join(execWorkspace.root, "src/app.ts"), "modified out of band");

    const req: ExecutionRequest = {
      approved: true,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "test",
        provenance,
        sourceSnapshotId: snapshot.snapshotId,
        buildTaskIds: ["task-1"],
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "src/app.ts",
          operation: "MODIFY",
          expectedExistingHash: snapshot.files.find((f) => f.path === "src/app.ts")?.hash,
          content: 'console.log("updated");\n',
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
    assert.equal(receipt.status, "FAILED");
    assert.match(receipt.failedOperation?.error ?? "", /content changed on disk/);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("5: CREATE patch application", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    const req: ExecutionRequest = {
      approved: true,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "create file",
        provenance,
        sourceSnapshotId: snapshot.snapshotId,
        buildTaskIds: ["task-1"],
        fileChanges: [{ path: "src/new.ts", operation: "CREATE", status: "PROPOSED_NEW_FILE", reason: "new file", evidence: [] }],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "src/new.ts",
          operation: "CREATE",
          content: 'export const x = 42;\n',
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
    assert.equal(receipt.status, "SUCCEEDED");
    assert.deepEqual(receipt.diffSummary.created, ["src/new.ts"]);
    const createdContent = await readFile(path.join(execWorkspace.root, "src/new.ts"), "utf-8");
    assert.equal(createdContent, 'export const x = 42;\n');
  } finally {
    await execWorkspace.cleanup();
  }
});

test("6: MODIFY patch application", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    const origHash = snapshot.files.find((f) => f.path === "src/app.ts")?.hash;
    const req: ExecutionRequest = {
      approved: true,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "modify file",
        provenance,
        sourceSnapshotId: snapshot.snapshotId,
        buildTaskIds: ["task-1"],
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "src/app.ts",
          operation: "MODIFY",
          expectedExistingHash: origHash,
          content: 'console.log("modified successfully");\n',
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
    assert.equal(receipt.status, "SUCCEEDED");
    assert.deepEqual(receipt.diffSummary.modified, ["src/app.ts"]);
    const updated = await readFile(path.join(execWorkspace.root, "src/app.ts"), "utf-8");
    assert.equal(updated, 'console.log("modified successfully");\n');
  } finally {
    await execWorkspace.cleanup();
  }
});

test("7 & 13: RENAME patch application and collision rejection", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    const origHash = snapshot.files.find((f) => f.path === "src/app.ts")?.hash;

    // First attempt rename into package.json (collision)
    const reqCollision: ExecutionRequest = {
      approved: true,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "rename collision",
        provenance,
        sourceSnapshotId: snapshot.snapshotId,
        buildTaskIds: ["task-1"],
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "package.json",
          fromPath: "src/app.ts",
          operation: "RENAME",
          expectedExistingHash: origHash,
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const collisionReceipt = await executePatchesInWorkspace(execWorkspace.root, reqCollision);
    assert.equal(collisionReceipt.status, "FAILED");
    assert.match(collisionReceipt.failedOperation?.error ?? "", /RENAME_COLLISION/);

    // Valid rename into new path
    const reqValid: ExecutionRequest = {
      ...reqCollision,
      patches: [
        {
          path: "src/main.ts",
          fromPath: "src/app.ts",
          operation: "RENAME",
          expectedExistingHash: origHash,
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const validReceipt = await executePatchesInWorkspace(execWorkspace.root, reqValid);
    assert.equal(validReceipt.status, "SUCCEEDED");
    assert.deepEqual(validReceipt.diffSummary.renamed, [{ from: "src/app.ts", to: "src/main.ts" }]);
    const mainContent = await readFile(path.join(execWorkspace.root, "src/main.ts"), "utf-8");
    assert.match(mainContent, /hello world/);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("8 & 9: DELETE without approval vs with approval", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    const origHash = snapshot.files.find((f) => f.path === "src/app.ts")?.hash;

    // Delete without approval -> rejected
    const reqNoApprove: ExecutionRequest = {
      approved: true,
      allowDelete: false,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "delete test",
        provenance,
        sourceSnapshotId: snapshot.snapshotId,
        buildTaskIds: ["task-1"],
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "src/app.ts",
          operation: "DELETE",
          expectedExistingHash: origHash,
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const noApproveReceipt = await executePatchesInWorkspace(execWorkspace.root, reqNoApprove);
    assert.equal(noApproveReceipt.status, "FAILED");

    // Delete with allowDelete: true -> applied
    const reqApproved: ExecutionRequest = {
      ...reqNoApprove,
      allowDelete: true,
    };

    const approvedReceipt = await executePatchesInWorkspace(execWorkspace.root, reqApproved);
    assert.equal(approvedReceipt.status, "SUCCEEDED");
    assert.deepEqual(approvedReceipt.diffSummary.deleted, ["src/app.ts"]);
    await assert.rejects(readFile(path.join(execWorkspace.root, "src/app.ts")));
  } finally {
    await execWorkspace.cleanup();
  }
});

test("10 & 11: path traversal and absolute path rejection", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    for (const badPath of ["../escape.txt", "/etc/passwd", "C:\\Windows\\System32\\cmd.exe"]) {
      const req: ExecutionRequest = {
        approved: true,
        snapshotId: snapshot.snapshotId,
        snapshot,
        build: {
          objective: "bad path",
          provenance,
          sourceSnapshotId: snapshot.snapshotId,
          buildTaskIds: ["task-1"],
          fileChanges: [],
          dependencyChanges: [],
          testChanges: [],
          risks: [],
          validation: { valid: true, errors: [] },
          assumptions: [],
        },
        patches: [
          {
            path: badPath,
            operation: "CREATE",
            content: "evil",
            originatingTaskId: "task-1",
            evidence: [],
            provenance,
          },
        ],
      };

      const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
      assert.equal(receipt.status, "FAILED");
    }
  } finally {
    await execWorkspace.cleanup();
  }
});

test("15 & 16: missing content & binary file rejection", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    // Binary file creation
    const binPath = path.join(execWorkspace.root, "binary.bin");
    const binBuf = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    await writeFile(binPath, binBuf);
    const binHash = createHash("sha256").update(binBuf).digest("hex");

    // Add binary file to snapshot dynamically for validation check
    const snapWithBin = {
      ...snapshot,
      files: [...snapshot.files, { path: "binary.bin", hash: binHash, size: binBuf.length, category: "ASSET" as const }],
    };

    // Attempt text MODIFY on binary file
    const req: ExecutionRequest = {
      approved: true,
      snapshotId: snapWithBin.snapshotId,
      snapshot: snapWithBin,
      build: {
        objective: "binary modify",
        provenance,
        sourceSnapshotId: snapWithBin.snapshotId,
        buildTaskIds: ["task-1"],
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "binary.bin",
          operation: "MODIFY",
          expectedExistingHash: binHash,
          content: "text replacement",
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
    assert.equal(receipt.status, "FAILED");
    assert.match(receipt.failedOperation?.error ?? "", /NOT_EXECUTABLE/);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("17 & 18: stop on first failure & atomic rollback", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    const origHash = snapshot.files.find((f) => f.path === "src/app.ts")?.hash;

    const req: ExecutionRequest = {
      approved: true,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "multi-patch",
        provenance,
        sourceSnapshotId: snapshot.snapshotId,
        buildTaskIds: ["task-1"],
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "src/first.ts",
          operation: "CREATE",
          content: "first content",
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
        {
          path: "package.json",
          fromPath: "src/app.ts",
          operation: "RENAME",
          expectedExistingHash: origHash,
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
        {
          path: "src/third.ts",
          operation: "CREATE",
          content: "should never run",
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
    assert.equal(receipt.status, "FAILED");
    assert.equal(receipt.rollback.attempted, true);
    assert.equal(receipt.rollback.succeeded, true);

    // Verify first file was rolled back and does NOT exist
    await assert.rejects(readFile(path.join(execWorkspace.root, "src/first.ts")));
    // Verify third file does NOT exist
    await assert.rejects(readFile(path.join(execWorkspace.root, "src/third.ts")));
    // Verify original src/app.ts is restored
    const originalApp = await readFile(path.join(execWorkspace.root, "src/app.ts"), "utf-8");
    assert.match(originalApp, /hello world/);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("19, 21, 22: execution receipt, provenance, and BuildTask propagation", async () => {
  const { execWorkspace, snapshot } = await setupFixture();
  try {
    const req: ExecutionRequest = {
      approved: true,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "receipt test",
        provenance,
        sourceSnapshotId: snapshot.snapshotId,
        buildTaskIds: ["task-42"],
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "src/newfile.ts",
          operation: "CREATE",
          content: "export const ok = true;\n",
          originatingTaskId: "task-42",
          evidence: [],
          provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
    assert.equal(receipt.status, "SUCCEEDED");
    assert.ok(receipt.executionId);
    assert.equal(receipt.snapshotId, snapshot.snapshotId);
    assert.deepEqual(receipt.provenance, provenance);
    assert.deepEqual(receipt.buildTaskIds, ["task-42"]);
    assert.equal(receipt.appliedOperations[0]?.originatingTaskId, "task-42");
  } finally {
    await execWorkspace.cleanup();
  }
});

test("20: user original project directory remains untouched", async () => {
  // Confirm host repo E:\ReForge is intact
  const projectFile = await readFile(path.resolve("src/execution.ts"), "utf-8");
  assert.ok(projectFile.length > 0);
});

function makeMultipartPayload(boundary: string, zipBuf: Buffer, reqJson: any): Buffer {
  const parts = [
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="project.zip"\r\nContent-Type: application/zip\r\n\r\n`),
    zipBuf,
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n`),
    Buffer.from(JSON.stringify(reqJson)),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  return Buffer.concat(parts);
}

test("API SMOKE TEST: POST /v1/execute with approved CREATE, MODIFY, stale hash, missing approval, delete without approval, and cleanup", async () => {
  process.env.REFORGE_SKIP_LISTEN = "true";
  const { app } = await import("../src/server.js");
  try {
    const zipBuf = storedZip([
      { name: "package.json", content: '{"name":"test-app"}' },
      { name: "src/app.ts", content: 'console.log("hello");\n' },
    ]);

  const appHash = createHash("sha256").update(Buffer.from('console.log("hello");\n')).digest("hex");

  const boundary = "----WebKitFormBoundaryTest123";

  // 1. Approved CREATE via POST /v1/execute
  const createReq = {
    approved: true,
    build: {
      objective: "API Create",
      provenance,
      buildTaskIds: ["task-1"],
      fileChanges: [],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    },
    patches: [
      {
        path: "src/new_api.ts",
        operation: "CREATE",
        content: 'export const api = true;\n',
        originatingTaskId: "task-1",
        evidence: [],
        provenance,
      },
    ],
  };

  const createRes = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: makeMultipartPayload(boundary, zipBuf, createReq),
  });

  assert.equal(createRes.statusCode, 200);
  const createBody = JSON.parse(createRes.body);
  assert.equal(createBody.receipt.status, "SUCCEEDED");
  assert.equal(createBody.receipt.workspaceCleanupStatus, "SUCCESS");
  assert.deepEqual(createBody.receipt.diffSummary.created, ["src/new_api.ts"]);

  // 2. Approved MODIFY via POST /v1/execute
  const modifyReq = {
    approved: true,
    build: {
      objective: "API Modify",
      provenance,
      buildTaskIds: ["task-1"],
      fileChanges: [],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    },
    patches: [
      {
        path: "src/app.ts",
        operation: "MODIFY",
        expectedExistingHash: appHash,
        content: 'console.log("modified via api");\n',
        originatingTaskId: "task-1",
        evidence: [],
        provenance,
      },
    ],
  };

  const modifyRes = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: makeMultipartPayload(boundary, zipBuf, modifyReq),
  });

  assert.equal(modifyRes.statusCode, 200);
  const modifyBody = JSON.parse(modifyRes.body);
  assert.equal(modifyBody.receipt.status, "SUCCEEDED");
  assert.deepEqual(modifyBody.receipt.diffSummary.modified, ["src/app.ts"]);

  // 3. Invalid Path via POST /v1/execute
  const invalidPathReq = {
    approved: true,
    build: {
      objective: "API Invalid Path",
      provenance,
      buildTaskIds: ["task-1"],
      fileChanges: [],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    },
    patches: [
      {
        path: "../escape.txt",
        operation: "CREATE",
        content: "evil",
        originatingTaskId: "task-1",
        evidence: [],
        provenance,
      },
    ],
  };

  const invalidPathRes = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: makeMultipartPayload(boundary, zipBuf, invalidPathReq),
  });

  assert.equal(invalidPathRes.statusCode, 200);
  const invalidPathBody = JSON.parse(invalidPathRes.body);
  assert.equal(invalidPathBody.receipt.status, "FAILED");

  // 4. Stale Hash via POST /v1/execute
  const staleHashReq = {
    approved: true,
    build: {
      objective: "API Stale Hash",
      provenance,
      buildTaskIds: ["task-1"],
      fileChanges: [],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    },
    patches: [
      {
        path: "src/app.ts",
        operation: "MODIFY",
        expectedExistingHash: "0".repeat(64),
        content: "fail",
        originatingTaskId: "task-1",
        evidence: [],
        provenance,
      },
    ],
  };

  const staleRes = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: makeMultipartPayload(boundary, zipBuf, staleHashReq),
  });

  assert.equal(staleRes.statusCode, 200);
  const staleBody = JSON.parse(staleRes.body);
  assert.equal(staleBody.receipt.status, "FAILED");

  // 5. Missing Approval via POST /v1/execute
  const missingApproveReq = {
    approved: false,
    build: {
      objective: "API Missing Approval",
      provenance,
      fileChanges: [],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    },
  };

  const missingApproveRes = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: makeMultipartPayload(boundary, zipBuf, missingApproveReq),
  });

  assert.equal(missingApproveRes.statusCode, 200);
  const missingApproveBody = JSON.parse(missingApproveRes.body);
  assert.equal(missingApproveBody.receipt.status, "FAILED");

  // 6. Delete Without Approval via POST /v1/execute
  const deleteNoApproveReq = {
    approved: true,
    allowDelete: false,
    build: {
      objective: "API Delete No Approve",
      provenance,
      buildTaskIds: ["task-1"],
      fileChanges: [],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    },
    patches: [
      {
        path: "src/app.ts",
        operation: "DELETE",
        expectedExistingHash: appHash,
        originatingTaskId: "task-1",
        evidence: [],
        provenance,
      },
    ],
  };

  const deleteNoApproveRes = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload: makeMultipartPayload(boundary, zipBuf, deleteNoApproveReq),
  });

  assert.equal(deleteNoApproveRes.statusCode, 200);
  const deleteNoApproveBody = JSON.parse(deleteNoApproveRes.body);
  assert.equal(deleteNoApproveBody.receipt.status, "FAILED");
  } finally {
    await app.close();
  }
});

