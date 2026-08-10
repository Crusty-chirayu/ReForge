"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

export interface ShellProps {
  children: React.ReactNode;
}

function getPageTitle(pathname: string | null): string {
  if (!pathname || pathname === "/") return "Dashboard";
  const segments = pathname.replace(/\/$/, "").split("/").filter(Boolean);
  const title = segments
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " "))
    .join(" › ");
  return title || "ReForge";
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <div className="flex h-screen overflow-hidden bg-ink-0">
      {/* Sidebar — desktop always visible, mobile overlay */}
      <div
        className={[
          "flex flex-col",
          mobileOpen ? "fixed inset-y-0 left-0 z-40" : "hidden",
          "lg:relative lg:flex lg:flex-col",
        ].join(" ")}
      >
        <Sidebar />
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-ink-border/40 bg-ink-0/95 px-4 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded bg-ink-1/50 p-1.5 text-ink-muted transition-colors hover:bg-ink-2 hover:text-ink-fg"
            aria-label="Open menu"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-forge text-[10px] font-bold text-forge-fg shadow-glow-sm">
              R
            </div>
            <span className="text-sm font-bold text-ink-fg">ReForge</span>
          </div>
        </div>

        <Header title={getPageTitle(pathname)} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6">{children}</div>
        </main>

        {/* Footer */}
        <footer className="border-t border-ink-border/40 bg-ink-0/80 px-6 py-2">
          <p className="flex items-center justify-between font-mono text-[10px] text-ink-subtle">
            <span>ReForge AI Engineering Intelligence</span>
            <span className="text-ink-muted">v0.1.0 · foundation</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
