import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import AnalysisReportPage from "@/app/analyze/report/page";
import PlanPage from "@/app/plan/page";
import { mockAnalysisReport } from "./fixtures/analysis-report";
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
}));

vi.mock("@/lib/api/client", () => ({
  generatePlan: vi.fn(),
  analyzeNovelty: vi.fn(),
  analyzeImpact: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    body?: unknown;
    constructor(message: string, status: number, body?: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

describe("Workflow navigation", () => {
  beforeEach(() => {
    reportState.value = null;
    reportState.loading = false;
    pushMock.mockReset();
  });

  it("navigates from the report to the plan workflow", () => {
    reportState.value = mockAnalysisReport;
    render(<AnalysisReportPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /Create Improvement Plan/ }),
    );
    expect(pushMock).toHaveBeenCalledWith("/plan");
  });

  it("navigates from the report to the novelty workflow", () => {
    reportState.value = mockAnalysisReport;
    render(<AnalysisReportPage />);
    fireEvent.click(screen.getByRole("button", { name: /Explore Novelty/ }));
    expect(pushMock).toHaveBeenCalledWith("/novelty");
  });

  it("navigates from the report to the impact workflow", () => {
    reportState.value = mockAnalysisReport;
    render(<AnalysisReportPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /Analyze Change Impact/ }),
    );
    expect(pushMock).toHaveBeenCalledWith("/impact");
  });

  it("navigates from the report to the pipeline workflow", () => {
    reportState.value = mockAnalysisReport;
    render(<AnalysisReportPage />);
    fireEvent.click(screen.getByRole("button", { name: /Run Pipeline/ }));
    expect(pushMock).toHaveBeenCalledWith("/pipeline/new");
  });

  it("navigates back to the report from a workflow page", () => {
    reportState.value = mockAnalysisReport;
    render(<PlanPage />);
    fireEvent.click(screen.getByRole("button", { name: /Back to Report/ }));
    expect(pushMock).toHaveBeenCalledWith("/analyze/report");
  });

  it("offers the next workflow step from each page", () => {
    reportState.value = mockAnalysisReport;
    render(<PlanPage />);
    expect(
      screen.getByRole("button", { name: /Next: Impact/ }),
    ).toBeInTheDocument();
  });
});
