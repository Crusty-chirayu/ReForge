import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { AnalysisReport, FileCategory, ProjectSnapshot } from "./domain.js";

const fingerprint = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const categoryFor = (report: AnalysisReport, file: string): FileCategory => report.projectModel?.files.find((entry) => entry.path === file)?.category ?? "UNKNOWN";
export async function createProjectSnapshot(root: string, report: AnalysisReport): Promise<ProjectSnapshot> {
  const inventory = report.projectModel?.files ?? [];
  const files = await Promise.all(inventory.map(async (entry) => {
    const absolute = path.resolve(root, entry.path);
    const contents = await fs.readFile(absolute);
    return { path: entry.path, hash: fingerprint(contents), size: contents.length, category: categoryFor(report, entry.path) };
  }));
  files.sort((a, b) => a.path.localeCompare(b.path));
  const dependencies = (report.projectModel?.dependencies ?? []).map(({ name, version, type }) => ({ name, version, type })).sort((a, b) => a.name.localeCompare(b.name));
  const projectModelFingerprint = fingerprint(JSON.stringify({ files, dependencies, modules: report.projectModel?.modules.map((m) => m.id).sort() ?? [] }));
  const snapshotId = fingerprint(JSON.stringify({ source: report.provenance, files, projectModelFingerprint, dependencies }));
  return { snapshotId, provenance: report.provenance, files, projectModelFingerprint, dependencies, createdAt: new Date().toISOString() };
}
