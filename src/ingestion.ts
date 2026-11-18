import { createWriteStream, promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { execFile } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
import yauzl from "yauzl";

export const WORKSPACE_ROOT = path.resolve(".reforge", "workspaces");
export const MAX_ARCHIVE_ENTRIES = 10_000;
export const MAX_ARCHIVE_BYTES = 200 * 1024 * 1024; // 200 MB upload limit
export const MAX_EXTRACTED_BYTES = 500 * 1024 * 1024; // 500 MB total uncompressed limit
export const MAX_SINGLE_FILE_BYTES = 100 * 1024 * 1024; // 100 MB single file uncompressed limit

export async function createWorkspace(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = path.join(WORKSPACE_ROOT, randomUUID());
  await fs.mkdir(root, { recursive: true });
  return {
    root,
    cleanup: async () => {
      await fs.rm(root, { recursive: true, force: true }).catch(() => {});
    },
  };
}

export async function saveUpload(input: NodeJS.ReadableStream, workspace: string): Promise<string> {
  const archive = path.join(workspace, "upload.zip");
  let bytesWritten = 0;

  const meter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_ARCHIVE_BYTES) {
        callback(new Error("Archive exceeds the 200 MB upload limit."));
        return;
      }
      callback(null, chunk);
    },
  });

  try {
    await pipeline(input, meter, createWriteStream(archive));
    const stat = await fs.stat(archive);
    if (stat.size === 0) {
      throw new Error("Archive is empty.");
    }
    if (stat.size > MAX_ARCHIVE_BYTES) {
      throw new Error("Archive exceeds the 200 MB upload limit.");
    }
    return archive;
  } catch (error) {
    await fs.rm(archive, { force: true }).catch(() => {});
    throw error;
  }
}

export function safeArchivePath(destination: string, entryName: string): string {
  if (entryName.includes("\0")) {
    throw new Error(`Unsafe ZIP entry path (null byte): ${entryName}`);
  }
  const root = path.resolve(destination);
  const normalized = entryName.replaceAll("\\", "/");
  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").includes("..")
  ) {
    throw new Error(`Unsafe ZIP entry path: ${entryName}`);
  }
  const output = path.resolve(root, normalized);
  if (!output.startsWith(`${root}${path.sep}`) && output !== root) {
    throw new Error(`Unsafe ZIP entry path: ${entryName}`);
  }
  return output;
}

export async function extractZipSafely(archive: string, destination: string): Promise<void> {
  const stat = await fs.stat(archive).catch(() => null);
  if (!stat || stat.size === 0) {
    throw new Error("Archive is empty or unreadable.");
  }

  await fs.mkdir(destination, { recursive: true });

  let totalActualExtractedBytes = 0;
  const seenPaths = new Set<string>();

  const cleanupDestination = async () => {
    await fs.rm(destination, { recursive: true, force: true }).catch(() => {});
  };

  try {
    await new Promise<void>((resolve, reject) => {
      yauzl.open(archive, { lazyEntries: true, validateEntrySizes: true }, (openError, zip) => {
        if (openError || !zip) {
          return reject(openError ?? new Error("Unable to open ZIP archive."));
        }

        let count = 0;
        let predictedExtractedBytes = 0;
        let done = false;

        const fail = (error: Error) => {
          if (!done) {
            done = true;
            try {
              zip.close();
            } catch {}
            reject(error);
          }
        };

        zip.on("error", fail);

        zip.on("entry", (entry: yauzl.Entry) => {
          if (done) return;

          if (++count > MAX_ARCHIVE_ENTRIES) {
            return fail(new Error("Archive contains too many entries."));
          }

          if (entry.uncompressedSize > MAX_SINGLE_FILE_BYTES) {
            return fail(
              new Error(
                `Archive entry exceeds the single-file size limit (${MAX_SINGLE_FILE_BYTES} bytes): ${entry.fileName}`,
              ),
            );
          }

          predictedExtractedBytes += entry.uncompressedSize;
          if (predictedExtractedBytes > MAX_EXTRACTED_BYTES) {
            return fail(new Error("Archive exceeds the 500 MB extracted-size limit."));
          }

          // Check entry attributes and mode
          const unixMode = (entry.externalFileAttributes >>> 16) & 0o170000;
          if (unixMode === 0o120000) {
            return fail(new Error(`Symbolic-link ZIP entries are not allowed: ${entry.fileName}`));
          }
          if (unixMode !== 0 && unixMode !== 0o100000 && unixMode !== 0o040000) {
            return fail(new Error(`Unsupported entry type in ZIP archive: ${entry.fileName}`));
          }

          let output: string;
          try {
            output = safeArchivePath(destination, entry.fileName);
          } catch (error) {
            return fail(error as Error);
          }

          // Safe duplicate path detection
          const normalizedOutput = path.resolve(output);
          if (seenPaths.has(normalizedOutput)) {
            return fail(new Error(`Duplicate ZIP entry path: ${entry.fileName}`));
          }
          seenPaths.add(normalizedOutput);

          // Directory entry
          if (/\/$/.test(entry.fileName)) {
            fs.mkdir(output, { recursive: true })
              .then(() => {
                if (!done) zip.readEntry();
              })
              .catch(fail);
            return;
          }

          // Regular file entry with streaming byte limits
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError || !stream) {
              return fail(streamError ?? new Error("Could not read ZIP entry."));
            }

            let entryWrittenBytes = 0;
            const entryMeter = new Transform({
              transform(chunk: Buffer, _encoding, callback) {
                entryWrittenBytes += chunk.length;
                totalActualExtractedBytes += chunk.length;

                if (entryWrittenBytes > MAX_SINGLE_FILE_BYTES) {
                  callback(
                    new Error(
                      `Archive entry exceeds the single-file size limit (${MAX_SINGLE_FILE_BYTES} bytes): ${entry.fileName}`,
                    ),
                  );
                  return;
                }

                if (totalActualExtractedBytes > MAX_EXTRACTED_BYTES) {
                  callback(new Error("Archive exceeds the 500 MB extracted-size limit."));
                  return;
                }

                callback(null, chunk);
              },
            });

            fs.mkdir(path.dirname(output), { recursive: true })
              .then(() => pipeline(stream, entryMeter, createWriteStream(output)))
              .then(() => {
                if (!done) zip.readEntry();
              })
              .catch(fail);
          });
        });

        zip.on("end", () => {
          if (!done) {
            done = true;
            resolve();
          }
        });

        zip.readEntry();
      });
    });
  } catch (error) {
    await cleanupDestination();
    throw error;
  }
}

export function validateGitHubUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("repositoryUrl must be a valid HTTPS GitHub URL.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only HTTPS GitHub repository URLs are currently accepted.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname !== "github.com") {
    throw new Error("Only HTTPS GitHub repository URLs are currently accepted.");
  }

  if (url.port && url.port !== "443") {
    throw new Error("Only HTTPS GitHub repository URLs are currently accepted.");
  }

  if (url.username || url.password) {
    throw new Error("Only HTTPS GitHub repository URLs are currently accepted.");
  }

  if (url.search || url.hash) {
    throw new Error("Only HTTPS GitHub repository URLs are currently accepted.");
  }

  if (!url.pathname.match(/^\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\.git)?\/?$/)) {
    throw new Error("Only HTTPS GitHub repository URLs are currently accepted.");
  }

  if (url.pathname.endsWith("/.git")) {
    throw new Error("Only HTTPS GitHub repository URLs are currently accepted.");
  }

  return url;
}

export async function cloneRepository(repositoryUrl: string, workspace: string): Promise<string> {
  const validatedUrl = validateGitHubUrl(repositoryUrl);
  const destination = path.join(workspace, "project");

  const gitArgs = [
    "clone",
    "--depth",
    "1",
    "--no-recurse-submodules",
    "-c",
    "protocol.file.allow=never",
    "-c",
    "protocol.ext.allow=never",
    "-c",
    "credential.helper=",
    validatedUrl.toString(),
    destination,
  ];

  try {
    await new Promise<void>((resolve, reject) =>
      execFile(
        "git",
        gitArgs,
        {
          windowsHide: true,
          timeout: 120_000,
          maxBuffer: 1024 * 1024,
        },
        (error) => (error ? reject(new Error(`Repository clone failed: ${error.message}`)) : resolve()),
      ),
    );
    return destination;
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}
