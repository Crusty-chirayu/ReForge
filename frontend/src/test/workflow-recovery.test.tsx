import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import BuildPage from "@/app/build/page";
import NoveltyPage from "@/app/novelty/page";
import ImpactPage from "@/app/impact/page";
import PlanPage from "@/app/plan/page";
import BrainPage from "@/app/brain/page";
import AnalysisReportPage from "@/app/analyze/report/page";
import { mockAnalysisReport } from "./fixtures/analysis-report";
import { clearWorkflow, workflowStore } from "@/lib/context/workflow-context";
import type { AnalysisReport } from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { reportState } = vi.hoisted(() => ({
  reportState: { value: null as AnalysisReport | null, loading: false },
}));
const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/context/report-context", () => ({
  useReport: () => ({
    report: reportState.value,
    reportLoading: reportState.loading,
    hasReport: reportState.value !== null,
    setReport: vi.fn(),
    clearReport: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/build",
}));

vi.mock("@/lib/api/client", () => ({
  generatePlan: vi.fn(),
  analyzeNovelty: vi.fn(),
  analyzeImpact: vi.fn(),
  generateBuild: vi.fn(),
  brainQuery: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

const REPORT_DEPENDENT: [string, () => React.ReactElement][] = [
  ["Plan", () => <PlanPage />],
  ["Novelty", () => <NoveltyPage />],
  ["Impact", () => <ImpactPage />],
  ["Build", () => <BuildPage />],
];

describe("Missing analysis report recovery", () => {
  beforeEach(() => {
    reportState.value = null;
    reportState.loading = false;
    pushMock.mockReset();
    clearWorkflow();
  });

  it.each(REPORT_DEPENDENT)(
    "%s explains the missing report instead of rendering a blank page",
    (_name, renderPage) => {
      render(renderPage());
      expect(screen.getByText("Run an analysis first")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Analyze Project" }),
      ).toBeInTheDocument();
    },
  );

  it.each(REPORT_DEPENDENT)(
    "%s routes the recovery action to /analyze",
    (_name, renderPage) => {
      render(renderPage());
      fireEvent.click(screen.getByRole("button", { name: "Analyze Project" }));
      expect(pushMock).toHaveBeenCalledWith("/analyze");
    },
  );

  it("states that reports are tab-scoped rather than silently losing them", () => {
    render(<PlanPage />);
    expect(screen.getByText(/current browser tab only/i)).toBeInTheDocument();
  });

  it("shows a loading state, not an error, while the store hydrates", () => {
    reportState.loading = true;
    render(<PlanPage />);
    expect(
      screen.getByRole("status", { name: "Loading report context" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Run an analysis first")).not.toBeInTheDocument();
  });

  it("Project Brain refuses to answer without report context", () => {
    render(<BrainPage />);
    expect(screen.getByText("Run an analysis first")).toBeInTheDocument();
    // No investigation log, so no answer can appear to exist.
    expect(screen.queryByTestId("investigation-log")).not.toBeInTheDocument();
  });

  it("the analysis report page offers a route back to Analyze when empty", () => {
    render(<AnalysisReportPage />);
    expect(
      screen.getByText("No analysis report available"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Analyze Project" }));
    expect(pushMock).toHaveBeenCalledWith("/analyze");
  });
});

describe("Workflow context continuity", () => {
  beforeEach(() => {
    reportState.value = mockAnalysisReport;
    reportState.loading = false;
    pushMock.mockReset();
    clearWorkflow();
  });

  it("marks absent Plan / Impact / Novelty context as unavailable, not as present", () => {
    render(<BuildPage />);
    const labels = screen.getAllByText("not available");
    // All three optional context sources are honestly reported as missing.
    expect(labels.length).toBe(3);
  });

  it("disables a context checkbox that has no backing data", () => {
    render(<BuildPage />);
    const checkboxes = screen.getAllByRole("checkbox");
    // Plan / Impact / Novelty are all absent, so none may be attachable.
    expect(checkboxes).toHaveLength(3);
    for (const box of checkboxes) expect(box).toBeDisabled();
  });

  it("marks context as attached once a real Plan exists", () => {
    workflowStore.setPlan({
      objective: "Reduce technical debt",
      tasks: [],
    } as never);
    render(<BuildPage />);
    expect(screen.getAllByText("attached")).toHaveLength(1);
    expect(screen.getAllByText("not available")).toHaveLength(2);
    const enabled = screen
      .getAllByRole("checkbox")
      .filter((box) => !(box as HTMLInputElement).disabled);
    expect(enabled).toHaveLength(1);
  });

  it("prefills the build goal from real plan context only", () => {
    workflowStore.setPlan({
      objective: "Reduce technical debt",
      tasks: [],
    } as never);
    render(<BuildPage />);
    expect(screen.getByLabelText("Goal")).toHaveValue("Reduce technical debt");
  });

  it("leaves the goal empty when there is no upstream context to derive it from", () => {
    render(<BuildPage />);
    expect(screen.getByLabelText("Goal")).toHaveValue("");
  });
});

describe("Workflow rail", () => {
  beforeEach(() => {
    reportState.value = mockAnalysisReport;
    reportState.loading = false;
    pushMock.mockReset();
    clearWorkflow();
  });

  it("exposes the whole journey as real links", () => {
    render(<PlanPage />);
    const rail = screen.getByRole("navigation", { name: "Workflow progress" });
    expect(within(rail).getByRole("link", { name: /Analyze/ })).toHaveAttribute(
      "href",
      "/analyze",
    );
    expect(within(rail).getByRole("link", { name: /Pipeline/ })).toHaveAttribute(
      "href",
      "/pipeline/new",
    );
  });

  it("marks the current step for assistive technology", () => {
    render(<ImpactPage />);
    const rail = screen.getByRole("navigation", { name: "Workflow progress" });
    const current = within(rail)
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(/Impact/);
  });
});
