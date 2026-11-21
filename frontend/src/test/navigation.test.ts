import { describe, expect, it } from "vitest";
import {
  NAV_ITEMS,
  NAV_SECTIONS,
  activeNavItem,
  breadcrumbsFor,
  isNavItemActive,
  pageTitleFor,
} from "@/lib/navigation";

/**
 * Every route that actually exists under src/app. If a page is added or
 * removed, this list is the contract the navigation registry is checked
 * against — it is what stops a "coming soon" or dead link from shipping.
 */
const REAL_ROUTES = [
  "/",
  "/analyze",
  "/analyze/report",
  "/xray",
  "/doctor",
  "/plan",
  "/novelty",
  "/impact",
  "/build",
  "/pipeline",
  "/pipeline/new",
  "/pipeline/[pipelineId]",
  "/snapshots",
  "/snapshot/compare",
  "/snapshot/[snapshotId]",
  "/snapshot/compare/[beforeId]/[afterId]",
  "/brain",
] as const;

const STATIC_ROUTES = REAL_ROUTES.filter((r) => !r.includes("["));

describe("Navigation registry", () => {
  it("only links to routes that exist", () => {
    for (const item of NAV_ITEMS) {
      expect(STATIC_ROUTES).toContain(item.href);
    }
  });

  it("exposes every primary product area required by Forge Ledger IA", () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    for (const expected of [
      "Overview",
      "Ingest",
      "Report",
      "X-Ray",
      "Doctor",
      "Impact",
      "Plan",
      "Brain",
      "Builder",
      "Pipelines",
      "Snapshots",
      "Compare",
    ]) {
      expect(labels).toContain(expected);
    }
  });

  it("has no duplicate ids or hrefs", () => {
    expect(new Set(NAV_ITEMS.map((i) => i.id)).size).toBe(NAV_ITEMS.length);
    expect(new Set(NAV_ITEMS.map((i) => i.href)).size).toBe(NAV_ITEMS.length);
  });

  it("groups every item into a titled section", () => {
    const grouped = NAV_SECTIONS.flatMap((s) => s.items);
    expect(grouped).toHaveLength(NAV_ITEMS.length);
    for (const section of NAV_SECTIONS) {
      expect(section.title.length).toBeGreaterThan(0);
      expect(section.items.length).toBeGreaterThan(0);
    }
  });

  it("gives every item a human description for tooltips and the 404 page", () => {
    for (const item of NAV_ITEMS) {
      expect(item.description.length).toBeGreaterThan(0);
    }
  });
});

describe("Active navigation state", () => {
  it("marks the dashboard active only at the exact root", () => {
    const dashboard = NAV_ITEMS.find((i) => i.href === "/")!;
    expect(isNavItemActive(dashboard, "/")).toBe(true);
    expect(isNavItemActive(dashboard, "/analyze")).toBe(false);
    expect(isNavItemActive(dashboard, "/brain")).toBe(false);
  });

  it("highlights the exact destination for nested routes", () => {
    expect(activeNavItem("/analyze/report")?.label).toBe("Report");
    expect(activeNavItem("/pipeline/new")?.label).toBe("Pipelines");
    expect(activeNavItem("/pipeline/pl_01J2XYZ")?.label).toBe("Pipelines");
  });

  it("highlights Snapshots and Compare appropriately", () => {
    expect(activeNavItem("/snapshots")?.label).toBe("Snapshots");
    expect(activeNavItem("/snapshot/snap_abc")?.label).toBe("Snapshots");
    expect(activeNavItem("/snapshot/compare")?.label).toBe("Compare");
    expect(
      activeNavItem("/snapshot/compare/snap_a/snap_b")?.label,
    ).toBe("Compare");
  });

  it("matches on segment boundaries, never on a bare prefix", () => {
    const plan = NAV_ITEMS.find((i) => i.href === "/plan")!;
    expect(isNavItemActive(plan, "/plan")).toBe(true);
    expect(isNavItemActive(plan, "/planner")).toBe(false);
  });

  it("tolerates a null pathname and trailing slashes", () => {
    const analyze = NAV_ITEMS.find((i) => i.href === "/analyze")!;
    expect(isNavItemActive(analyze, null)).toBe(false);
    expect(isNavItemActive(analyze, "/analyze/")).toBe(true);
  });

  it("activates exactly one item per registered static route", () => {
    for (const route of NAV_ITEMS.map((item) => item.href)) {
      const matches = NAV_ITEMS.filter((i) => isNavItemActive(i, route));
      expect(matches.length, `route ${route}`).toBe(1);
    }
  });
});

describe("Breadcrumbs", () => {
  it("returns a single crumb for the overview", () => {
    expect(breadcrumbsFor("/")).toEqual([{ label: "Overview" }]);
  });

  it("links the parent and marks the leaf for nested routes", () => {
    const crumbs = breadcrumbsFor("/analyze/report");
    expect(crumbs).toEqual([
      { label: "Analyze", href: "/analyze" },
      { label: "Report" },
    ]);
  });

  it("labels dynamic routes without inventing an identifier", () => {
    const crumbs = breadcrumbsFor("/pipeline/pl_01J2XYZ");
    expect(crumbs.at(-1)).toEqual({ label: "Result" });
    // The raw id is never presented as a fabricated human name.
    expect(JSON.stringify(crumbs)).not.toContain("pl_01J2XYZ");
  });

  it("labels the snapshot comparison route", () => {
    expect(breadcrumbsFor("/snapshot/compare/a/b").at(-1)).toEqual({
      label: "Diff",
    });
  });

  it("never emits a crumb linking to a non-existent route", () => {
    for (const route of STATIC_ROUTES) {
      const crumbs = breadcrumbsFor(route);
      expect(crumbs.length).toBeGreaterThan(0);
      for (const crumb of crumbs) {
        if (crumb.href) {
          expect(
            STATIC_ROUTES as readonly string[],
            `crumb ${crumb.label} -> ${crumb.href}`,
          ).toContain(crumb.href);
        }
      }
    }
  });
});

describe("Page titles", () => {
  it("generates honest titles matching the breadcrumb trail", () => {
    expect(pageTitleFor("/")).toBe("Overview");
    expect(pageTitleFor("/analyze")).toBe("Ingest");
    expect(pageTitleFor("/analyze/report")).toBe("Analyze › Report");
    expect(pageTitleFor("/pipeline/pl_123")).toBe("Pipelines › Result");
    expect(pageTitleFor("/snapshot/compare/a/b")).toBe("Compare › Diff");
  });
});
