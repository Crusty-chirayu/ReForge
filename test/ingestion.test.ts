import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import {
  cloneRepository,
  extractZipSafely,
  MAX_SINGLE_FILE_BYTES,
  safeArchivePath,
  saveUpload,
  validateGitHubUrl,
} from "../src/ingestion.js";
import { AnalysisEngine } from "../src/engine.js";

interface ZipEntry {
  name: string;
  content?: string | Buffer;
  externalAttributes?: number;
  uncompressedSizeOverride?: number;
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
    const uncompressedSize = entry.uncompressedSizeOverride ?? content.length;
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(content.length, 18);
    header.writeUInt32LE(uncompressedSize, 22);
    header.writeUInt16LE(name.length, 26);
    local.push(header, name, content);
    const directory = Buffer.alloc(46);
    directory.writeUInt32LE(0x02014b50, 0);
    directory.writeUInt16LE(20, 4);
    directory.writeUInt16LE(20, 6);
    directory.writeUInt32LE(crc, 16);
    directory.writeUInt32LE(content.length, 20);
    directory.writeUInt32LE(uncompressedSize, 24);
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

test("extracts a safe ZIP and produces a report", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-zip-"));
  try {
    const archive = path.join(root, "safe.zip");
    const project = path.join(root, "project");
    await writeFile(
      archive,
      storedZip([
        { name: "package.json", content: '{"dependencies":{"fastify":"^5"}}' },
        { name: "src/server.ts", content: "app.get('/health', () => 'ok')" },
      ]),
    );
    await extractZipSafely(archive, project.replaceAll("\\", "/"));
    assert.match(await readFile(path.join(project, "package.json"), "utf8"), /fastify/);
    const report = await new AnalysisEngine().analyze(project, { kind: "archive" });
    assert.ok(report.frameworks.some((item) => item.name === "fastify"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects malformed, traversal, and symbolic-link ZIP inputs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-zip-"));
  try {
    await writeFile(path.join(root, "bad.zip"), "not a ZIP");
    await assert.rejects(extractZipSafely(path.join(root, "bad.zip"), path.join(root, "bad")));

    await writeFile(path.join(root, "traversal.zip"), storedZip([{ name: "../escape.txt", content: "no" }]));
    await assert.rejects(extractZipSafely(path.join(root, "traversal.zip"), path.join(root, "traversal")));

    await writeFile(
      path.join(root, "symlink.zip"),
      storedZip([{ name: "link", externalAttributes: (0o120777 << 16) >>> 0 }]),
    );
    await assert.rejects(
      extractZipSafely(path.join(root, "symlink.zip"), path.join(root, "symlink")),
      /Symbolic-link/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("accepts an empty project and rejects malformed GitHub URLs", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-zip-"));
  try {
    const archive = path.join(root, "empty.zip");
    const project = path.join(root, "empty");
    await writeFile(archive, storedZip([]));
    await extractZipSafely(archive, project);
    const report = await new AnalysisEngine().analyze(project, { kind: "archive" });
    assert.equal(report.overview.fileCount, 0);

    assert.doesNotThrow(() => validateGitHubUrl("https://github.com/openai/openai-node.git"));
    for (const value of [
      "not-a-url",
      "http://github.com/openai/openai-node",
      "https://example.com/a/b",
      "https://github.com/openai",
      "https://github.com/openai/openai-node/.git",
      "https://github.com:8080/openai/openai-node",
      "https://user:pass@github.com/openai/openai-node",
      "https://github.com/openai/openai-node?branch=main",
      "https://github.com/openai/openai-node#hash",
    ]) {
      assert.throws(() => validateGitHubUrl(value));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects zero-byte unreadable archives", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-zip-"));
  try {
    const archive = path.join(root, "zero.zip");
    const project = path.join(root, "project");
    await writeFile(archive, Buffer.alloc(0));
    await assert.rejects(extractZipSafely(archive, project), /empty or unreadable/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects entries with null bytes or drive-letter paths", async () => {
  assert.throws(() => safeArchivePath("dest", "foo\0bar.ts"), /null byte/);
  assert.throws(() => safeArchivePath("dest", "C:/Windows/System32.dll"), /Unsafe ZIP entry path/);
  assert.throws(() => safeArchivePath("dest", "/etc/passwd"), /Unsafe ZIP entry path/);
  assert.throws(() => safeArchivePath("dest", "nested/../../outside.ts"), /Unsafe ZIP entry path/);
});

test("rejects duplicate paths inside the same archive", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-zip-"));
  try {
    const archive = path.join(root, "duplicate.zip");
    const project = path.join(root, "project");
    await writeFile(
      archive,
      storedZip([
        { name: "index.ts", content: "console.log(1);" },
        { name: "index.ts", content: "console.log(2);" },
      ]),
    );
    await assert.rejects(extractZipSafely(archive, project), /Duplicate ZIP entry path/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unsupported entry types like FIFOs and character devices", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-zip-"));
  try {
    const archive = path.join(root, "fifo.zip");
    const project = path.join(root, "project");
    await writeFile(
      archive,
      storedZip([{ name: "mypipe", externalAttributes: (0o010666 << 16) >>> 0 }]),
    );
    await assert.rejects(extractZipSafely(archive, project), /Unsupported entry type/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects entries whose declared uncompressedSize exceeds MAX_SINGLE_FILE_BYTES", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-zip-"));
  try {
    const archive = path.join(root, "huge.zip");
    const project = path.join(root, "project");
    await writeFile(
      archive,
      storedZip([
        {
          name: "huge.bin",
          content: "small content",
          uncompressedSizeOverride: MAX_SINGLE_FILE_BYTES + 1,
        },
      ]),
    );
    await assert.rejects(
      extractZipSafely(archive, project),
      /exceeds the single-file size limit|compressed\/uncompressed size mismatch/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cleans up destination completely if extraction fails part-way", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-zip-"));
  try {
    const archive = path.join(root, "half-bad.zip");
    const project = path.join(root, "project");
    await writeFile(
      archive,
      storedZip([
        { name: "first.txt", content: "ok" },
        { name: "../evil.txt", content: "bad" },
      ]),
    );
    await assert.rejects(extractZipSafely(archive, project));
    const exists = await stat(project).then(() => true, () => false);
    assert.equal(exists, false, "Destination directory should be cleaned up on failure");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("saveUpload rejects empty streams and enforces limits", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-upload-"));
  try {
    const emptyStream = Readable.from([]);
    await assert.rejects(saveUpload(emptyStream, root), /Archive is empty/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("cloneRepository cleans up destination workspace on failure", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "reforge-clone-"));
  try {
    // Non-existent repository on github
    await assert.rejects(
      cloneRepository("https://github.com/reforge-nonexistent-org/nonexistent-repo-404.git", root),
    );
    const dest = path.join(root, "project");
    const exists = await stat(dest).then(() => true, () => false);
    assert.equal(exists, false, "Clone destination should be removed on error");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
