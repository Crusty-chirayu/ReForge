import { spawn } from "node:child_process";
import path from "node:path";
import type {
  VerificationCommand,
  VerificationResultItem,
  VerificationStatus,
} from "./domain.js";

const MAX_STREAM_BYTES = 1 * 1024 * 1024; // 1 MB output cap per stream

/**
 * Executes an allowlisted verification command inside the isolated workspace.
 *
 * Security & Resource Constraints:
 * - cwd MUST be projectRoot inside the disposable workspace.
 * - Spawns with shell: false.
 * - Strict timeout (default 60s); forces process killing on timeout.
 * - Hard stdout and stderr stream buffers capped at 1MB with outputTruncated flag.
 * - Sanitized environment variables.
 */
export async function runVerificationCommand(
  projectRoot: string,
  command: VerificationCommand,
): Promise<VerificationResultItem> {
  const startTime = Date.now();
  const timeoutMs = command.timeoutMs ?? 60_000;
  const resolvedCwd = path.resolve(projectRoot);

  let stdoutBytes = 0;
  let stderrBytes = 0;
  let outputTruncated = false;
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];

  let timedOut = false;
  let childError: Error | undefined = undefined;

  // Sanitized environment variables (no secret credentials)
  const safeEnv: Record<string, string> = {};
  for (const key of [
    "PATH",
    "SYSTEMROOT",
    "TMP",
    "TEMP",
    "PATHEXT",
    "APPDATA",
    "LOCALAPPDATA",
    "HOME",
    "USERPROFILE",
  ]) {
    if (process.env[key]) safeEnv[key] = process.env[key]!;
  }

  return new Promise<VerificationResultItem>((resolve) => {
    let timer: NodeJS.Timeout | undefined;

    const child = spawn(command.executable, command.args, {
      cwd: resolvedCwd,
      shell: false,
      env: safeEnv,
      windowsHide: true,
    });

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill();
        } catch {}
      }, timeoutMs);
      timer.unref?.();
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBytes += chunk.length;
      if (stdoutBytes <= MAX_STREAM_BYTES) {
        stdoutChunks.push(chunk);
      } else {
        outputTruncated = true;
        const allowed = chunk.length - (stdoutBytes - MAX_STREAM_BYTES);
        if (allowed > 0) stdoutChunks.push(chunk.subarray(0, allowed));
        child.stdout?.destroy();
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderrBytes += chunk.length;
      if (stderrBytes <= MAX_STREAM_BYTES) {
        stderrChunks.push(chunk);
      } else {
        outputTruncated = true;
        const allowed = chunk.length - (stderrBytes - MAX_STREAM_BYTES);
        if (allowed > 0) stderrChunks.push(chunk.subarray(0, allowed));
        child.stderr?.destroy();
      }
    });

    child.on("error", (err) => {
      childError = err;
    });

    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const stdout = Buffer.concat(stdoutChunks).toString("utf-8");
      const stderr = Buffer.concat(stderrChunks).toString("utf-8");

      let status: VerificationStatus = "FAILED";
      if (timedOut) {
        status = "TIMEOUT";
      } else if (childError) {
        status = "ERROR";
      } else if (code === 0) {
        status = "PASSED";
      } else {
        status = "FAILED";
      }

      let errorMsg: string | undefined = undefined;
      if (timedOut) {
        errorMsg = `Verification command timed out after ${timeoutMs}ms.`;
      } else if (childError) {
        errorMsg = childError.message;
      } else if (code !== 0) {
        errorMsg = `Verification process exited with non-zero code: ${code}`;
      }

      resolve({
        id: command.id,
        label: command.label,
        status,
        exitCode: code ?? null,
        durationMs,
        stdout,
        stderr,
        outputTruncated,
        error: errorMsg,
      });
    });
  });
}
