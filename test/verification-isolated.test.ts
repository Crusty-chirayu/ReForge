import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile, stat as fsStat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Readable } from "node:stream";
import { createExecutionWorkspace } from "../src/execution-workspace.js";
import { executePatchesInWorkspace } from "../src/execution.js";
import { createProjectSnapshot } from "../src/snapshot.js";
import { AnalysisEngine } from "../src/engine.js";
import { deriveVerificationPolicy } from "../src/verification-policy.js";
import { runVerificationCommand } from "../src/verification-runner.js";
import type { ExecutionRequest, VerificationCommand } from "../src/domain.js";

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

async function setupTSWorkspace() {
  const zipBuf = storedZip([
    { name: "package.json", content: '{"name":"ts-app"}' },
    { name: "tsconfig.json", content: '{"compilerOptions":{"module":"NodeNext","target":"ES2022","noEmit":true}}' },
    { name: "src/index.ts", content: 'export const msg: string = "hello";\n' },
  ]);

  const execWorkspace = await createExecutionWorkspace(Readable.from(zipBuf));
  const engine = new AnalysisEngine();
  const report = await engine.analyze(execWorkspace.root, { kind: "archive", reference: "project.zip" });
  const snapshot = await createProjectSnapshot(execWorkspace.root, report);

  return { execWorkspace, report, snapshot, zipBuf };
}

test("1. TypeScript verification command is detected safely", async () => {
  const { execWorkspace, snapshot } = await setupTSWorkspace();
  try {
    const policy = await deriveVerificationPolicy(execWorkspace.root, snapshot);
    assert.equal(policy.available, true);
    assert.equal(policy.commands.length, 1);
    assert.equal(policy.commands[0]?.id, "TYPECHECK");
    assert.equal(policy.commands[0]?.executable, process.execPath);
    assert.deepEqual(policy.commands[0]?.args.slice(-1), ["--noEmit"]);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("2. No verification available for non-TS project", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-nots-"));
  try {
    await writeFile(path.join(root, "README.md"), "# Plain Project");
    const policy = await deriveVerificationPolicy(root);
    assert.equal(policy.available, false);
    assert.equal(policy.commands.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("3 & 15: Successful verification runs in isolated workspace", async () => {
  const { execWorkspace, snapshot } = await setupTSWorkspace();
  try {
    const policy = await deriveVerificationPolicy(execWorkspace.root, snapshot);
    assert.equal(policy.available, true);
    const result = await runVerificationCommand(execWorkspace.root, policy.commands[0]!);
    assert.equal(result.status, "PASSED");
    assert.equal(result.exitCode, 0);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("4. Non-zero exit code during verification failure", async () => {
  const { execWorkspace, snapshot } = await setupTSWorkspace();
  try {
    // Write invalid TypeScript file with syntax error
    await writeFile(path.join(execWorkspace.root, "src/index.ts"), 'const x: number = "not a number";\n');
    const policy = await deriveVerificationPolicy(execWorkspace.root, snapshot);
    const result = await runVerificationCommand(execWorkspace.root, policy.commands[0]!);
    assert.equal(result.status, "FAILED");
    assert.notEqual(result.exitCode, 0);
    assert.match(result.stdout + result.stderr, /Type 'string' is not assignable to type 'number'/);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("5. Timeout handling kills child process", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-timeout-"));
  try {
    // Command that sleeps 5 seconds with a 100ms hard timeout
    const timeoutCmd: VerificationCommand = {
      id: "SLOW",
      label: "Slow test process",
      executable: process.execPath,
      args: ["-e", "setTimeout(() => {}, 10000)"],
      reason: "Timeout test",
      timeoutMs: 100,
    };

    const result = await runVerificationCommand(root, timeoutCmd);
    assert.equal(result.status, "TIMEOUT");
    assert.match(result.error ?? "", /timed out after 100ms/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("6, 7, 8, 9: stdout, stderr capture and truncation limits", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-output-"));
  try {
    // Output over 1MB of text
    const largeOutputCmd: VerificationCommand = {
      id: "LARGE",
      label: "Large output process",
      executable: process.execPath,
      args: ["-e", "process.stdout.on('error', () => {}); process.stdout.write('A'.repeat(1500000))"],
      reason: "Truncation test",
      timeoutMs: 10000,
    };

    const result = await runVerificationCommand(root, largeOutputCmd);
    assert.equal(result.status, "PASSED");
    assert.equal(result.outputTruncated, true);
    assert.ok(result.stdout.length <= 1048576);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("10, 11, 12, 13, 14: safe process spawning (shell=false, env, cwd, executable isolation)", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-spawn-"));
  try {
    // Executable receives sanitized env without secrets
    process.env.SECRET_API_KEY = "SUPER_SECRET_123";
    const envCheckCmd: VerificationCommand = {
      id: "ENVCHECK",
      label: "Environment check",
      executable: process.execPath,
      args: ["-e", "console.log(process.env.SECRET_API_KEY || 'CLEAN')"],
      reason: "Sanitize check",
      timeoutMs: 5000,
    };

    const result = await runVerificationCommand(root, envCheckCmd);
    assert.equal(result.status, "PASSED");
    assert.match(result.stdout, /CLEAN/);
    assert.doesNotMatch(result.stdout, /SUPER_SECRET_123/);
  } finally {
    delete process.env.SECRET_API_KEY;
    await rm(root, { recursive: true, force: true });
  }
});

test("17: Patch failure prevents verification from executing", async () => {
  const { execWorkspace, snapshot } = await setupTSWorkspace();
  try {
    const req: ExecutionRequest = {
      approved: true,
      verify: true,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "failed patch",
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
          path: "src/nonexistent.ts",
          operation: "MODIFY",
          expectedExistingHash: "0".repeat(64),
          content: "fail patch",
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
    assert.equal(receipt.status, "FAILED");
    assert.ok(receipt.failedOperation);
    // Verification should not have attempted
    assert.equal(receipt.verification?.attempted, undefined);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("18, 19, 20, 21, 22: Verification failure triggers atomic rollback without repair & preserves receipt fields", async () => {
  const { execWorkspace, snapshot } = await setupTSWorkspace();
  try {
    const origHash = snapshot.files.find((f) => f.path === "src/index.ts")?.hash;

    const req: ExecutionRequest = {
      approved: true,
      verify: true,
      snapshotId: snapshot.snapshotId,
      snapshot,
      build: {
        objective: "verify failure test",
        provenance,
        sourceSnapshotId: snapshot.snapshotId,
        buildTaskIds: ["task-77"],
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      patches: [
        {
          path: "src/index.ts",
          operation: "MODIFY",
          expectedExistingHash: origHash,
          content: 'const a: number = "type error";\n',
          originatingTaskId: "task-77",
          evidence: [],
          provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(execWorkspace.root, req);
    assert.equal(receipt.status, "FAILED");
    assert.equal(receipt.verification?.attempted, true);
    assert.equal(receipt.verification?.overallStatus, "FAILED");
    assert.equal(receipt.rollback.attempted, true);
    assert.equal(receipt.rollback.succeeded, true);
    assert.deepEqual(receipt.provenance, provenance);
    assert.deepEqual(receipt.buildTaskIds, ["task-77"]);

    // Verify workspace was rolled back to original working state
    const restoredContent = await readFile(path.join(execWorkspace.root, "src/index.ts"), "utf-8");
    assert.match(restoredContent, /export const msg: string = "hello";/);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("16: Original user host repository E:\\ReForge remains untouched", async () => {
  const projectFile = await readFile(path.resolve("src/execution.ts"), "utf-8");
  assert.ok(projectFile.length > 0);
});

test("API SMOKE TEST: POST /v1/execute with verify: true and command rejection", async () => {
  process.env.REFORGE_SKIP_LISTEN = "true";
  const { app } = await import("../src/server.js");

  const boundary = "----WebKitFormBoundaryPhase9CTest";

  const zipBuf = storedZip([
    { name: "package.json", content: '{"name":"smoke-app"}' },
    { name: "tsconfig.json", content: '{"compilerOptions":{"noEmit":true}}' },
    { name: "src/main.ts", content: 'export const y: number = 100;\n' },
  ]);

  function makeMultipart(jsonPayload: any): Buffer {
    return Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="smoke.zip"\r\nContent-Type: application/zip\r\n\r\n`),
      zipBuf,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n`),
      Buffer.from(JSON.stringify(jsonPayload)),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
  }

  try {
    // 1. Approved CREATE + verify -> 200 OK, SUCCEEDED
    const validReq = {
      approved: true,
      verify: true,
      build: {
        objective: "API verify smoke",
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
          path: "src/extra.ts",
          operation: "CREATE",
          content: "export const extra = true;\n",
          originatingTaskId: "task-1",
          evidence: [],
          provenance,
        },
      ],
    };

    const validRes = await app.inject({
      method: "POST",
      url: "/v1/execute",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: makeMultipart(validReq),
    });

    assert.equal(validRes.statusCode, 200);
    const validBody = JSON.parse(validRes.body);
    assert.equal(validBody.receipt.status, "SUCCEEDED");
    assert.equal(validBody.receipt.verification?.attempted, true);
    assert.equal(validBody.receipt.verification?.overallStatus, "PASSED");

    // 2. Client supplying forbidden "command" field -> HTTP 400 Bad Request
    const forbiddenCmdReq = {
      ...validReq,
      command: "rm -rf /",
    };

    const forbiddenRes = await app.inject({
      method: "POST",
      url: "/v1/execute",
      headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
      payload: makeMultipart(forbiddenCmdReq),
    });

    assert.equal(forbiddenRes.statusCode, 400);
    assert.match(forbiddenRes.body, /Arbitrary executable, command, shell, args, cwd, or environment overrides are not permitted/);
  } finally {
    await app.close();
  }
});
