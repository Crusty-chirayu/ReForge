"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, AlertTriangle } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { pageTitleFor } from "@/lib/navigation";
import { useHealth } from "@/lib/query/use-health";
import { CommandPalette } from "../ui/command-palette";
import { ShortcutsDialog } from "../ui/shortcuts-dialog";
import { SettingsDrawer } from "./settings-drawer";
import { DesignShowcase } from "../dev/design-showcase";
import { BrandWordmark } from "../brand/brand-wordmark";

export interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: health, isError } = useHealth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pendingGKeyRef = useRef<boolean>(false);
  const gKeyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when inside inputs/textareas
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (e.key === "Escape") {
        if (mobileOpen) {
          setMobileOpen(false);
          menuButtonRef.current?.focus();
        }
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        if (shortcutsOpen) setShortcutsOpen(false);
        if (settingsOpen) setSettingsOpen(false);
        if (showcaseOpen) setShowcaseOpen(false);
        return;
      }

      // ⌘K or Ctrl+K: Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      if (isInput) return;

      // [ toggles sidebar collapse
      if (e.key === "[") {
        e.preventDefault();
        toggleCollapsed();
        return;
      }

      // ? opens shortcuts dialog
      if (e.key === "?") {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // 'g' key sequence
      if (e.key.toLowerCase() === "g" && !pendingGKeyRef.current) {
        pendingGKeyRef.current = true;
        if (gKeyTimerRef.current) clearTimeout(gKeyTimerRef.current);
        gKeyTimerRef.current = setTimeout(() => {
          pendingGKeyRef.current = false;
        }, 1000);
        return;
      }

      if (pendingGKeyRef.current) {
        pendingGKeyRef.current = false;
        if (gKeyTimerRef.current) clearTimeout(gKeyTimerRef.current);
        const k = e.key.toLowerCase();
        if (k === "t") {
          e.preventDefault();
          setSettingsOpen((prev) => !prev);
          return;
        }
        const routes: Record<string, string> = {
          o: "/",
          a: "/analyze",
          r: "/analyze/report",
          x: "/xray",
          d: "/doctor",
          i: "/impact",
          p: "/plan",
          b: "/build",
          l: "/pipeline",
          s: "/snapshots",
          k: "/brain",
        };
        if (routes[k]) {
          e.preventDefault();
          router.push(routes[k]!);
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (gKeyTimerRef.current) clearTimeout(gKeyTimerRef.current);
    };
  }, [mobileOpen, commandPaletteOpen, shortcutsOpen, settingsOpen, showcaseOpen, toggleCollapsed, router]);

  const title = pageTitleFor(pathname);

  // Workbench pages (X-Ray, Builder, Brain) are full-bleed
  const isWorkbench =
    pathname?.startsWith("/xray") ||
    pathname?.startsWith("/build") ||
    pathname?.startsWith("/brain");

  const isApiUnreachable = isError || (health && health.status !== "ok");

  return (
    <div className="flex h-dvh overflow-hidden bg-bg-canvas text-text-primary">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-[4px] focus:bg-accent focus:px-3 focus:py-1.5 focus:text-meta focus:font-medium focus:text-on-accent"
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
              className="absolute right-2 top-2.5 rounded-[4px] p-1 text-text-tertiary transition-colors hover:bg-bg-raised hover:text-text-primary"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        </>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Offline / API unreachable banner */}
        {isApiUnreachable && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 bg-critical/15 border-b border-critical/30 px-4 py-1.5 font-mono text-meta text-critical select-none"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
              <span>Backend unreachable at http://127.0.0.1:3000 — Check that `pnpm dev` or Fastify server is running.</span>
            </div>
            <span className="text-[10px] uppercase font-semibold">OFFLINE</span>
          </div>
        )}

        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-border-subtle bg-bg-surface px-4 py-2 lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="rounded-[4px] bg-bg-raised p-1.5 text-text-secondary transition-colors hover:bg-bg-overlay hover:text-text-primary"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <BrandWordmark symbolSize={20} />
        </div>

        <Header
          title={title}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        {/* Content */}
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto">
          {isWorkbench ? (
            <div className="h-full w-full">{children}</div>
          ) : (
            <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6">{children}</div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-border-subtle bg-bg-surface px-4 py-2 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-[10px] text-text-tertiary">
            <span>ReForge AI Engineering Intelligence — Forge Ledger</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowcaseOpen(true)}
                className="text-text-tertiary hover:text-accent transition-colors underline underline-offset-2"
              >
                Dev: Design Showcase
              </button>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="text-text-tertiary hover:text-text-primary transition-colors"
              >
                Settings
              </button>
              <span className="text-text-secondary">v0.1.0</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Overlays */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenShowcase={() => setShowcaseOpen(true)}
      />
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <SettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <DesignShowcase
        open={showcaseOpen}
        onClose={() => setShowcaseOpen(false)}
      />
    </div>
  );
}
