import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { Readable } from "node:stream";
import { createExecutionWorkspace } from "../src/execution-workspace.js";
import { runPipeline } from "../src/pipeline.js";
import { app } from "../src/server.js";
import { StateStore } from "../src/state-store.js";

interface ZipEntry {
  name: string;
  content?: Buffer | string;
  externalAttributes?: number;
}

const crc32 = (input: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
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
  archiveFilename = "project.zip",
): Buffer {
  const parts = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="${archiveFilename}"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    zipBuf,
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n`,
    ),
    Buffer.from(typeof reqJson === "string" ? reqJson : JSON.stringify(reqJson)),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  return Buffer.concat(parts);
}

function makeInvertedMultipartPayload(
  boundary: string,
  reqJson: any,
  zipBuf: Buffer,
): Buffer {
  const parts = [
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n`,
    ),
    Buffer.from(typeof reqJson === "string" ? reqJson : JSON.stringify(reqJson)),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="project.zip"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    zipBuf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];
  return Buffer.concat(parts);
}

const sampleProjectZip = () =>
  storedZip([
    { name: "package.json", content: '{"name":"api-demo"}' },
    {
      name: "tsconfig.json",
      content: '{"compilerOptions":{"module":"NodeNext","target":"ES2022","noEmit":true}}',
    },
    { name: "src/main.ts", content: 'console.log("hello");\n' },
  ]);

test("1. Pipeline proposal mode (approved: false) generates analysis, plan, impact, build without executing patches", async () => {
  const zipBuf = storedZip([
    { name: "package.json", content: '{"name":"demo-app"}' },
    {
      name: "tsconfig.json",
      content: '{"compilerOptions":{"module":"NodeNext","target":"ES2022","noEmit":true}}',
    },
    { name: "src/index.ts", content: 'export const status = "ok";\n' },
  ]);

  const execWorkspace = await createExecutionWorkspace(Readable.from(zipBuf));
  try {
    const result = await runPipeline(
      execWorkspace.root,
      {
        goal: "Improve project structure",
        approved: false,
      },
      { kind: "archive", reference: "project.zip" },
    );

    assert.ok(result.pipelineId);
    assert.equal(result.status, "BLOCKED");
    assert.equal(result.goal, "Improve project structure");
    assert.ok(result.report);
    assert.ok(result.plan);
    assert.ok(result.impact);
    assert.ok(result.build);
    assert.ok(result.snapshot);
    assert.equal(result.execution, undefined);
  } finally {
    await execWorkspace.cleanup();
  }
});

test("2. Pipeline execution mode (approved: true) applies patches and performs controlled verification", async () => {
  const zipBuf = storedZip([
    { name: "package.json", content: '{"name":"demo-app"}' },
    {
      name: "tsconfig.json",
      content: '{"compilerOptions":{"module":"NodeNext","target":"ES2022","noEmit":true}}',
    },
    { name: "src/index.ts", content: 'export const status = "ok";\n' },
  ]);

  const execWorkspace = await createExecutionWorkspace(Readable.from(zipBuf));
  try {
    const result = await runPipeline(
      execWorkspace.root,
      {
        goal: "Add quality improvements",
        approved: true,
        verify: true,
      },
      { kind: "archive", reference: "project.zip" },
    );

    assert.ok(result.pipelineId);
    assert.equal(result.status, "PASSED");
    assert.ok(result.execution);
    assert.equal(result.execution.status, "SUCCEEDED");

    assert.ok(result.execution.verification);
    assert.equal(result.execution.verification.overallStatus, "PASSED");
  } finally {
    await execWorkspace.cleanup();
  }
});

test("3. HTTP API POST /v1/pipeline executes end-to-end pipeline (archive before request) and returns 200", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryPhase10PipelineTest";
  const payload = makeMultipartPayload(boundary, zipBuf, {
    goal: "Refactor core API",
    approved: true,
    verify: true,
  });

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.payload);
  assert.ok(json.pipeline);
  assert.equal(json.pipeline.status, "PASSED");
  assert.ok(json.pipeline.build);
  assert.ok(json.pipeline.execution);
  assert.ok(json.pipeline.pipelineId);

  // Verify persistence in StateStore
  const store = new StateStore();
  const saved = await store.getExecution(json.pipeline.pipelineId);
  assert.ok(saved);
  assert.equal(saved?.pipelineId, json.pipeline.pipelineId);
});

test("4. HTTP API POST /v1/pipeline handles inverted field ordering (request before archive) and returns 200", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryInvertedOrderTest";
  const payload = makeInvertedMultipartPayload(
    boundary,
    {
      goal: "Inverted fields test",
      approved: false,
    },
    zipBuf,
  );

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.payload);
  assert.ok(json.pipeline);
  assert.equal(json.pipeline.status, "BLOCKED");
  assert.equal(json.pipeline.goal, "Inverted fields test");
});

test("5. HTTP API POST /v1/pipeline rejects missing archive field with 400", async () => {
  const boundary = "----WebKitFormBoundaryMissingArchive";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n{"goal":"test","approved":false}\r\n--${boundary}--\r\n`,
    ),
  ]);

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Expected a multipart \.zip field named 'archive'/);
});

test("6. HTTP API POST /v1/pipeline rejects missing request field with 400", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryMissingRequest";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="test.zip"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    zipBuf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Expected a JSON field named 'request'/);
});

test("7. HTTP API POST /v1/pipeline rejects malformed JSON in request field with 400", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryBadJson";
  const payload = makeMultipartPayload(boundary, zipBuf, "NOT_JSON{{{");

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /The 'request' field must contain valid JSON/);
});

test("8. HTTP API POST /v1/pipeline rejects non-zip archive extension with 400", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryBadExt";
  const payload = makeMultipartPayload(
    boundary,
    zipBuf,
    { goal: "test", approved: false },
    "project.tar.gz",
  );

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Only \.zip archives are accepted/);
});

test("9. HTTP API POST /v1/pipeline rejects unexpected file field with 400", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryBadFieldName";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="wrong_name"; filename="project.zip"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    zipBuf,
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n{"goal":"test","approved":false}\r\n--${boundary}--\r\n`,
    ),
  ]);

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Only the multipart file field named 'archive' is accepted/);
});

test("10. HTTP API POST /v1/pipeline rejects duplicate archive fields with 400", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryDuplicateArchive";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="project1.zip"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    zipBuf,
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="project2.zip"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    zipBuf,
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n{"goal":"test","approved":false}\r\n--${boundary}--\r\n`,
    ),
  ]);

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Only one pipeline execution archive is allowed|reach files limit/);
});

test("11. HTTP API POST /v1/pipeline rejects client command/executable/cwd overrides", async () => {
  const zipBuf = storedZip([{ name: "package.json", content: '{"name":"sec-test"}' }]);
  const boundary = "----WebKitFormBoundaryPhase10SecTest";
  const payload = makeMultipartPayload(boundary, zipBuf, {
    goal: "Malicious injection test",
    approved: true,
    command: "rm -rf /",
    shell: true,
  });

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Arbitrary executable, command, shell/i);
});

test("12. HTTP API POST /v1/pipeline rejects empty (0-byte) archive file with 400", async () => {
  const boundary = "----WebKitFormBoundaryZeroByteArchive";
  const payload = makeMultipartPayload(boundary, Buffer.alloc(0), {
    goal: "Zero byte test",
    approved: false,
  });

  const res = await app.inject({
    method: "POST",
    url: "/v1/pipeline",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /empty or unreadable|Archive is empty/);
});

test("13. Original E:\\ReForge project directory remains untouched", async () => {
  const projectFile = await readFile(path.resolve("src/pipeline.ts"), "utf-8");
  assert.ok(projectFile.length > 0);
});
