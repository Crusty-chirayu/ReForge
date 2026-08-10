import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import NoveltyPage from "@/app/novelty/page";
import { mockAnalysisReport } from "./fixtures/analysis-report";
import { mockNovelty } from "./fixtures/novelty";
import type { AnalysisReport } from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { analyzeNoveltyMock } = vi.hoisted(() => ({
  analyzeNoveltyMock: vi.fn(),
}));

const { reportState } = vi.hoisted(() => ({
  reportState: { value: null as AnalysisReport | null, loading: false },
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  analyzeNovelty: analyzeNoveltyMock,
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

function renderNovelty() {
  return render(<NoveltyPage />);
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

describe("Novelty workflow", () => {
  beforeEach(() => {
    analyzeNoveltyMock.mockReset();
    pushMock.mockReset();
    reportState.value = null;
    reportState.loading = false;
  });

  it("uses the analysis report from context and offers a goal focus", () => {
    reportState.value = mockAnalysisReport;
    renderNovelty();
    expect(screen.getByLabelText("Goal Focus")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyze Novelty" }),
    ).toBeInTheDocument();
  });

  it("calls the novelty API with the report and an optional goal", async () => {
    reportState.value = mockAnalysisReport;
    analyzeNoveltyMock.mockResolvedValue({ novelty: mockNovelty });
    renderNovelty();

    fireEvent.change(screen.getByLabelText("Goal Focus"), {
      target: { value: "Improve developer onboarding" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Novelty" }));

    await vi.waitFor(() => expect(analyzeNoveltyMock).toHaveBeenCalledTimes(1));
    const [report, goal] = analyzeNoveltyMock.mock.calls[0] as [
      AnalysisReport,
      string,
    ];
    expect(report).toBe(mockAnalysisReport);
    expect(goal).toBe("Improve developer onboarding");
  });

  it("omits the goal when left empty", async () => {
    reportState.value = mockAnalysisReport;
    analyzeNoveltyMock.mockResolvedValue({ novelty: mockNovelty });
    renderNovelty();

    fireEvent.click(screen.getByRole("button", { name: "Analyze Novelty" }));

    await vi.waitFor(() => expect(analyzeNoveltyMock).toHaveBeenCalledTimes(1));
    const [report, goal] = analyzeNoveltyMock.mock.calls[0] as [
      AnalysisReport,
      string | undefined,
    ];
    expect(report).toBe(mockAnalysisReport);
    expect(goal).toBeUndefined();
  });

  it("shows a loading state while analyzing", () => {
    reportState.value = mockAnalysisReport;
    const { promise } = deferred<{ novelty: typeof mockNovelty }>();
    analyzeNoveltyMock.mockReturnValue(promise);
    renderNovelty();

    fireEvent.click(screen.getByRole("button", { name: "Analyze Novelty" }));
    expect(screen.getByText("Analyzing novelty…")).toBeInTheDocument();
  });

  it("shows an error state on API failure", async () => {
    reportState.value = mockAnalysisReport;
    analyzeNoveltyMock.mockRejectedValue(new Error("Network error"));
    renderNovelty();

    fireEvent.click(screen.getByRole("button", { name: "Analyze Novelty" }));

    expect(await screen.findByText("Network error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders novelty candidates with scores and source badges", async () => {
    reportState.value = mockAnalysisReport;
    analyzeNoveltyMock.mockResolvedValue({ novelty: mockNovelty });
    renderNovelty();

    fireEvent.click(screen.getByRole("button", { name: "Analyze Novelty" }));

    expect(
      await screen.findByText("Patch-safety scoring for autonomous pipelines"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Diff-aware test selection"),
    ).toBeInTheDocument();
    expect(screen.getByText("Evidence-backed")).toBeInTheDocument();
    expect(screen.getByText("AI recommendation")).toBeInTheDocument();
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Novelty").length).toBeGreaterThan(0);
  });

  it("renders evidence, confidence, and limitations", async () => {
    reportState.value = mockAnalysisReport;
    analyzeNoveltyMock.mockResolvedValue({ novelty: mockNovelty });
    renderNovelty();

    fireEvent.click(screen.getByRole("button", { name: "Analyze Novelty" }));

    expect(
      (await screen.findAllByText("src/execution.ts")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText("patch validation pipeline exists"),
    ).toBeInTheDocument();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
    expect(
      screen.getByText("Analysis is based on a single project snapshot"),
    ).toBeInTheDocument();
  });
});
