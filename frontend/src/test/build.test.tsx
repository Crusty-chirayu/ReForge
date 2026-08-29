import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BuildPage from "@/app/build/page";
import { mockAnalysisReport } from "./fixtures/analysis-report";
import { mockPlan } from "./fixtures/plan";
import { mockImpact } from "./fixtures/impact";
import {
  mockBuildPlan,
  mockValidationBlocked,
  mockValidationValid,
} from "./fixtures/build";
import type { AnalysisReport } from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { generateBuildMock, validateExecutionMock } = vi.hoisted(() => ({
  generateBuildMock: vi.fn(),
  validateExecutionMock: vi.fn(),
}));

const { reportState } = vi.hoisted(() => ({
  reportState: { value: null as AnalysisReport | null, loading: false },
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  generateBuild: generateBuildMock,
  validateExecution: validateExecutionMock,
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

// Real workflow store is used — seed it directly.
import { workflowStore } from "@/lib/context/workflow-context";

function renderBuild() {
  return render(<BuildPage />);
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

describe("Build workflow", () => {
  beforeEach(() => {
    generateBuildMock.mockReset();
    validateExecutionMock.mockReset();
    pushMock.mockReset();
    workflowStore.clear();
    reportState.value = null;
    reportState.loading = false;
  });

  it("shows the missing-context state when no report exists", () => {
    renderBuild();
    expect(screen.getByText("Run an analysis first")).toBeInTheDocument();
    expect(generateBuildMock).not.toHaveBeenCalled();
  });

  it("renders the build form with goal and context toggles", () => {
    reportState.value = mockAnalysisReport;
    renderBuild();
    expect(screen.getByLabelText("Goal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Generate Build" })).toBeDisabled();
    expect(screen.getByText("Workflow context")).toBeInTheDocument();
    expect(screen.getAllByText("not available").length).toBeGreaterThan(0);
  });

  it("sends the correct POST /v1/build request with attached context", async () => {
    reportState.value = mockAnalysisReport;
    workflowStore.setPlan(mockPlan);
    workflowStore.setImpact(mockImpact);
    generateBuildMock.mockResolvedValue({ build: mockBuildPlan });

    renderBuild();
    // Goal is prefilled from the plan objective; attach plan + impact.
    const goalInput = screen.getByLabelText("Goal") as HTMLTextAreaElement;
    expect(goalInput.value).toBe(mockPlan.objective);

    fireEvent.click(screen.getByRole("button", { name: "Generate Build" }));

    await vi.waitFor(() => expect(generateBuildMock).toHaveBeenCalledTimes(1));
    const [goal, report, options] = generateBuildMock.mock.calls[0] as [
      string,
      AnalysisReport,
      { plan?: unknown; impact?: unknown; noveltyCandidate?: unknown },
    ];
    expect(goal).toBe(mockPlan.objective);
    expect(report).toBe(mockAnalysisReport);
    expect(options.plan).toBe(mockPlan);
    expect(options.impact).toBe(mockImpact);
    expect(options.noveltyCandidate).toBeUndefined();
  });

  it("shows a loading state while generating", () => {
    reportState.value = mockAnalysisReport;
    const { promise } = deferred<{ build: typeof mockBuildPlan }>();
    generateBuildMock.mockReturnValue(promise);
    renderBuild();

    fireEvent.change(screen.getByLabelText("Goal"), {
      target: { value: "Introduce caching" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Build" }));
    expect(screen.getByText("Generating build plan…")).toBeInTheDocument();
  });

  it("shows an error state when the build API fails", async () => {
    reportState.value = mockAnalysisReport;
    generateBuildMock.mockRejectedValue(
      new (class extends Error {
        status = 400;
      })("Invalid build request"),
    );
    renderBuild();

    fireEvent.change(screen.getByLabelText("Goal"), {
      target: { value: "Introduce caching" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Build" }));

    expect(await screen.findByText("Invalid build request")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders CREATE / MODIFY / DELETE / RENAME operations distinctly", async () => {
    reportState.value = mockAnalysisReport;
    generateBuildMock.mockResolvedValue({ build: mockBuildPlan });
    renderBuild();

    fireEvent.change(screen.getByLabelText("Goal"), {
      target: { value: "Introduce caching" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Build" }));

    expect(await screen.findByText("Proposed Build")).toBeInTheDocument();
    expect(screen.getByText("CREATE")).toBeInTheDocument();
    expect(screen.getByText("MODIFY")).toBeInTheDocument();
    expect(screen.getByText("DELETE")).toBeInTheDocument();
    expect(screen.getByText("RENAME")).toBeInTheDocument();
    expect(screen.getAllByText("src/cache.ts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("src/orders.ts").length).toBeGreaterThan(0);
    expect(screen.getByText("src/legacy.ts")).toBeInTheDocument();
    expect(screen.getByText("sha256:abc123")).toBeInTheDocument();
    // Proposal-only is stated explicitly.
    expect(screen.getByText(/Nothing has been applied/)).toBeInTheDocument();
  });

  it("renders patch validation with VALID and BLOCKED verdicts", async () => {
    reportState.value = mockAnalysisReport;
    generateBuildMock.mockResolvedValue({ build: mockBuildPlan });
    validateExecutionMock
      .mockResolvedValueOnce(mockValidationValid)
      .mockResolvedValueOnce(mockValidationBlocked);
    renderBuild();

    fireEvent.change(screen.getByLabelText("Goal"), {
      target: { value: "Introduce caching" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Build" }));
    await screen.findByText("Proposed Build");

    fireEvent.click(screen.getByRole("button", { name: "Validate Patches" }));
    expect(await screen.findByText("VALID")).toBeInTheDocument();
    expect(screen.getByText(/0 applied/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Validate Patches" }));
    expect(await screen.findByText("BLOCKED")).toBeInTheDocument();
    expect(
      screen.getByText(/DELETE_APPROVAL_REQUIRED/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Delete operations require explicit delete approval."),
    ).toBeInTheDocument();
  });
});
