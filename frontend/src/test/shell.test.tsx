import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { NAV_ITEMS } from "@/lib/navigation";

const { getHealthMock } = vi.hoisted(() => ({ getHealthMock: vi.fn() }));
const { pathnameRef } = vi.hoisted(() => ({ pathnameRef: { value: "/" } }));

vi.mock("@/lib/api/client", () => ({
  getHealth: getHealthMock,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameRef.value,
  useRouter: () => ({ push: vi.fn() }),
}));

function renderShell(pathname = "/") {
  pathnameRef.value = pathname;
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, refetchInterval: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <Shell>
        <h1>Page content</h1>
      </Shell>
    </QueryClientProvider>,
  );
}

/** The docked desktop sidebar (the drawer copy only exists when opened). */
function primaryNav() {
  return screen.getAllByRole("complementary", {
    name: "Primary navigation",
  })[0]!;
}

describe("Console shell — navigation", () => {
  beforeEach(() => {
    getHealthMock.mockReset();
    getHealthMock.mockResolvedValue({
      status: "ok",
      service: "reforge-analysis-engine",
    });
  });

  it("renders a link for every registered destination", () => {
    renderShell();
    const nav = primaryNav();
    for (const item of NAV_ITEMS) {
      const link = within(nav).getByRole("link", { name: item.label });
      expect(link).toHaveAttribute("href", item.href);
    }
  });

  it("renders no disabled or 'coming soon' navigation entries", () => {
    renderShell();
    const nav = primaryNav();
    expect(within(nav).queryByText(/planned/i)).not.toBeInTheDocument();
    expect(within(nav).queryByText(/coming soon/i)).not.toBeInTheDocument();
    expect(nav.querySelector("[aria-disabled='true']")).toBeNull();
  });

  it("marks the current route with aria-current", () => {
    renderShell("/analyze");
    const nav = primaryNav();
    expect(within(nav).getByRole("link", { name: "Ingest" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Plan" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("keeps the parent highlighted on a nested route", () => {
    renderShell("/analyze/report");
    expect(
      within(primaryNav()).getByRole("link", { name: "Report" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("keeps Snapshots highlighted on a dynamic snapshot route", () => {
    renderShell("/snapshot/snap_abc123");
    expect(
      within(primaryNav()).getByRole("link", { name: "Snapshots" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("marks exactly one destination active at a time", () => {
    renderShell("/pipeline/new");
    const current = within(primaryNav())
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName("Pipelines");
  });
});

describe("Console shell — breadcrumbs", () => {
  beforeEach(() => {
    getHealthMock.mockReset();
    getHealthMock.mockResolvedValue({ status: "ok", service: "reforge" });
  });

  it("shows a working parent link on a nested route", () => {
    renderShell("/analyze/report");
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(crumbs).getByRole("link", { name: "Analyze" }),
    ).toHaveAttribute("href", "/analyze");
  });

  it("omits the breadcrumb bar on a top-level route", () => {
    renderShell("/analyze");
    expect(
      screen.queryByRole("navigation", { name: "Breadcrumb" }),
    ).not.toBeInTheDocument();
  });
});

describe("Console shell — accessibility", () => {
  beforeEach(() => {
    getHealthMock.mockReset();
    getHealthMock.mockResolvedValue({ status: "ok", service: "reforge" });
  });

  it("offers a skip link to the main content", () => {
    renderShell();
    expect(
      screen.getByRole("link", { name: "Skip to main content" }),
    ).toHaveAttribute("href", "#main-content");
    expect(document.getElementById("main-content")).not.toBeNull();
  });

  it("does not add a second page-level heading", () => {
    renderShell("/analyze");
    // The page supplies the only <h1>; the header title is plain text.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("labels the collapse toggle and reflects its state", () => {
    renderShell();
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: "Expand sidebar" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps navigation labels available when collapsed", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(
      within(primaryNav()).getByRole("link", { name: "Overview" }),
    ).toBeInTheDocument();
  });

  it("communicates backend status as text, not colour alone", async () => {
    renderShell();
    const nav = primaryNav();
    expect(await within(nav).findByText(/Backend\s+LIVE/i)).toBeInTheDocument();
    expect(within(nav).getByRole("status")).toHaveTextContent(/backend status/i);
  });
});

describe("Console shell — mobile drawer", () => {
  beforeEach(() => {
    getHealthMock.mockReset();
    getHealthMock.mockResolvedValue({ status: "ok", service: "reforge" });
  });

  it("opens a labelled dialog from the menu button", () => {
    renderShell();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(screen.getByRole("dialog", { name: "Navigation" })).toBeInTheDocument();
  });

  it("closes on Escape so the drawer can never trap the user", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when a destination inside the drawer is followed", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    fireEvent.click(within(drawer).getByRole("link", { name: "Brain" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes from the explicit close control", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = screen.getByRole("dialog", { name: "Navigation" });
    fireEvent.click(within(drawer).getByRole("button", { name: "Close navigation" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
