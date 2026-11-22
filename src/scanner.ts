import { promises as fs } from "node:fs";
import path from "node:path";
import type { ScanResult, ScannedFile } from "./domain.js";

const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".cache", "vendor", "target", "out", "__pycache__", ".reforge", "test-results", ".turbo"]);
const TEXT_LIMIT = 512 * 1024;
const FILE_LIMIT = 10_000;
const BINARY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".gz", ".tar", ".woff", ".woff2", ".ttf", ".exe", ".dll", ".so", ".dylib"]);

export async function scanProject(root: string): Promise<ScanResult> {
  const files: ScannedFile[] = [];
  const ignoredDirectories = new Set<string>();
  let skippedFiles = 0;

  async function walk(directory: string): Promise<void> {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relativePath = path.relative(root, absolute).split(path.sep).join("/");
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) { ignoredDirectories.add(relativePath); continue; }
        await walk(absolute);
      } else if (entry.isFile()) {
        if (files.length >= FILE_LIMIT) { skippedFiles++; continue; }
        const stat = await fs.stat(absolute);
        const extension = path.extname(entry.name).toLowerCase();
        const file: ScannedFile = { relativePath, extension, size: stat.size };
        if (stat.size <= TEXT_LIMIT && !BINARY_EXTENSIONS.has(extension)) {
          try { file.text = await fs.readFile(absolute, "utf8"); } catch { skippedFiles++; }
        }
        files.push(file);
      }
    }
  }
  await walk(root);
  return { root, files, ignoredDirectories: [...ignoredDirectories].sort(), skippedFiles };
}
