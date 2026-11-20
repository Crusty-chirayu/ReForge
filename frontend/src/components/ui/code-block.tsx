"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  className = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const lines = code.split("\n");

  return (
    <div className={`rounded-[6px] border border-border-default bg-bg-surface overflow-hidden ${className}`}>
      {(filename || language) && (
        <div className="flex items-center justify-between border-b border-border-subtle bg-bg-raised px-3 py-1.5 font-mono text-meta text-text-secondary select-none">
          <span className="truncate">{filename ?? language}</span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code"
            className="flex items-center gap-1 text-text-tertiary hover:text-text-primary transition-colors"
          >
            {copied ? (
              <>
                <Check size={12} className="text-success" aria-hidden="true" />
                <span className="text-success">Copied</span>
              </>
            ) : (
              <>
                <Copy size={12} aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="overflow-x-auto p-3 font-mono text-meta leading-relaxed">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-bg-raised/60">
                {showLineNumbers && (
                  <td className="w-8 select-none pr-3 text-right text-text-tertiary opacity-50 tabular-nums">
                    {idx + 1}
                  </td>
                )}
                <td className="text-text-primary whitespace-pre">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
