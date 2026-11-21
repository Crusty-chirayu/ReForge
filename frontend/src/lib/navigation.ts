// ─────────────────────────────────────────────────────────────────────────────
// ReForge navigation registry.
//
// Single source of truth for every route the console exposes.
// Follows the Forge Ledger information architecture:
//   WORKSPACE  -> Overview
//   ANALYZE    -> Ingest, Report
//   UNDERSTAND -> X-Ray, Doctor, Impact
//   ACT        -> Plan, Brain, Builder, Pipelines
//   HISTORY    -> Snapshots, Compare
// ─────────────────────────────────────────────────────────────────────────────

import {
  Activity,
  Brain,
  Compass,
  FileText,
  FolderArchive,
  GitCompare,
  Layers,
  LayoutDashboard,
  Stethoscope,
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
    title: "WORKSPACE",
    items: [
      {
        id: "dashboard",
        label: "Overview",
        href: "/",
        icon: LayoutDashboard,
        description: "Project timeline, pipeline history, and backend status",
      },
    ],
  },
  {
    title: "ANALYZE",
    items: [
      {
        id: "analyze",
        label: "Ingest",
        href: "/analyze",
        icon: Compass,
        description: "Ingest a ZIP or repository and generate an analysis report",
      },
      {
        id: "report",
        label: "Report",
        href: "/analyze/report",
        icon: FileText,
        description: "Inspect the evidence-backed project analysis report",
        activePrefixes: ["/analyze/report"],
      },
    ],
  },
  {
    title: "UNDERSTAND",
    items: [
      {
        id: "xray",
        label: "X-Ray",
        href: "/xray",
        icon: Layers,
        description: "Interactive architectural graph, module dependencies, and coupling matrix",
        activePrefixes: ["/xray"],
      },
      {
        id: "doctor",
        label: "Doctor",
        href: "/doctor",
        icon: Stethoscope,
        description: "Automated architectural triage, hygiene rules, and health scoring",
        activePrefixes: ["/doctor"],
      },
      {
        id: "impact",
        label: "Impact",
        href: "/impact",
        icon: Activity,
        description: "Model the blast radius of a proposed change",
        activePrefixes: ["/impact"],
      },
    ],
  },
  {
    title: "ACT",
    items: [
      {
        id: "plan",
        label: "Plan",
        href: "/plan",
        icon: Target,
        description: "Turn the analysis report into a sequenced improvement plan",
        activePrefixes: ["/plan"],
      },
      {
        id: "brain",
        label: "Brain",
        href: "/brain",
        icon: Brain,
        description: "Ask evidence-grounded questions about the analyzed project",
        activePrefixes: ["/brain"],
      },
      {
        id: "build",
        label: "Builder",
        href: "/build",
        icon: Wrench,
        description: "Generate and inspect patch proposals in the engineering workbench",
        activePrefixes: ["/build"],
      },
      {
        id: "pipeline",
        label: "Pipelines",
        href: "/pipeline",
        icon: Zap,
        description: "Run the end-to-end pipeline and inspect stored results",
        activePrefixes: ["/pipeline"],
      },
    ],
  },
  {
    title: "HISTORY",
    items: [
      {
        id: "snapshots",
        label: "Snapshots",
        href: "/snapshots",
        icon: FolderArchive,
        description: "Browse, inspect, and track versioned project snapshots",
        activePrefixes: ["/snapshots", "/snapshot"],
      },
      {
        id: "compare",
        label: "Compare",
        href: "/snapshot/compare",
        icon: GitCompare,
        description: "Deterministically compare two versioned project snapshots",
        activePrefixes: ["/snapshot/compare"],
      },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function isNavItemActive(item: NavItem, pathname: string | null): boolean {
  if (!pathname) return false;
  const path = normalize(pathname);

  if (item.href === "/") return path === "/";

  // Prevent Snapshots item from capturing Snapshot Compare routes
  if (item.id === "snapshots" && path.startsWith("/snapshot/compare")) {
    return false;
  }

  // Prevent Ingest item from capturing Report routes
  if (item.id === "analyze" && path.startsWith("/analyze/report")) {
    return false;
  }

  if (item.activePrefixes && item.activePrefixes.length > 0) {
    return item.activePrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  return path === item.href || path.startsWith(`${item.href}/`);
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
  if (path === "/") return [{ label: "Overview" }];

  if (path === "/analyze/report") {
    return [
      { label: "Analyze", href: "/analyze" },
      { label: "Report" },
    ];
  }

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
  } else if (path.startsWith("/snapshot/compare/") && segments.length >= 4) {
    crumbs.push({ label: "Diff" });
  } else if (path.startsWith("/snapshot/") && segments[1]) {
    crumbs.push({ label: "Detail" });
  }

  return crumbs;
}

const KNOWN_TRAILS: Record<string, Crumb[]> = {
  "/pipeline/new": [{ label: "New Run" }],
  "/novelty": [{ label: "Novelty" }],
};

export function pageTitleFor(pathname: string | null): string {
  const path = normalize(pathname ?? "/");
  if (path === "/") return "Overview";
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
