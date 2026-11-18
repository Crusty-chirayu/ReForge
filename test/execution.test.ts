import assert from "node:assert/strict";
import test from "node:test";
import { validateExecution } from "../src/execution.js";
import { app } from "../src/server.js";

const crc32 = (input: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of input) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const storedZip = (entries: { name: string; content?: Buffer | string }[]): Buffer => {
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
    directory.writeUInt32LE(0, 38);
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
    { name: "package.json", content: '{"name":"exec-demo"}' },
    {
      name: "tsconfig.json",
      content: '{"compilerOptions":{"module":"NodeNext","target":"ES2022","noEmit":true}}',
    },
    { name: "src/main.ts", content: 'export const num = 42;\n' },
  ]);

const build = {
  provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
  validation: { valid: true, errors: [] },
  fileChanges: [{ path: "src/new.ts", operation: "CREATE", reason: "proposed", evidence: [] }],
} as any;

test("1. validateExecution requires approval and never applies changes", () => {
  const result = validateExecution({ build, approved: false });
  assert.equal(result.status, "FAILED");
  assert.equal(result.changes[0]?.applied, false);
});

test("2. validateExecution rejects unsafe and delete operations without explicit delete approval", () => {
  const result = validateExecution({
    build: {
      ...build,
      fileChanges: [{ path: "../x", operation: "DELETE", reason: "x", evidence: [] }],
    },
    approved: true,
  });
  assert.equal(result.validation.valid, false);
});

test("3. HTTP API POST /v1/execute parses multipart (archive before request) without deadlock", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryExecuteTest";
  const payload = makeMultipartPayload(boundary, zipBuf, {
    approved: true,
    build: {
      objective: "Test execution",
      provenance: { source: { kind: "archive" }, licenses: [], copyrightNotices: [] },
      fileChanges: [],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    },
    verify: false,
  });

  const res = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.payload);
  assert.ok(json.execution);
  assert.ok(json.snapshot);
  assert.equal(json.execution.status, "SUCCEEDED");
});

test("4. HTTP API POST /v1/execute handles inverted field ordering (request before archive)", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryExecuteInverted";
  const payload = makeInvertedMultipartPayload(
    boundary,
    {
      approved: true,
      build: {
        objective: "Test inverted execution",
        provenance: { source: { kind: "archive" }, licenses: [], copyrightNotices: [] },
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        validation: { valid: true, errors: [] },
        assumptions: [],
      },
      verify: false,
    },
    zipBuf,
  );

  const res = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 200);
  const json = JSON.parse(res.payload);
  assert.ok(json.execution);
  assert.equal(json.execution.status, "SUCCEEDED");
});

test("5. HTTP API POST /v1/execute rejects missing archive field with 400", async () => {
  const boundary = "----WebKitFormBoundaryExecuteMissingArchive";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="request"\r\n\r\n{"approved":false,"build":{}}\r\n--${boundary}--\r\n`,
    ),
  ]);

  const res = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Expected a multipart \.zip field named 'archive'/);
});

test("6. HTTP API POST /v1/execute rejects missing request field with 400", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryExecuteMissingReq";
  const payload = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="archive"; filename="test.zip"\r\nContent-Type: application/zip\r\n\r\n`,
    ),
    zipBuf,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const res = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Expected a JSON field named 'request'/);
});

test("7. HTTP API POST /v1/execute rejects non-zip archive with 400", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryExecuteBadExt";
  const payload = makeMultipartPayload(
    boundary,
    zipBuf,
    { approved: false, build: {} },
    "archive.tar.gz",
  );

  const res = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Only \.zip archives are accepted for execution/);
});

test("8. HTTP API POST /v1/execute rejects malformed JSON in request field with 400", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryExecuteBadJson";
  const payload = makeMultipartPayload(boundary, zipBuf, "INVALID_JSON_HERE");

  const res = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /The 'request' field must contain valid JSON/);
});

test("9. HTTP API POST /v1/execute rejects override attempts (command/shell/cwd/args)", async () => {
  const zipBuf = sampleProjectZip();
  const boundary = "----WebKitFormBoundaryExecuteOverride";
  const payload = makeMultipartPayload(boundary, zipBuf, {
    approved: true,
    build: {},
    command: "node -e 'console.log(1)'",
    shell: true,
  });

  const res = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /Arbitrary executable, command, shell/);
});

test("10. HTTP API POST /v1/execute rejects empty 0-byte archive with 400", async () => {
  const boundary = "----WebKitFormBoundaryExecuteZero";
  const payload = makeMultipartPayload(boundary, Buffer.alloc(0), {
    approved: true,
    build: {},
  });

  const res = await app.inject({
    method: "POST",
    url: "/v1/execute",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    payload,
  });

  assert.equal(res.statusCode, 400);
  const json = JSON.parse(res.payload);
  assert.match(json.error, /empty or unreadable|Archive is empty/);
});
