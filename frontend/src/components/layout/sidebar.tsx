"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NAV_SECTIONS, isNavItemActive } from "@/lib/navigation";
import { useHealth } from "@/lib/query/use-health";

export interface SidebarProps {
  /** Rendered collapsed (icon-only). Desktop only — the drawer is never collapsed. */
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Invoked after a navigation link is followed, so the mobile drawer closes. */
  onNavigate?: () => void;
}

/**
 * Console navigation.
 *
 * Every entry resolves to a route that exists; nested and dynamic routes
 * highlight their parent via the shared navigation registry.
 */
export function Sidebar({
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const { data: health, isLoading, isError } = useHealth();

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

  return (
    <aside
      className={[
        "flex h-full flex-col border-r border-ink-border/60 bg-ink-0/95 backdrop-blur-sm",
        "transition-[width] duration-200",
        collapsed ? "w-16" : "w-60",
      ].join(" ")}
      aria-label="Primary navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-ink-border/40 px-4 py-3">
        <div
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-forge text-xs font-bold text-forge-fg shadow-glow-sm"
        >
          R
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-bold tracking-tight text-ink-fg">
              ReForge
            </span>
            <span className="font-mono text-[10px] text-ink-subtle">
              AI Engineering
            </span>
          </div>
        )}
      </div>

      {/* Backend status — conveyed by text as well as colour. */}
      <div className="border-b border-ink-border/40 p-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={["h-2 w-2 shrink-0 rounded-full", statusDot].join(" ")}
          />
          {!collapsed && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
              Backend&nbsp;{statusLabel}
            </span>
          )}
        </div>
        {!collapsed && (
          <p className="mt-1.5 truncate font-mono text-[10px] text-ink-subtle">
            {statusDetail}
          </p>
        )}
        <span className="sr-only" role="status">
          Backend status: {statusLabel.toLowerCase()}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3" aria-label="Console sections">
        <ul className="space-y-5 px-2">
          {NAV_SECTIONS.map((section) => (
            <li key={section.title}>
              {!collapsed && (
                <p className="mb-1.5 px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-subtle">
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
                          "flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-colors duration-150",
                          isActive
                            ? "border border-forge/20 bg-forge/10 text-forge"
                            : "border border-transparent text-ink-muted hover:bg-ink-1 hover:text-ink-fg",
                          collapsed ? "justify-center px-2" : "",
                        ].join(" ")}
                      >
                        <span
                          aria-hidden="true"
                          className={["shrink-0", isActive ? "text-forge" : ""].join(" ")}
                        >
                          <Icon size={15} />
                        </span>
                        {!collapsed && (
                          <>
                            <span className="truncate">{item.label}</span>
                            {isActive && (
                              <ChevronRight
                                size={12}
                                aria-hidden="true"
                                className="ml-auto shrink-0 text-forge"
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

      {/* Collapse toggle — desktop affordance only. */}
      {onToggleCollapsed && (
        <div className="border-t border-ink-border/40 p-2">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="flex w-full items-center justify-center gap-2 rounded bg-ink-1/50 px-2 py-1.5 text-[10px] text-ink-muted transition-colors hover:bg-ink-2 hover:text-ink-fg"
          >
            {collapsed ? (
              <PanelLeftOpen size={13} aria-hidden="true" />
            ) : (
              <>
                <PanelLeftClose size={12} aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      )}
    </aside>
  );
}
