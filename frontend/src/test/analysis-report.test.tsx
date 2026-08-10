import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AnalysisReportPage from "@/app/analyze/report/page";
import { mockAnalysisReport, minimalAnalysisReport } from "./fixtures/analysis-report";
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

function renderReport() {
  return render(<AnalysisReportPage />);
}

describe("Analysis report page", () => {
  beforeEach(() => {
    reportState.value = null;
    reportState.loading = false;
    pushMock.mockReset();
  });

  it("renders the report overview with real statistics", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    expect(screen.getAllByText("Analysis Report").length).toBeGreaterThan(0);
    expect(screen.getByText("acme-app.zip")).toBeInTheDocument();
    expect(screen.getByText("archive")).toBeInTheDocument();
    // Overview tiles
    expect(screen.getAllByText("42").length).toBeGreaterThan(0);
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("1000 KB")).toBeInTheDocument();
    // Project model heading (name appears inside the subtitle sentence)
    expect(screen.getAllByText(/acme-app/).length).toBeGreaterThan(0);
  });

  it("renders languages and frameworks", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("JavaScript")).toBeInTheDocument();
    expect(screen.getByText("Next.js")).toBeInTheDocument();
  });

  it("renders resolved dependencies with versions and types", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    expect(screen.getAllByText("fastify").length).toBeGreaterThan(0);
    expect(screen.getByText("5.0.0")).toBeInTheDocument();
    expect(screen.getAllByText("typescript").length).toBeGreaterThan(0);
    expect(screen.getByText("5.7.2")).toBeInTheDocument();
    expect(screen.getAllByText("production").length).toBeGreaterThan(0);
    expect(screen.getAllByText("development").length).toBeGreaterThan(0);
    // Detected dependency finding
    expect(screen.getByText("react")).toBeInTheDocument();
  });

  it("renders doctor findings with titles and metadata", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    expect(screen.getByText("76")).toBeInTheDocument();
    expect(
      screen.getByText("Hardcoded secret in configuration"),
    ).toBeInTheDocument();
    expect(screen.getByText("SEC-001")).toBeInTheDocument();
    expect(screen.getByText("Large module exceeds recommended size")).toBeInTheDocument();
    expect(
      screen.getByText("Move the value to an environment variable and rotate the secret."),
    ).toBeInTheDocument();
  });

  it("renders severity badges for every severity level", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MEDIUM").length).toBeGreaterThan(0);
    expect(screen.getAllByText("LOW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("INFO").length).toBeGreaterThan(0);
  });

  it("renders evidence blocks with file paths", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    expect(screen.getAllByText("src/config.ts").length).toBeGreaterThan(0);
    expect(screen.getByText("line 12: apiKey = \"sk-…\"")).toBeInTheDocument();
  });

  it("renders risks, architecture, and next steps", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    expect(
      screen.getByText("No test coverage for execution module"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Modular monolith with service layer"),
    ).toBeInTheDocument();
    expect(screen.getByText("Large module detected")).toBeInTheDocument();
    expect(
      screen.getByText("Create an improvement plan targeting test coverage"),
    ).toBeInTheDocument();
  });

  it("does not crash when optional sections are absent", () => {
    reportState.value = minimalAnalysisReport;
    renderReport();

    expect(screen.getAllByText("Analysis Report").length).toBeGreaterThan(0);
    expect(screen.getByText("repository")).toBeInTheDocument();
    expect(
      screen.getByText("The Doctor report was not included in this analysis."),
    ).toBeInTheDocument();
    expect(screen.getByText("No languages detected")).toBeInTheDocument();
    expect(screen.getByText("No frameworks detected")).toBeInTheDocument();
    expect(screen.getByText("No risks identified.")).toBeInTheDocument();
  });

  it("shows an empty state when no report is available", () => {
    reportState.value = null;
    renderReport();

    expect(
      screen.getByText("No analysis report available"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyze Project" }),
    ).toBeInTheDocument();
  });

  it("shows a loading skeleton while the report hydrates", () => {
    reportState.value = null;
    reportState.loading = true;
    renderReport();

    expect(
      screen.getByRole("status", { name: "Loading analysis report" }),
    ).toBeInTheDocument();
  });

  it("renders all next-step workflow actions enabled", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    const planButton = screen.getByRole("button", {
      name: /Create Improvement Plan/,
    });
    const impactButton = screen.getByRole("button", {
      name: /Analyze Change Impact/,
    });
    const noveltyButton = screen.getByRole("button", {
      name: /Explore Novelty/,
    });
    const pipelineButton = screen.getByRole("button", {
      name: /Run Pipeline/,
    });

    // All four workflows are live as of F5.
    expect(planButton).toBeEnabled();
    expect(impactButton).toBeEnabled();
    expect(noveltyButton).toBeEnabled();
    expect(pipelineButton).toBeEnabled();
  });

  it("navigates back to the analyze page", () => {
    reportState.value = mockAnalysisReport;
    renderReport();

    const back = screen.getByRole("button", { name: /Back to Analyze/ });
    back.click();
    expect(pushMock).toHaveBeenCalledWith("/analyze");
  });
});
