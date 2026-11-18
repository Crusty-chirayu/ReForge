/**
 * Unified Diff Generator for ReForge Code Intelligence
 *
 * Implements Myers-style line diffing to produce standard unified diff
 * format (POSIX / Git style) with hunk headers and configurable context.
 */

export interface UnifiedDiffOptions {
  contextLines?: number;
  oldHeader?: string;
  newHeader?: string;
}

interface DiffLine {
  type: "add" | "delete" | "equal";
  text: string;
}

interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

function computeLineDiff(oldLines: string[], newLines: string[]): DiffLine[] {
  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    const rowCurrent = dp[i + 1]!;
    const rowPrev = dp[i]!;
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        rowCurrent[j + 1] = (rowPrev[j] ?? 0) + 1;
      } else {
        rowCurrent[j + 1] = Math.max(rowPrev[j + 1] ?? 0, rowCurrent[j] ?? 0);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    const prevOld = oldLines[i - 1];
    const prevNew = newLines[j - 1];
    const dpCurrent = dp[i]!;
    const dpPrev = dp[i - 1];

    if (i > 0 && j > 0 && prevOld === prevNew && prevOld !== undefined) {
      result.push({ type: "equal", text: prevOld });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || (dpCurrent[j - 1] ?? 0) >= (dpPrev ? (dpPrev[j] ?? 0) : 0))) {
      result.push({ type: "add", text: prevNew ?? "" });
      j--;
    } else if (i > 0 && (j === 0 || (dpCurrent[j - 1] ?? 0) < (dpPrev ? (dpPrev[j] ?? 0) : 0))) {
      result.push({ type: "delete", text: prevOld ?? "" });
      i--;
    }
  }

  return result.reverse();
}

function buildHunks(diffLines: DiffLine[], contextLines = 3): Hunk[] {
  const hunks: Hunk[] = [];
  let currentHunkLines: DiffLine[] = [];
  let oldLineNum = 1;
  let newLineNum = 1;

  let hunkOldStart = 1;
  let hunkNewStart = 1;
  let consecutiveEquals = 0;

  let inHunk = false;

  for (let idx = 0; idx < diffLines.length; idx++) {
    const item = diffLines[idx];
    if (!item) continue;

    if (item.type !== "equal") {
      if (!inHunk) {
        inHunk = true;
        const leadingContextStart = Math.max(0, idx - contextLines);
        const leadingLines = diffLines.slice(leadingContextStart, idx);

        currentHunkLines = [...leadingLines];
        hunkOldStart = oldLineNum - leadingLines.length;
        hunkNewStart = newLineNum - leadingLines.length;
      }
      currentHunkLines.push(item);
      consecutiveEquals = 0;

      if (item.type === "delete") {
        oldLineNum++;
      } else if (item.type === "add") {
        newLineNum++;
      }
    } else {
      if (inHunk) {
        currentHunkLines.push(item);
        consecutiveEquals++;

        if (consecutiveEquals > contextLines * 2) {
          const trimmed = currentHunkLines.slice(
            0,
            currentHunkLines.length - (consecutiveEquals - contextLines)
          );

          let oldCount = 0;
          let newCount = 0;
          for (const l of trimmed) {
            if (l.type === "equal" || l.type === "delete") oldCount++;
            if (l.type === "equal" || l.type === "add") newCount++;
          }

          hunks.push({
            oldStart: Math.max(1, hunkOldStart),
            oldCount,
            newStart: Math.max(1, hunkNewStart),
            newCount,
            lines: trimmed,
          });

          inHunk = false;
          currentHunkLines = [];
          consecutiveEquals = 0;
        }
      }
      oldLineNum++;
      newLineNum++;
    }
  }

  if (inHunk && currentHunkLines.length > 0) {
    let trailingEquals = 0;
    for (let k = currentHunkLines.length - 1; k >= 0; k--) {
      const line = currentHunkLines[k];
      if (line && line.type === "equal") trailingEquals++;
      else break;
    }
    const trimmed =
      trailingEquals > contextLines
        ? currentHunkLines.slice(0, currentHunkLines.length - (trailingEquals - contextLines))
        : currentHunkLines;

    let oldCount = 0;
    let newCount = 0;
    for (const l of trimmed) {
      if (l.type === "equal" || l.type === "delete") oldCount++;
      if (l.type === "equal" || l.type === "add") newCount++;
    }

    hunks.push({
      oldStart: Math.max(1, hunkOldStart),
      oldCount,
      newStart: Math.max(1, hunkNewStart),
      newCount,
      lines: trimmed,
    });
  }

  return hunks;
}

export function createUnifiedDiff(
  filePath: string,
  oldContent: string,
  newContent: string,
  options: UnifiedDiffOptions = {}
): string {
  if (oldContent === newContent) {
    return "";
  }

  const oldLines = oldContent === "" ? [] : oldContent.split(/\r?\n/);
  const newLines = newContent === "" ? [] : newContent.split(/\r?\n/);

  const diffLines = computeLineDiff(oldLines, newLines);
  const hunks = buildHunks(diffLines, options.contextLines ?? 3);

  if (hunks.length === 0) {
    return "";
  }

  const oldHeader = options.oldHeader ?? `a/${filePath}`;
  const newHeader = options.newHeader ?? `b/${filePath}`;

  const header = `--- ${oldHeader}\n+++ ${newHeader}\n`;

  const hunkStrings = hunks.map((hunk) => {
    const hunkHeader = `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@\n`;
    const lines = hunk.lines
      .map((l) => {
        const prefix = l.type === "add" ? "+" : l.type === "delete" ? "-" : " ";
        return `${prefix}${l.text}`;
      })
      .join("\n");
    return hunkHeader + lines;
  });

  return header + hunkStrings.join("\n") + "\n";
}
