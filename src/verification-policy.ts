import { promises as fs } from "node:fs";
import path from "node:path";
import type { AnalysisReport, ProjectSnapshot, VerificationPolicy } from "./domain.js";

/**
 * Derives server-controlled allowlisted verification policy for a given workspace.
 *
 * Rules:
 * - Never accepts client-supplied commands or executables.
 * - Does not run package manager install commands.
 * - Resolves safe fixed executable and arguments for detected project configurations (e.g. TypeScript).
 * - Returns available: false if no safe allowlisted command can be derived.
 */
export async function deriveVerificationPolicy(
  projectRoot: string,
  reportOrSnapshot?: AnalysisReport | ProjectSnapshot,
): Promise<VerificationPolicy> {
  const tsconfigPath = path.join(projectRoot, "tsconfig.json");
  let isTypeScript = false;

  try {
    await fs.access(tsconfigPath);
    isTypeScript = true;
  } catch {
    const files =
      (reportOrSnapshot as ProjectSnapshot)?.files ??
      (reportOrSnapshot as AnalysisReport)?.projectModel?.files ??
      [];
    if (files.some((f) => f.path.endsWith(".ts") || f.path.endsWith(".tsx"))) {
      isTypeScript = true;
    }
  }

  if (!isTypeScript) {
    return {
      available: false,
      commands: [],
      reason: "No safe verification command could be derived for this project.",
    };
  }

  // Resolve safe tsc compiler binary path
  let tscPath: string | undefined;

  const workspaceTsc = path.join(
    projectRoot,
    "node_modules",
    "typescript",
    "bin",
    "tsc",
  );
  try {
    await fs.access(workspaceTsc);
    tscPath = workspaceTsc;
  } catch {
    const hostTsc = path.resolve("node_modules", "typescript", "bin", "tsc");
    try {
      await fs.access(hostTsc);
      tscPath = hostTsc;
    } catch {}
  }

  if (!tscPath) {
    return {
      available: false,
      commands: [],
      reason:
        "TypeScript project detected, but no safe tsc binary could be resolved in workspace or host environment.",
    };
  }

  return {
    available: true,
    commands: [
      {
        id: "TYPECHECK",
        label: "TypeScript typecheck",
        executable: process.execPath,
        args: [tscPath, "--noEmit"],
        reason: "TypeScript project detected",
        timeoutMs: 60_000,
      },
    ],
  };
}
