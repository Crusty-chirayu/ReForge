"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { breadcrumbsFor } from "@/lib/navigation";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Console header — breadcrumb trail plus the current page title.
 *
 * The breadcrumb is derived from the shared navigation registry, so every
 * link resolves to a real route. Backend liveness lives in the sidebar and on
 * the dashboard hero.
 */
export function Header({ title, subtitle, actions }: HeaderProps) {
  const pathname = usePathname();
  const crumbs = breadcrumbsFor(pathname);
  const showTrail = crumbs.length > 1;

  return (
    <header className="flex flex-col gap-2 border-b border-ink-border/40 bg-ink-0/80 px-4 py-3 backdrop-blur-sm lg:px-6 lg:py-4">
      {showTrail && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
            {crumbs.map((crumb, index) => {
              const isLast = index === crumbs.length - 1;
              return (
                <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight size={10} aria-hidden="true" className="text-ink-subtle" />
                  )}
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="rounded px-0.5 transition-colors hover:text-ink-fg"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      className={isLast ? "text-ink-muted" : undefined}
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
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        {/*
          Rendered as plain text, not a heading: each page supplies its own
          <h1>, and a second top-level heading here would give screen-reader
          users two competing page titles.
        */}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight text-ink-fg lg:text-lg">
            {title}
          </p>
          {subtitle && <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
