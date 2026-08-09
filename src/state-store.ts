import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  PipelineAuditLogEntry,
  PipelineExecutionSummary,
  PipelineResult,
  ProjectSnapshot,
} from "./domain.js";

const ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function validateId(id: string, name: string): void {
  if (!id || typeof id !== "string" || !ID_REGEX.test(id) || id.includes("..")) {
    throw new Error(`Invalid ${name}: must be a safe alphanumeric identifier.`);
  }
}

export class StateStore {
  private baseDir: string;
  private executionsDir: string;
  private snapshotsDir: string;
  private auditFile: string;

  constructor(customStoreDir?: string) {
    const rawDir =
      customStoreDir ??
      process.env.REFORGE_STORE_DIR ??
      path.join(process.cwd(), ".reforge", "store");

    this.baseDir = path.resolve(rawDir);
    this.executionsDir = path.join(this.baseDir, "executions");
    this.snapshotsDir = path.join(this.baseDir, "snapshots");
    this.auditFile = path.join(this.baseDir, "audit.jsonl");
  }

  public getStoreDir(): string {
    return this.baseDir;
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.executionsDir, { recursive: true });
    await fs.mkdir(this.snapshotsDir, { recursive: true });
  }

  /**
   * Atomic crash-safe write using temp file and rename.
   */
  private async atomicWriteJson(targetPath: string, data: unknown): Promise<void> {
    await this.ensureDirectories();
    const tempPath = `${targetPath}.tmp.${randomUUID()}`;
    const jsonStr = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, jsonStr, "utf-8");
    await fs.rename(tempPath, targetPath);
  }

  /**
   * Persists a PipelineResult metadata object.
   */
  public async savePipelineResult(result: PipelineResult): Promise<void> {
    validateId(result.pipelineId, "pipelineId");
    const targetPath = path.join(this.executionsDir, `${result.pipelineId}.json`);
    await this.atomicWriteJson(targetPath, result);

    if (result.snapshot) {
      await this.saveSnapshot(result.snapshot);
    }
  }

  /**
   * Retrieves a stored PipelineResult by pipelineId.
   */
  public async getExecution(pipelineId: string): Promise<PipelineResult | undefined> {
    validateId(pipelineId, "pipelineId");
    const targetPath = path.join(this.executionsDir, `${pipelineId}.json`);
    try {
      const content = await fs.readFile(targetPath, "utf-8");
      return JSON.parse(content) as PipelineResult;
    } catch {
      return undefined;
    }
  }

  /**
   * Lists historical pipeline executions up to the specified limit (max 200).
   */
  public async listExecutions(limit = 50): Promise<PipelineExecutionSummary[]> {
    await this.ensureDirectories();
    const safeLimit = Math.min(Math.max(1, limit), 200);

    let filenames: string[] = [];
    try {
      filenames = await fs.readdir(this.executionsDir);
    } catch {
      return [];
    }

    const summaries: PipelineExecutionSummary[] = [];

    for (const file of filenames) {
      if (!file.endsWith(".json")) continue;
      try {
        const fullPath = path.join(this.executionsDir, file);
        const content = await fs.readFile(fullPath, "utf-8");
        const res = JSON.parse(content) as PipelineResult;

        summaries.push({
          pipelineId: res.pipelineId,
          goal: res.goal,
          status: res.status,
          snapshotId: res.snapshot?.snapshotId ?? "",
          approved: res.execution?.approved ?? false,
          appliedPatchCount: res.execution?.appliedOperations?.length ?? 0,
          verificationStatus: res.execution?.verification?.overallStatus,
          createdAt: res.createdAt,
          completedAt: res.completedAt,
        });
      } catch {}
    }

    // Deterministic reverse chronological ordering
    summaries.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return summaries.slice(0, safeLimit);
  }

  /**
   * Persists a ProjectSnapshot metadata object by snapshotId.
   */
  public async saveSnapshot(snapshot: ProjectSnapshot): Promise<void> {
    validateId(snapshot.snapshotId, "snapshotId");
    const targetPath = path.join(this.snapshotsDir, `${snapshot.snapshotId}.json`);

    // Clean snapshot copy: exclude file text/contents if any exist
    const cleanSnapshot: ProjectSnapshot = {
      snapshotId: snapshot.snapshotId,
      provenance: snapshot.provenance,
      files: snapshot.files.map((f) => ({
        path: f.path,
        hash: f.hash,
        size: f.size,
        category: f.category,
      })),
      projectModelFingerprint: snapshot.projectModelFingerprint,
      dependencies: snapshot.dependencies,
      createdAt: snapshot.createdAt,
    };

    await this.atomicWriteJson(targetPath, cleanSnapshot);
  }

  /**
   * Retrieves a stored ProjectSnapshot by snapshotId.
   */
  public async getSnapshot(snapshotId: string): Promise<ProjectSnapshot | undefined> {
    validateId(snapshotId, "snapshotId");
    const targetPath = path.join(this.snapshotsDir, `${snapshotId}.json`);
    try {
      const content = await fs.readFile(targetPath, "utf-8");
      return JSON.parse(content) as ProjectSnapshot;
    } catch {
      return undefined;
    }
  }

  /**
   * Appends an audit log entry in JSONL format.
   */
  public async appendAuditEvent(
    event: Omit<PipelineAuditLogEntry, "auditId" | "timestamp"> & {
      auditId?: string;
      timestamp?: string;
    },
  ): Promise<PipelineAuditLogEntry> {
    await this.ensureDirectories();

    const fullEntry: PipelineAuditLogEntry = {
      auditId: event.auditId ?? randomUUID(),
      pipelineId: event.pipelineId,
      timestamp: event.timestamp ?? new Date().toISOString(),
      eventType: event.eventType,
      details: event.details,
    };

    const line = `${JSON.stringify(fullEntry)}\n`;
    await fs.appendFile(this.auditFile, line, "utf-8");
    return fullEntry;
  }
}
