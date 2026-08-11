// ─────────────────────────────────────────────────────────────────────────────
// ReForge navigation registry.
//
// Single source of truth for every route the console exposes. The sidebar, the
// mobile drawer, and the header breadcrumb all read from here, so a route can
// never appear in one navigation surface and be missing from another.
//
// Every entry points at a route that exists in `src/app`. There are no
// "planned" or "coming soon" entries — if it is listed here, it is shippable.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Activity,
  Brain,
  FolderArchive,
  LayoutDashboard,
  Search,
  Sparkles,
  Target,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  /** Stable identifier, also used as the React key. */
  id: string;
  label: string;
  /** Destination route — always a real page. */
  href: string;
  icon: LucideIcon;
  /** Short description used for tooltips and the mobile drawer. */
  description: string;
  /**
   * Additional path prefixes that should mark this item active. Nested and
   * dynamic routes highlight their parent through these.
   */
  activePrefixes?: string[];
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "SYSTEM",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        description: "Project timeline, pipeline history, and backend status",
      },
    ],
  },
  {
    title: "WORKFLOW",
    items: [
      {
        id: "analyze",
        label: "Analyze",
        href: "/analyze",
        icon: Search,
        description: "Ingest a ZIP or repository and generate an analysis report",
        // /analyze/report highlights Analyze.
        activePrefixes: ["/analyze"],
      },
      {
        id: "plan",
        label: "Plan",
        href: "/plan",
        icon: Target,
        description: "Turn the analysis report into a sequenced improvement plan",
      },
      {
        id: "novelty",
        label: "Novelty",
        href: "/novelty",
        icon: Sparkles,
        description: "Surface differentiating opportunities from the report",
      },
      {
        id: "impact",
        label: "Impact",
        href: "/impact",
        icon: Activity,
        description: "Model the blast radius of a proposed change",
      },
      {
        id: "build",
        label: "Build",
        href: "/build",
        icon: Wrench,
        description: "Generate a reviewable patch proposal from workflow context",
      },
      {
        id: "pipeline",
        label: "Pipeline",
        href: "/pipeline",
        icon: Zap,
        description: "Run the end-to-end pipeline and inspect stored results",
        // /pipeline/new and /pipeline/:id both highlight Pipeline.
        activePrefixes: ["/pipeline"],
      },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      {
        id: "snapshots",
        label: "Snapshots",
        href: "/snapshots",
        icon: FolderArchive,
        description: "Browse, inspect, and compare versioned project snapshots",
        // /snapshot/:id and /snapshot/compare/:a/:b highlight Snapshots.
        activePrefixes: ["/snapshots", "/snapshot"],
      },
      {
        id: "brain",
        label: "Brain",
        href: "/brain",
        icon: Brain,
        description: "Ask evidence-grounded questions about the analyzed project",
      },
    ],
  },
];

/** Flat list of every navigable item. */
export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap(
  (section) => section.items,
);

/**
 * True when `pathname` should mark `item` as the active navigation entry.
 *
 * The dashboard (`/`) matches exactly so it does not light up on every route.
 * Everything else matches its own path plus any declared prefixes, always on a
 * segment boundary so `/plan` never activates for a hypothetical `/planner`.
 */
export function isNavItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  const path = normalize(pathname);

  if (item.href === "/") return path === "/";

  const candidates = [item.href, ...(item.activePrefixes ?? [])];
  return candidates.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** The navigation item that owns `pathname`, if any. */
export function activeNavItem(pathname: string | null): NavItem | null {
  return NAV_ITEMS.find((item) => isNavItemActive(item, pathname)) ?? null;
}

export interface Crumb {
  label: string;
  /** Omitted for the final crumb, which represents the current page. */
  href?: string;
}

/**
 * Build a breadcrumb trail for `pathname`.
 *
 * Dynamic identifiers are shortened for display but never invented — an
 * unrecognized segment is rendered verbatim rather than replaced with a
 * placeholder name.
 */
export function breadcrumbsFor(pathname: string | null): Crumb[] {
  const path = normalize(pathname ?? "/");
  if (path === "/") return [{ label: "Dashboard" }];

  const owner = activeNavItem(path);
  const crumbs: Crumb[] = [];

  if (owner) {
    crumbs.push(
      path === owner.href
        ? { label: owner.label }
        : { label: owner.label, href: owner.href },
    );
  }

  const known = KNOWN_TRAILS[path];
  if (known) {
    crumbs.push(...known);
    return crumbs;
  }

  // Dynamic routes: label the trailing identifier without fabricating a name.
  const segments = path.split("/").filter(Boolean);
  if (path.startsWith("/pipeline/") && segments[1]) {
    crumbs.push({ label: "Result" });
  } else if (path.startsWith("/snapshot/compare/")) {
    crumbs.push({ label: "Compare" });
  } else if (path.startsWith("/snapshot/") && segments[1]) {
    crumbs.push({ label: "Detail" });
  }

  return crumbs;
}

const KNOWN_TRAILS: Record<string, Crumb[]> = {
  "/analyze/report": [{ label: "Report" }],
  "/pipeline/new": [{ label: "New Run" }],
};

/** Page title for the console header. */
export function pageTitleFor(pathname: string | null): string {
  const path = normalize(pathname ?? "/");
  if (path === "/") return "Dashboard";
  const crumbs = breadcrumbsFor(path);
  if (crumbs.length === 0) return "ReForge";
  return crumbs.map((crumb) => crumb.label).join(" › ");
}

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.replace(/\/+$/, "") || "/";
  }
  return pathname;
}
