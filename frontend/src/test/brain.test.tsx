import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BrainPage from "@/app/brain/page";
import { ApiError } from "@/lib/api/client";
import { mockAnalysisReport } from "./fixtures/analysis-report";
import { mockBrainResponse, mockBrainMinimal } from "./fixtures/brain";
import type { AnalysisReport } from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { brainQueryMock } = vi.hoisted(() => ({ brainQueryMock: vi.fn() }));

const { reportState } = vi.hoisted(() => ({
  reportState: { value: null as AnalysisReport | null, loading: false },
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  brainQuery: brainQueryMock,
  getHealth: vi.fn().mockResolvedValue({ status: "ok", service: "reforge-engine" }),
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

function renderBrain() {
  return render(<BrainPage />);
}

function typeQuestion(value: string) {
  fireEvent.change(screen.getByLabelText("Question"), {
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

describe("Project Brain", () => {
  beforeEach(() => {
    brainQueryMock.mockReset();
    pushMock.mockReset();
    reportState.value = null;
    reportState.loading = false;
  });

  it("shows the run-analysis-first state when no report exists", () => {
    renderBrain();
    expect(screen.getByText("Run an analysis first")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyze Project" }),
    ).toBeInTheDocument();
    expect(brainQueryMock).not.toHaveBeenCalled();
  });

  it("renders the composer and report context when a report exists", () => {
    reportState.value = mockAnalysisReport;
    renderBrain();
    expect(screen.getByLabelText("Question")).toBeInTheDocument();
    expect(screen.getByTestId("report-context")).toBeInTheDocument();
    expect(screen.getByText("archive")).toBeInTheDocument();
    expect(screen.getByText("Suggested Questions")).toBeInTheDocument();
  });

  it("prevents submitting an empty question", () => {
    reportState.value = mockAnalysisReport;
    renderBrain();
    expect(screen.getByRole("button", { name: "Ask Brain" })).toBeDisabled();
  });

  it("submits a suggested question directly", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainResponse);
    renderBrain();

    const suggestion = screen.getByRole("button", {
      name: /What are the highest-risk areas/,
    });
    fireEvent.click(suggestion);

    await vi.waitFor(() => expect(brainQueryMock).toHaveBeenCalledTimes(1));
    const [question, report] = brainQueryMock.mock.calls[0] as [
      string,
      AnalysisReport,
    ];
    expect(question).toBe("What are the highest-risk areas of this project?");
    expect(report).toBe(mockAnalysisReport);
  });

  it("submits a typed question on button click", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainResponse);
    renderBrain();

    typeQuestion("Explain the current architecture");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    await vi.waitFor(() => expect(brainQueryMock).toHaveBeenCalledTimes(1));
    const [question] = brainQueryMock.mock.calls[0] as [string];
    expect(question).toBe("Explain the current architecture");
  });

  it("shows a loading state while the query is in flight", () => {
    reportState.value = mockAnalysisReport;
    const { promise } = deferred<typeof mockBrainResponse>();
    brainQueryMock.mockReturnValue(promise);
    renderBrain();

    typeQuestion("Explain the current architecture");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(
      screen.getByText("Brain is reasoning over the report…"),
    ).toBeInTheDocument();
  });

  it("renders the answer and confidence", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainResponse);
    renderBrain();

    typeQuestion("What are the highest-risk areas?");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(
      await screen.findByText(/The highest-risk area is the authentication module/),
    ).toBeInTheDocument();
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
  });

  it("renders evidence distinctly", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainResponse);
    renderBrain();

    typeQuestion("What are the highest-risk areas?");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(await screen.findByText("Evidence")).toBeInTheDocument();
    expect(screen.getByText("src/config.ts")).toBeInTheDocument();
    expect(screen.getByText("line 12: apiKey = \"sk-…\"")).toBeInTheDocument();
  });

  it("renders limitations prominently", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainResponse);
    renderBrain();

    typeQuestion("What are the highest-risk areas?");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(await screen.findByText("Limitations")).toBeInTheDocument();
    expect(
      screen.getByText(
        "AI output is inference; deterministic report facts remain authoritative.",
      ),
    ).toBeInTheDocument();
  });

  it("renders inferences as unverified", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainResponse);
    renderBrain();

    typeQuestion("What are the highest-risk areas?");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(await screen.findByText("Inferences")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Refactoring token verification into a shared service would reduce duplication risk.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/unverified/)).toBeInTheDocument();
  });

  it("supports a multi-question investigation log", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainResponse);
    renderBrain();

    typeQuestion("First question");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));
    await screen.findByText(/First question/);

    typeQuestion("Second question");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));
    await screen.findByText(/Second question/);

    const log = screen.getByTestId("investigation-log");
    expect(log.textContent).toContain("First question");
    expect(log.textContent).toContain("Second question");
    expect(brainQueryMock).toHaveBeenCalledTimes(2);
  });

  it("clears the conversation", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainResponse);
    renderBrain();

    typeQuestion("First question");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));
    await screen.findByText(/First question/);

    fireEvent.click(screen.getByRole("button", { name: "Clear conversation" }));
    expect(screen.queryByText(/First question/)).not.toBeInTheDocument();
    expect(
      screen.getByText("Ask your first question"),
    ).toBeInTheDocument();
  });

  it("shows a 400 error state", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockRejectedValue(
      new ApiError(
        "Invalid Brain request: question and deterministic report are required.",
        400,
      ),
    );
    renderBrain();

    typeQuestion("What are the risks?");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(await screen.findByText("Brain query failed")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Invalid Brain request: question and deterministic report are required.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the provider-unavailable state on 503", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockRejectedValue(
      new ApiError(
        "Project Brain is not configured. Configure an LLM provider before querying.",
        503,
      ),
    );
    renderBrain();

    typeQuestion("What are the risks?");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(
      (await screen.findAllByText("Project Brain is unavailable")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Your ReForge analysis engine is running, but no Brain provider is currently configured.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("button", { name: "Retry" }).length,
    ).toBeGreaterThan(0);
  });

  it("shows a network error state", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockRejectedValue(new TypeError("fetch failed"));
    renderBrain();

    typeQuestion("What are the risks?");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(await screen.findByText("Brain query failed")).toBeInTheDocument();
    expect(screen.getByText("fetch failed")).toBeInTheDocument();
  });

  it("renders without fabricating optional fields when they are absent", async () => {
    reportState.value = mockAnalysisReport;
    brainQueryMock.mockResolvedValue(mockBrainMinimal);
    renderBrain();

    typeQuestion("Is there anything risky?");
    fireEvent.click(screen.getByRole("button", { name: "Ask Brain" }));

    expect(
      await screen.findByText("No specific evidence was found for this question."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Evidence")).not.toBeInTheDocument();
    expect(screen.queryByText("Inferences")).not.toBeInTheDocument();
    expect(screen.queryByText("Limitations")).not.toBeInTheDocument();
  });
});
