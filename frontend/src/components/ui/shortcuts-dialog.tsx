"use client";

import React from "react";
import { Dialog } from "./dialog";
import { Kbd } from "./kbd";

export interface ShortcutsDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Global Navigation (g then ...)",
    shortcuts: [
      { key: "g o", label: "Go to Overview" },
      { key: "g a", label: "Go to Ingest / Analyze" },
      { key: "g r", label: "Go to Report" },
      { key: "g x", label: "Go to Project X-Ray" },
      { key: "g d", label: "Go to Project Doctor" },
      { key: "g i", label: "Go to Impact Analysis" },
      { key: "g p", label: "Go to Planning" },
      { key: "g b", label: "Go to Builder" },
      { key: "g l", label: "Go to Pipelines" },
      { key: "g s", label: "Go to Snapshots" },
      { key: "g k", label: "Go to Project Brain" },
      { key: "g t", label: "Go to Settings" },
    ],
  },
  {
    title: "Shell Controls",
    shortcuts: [
      { key: "⌘ K / Ctrl K", label: "Open Command Palette" },
      { key: "[", label: "Toggle Sidebar Collapse" },
      { key: "?", label: "Open Keyboard Shortcuts" },
      { key: "Esc", label: "Close active dialog or drawer" },
    ],
  },
  {
    title: "Builder & Diff Viewer",
    shortcuts: [
      { key: "n", label: "Next diff hunk" },
      { key: "p", label: "Previous diff hunk" },
    ],
  },
];

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Keyboard Shortcuts" maxWidth="md">
      <div className="space-y-4 font-sans text-ui-dense">
        {SHORTCUT_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="font-mono text-meta font-semibold uppercase tracking-wider text-text-tertiary">
              {group.title}
            </h3>
            <div className="divide-y divide-border-subtle/50 rounded-[6px] border border-border-subtle bg-bg-surface">
              {group.shortcuts.map((sc, sIdx) => (
                <div
                  key={sIdx}
                  className="flex items-center justify-between px-3 py-2 text-ui-dense"
                >
                  <span className="text-text-secondary">{sc.label}</span>
                  <div className="flex items-center gap-1 font-mono">
                    {sc.key.split(" ").map((k, kIdx) => (
                      <Kbd key={kIdx}>{k}</Kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
