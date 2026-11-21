"use client";

import React, { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeftClose, PanelLeftOpen, FolderGit2, Settings } from "lucide-react";
import { NAV_SECTIONS, isNavItemActive } from "@/lib/navigation";
import { useHealth } from "@/lib/query/use-health";
import { reportStore } from "@/lib/context/report-context";
import { BrandWordmark } from "../brand/brand-wordmark";
import { BrandSymbol } from "../brand/brand-symbol";

export interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
  onOpenSettings?: () => void;
}

export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
  onOpenSettings,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: health, isLoading, isError } = useHealth();
  const reportSnapshot = useSyncExternalStore(
    reportStore.subscribe,
    reportStore.getSnapshot,
    reportStore.getServerSnapshot,
  );
  const report = reportSnapshot.report;

  const isHealthy = health?.status === "ok";
  const statusLabel = isLoading ? "CHECKING" : isHealthy ? "LIVE" : "OFFLINE";
  const statusDot = isLoading
    ? "bg-amber-400 pulse-dot"
    : isHealthy
    ? "bg-emerald-400 pulse-dot"
    : "bg-rose-400";

  const statusDetail = isHealthy
    ? (health?.service ?? "reforge-analysis-engine")
    : isLoading
    ? "connecting…"
    : isError
    ? "unreachable"
    : "unreachable";

  // Real project name from report provenance
  const projectName =
    report?.provenance?.source?.reference ??
    (report ? "Active Workspace" : "Default Project");

  return (
    <aside
      className={[
        "flex h-full flex-col border-r border-border-subtle bg-bg-surface select-none",
        "transition-[width] duration-180",
        collapsed ? "w-14" : "w-60",
      ].join(" ")}
      aria-label="Primary navigation"
    >
      {/* Brand Header */}
      <div className="flex h-12 items-center justify-between border-b border-border-subtle px-3.5">
        {collapsed ? (
          <div className="flex w-full items-center justify-center">
            <BrandSymbol size={20} />
          </div>
        ) : (
          <BrandWordmark symbolSize={20} />
        )}
      </div>

      {/* Project Selector (Real API data) */}
      {!collapsed ? (
        <div className="border-b border-border-subtle/70 px-3 py-2 bg-bg-raised/40">
          <div className="flex items-center justify-between gap-1 text-meta text-text-tertiary">
            <span className="font-mono text-[9px] uppercase tracking-wider">PROJECT</span>
            {report && (
              <span className="rounded bg-accent/15 px-1 py-0.2 text-[9px] font-mono font-semibold text-accent">
                ANALYZED
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 rounded border border-border-subtle bg-bg-surface px-2 py-1 text-ui-dense font-medium text-text-primary">
            <div className="flex items-center gap-1.5 truncate">
              <FolderGit2 size={13} className="text-text-tertiary shrink-0" aria-hidden="true" />
              <span className="truncate text-meta font-mono">{projectName}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center border-b border-border-subtle py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded border border-border-subtle bg-bg-raised text-text-secondary" title={projectName}>
            <FolderGit2 size={14} aria-hidden="true" />
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <nav className="flex-1 overflow-y-auto py-2" aria-label="Console sections">
        <ul className="space-y-4 px-2">
          {NAV_SECTIONS.map((section) => (
            <li key={section.title}>
              {!collapsed && (
                <p className="mb-1 px-2 font-mono text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isNavItemActive(item, pathname);

                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        title={collapsed ? item.label : item.description}
                        className={[
                          "relative flex items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-ui-dense transition-colors duration-120 font-medium",
                          isActive
                            ? "bg-accent-subtle/60 text-text-primary border-l-2 border-l-accent"
                            : "text-text-secondary hover:bg-bg-raised hover:text-text-primary",
                          collapsed ? "justify-center px-1" : "",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden="true"
                          className={["shrink-0", isActive ? "text-accent" : "text-text-tertiary"].join(" ")}
                        >
                          <Icon size={16} strokeWidth={1.5} />
                        </span>
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {isActive && (
                              <ChevronRight
                                size={12}
                                aria-hidden="true"
                                className="ml-auto shrink-0 text-accent"
                              />
                            )}
                          </>
                        )}
                        {collapsed && <span className="sr-only">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* Backend Status Area */}
      <div className="border-t border-border-subtle p-2.5 bg-bg-surface">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={["h-2 w-2 shrink-0 rounded-full", statusDot].join(" ")}
          />
          {!collapsed && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary">
              Backend&nbsp;{statusLabel}
            </span>
          )}
        </div>
        {!collapsed && (
          <p className="mt-1 truncate font-mono text-[9px] text-text-tertiary">
            {statusDetail}
          </p>
        )}
        <span className="sr-only" role="status">
          Backend status: {statusLabel.toLowerCase()}
        </span>
      </div>

      {/* Settings Action */}
      {onOpenSettings && (
        <div className="border-t border-border-subtle p-2 bg-bg-surface">
          <button
            type="button"
            onClick={onOpenSettings}
            className={[
              "flex w-full items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-ui-dense font-medium text-text-secondary transition-colors hover:bg-bg-raised hover:text-text-primary",
              collapsed ? "justify-center px-1" : "",
            ].join(" ")}
            title="Settings"
          >
            <Settings size={16} strokeWidth={1.5} className="shrink-0 text-text-tertiary" aria-hidden="true" />
            {!collapsed && <span>Settings</span>}
          </button>
        </div>
      )}

      {/* Collapse Toggle */}
      {onToggleCollapsed && (
        <div className="border-t border-border-subtle/70 p-2 bg-bg-raised/30">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="flex w-full items-center justify-center gap-2 rounded-[4px] bg-bg-surface border border-border-subtle px-2 py-1 text-meta text-text-secondary transition-colors hover:bg-bg-raised hover:text-text-primary focus-visible:ring-2 focus-visible:ring-accent"
          >
            {collapsed ? (
              <PanelLeftOpen size={14} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={13} aria-hidden="true" />
                <span className="font-mono text-[11px]">Collapse sidebar</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
