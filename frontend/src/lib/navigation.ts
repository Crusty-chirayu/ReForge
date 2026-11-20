// ─────────────────────────────────────────────────────────────────────────────
// ReForge navigation registry.
//
// Single source of truth for every route the console exposes.
// ─────────────────────────────────────────────────────────────────────────────

import {
  Activity,
  Brain,
  Compass,
  FolderArchive,
  LayoutDashboard,
  Sparkles,
  Target,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
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
        icon: Compass,
        description: "Ingest a ZIP or repository and generate an analysis report",
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

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function isNavItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  const path = normalize(pathname);

  if (item.href === "/") return path === "/";

  const candidates = [item.href, ...(item.activePrefixes ?? [])];
  return candidates.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

export function activeNavItem(pathname: string | null): NavItem | null {
  return NAV_ITEMS.find((item) => isNavItemActive(item, pathname)) ?? null;
}

export interface Crumb {
  label: string;
  href?: string;
}

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
