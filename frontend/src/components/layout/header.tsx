"use client";

import { Command } from "lucide-react";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Console header — page title row plus a static command-palette affordance.
 * Backend liveness lives in the sidebar and on the home page.
 */
export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex flex-col gap-3 border-b border-ink-border/40 bg-ink-0/80 px-6 py-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-ink-fg">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {/* Command palette affordance (static in F1) */}
      <div
        className="flex items-center gap-2 rounded border border-ink-border/40 bg-ink-1/50 px-3 py-1.5"
        aria-hidden="true"
      >
        <Command size={13} className="text-ink-subtle" />
        <span className="font-mono text-[11px] text-ink-subtle">
          Press{" "}
          <kbd className="inline-flex h-4 items-center rounded border border-ink-border/40 bg-ink-2 px-1 font-mono text-[10px] text-ink-muted">
            ⌘K
          </kbd>{" "}
          to search
        </span>
      </div>
    </header>
  );
}
