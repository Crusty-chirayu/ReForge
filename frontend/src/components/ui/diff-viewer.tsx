"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Columns2, Rows2, ArrowRight } from "lucide-react";
import { Button } from "./button";

export interface DiffLine {
  type: "add" | "delete" | "equal" | "header";
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
  oldStart: number;
  newStart: number;
}

export interface DiffViewerProps {
  diffText?: string;
  oldContent?: string;
  newContent?: string;
  filePath?: string;
  operation?: "CREATE" | "MODIFY" | "DELETE" | "RENAME";
  fromPath?: string;
  showOperationBadge?: boolean;
  className?: string;
}

/**
 * Parses standard POSIX unified diff text into structured hunks.
 */
export function parseUnifiedDiff(rawDiff: string): DiffHunk[] {
  if (!rawDiff.trim()) return [];

  const rawLines = rawDiff.split("\n");
  const hunks: DiffHunk[] = [];
  let currentHunk: DiffHunk | null = null;
  let oldLine = 1;
  let newLine = 1;

  for (const line of rawLines) {
    if (line.startsWith("@@")) {
      // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const match = line.match(/@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/);
      if (match) {
        oldLine = parseInt(match[1]!, 10);
        newLine = parseInt(match[3]!, 10);
      }
      currentHunk = {
        header: line,
        lines: [{ type: "header", text: line }],
        oldStart: oldLine,
        newStart: newLine,
      };
      hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) {
      // Header lines like --- a/file or +++ b/file
      continue;
    }

    if (line.startsWith("+")) {
      currentHunk.lines.push({
        type: "add",
        text: line.substring(1),
        newLineNumber: newLine++,
      });
    } else if (line.startsWith("-")) {
      currentHunk.lines.push({
        type: "delete",
        text: line.substring(1),
        oldLineNumber: oldLine++,
      });
    } else {
      // Equal / context line
      const text = line.startsWith(" ") ? line.substring(1) : line;
      currentHunk.lines.push({
        type: "equal",
        text,
        oldLineNumber: oldLine++,
        newLineNumber: newLine++,
      });
    }
  }

  return hunks;
}

export function DiffViewer({
  diffText = "",
  filePath,
  operation = "MODIFY",
  fromPath,
  showOperationBadge = true,
  className = "",
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified");
  const [activeHunkIndex, setActiveHunkIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const hunks = useMemo(() => parseUnifiedDiff(diffText), [diffText]);

  // Hunk navigation: n for next hunk, p for prev hunk
  const goToNextHunk = useCallback(() => {
    if (hunks.length === 0) return;
    setActiveHunkIndex((prev) => Math.min(prev + 1, hunks.length - 1));
  }, [hunks.length]);

  const goToPrevHunk = useCallback(() => {
    if (hunks.length === 0) return;
    setActiveHunkIndex((prev) => Math.max(prev - 1, 0));
  }, [hunks.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only when not typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      if (e.key === "n") {
        goToNextHunk();
      } else if (e.key === "p") {
        goToPrevHunk();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextHunk, goToPrevHunk]);

  const handleCopyDiff = async () => {
    try {
      await navigator.clipboard.writeText(diffText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const totalLinesAdded = useMemo(() => {
    return hunks.reduce(
      (acc, h) => acc + h.lines.filter((l) => l.type === "add").length,
      0,
    );
  }, [hunks]);

  const totalLinesDeleted = useMemo(() => {
    return hunks.reduce(
      (acc, h) => acc + h.lines.filter((l) => l.type === "delete").length,
      0,
    );
  }, [hunks]);

  if (!diffText.trim()) {
    return (
      <div className={`rounded-[6px] border border-border-subtle bg-bg-surface p-6 text-center font-mono text-meta text-text-tertiary ${className}`}>
        {operation === "DELETE"
          ? "File marked for deletion"
          : operation === "CREATE"
          ? "Empty file created"
          : "No changes recorded in diff"}
      </div>
    );
  }

  return (
    <div className={`flex flex-col rounded-[6px] border border-border-default bg-bg-surface overflow-hidden ${className}`}>
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-bg-raised px-3 py-2 select-none">
        <div className="flex items-center gap-2 font-mono text-meta min-w-0">
          {showOperationBadge && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                operation === "CREATE"
                  ? "bg-success/15 text-success"
                  : operation === "DELETE"
                  ? "bg-critical/15 text-critical"
                  : operation === "RENAME"
                  ? "bg-low/15 text-low"
                  : "bg-medium/15 text-medium"
              }`}
            >
              {operation}
            </span>
          )}

          {operation === "RENAME" && fromPath ? (
            <div className="flex items-center gap-1 truncate text-text-secondary">
              <span className="truncate">{fromPath}</span>
              <ArrowRight size={11} className="shrink-0" />
              <span className="text-text-primary font-medium truncate">{filePath}</span>
            </div>
          ) : (
            <span className="text-text-primary font-medium truncate">{filePath}</span>
          )}

          <div className="flex items-center gap-1.5 ml-2 tabular-nums">
            <span className="text-success font-medium">+{totalLinesAdded}</span>
            <span className="text-critical font-medium">-{totalLinesDeleted}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Hunk navigation buttons */}
          {hunks.length > 1 && (
            <div className="flex items-center gap-1 font-mono text-meta text-text-secondary">
              <span className="tabular-nums mr-1">
                Hunk {activeHunkIndex + 1}/{hunks.length}
              </span>
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronUp size={12} />}
                onClick={goToPrevHunk}
                aria-label="Previous hunk (p)"
                title="Previous hunk (p)"
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<ChevronDown size={12} />}
                onClick={goToNextHunk}
                aria-label="Next hunk (n)"
                title="Next hunk (n)"
              />
            </div>
          )}

          {/* Unified / Split toggle */}
          <div className="flex items-center rounded border border-border-default bg-bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("unified")}
              className={`p-1 rounded text-text-secondary hover:text-text-primary transition-colors ${
                viewMode === "unified" ? "bg-bg-raised text-text-primary" : ""
              }`}
              title="Unified view"
              aria-label="Unified view"
            >
              <Rows2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`p-1 rounded text-text-secondary hover:text-text-primary transition-colors ${
                viewMode === "split" ? "bg-bg-raised text-text-primary" : ""
              }`}
              title="Split view"
              aria-label="Split view"
            >
              <Columns2 size={13} />
            </button>
          </div>

          {/* Copy diff button */}
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            onClick={handleCopyDiff}
            aria-label="Copy diff"
          >
            {copied ? "Copied" : "Copy Diff"}
          </Button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="overflow-x-auto font-mono text-meta leading-relaxed">
        {viewMode === "unified" ? (
          <table className="w-full border-collapse">
            <tbody>
              {hunks.map((hunk, hunkIdx) => (
                <React.Fragment key={hunkIdx}>
                  {hunk.lines.map((line, lineIdx) => {
                    const isHeader = line.type === "header";
                    const isAdd = line.type === "add";
                    const isDelete = line.type === "delete";

                    return (
                      <tr
                        key={`${hunkIdx}-${lineIdx}`}
                        className={`transition-colors ${
                          isHeader
                            ? "bg-bg-raised/80 text-text-tertiary select-none"
                            : isAdd
                            ? "bg-success/10 text-text-primary"
                            : isDelete
                            ? "bg-critical/10 text-text-primary"
                            : "hover:bg-bg-raised/40 text-text-secondary"
                        }`}
                      >
                        {isHeader ? (
                          <td
                            colSpan={3}
                            className="px-3 py-1 text-meta text-low font-semibold border-y border-border-subtle"
                          >
                            {line.text}
                          </td>
                        ) : (
                          <>
                            {/* Old line number */}
                            <td className="w-10 select-none px-2 py-0.5 text-right text-text-tertiary opacity-60 tabular-nums">
                              {line.oldLineNumber ?? ""}
                            </td>
                            {/* New line number */}
                            <td className="w-10 select-none px-2 py-0.5 text-right text-text-tertiary opacity-60 tabular-nums">
                              {line.newLineNumber ?? ""}
                            </td>
                            {/* Marker & Code content */}
                            <td className="px-3 py-0.5 whitespace-pre">
                              <span
                                className={`inline-block w-4 select-none font-bold ${
                                  isAdd
                                    ? "text-success"
                                    : isDelete
                                    ? "text-critical"
                                    : "text-text-tertiary opacity-30"
                                }`}
                              >
                                {isAdd ? "+" : isDelete ? "-" : " "}
                              </span>
                              <span>{line.text}</span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          /* Split View */
          <table className="w-full border-collapse">
            <tbody>
              {hunks.map((hunk, hunkIdx) => (
                <React.Fragment key={hunkIdx}>
                  <tr className="bg-bg-raised text-low font-semibold text-meta border-y border-border-subtle">
                    <td colSpan={4} className="px-3 py-1">
                      {hunk.header}
                    </td>
                  </tr>
                  {hunk.lines.filter((l) => l.type !== "header").map((line, lineIdx) => {
                    const isAdd = line.type === "add";
                    const isDelete = line.type === "delete";

                    return (
                      <tr key={lineIdx} className="hover:bg-bg-raised/30">
                        {/* Left: Original / Delete */}
                        <td className="w-8 select-none px-2 py-0.5 text-right text-text-tertiary tabular-nums border-r border-border-subtle/50">
                          {line.oldLineNumber ?? ""}
                        </td>
                        <td
                          className={`w-1/2 px-2 py-0.5 whitespace-pre border-r border-border-subtle ${
                            isDelete ? "bg-critical/10 text-critical" : "text-text-secondary"
                          }`}
                        >
                          {isDelete ? line.text : line.type === "equal" ? line.text : ""}
                        </td>

                        {/* Right: New / Add */}
                        <td className="w-8 select-none px-2 py-0.5 text-right text-text-tertiary tabular-nums border-r border-border-subtle/50">
                          {line.newLineNumber ?? ""}
                        </td>
                        <td
                          className={`w-1/2 px-2 py-0.5 whitespace-pre ${
                            isAdd ? "bg-success/10 text-success" : "text-text-secondary"
                          }`}
                        >
                          {isAdd ? line.text : line.type === "equal" ? line.text : ""}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
