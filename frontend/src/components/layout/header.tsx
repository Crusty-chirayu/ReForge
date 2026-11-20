"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Search, Sun, Moon, HelpCircle, Settings } from "lucide-react";
import { breadcrumbsFor } from "@/lib/navigation";
import { useTheme } from "@/lib/theme";
import { Kbd } from "../ui/kbd";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
  onOpenSettings?: () => void;
}

export function Header({
  title,
  subtitle,
  actions,
  onOpenCommandPalette,
  onOpenShortcuts,
  onOpenSettings,
}: HeaderProps) {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  const crumbs = breadcrumbsFor(pathname);
  const showTrail = crumbs.length > 1;

  return (
    <header className="flex flex-col gap-2 border-b border-border-subtle bg-bg-surface px-4 py-2.5 lg:px-6">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-4">
        {/* Left: Breadcrumbs or Title indicator */}
        <div className="min-w-0">
          {showTrail ? (
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                {crumbs.map((crumb, index) => {
                  const isLast = index === crumbs.length - 1;
                  return (
                    <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                      {index > 0 && (
                        <ChevronRight size={10} aria-hidden="true" className="text-text-tertiary" />
                      )}
                      {crumb.href && !isLast ? (
                        <Link
                          href={crumb.href}
                          className="rounded px-0.5 transition-colors hover:text-text-primary"
                        >
                          {crumb.label}
                        </Link>
                      ) : (
                        <span
                          className={isLast ? "text-text-secondary font-medium" : undefined}
                          aria-current={isLast ? "page" : undefined}
                        >
                          {crumb.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-tertiary">
              REFORGE // CONSOLE
            </span>
          )}
        </div>

        {/* Right: Search, Shortcuts, Theme */}
        <div className="flex items-center gap-2">
          {/* Command Palette Trigger */}
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="flex items-center gap-2 rounded-[4px] border border-border-default bg-bg-raised px-2.5 py-1 text-meta text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
            aria-label="Search and command palette"
          >
            <Search size={13} className="text-text-tertiary" aria-hidden="true" />
            <span className="hidden sm:inline">Search commands...</span>
            <span className="hidden sm:inline-flex items-center gap-0.5">
              <Kbd>⌘K</Kbd>
            </span>
          </button>

          {/* Shortcuts Help Trigger */}
          <button
            type="button"
            onClick={onOpenShortcuts}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            className="rounded-[4px] border border-border-default bg-bg-raised p-1.5 text-text-secondary transition-colors hover:text-text-primary hover:border-border-strong"
          >
            <HelpCircle size={14} aria-hidden="true" />
          </button>

          {/* Settings Drawer Trigger */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Settings"
              title="Settings"
              className="rounded-[4px] border border-border-default bg-bg-raised p-1.5 text-text-secondary transition-colors hover:text-text-primary hover:border-border-strong"
            >
              <Settings size={14} aria-hidden="true" />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Toggle theme (currently ${resolvedTheme})`}
            title={`Toggle theme (currently ${resolvedTheme})`}
            className="rounded-[4px] border border-border-default bg-bg-raised p-1.5 text-text-secondary transition-colors hover:text-text-primary hover:border-border-strong"
          >
            {resolvedTheme === "dark" ? (
              <Sun size={14} aria-hidden="true" />
            ) : (
              <Moon size={14} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Main title bar */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 pt-0.5">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-text-primary lg:text-lg">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 text-meta text-text-secondary">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
