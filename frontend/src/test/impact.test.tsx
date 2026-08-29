import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ImpactPage from "@/app/impact/page";
import { mockAnalysisReport } from "./fixtures/analysis-report";
import { mockImpact } from "./fixtures/impact";
import type { AnalysisReport } from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { analyzeImpactMock } = vi.hoisted(() => ({
  analyzeImpactMock: vi.fn(),
}));

const { reportState } = vi.hoisted(() => ({
  reportState: { value: null as AnalysisReport | null, loading: false },
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  analyzeImpact: analyzeImpactMock,
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

function renderImpact() {
  return render(<ImpactPage />);
}

function typeRequest(value: string) {
  fireEvent.change(screen.getByLabelText("Proposed Change"), {
    target: { value },
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("Impact workflow", () => {
  beforeEach(() => {
    analyzeImpactMock.mockReset();
    pushMock.mockReset();
    reportState.value = null;
    reportState.loading = false;
  });

  it("shows the missing-report state when no analysis report exists", () => {
    renderImpact();
    expect(screen.getByText("Run an analysis first")).toBeInTheDocument();
    expect(analyzeImpactMock).not.toHaveBeenCalled();
  });

  it("renders the change request input and category selector", () => {
    reportState.value = mockAnalysisReport;
    renderImpact();
    expect(screen.getByLabelText("Proposed Change")).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Analyze Impact" });
    expect(button).toBeDisabled();
    typeRequest("Replace MongoDB with PostgreSQL");
    expect(button).toBeEnabled();
  });

  it("calls the impact API with the request, report, and category", async () => {
    reportState.value = mockAnalysisReport;
    analyzeImpactMock.mockResolvedValue(mockImpact);
    renderImpact();

    typeRequest("Replace MongoDB with PostgreSQL");
    fireEvent.change(screen.getByLabelText(/Category/), {
      target: { value: "TECHNOLOGY_MIGRATION" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Impact" }));

    await vi.waitFor(() => expect(analyzeImpactMock).toHaveBeenCalledTimes(1));
    const [req, report, category] = analyzeImpactMock.mock.calls[0] as [
      string,
      AnalysisReport,
      string,
    ];
    expect(req).toBe("Replace MongoDB with PostgreSQL");
    expect(report).toBe(mockAnalysisReport);
    expect(category).toBe("TECHNOLOGY_MIGRATION");
  });

  it("calls the impact API without a category when none is selected", async () => {
    reportState.value = mockAnalysisReport;
    analyzeImpactMock.mockResolvedValue(mockImpact);
    renderImpact();

    typeRequest("Introduce caching");
    fireEvent.click(screen.getByRole("button", { name: "Analyze Impact" }));

    await vi.waitFor(() => expect(analyzeImpactMock).toHaveBeenCalledTimes(1));
    const [req, , category] = analyzeImpactMock.mock.calls[0] as [
      string,
      AnalysisReport,
      string | undefined,
    ];
    expect(req).toBe("Introduce caching");
    expect(category).toBeUndefined();
  });

  it("shows a loading state while analyzing", () => {
    reportState.value = mockAnalysisReport;
    const { promise } = deferred<typeof mockImpact>();
    analyzeImpactMock.mockReturnValue(promise);
    renderImpact();

    typeRequest("Replace MongoDB with PostgreSQL");
    fireEvent.click(screen.getByRole("button", { name: "Analyze Impact" }));
    expect(screen.getByText("Analyzing impact…")).toBeInTheDocument();
  });

  it("shows an error state on API failure", async () => {
    reportState.value = mockAnalysisReport;
    analyzeImpactMock.mockRejectedValue(new Error("Impact analysis failed"));
    renderImpact();

    typeRequest("Replace MongoDB with PostgreSQL");
    fireEvent.click(screen.getByRole("button", { name: "Analyze Impact" }));

    expect(await screen.findByText("Impact analysis failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders the impact report with level, confidence, and blast radius", async () => {
    reportState.value = mockAnalysisReport;
    analyzeImpactMock.mockResolvedValue(mockImpact);
    renderImpact();

    typeRequest("Replace MongoDB with PostgreSQL");
    fireEvent.click(screen.getByRole("button", { name: "Analyze Impact" }));

    expect(
      await screen.findByText("Replace MongoDB with PostgreSQL"),
    ).toBeInTheDocument();
    expect(screen.getByText("HIGH Impact")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
    expect(screen.getByText("Blast Radius")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });

  it("renders affected modules and evidence", async () => {
    reportState.value = mockAnalysisReport;
    analyzeImpactMock.mockResolvedValue(mockImpact);
    renderImpact();

    typeRequest("Replace MongoDB with PostgreSQL");
    fireEvent.click(screen.getByRole("button", { name: "Analyze Impact" }));

    expect((await screen.findAllByText("src/repository.ts")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("src/services/orders.ts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("src/api/orders.ts").length).toBeGreaterThan(0);
    expect(screen.getByText("uses the Mongo client directly")).toBeInTheDocument();
  });
});
