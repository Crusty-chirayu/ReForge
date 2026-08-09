import { createWriteStream, promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { execFile } from "node:child_process";
import { pipeline } from "node:stream/promises";
import yauzl from "yauzl";

const WORKSPACE_ROOT = path.resolve(".reforge", "workspaces");
const MAX_ARCHIVE_ENTRIES = 10_000;
const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024;
const MAX_EXTRACTED_BYTES = 500 * 1024 * 1024;

export async function createWorkspace(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = path.join(WORKSPACE_ROOT, randomUUID());
  await fs.mkdir(root, { recursive: true });
  return { root, cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}

export async function saveUpload(input: NodeJS.ReadableStream, workspace: string): Promise<string> {
  const archive = path.join(workspace, "upload.zip");
  await pipeline(input, createWriteStream(archive));
  const stat = await fs.stat(archive);
  if (stat.size > MAX_ARCHIVE_BYTES) throw new Error("Archive exceeds the 200 MB upload limit.");
  return archive;
}

function safeArchivePath(destination: string, entryName: string): string {
  const root = path.resolve(destination);
  const normalized = entryName.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) throw new Error(`Unsafe ZIP entry path: ${entryName}`);
  const output = path.resolve(root, normalized);
  if (!output.startsWith(`${root}${path.sep}`) && output !== root) throw new Error(`Unsafe ZIP entry path: ${entryName}`);
  return output;
}

export async function extractZipSafely(archive: string, destination: string): Promise<void> {
  await fs.mkdir(destination, { recursive: true });
  await new Promise<void>((resolve, reject) => {
    yauzl.open(archive, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError || !zip) return reject(openError ?? new Error("Unable to open ZIP archive."));
      let count = 0;
      let extractedBytes = 0;
      let done = false;
      const fail = (error: Error) => { if (!done) { done = true; zip.close(); reject(error); } };
      zip.on("error", fail);
      zip.on("entry", (entry) => {
        if (++count > MAX_ARCHIVE_ENTRIES) return fail(new Error("Archive contains too many entries."));
        extractedBytes += entry.uncompressedSize;
        if (extractedBytes > MAX_EXTRACTED_BYTES) return fail(new Error("Archive exceeds the 500 MB extracted-size limit."));
        const unixMode = (entry.externalFileAttributes >>> 16) & 0o170000;
        if (unixMode === 0o120000) return fail(new Error(`Symbolic-link ZIP entries are not allowed: ${entry.fileName}`));
        let output: string;
        try { output = safeArchivePath(destination, entry.fileName); } catch (error) { return fail(error as Error); }
        if (/\/$/.test(entry.fileName)) {
          fs.mkdir(output, { recursive: true }).then(() => zip.readEntry(), fail);
          return;
        }
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) return fail(streamError ?? new Error("Could not read ZIP entry."));
          fs.mkdir(path.dirname(output), { recursive: true })
            .then(() => pipeline(stream, createWriteStream(output)))
            .then(() => zip.readEntry(), fail);
        });
      });
      zip.on("end", () => { if (!done) { done = true; resolve(); } });
      zip.readEntry();
    });
  });
}

export function validateGitHubUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("repositoryUrl must be a valid HTTPS GitHub URL."); }
  if (url.protocol !== "https:" || url.hostname !== "github.com" || !url.pathname.match(/^\/[^/]+\/[^/]+(?:\.git)?\/?$/)) throw new Error("Only HTTPS GitHub repository URLs are currently accepted.");
  return url;
}

export async function cloneRepository(repositoryUrl: string, workspace: string): Promise<string> {
  validateGitHubUrl(repositoryUrl);
  const destination = path.join(workspace, "project");
  await new Promise<void>((resolve, reject) => execFile("git", ["clone", "--depth", "1", repositoryUrl, destination], { windowsHide: true, timeout: 120_000, maxBuffer: 1024 * 1024 }, (error) => error ? reject(new Error(`Repository clone failed: ${error.message}`)) : resolve()));
  return destination;
}
