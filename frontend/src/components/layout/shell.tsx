"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { pageTitleFor } from "@/lib/navigation";

export interface ShellProps {
  children: React.ReactNode;
}

/**
 * Application shell: persistent navigation, page header, and content region.
 *
 * Desktop keeps the sidebar docked (and collapsible). Below `lg` it becomes a
 * drawer that closes on navigation, on backdrop click, and on Escape, so the
 * navigation can never trap a mobile user.
 */
export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  // Escape closes the drawer and returns focus to the trigger.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const title = pageTitleFor(pathname);

  return (
    <div className="flex h-dvh overflow-hidden bg-ink-0">
      {/* Skip link — first tab stop on every page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-forge focus:px-3 focus:py-1.5 focus:text-xs focus:font-medium focus:text-forge-fg"
      >
        Skip to main content
      </a>

      {/* Docked sidebar (lg and up) */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={closeMobile}
            className="fixed inset-0 z-40 cursor-default bg-black/70 lg:hidden"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-60 max-w-[85vw] lg:hidden"
          >
            <Sidebar onNavigate={closeMobile} />
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close navigation"
              className="absolute right-2 top-2.5 rounded p-1 text-ink-subtle transition-colors hover:bg-ink-2 hover:text-ink-fg"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-ink-border/40 bg-ink-0/95 px-4 py-2 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="rounded bg-ink-1/50 p-1.5 text-ink-muted transition-colors hover:bg-ink-2 hover:text-ink-fg"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-forge text-[10px] font-bold text-forge-fg shadow-glow-sm"
            >
              R
            </span>
            <span className="truncate text-sm font-bold text-ink-fg">ReForge</span>
          </div>
        </div>

        <Header title={title} />

        {/* Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t border-ink-border/40 bg-ink-0/80 px-4 py-2 lg:px-6">
          <p className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[10px] text-ink-subtle">
            <span>ReForge AI Engineering Intelligence</span>
            <span className="text-ink-muted">v0.1.0</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
