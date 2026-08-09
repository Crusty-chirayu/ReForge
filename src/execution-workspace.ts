import { promises as fs } from "node:fs";
import path from "node:path";
import {
  createWorkspace,
  extractZipSafely,
  saveUpload,
} from "./ingestion.js";

export interface ExecutionWorkspace {
  root: string;
  cleanup: () => Promise<void>;
}

/**
 * Creates a disposable execution workspace from a trusted ZIP stream.
 *
 * The caller never supplies a filesystem root.
 * ReForge creates the workspace internally under its controlled
 * workspace directory and removes it when execution finishes.
 */
export async function createExecutionWorkspace(
  input: NodeJS.ReadableStream,
): Promise<ExecutionWorkspace> {
  const workspace = await createWorkspace();

  try {
    const archive = await saveUpload(input, workspace.root);
    const projectRoot = path.join(workspace.root, "project");

    await extractZipSafely(archive, projectRoot);

    // The archive is no longer needed after successful extraction.
    await fs.rm(archive, { force: true });

    return {
      root: projectRoot,
      cleanup: workspace.cleanup,
    };
  } catch (error) {
    await workspace.cleanup();
    throw error;
  }
}