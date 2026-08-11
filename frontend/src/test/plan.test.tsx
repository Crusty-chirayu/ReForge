import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PlanPage from "@/app/plan/page";
import { mockAnalysisReport } from "./fixtures/analysis-report";
import { mockPlan } from "./fixtures/plan";
import type { AnalysisReport } from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { generatePlanMock, setReportMock, clearReportMock } = vi.hoisted(() => ({
  generatePlanMock: vi.fn(),
  setReportMock: vi.fn(),
  clearReportMock: vi.fn(),
}));

const { reportState } = vi.hoisted(() => ({
  reportState: { value: null as AnalysisReport | null, loading: false },
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  generatePlan: generatePlanMock,
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
    setReport: setReportMock,
    clearReport: clearReportMock,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function renderPlan() {
  return render(<PlanPage />);
}

function typeGoal(value: string) {
  fireEvent.change(screen.getByLabelText("Improvement Goal"), {
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

describe("Plan workflow", () => {
  beforeEach(() => {
    generatePlanMock.mockReset();
    pushMock.mockReset();
    reportState.value = null;
    reportState.loading = false;
  });

  it("shows the missing-report state when no analysis report exists", () => {
    renderPlan();
    expect(screen.getByText("Run an analysis first")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyze Project" }),
    ).toBeInTheDocument();
    expect(generatePlanMock).not.toHaveBeenCalled();
  });

  it("renders the goal input and optional fields", () => {
    reportState.value = mockAnalysisReport;
    renderPlan();

    expect(screen.getByLabelText("Improvement Goal")).toBeInTheDocument();
    expect(screen.getByLabelText("Constraints")).toBeInTheDocument();
    expect(screen.getByLabelText("Priorities")).toBeInTheDocument();
    expect(screen.getByLabelText("Desired Technology")).toBeInTheDocument();
  });

  it("disables the generate button until a goal is entered", () => {
    reportState.value = mockAnalysisReport;
    renderPlan();
    const button = screen.getByRole("button", { name: "Generate Plan" });
    expect(button).toBeDisabled();
    typeGoal("Reduce auth debt");
    expect(button).toBeEnabled();
  });

  it("calls the plan API with goal, optional fields, and the report", async () => {
    reportState.value = mockAnalysisReport;
    generatePlanMock.mockResolvedValue({ plan: mockPlan });
    renderPlan();

    typeGoal("Reduce auth debt");
    fireEvent.change(screen.getByLabelText("Constraints"), {
      target: { value: "No new dependencies, TypeScript only" },
    });
    fireEvent.change(screen.getByLabelText("Priorities"), {
      target: { value: "Security, Performance" },
    });
    fireEvent.change(screen.getByLabelText("Desired Technology"), {
      target: { value: "PostgreSQL" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));

    await vi.waitFor(() => expect(generatePlanMock).toHaveBeenCalledTimes(1));
    const [goal, report, options] = generatePlanMock.mock.calls[0] as [
      string,
      AnalysisReport,
      { constraints: string[]; priorities: string[]; desiredTechnology: string },
    ];
    expect(goal).toBe("Reduce auth debt");
    expect(report).toBe(mockAnalysisReport);
    expect(options.constraints).toEqual(["No new dependencies", "TypeScript only"]);
    expect(options.priorities).toEqual(["Security", "Performance"]);
    expect(options.desiredTechnology).toBe("PostgreSQL");
  });

  it("shows a loading state while generating", () => {
    reportState.value = mockAnalysisReport;
    const { promise } = deferred<{ plan: typeof mockPlan }>();
    generatePlanMock.mockReturnValue(promise);
    renderPlan();

    typeGoal("Reduce auth debt");
    fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));
    expect(screen.getByText("Generating plan…")).toBeInTheDocument();
  });

  it("shows an error state when the plan API fails", async () => {
    reportState.value = mockAnalysisReport;
    generatePlanMock.mockRejectedValue(
      new (class extends Error {
        status = 400;
      })("Invalid planning request: goal and deterministic report are required."),
    );
    renderPlan();

    typeGoal("Reduce auth debt");
    fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));

    expect(
      await screen.findByText("Invalid planning request: goal and deterministic report are required."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry" }),
    ).toBeInTheDocument();
  });

  it("renders the plan objective, validation, and task cards", async () => {
    reportState.value = mockAnalysisReport;
    generatePlanMock.mockResolvedValue({ plan: mockPlan });
    renderPlan();

    typeGoal("Reduce auth debt");
    fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));

    expect(
      await screen.findByText("Reduce technical debt in the authentication module"),
    ).toBeInTheDocument();
    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getAllByText("TASK-001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TASK-002").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Extract token verification into a dedicated service")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("src/auth.ts").length).toBeGreaterThan(0);
  });

  it("renders the ordered execution sequence", async () => {
    reportState.value = mockAnalysisReport;
    generatePlanMock.mockResolvedValue({ plan: mockPlan });
    renderPlan();

    typeGoal("Reduce auth debt");
    fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));

    expect(
      await screen.findByText("Execution Order"),
    ).toBeInTheDocument();
    const order = screen.getByText("Recommended task sequence").closest("div");
    expect(order).not.toBeNull();
  });
  it("renders every risk when one Doctor rule reports against several modules", async () => {
    // Regression: PlanRisk has no id, and planning.ts derives risks directly
    // from Doctor findings — so a rule firing against several modules produces
    // repeated titles. A real plan contained two "High fan-out module" risks,
    // which collided on `key={risk.title}` and made React drop one.
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    reportState.value = mockAnalysisReport;
    generatePlanMock.mockResolvedValue({
      plan: {
        ...mockPlan,
        risks: [
          {
            title: "High fan-out module",
            probability: "MEDIUM",
            impact: "HIGH",
            mitigation: "Split src/components/Character/Scene.tsx into focused modules.",
            evidence: [
              { file: "src/components/Character/Scene.tsx", detail: "imports 24 modules" },
            ],
          },
          {
            title: "High fan-out module",
            probability: "MEDIUM",
            impact: "HIGH",
            mitigation: "Split src/components/MainContainer.tsx into focused modules.",
            evidence: [
              { file: "src/components/MainContainer.tsx", detail: "imports 19 modules" },
            ],
          },
        ],
      },
    });
    renderPlan();

    typeGoal("Reduce coupling");
    fireEvent.click(screen.getByRole("button", { name: "Generate Plan" }));

    // Both risks survive — neither is deduplicated nor dropped.
    await vi.waitFor(() =>
      expect(screen.getAllByText("High fan-out module")).toHaveLength(2),
    );

    // Each keeps its own mitigation, proving they are separate nodes.
    expect(
      screen.getByText(/Split src\/components\/Character\/Scene\.tsx/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Split src\/components\/MainContainer\.tsx/),
    ).toBeInTheDocument();

    // And React raised no duplicate-key warning.
    const warnings = consoleError.mock.calls
      .map((args) => args.join(" "))
      .filter((message) => message.includes("same key"));
    expect(warnings).toEqual([]);

    consoleError.mockRestore();
  });
});
