"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import {
  Activity,
  ChevronRight,
  FolderArchive,
  LayoutDashboard,
  Search,
  Server,
  Sparkles,
  Target,
  Wrench,
  Zap,
} from "lucide-react";
import { useHealth } from "@/lib/query/use-health";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

interface NavItem {
  label: string;
  href?: string;
  icon: IconComponent;
  soon?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

/**
 * Console navigation — only links to routes that exist. Items for upcoming
 * phases render as disabled "planned" entries until their pages land.
 */
const navSections: NavSection[] = [
  {
    title: "SYSTEM",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "WORKBENCH",
    items: [
      { label: "Analyze", href: "/analyze", icon: Search },
      { label: "Plan", href: "/plan", icon: Target },
      { label: "Novelty", href: "/novelty", icon: Sparkles },
      { label: "Impact", href: "/impact", icon: Activity },
      { label: "Build", href: "/build", icon: Wrench },
      { label: "Pipeline", href: "/pipeline/new", icon: Zap },
      { label: "Snapshots", href: "/snapshots", icon: FolderArchive, soon: true },
    ],
  },
];

function LogoMark() {
  return (
    <div className="flex h-7 w-7 items-center justify-center rounded bg-forge text-xs font-bold text-forge-fg shadow-glow-sm">
      R
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: health, isLoading } = useHealth();

  const isHealthy = health?.status === "ok";
  const statusLabel = isLoading ? "CHECKING" : isHealthy ? "LIVE" : "OFFLINE";
  const statusDot = isLoading
    ? "bg-amber-400 pulse-dot"
    : isHealthy
      ? "bg-emerald-400 pulse-dot"
      : "bg-rose-400";

  return (
    <aside
      className={[
        "flex flex-col border-r border-ink-border/60 bg-ink-0/95 backdrop-blur-sm",
        "transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      ].join(" ")}
      aria-label="Primary"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-ink-border/40 px-4 py-3">
        <LogoMark />
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

      {/* Backend status */}
      <div className="border-b border-ink-border/40 p-3">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={["h-2 w-2 rounded-full", statusDot].join(" ")}
          />
          {!collapsed && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
              Backend&nbsp;{statusLabel}
            </span>
          )}
        </div>
        {!collapsed && (
          <p className="mt-1.5 truncate font-mono text-[10px] text-ink-subtle">
            {isHealthy
              ? health?.service ?? "reforge-analysis-engine"
              : isLoading
                ? "connecting…"
                : "unreachable"}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        <ul className="space-y-5 px-2">
          {navSections.map((section) => (
            <li key={section.title}>
              {!collapsed && (
                <p className="mb-1.5 px-2 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-subtle">
                  {section.title}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    !!item.href &&
                    pathname !== null &&
                    (pathname === item.href ||
                      pathname.startsWith(`${item.href}/`));

                  const inner = (
                    <>
                      <span
                        aria-hidden="true"
                        className={["shrink-0", isActive ? "text-forge" : ""].join(" ")}
                      >
                        <Icon size={15} />
                      </span>
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.soon && (
                            <span className="ml-auto shrink-0 rounded border border-ink-border/40 px-1 py-px font-mono text-[8px] uppercase tracking-wider text-ink-subtle">
                              planned
                            </span>
                          )}
                          {isActive && (
                            <ChevronRight
                              size={12}
                              className="ml-auto shrink-0 text-forge"
                            />
                          )}
                        </>
                      )}
                    </>
                  );

                  const linkClass = [
                    "flex items-center gap-2.5 rounded px-2 py-1.5 text-sm transition-all duration-150",
                    item.href
                      ? isActive
                        ? "bg-forge/10 text-forge border border-forge/20"
                        : "text-ink-muted hover:bg-ink-1 hover:text-ink-fg"
                      : "text-ink-subtle cursor-not-allowed",
                    collapsed ? "justify-center px-2" : "",
                  ].join(" ");

                  return (
                    <li key={item.label}>
                      {item.href && !item.soon ? (
                        <Link
                          href={item.href}
                          className={linkClass}
                          title={collapsed ? item.label : undefined}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <span
                          className={linkClass}
                          aria-disabled="true"
                          title={
                            collapsed
                              ? `${item.label} (planned)`
                              : `${item.label} — available in a later phase`
                          }
                        >
                          {inner}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-ink-border/40 p-2">
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-full items-center justify-center gap-2 rounded bg-ink-1/50 px-2 py-1.5 text-[10px] text-ink-muted transition-colors hover:bg-ink-2 hover:text-ink-fg"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight size={12} className="rotate-180" />
          ) : (
            <>
              <Server size={11} aria-hidden="true" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
