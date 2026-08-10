import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PipelineDetailPage from "@/app/pipeline/[pipelineId]/page";
import { ApiError } from "@/lib/api/client";
import {
  mockPipelinePassed,
  mockPipelineProposal,
  mockPipelineRolledBack,
  mockPipelineVerifyFailed,
  mockPipelineVerifyTimeout,
} from "./fixtures/pipeline";
import type { PipelineResult } from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { getPipelineMock } = vi.hoisted(() => ({ getPipelineMock: vi.fn() }));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  getPipeline: getPipelineMock,
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

/**
 * Next.js passes page params as a Promise; React 19's `use()` suspends on a
 * plain promise. Pre-marking the thenable as fulfilled (React's own internal
 * mechanism) lets `use(params)` resolve synchronously in tests.
 */
function resolvedParams(pipelineId: string): Promise<{ pipelineId: string }> {
  const value = { pipelineId };
  const promise = Promise.resolve(value) as Promise<{ pipelineId: string }> & {
    status: "fulfilled";
    value: { pipelineId: string };
  };
  promise.status = "fulfilled";
  promise.value = value;
  return promise;
}

function renderDetail(pipelineId = "pl_01F6ABC") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, staleTime: 0, refetchInterval: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <PipelineDetailPage params={resolvedParams(pipelineId)} />
    </QueryClientProvider>,
  );
}

function respondWith(result: PipelineResult) {
  getPipelineMock.mockResolvedValue({ execution: result, result });
}

describe("Pipeline detail", () => {
  beforeEach(() => {
    getPipelineMock.mockReset();
    pushMock.mockReset();
  });

  it("shows a loading skeleton while fetching", () => {
    getPipelineMock.mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(
      screen.getByRole("status", { name: "Loading pipeline result" }),
    ).toBeInTheDocument();
  });

  it("renders a successful pipeline fetch", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();
    expect(
      await screen.findByText("Add authentication middleware"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("PASSED").length).toBeGreaterThan(0);
  });

  it("shows a 404 state when the pipeline does not exist", async () => {
    getPipelineMock.mockRejectedValue(
      new ApiError("Execution receipt not found.", 404),
    );
    renderDetail();
    expect(await screen.findByText("Pipeline not found")).toBeInTheDocument();
    expect(
      screen.getByText("The requested pipeline result does not exist (404)."),
    ).toBeInTheDocument();
  });

  it("shows a network error state when the backend is unreachable", async () => {
    getPipelineMock.mockRejectedValue(new TypeError("fetch failed"));
    renderDetail();
    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Ensure it is running on http:\/\/127.0.0.1:3000/),
    ).toBeInTheDocument();
  });

  it("renders header facts: IDs, approval, execution, verification, timestamps", async () => {
    respondWith(mockPipelinePassed);
    renderDetail("pl_01F6ABC");

    expect((await screen.findAllByText("pl_01F6ABC")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("snap_f6abc").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SUCCEEDED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PASSED").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SUCCESS").length).toBeGreaterThan(0);
  });

  it("renders the stage stepper with complete and not-executed states", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    const stepper = await screen.findByTestId("pipeline-stepper");
    expect(within(stepper).getByText("Ingested")).toBeInTheDocument();
    expect(within(stepper).getByText("Analyzed")).toBeInTheDocument();
    expect(within(stepper).getByText("Planned")).toBeInTheDocument();
    expect(within(stepper).getByText("Impact Evaluated")).toBeInTheDocument();
    expect(within(stepper).getByText("Build Proposed")).toBeInTheDocument();
    expect(within(stepper).getByText("Patches Applied")).toBeInTheDocument();
    expect(
      within(stepper).getByText("Verification Completed"),
    ).toBeInTheDocument();
  });

  it("renders the plan section with objective and tasks", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    expect(
      await screen.findByText("Reduce technical debt in the authentication module"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("TASK-001").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Extract token verification into a dedicated service")
        .length,
    ).toBeGreaterThan(0);
  });

  it("renders the impact section with level and blast radius", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    expect(await screen.findByText("HIGH Impact")).toBeInTheDocument();
    expect(screen.getByText("Blast Radius")).toBeInTheDocument();
  });

  it("renders build operations with distinct operation labels", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    expect(await screen.findByText("Build Plan")).toBeInTheDocument();
    expect(screen.getAllByText("CREATE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MODIFY").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DELETE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("RENAME").length).toBeGreaterThan(0);
    expect(screen.getAllByText("src/cache.ts").length).toBeGreaterThan(0);
    expect(screen.getByText("sha256:abc123")).toBeInTheDocument();
  });

  it("renders diff summary counts for CREATE/MODIFY/DELETE/RENAME", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    const diff = await screen.findByTestId("diff-summary");
    expect(within(diff).getByText("CREATE")).toBeInTheDocument();
    expect(within(diff).getByText("2")).toBeInTheDocument(); // 2 created
    expect(within(diff).getAllByText("1").length).toBeGreaterThanOrEqual(3); // modify / rename / delete
  });

  it("shows NOT EXECUTED for a proposal-mode pipeline without treating it as failure", async () => {
    respondWith(mockPipelineProposal);
    renderDetail("pl_01F6PROP");

    expect(
      await screen.findByText(/This pipeline ran in proposal mode/),
    ).toBeInTheDocument();
    // The execution header badge reads NOT EXECUTED.
    expect(screen.getAllByText("Not Executed").length).toBeGreaterThan(0);
  });

  it("renders the execution receipt with applied operations", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    expect(await screen.findByText("Execution Receipt")).toBeInTheDocument();
    expect(screen.getAllByText("exec_f6abc").length).toBeGreaterThan(0);
    expect(screen.getAllByText("src/orders.ts").length).toBeGreaterThan(0);
  });

  it("renders verification PASSED", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    expect(await screen.findByText("typecheck")).toBeInTheDocument();
    expect(screen.getAllByText("PASSED").length).toBeGreaterThan(0);
  });

  it("renders verification FAILED with stderr", async () => {
    respondWith(mockPipelineVerifyFailed);
    renderDetail();

    expect(
      await screen.findByText("src/orders.ts:14:3 - error TS2322"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("FAILED").length).toBeGreaterThan(0);
  });

  it("renders verification TIMEOUT", async () => {
    respondWith(mockPipelineVerifyTimeout);
    renderDetail();

    expect((await screen.findAllByText("TIMEOUT")).length).toBeGreaterThan(0);
    expect(
      screen.getByText("command exceeded 30s timeout"),
    ).toBeInTheDocument();
  });

  it("renders the rollback state when execution rolled back", async () => {
    respondWith(mockPipelineRolledBack);
    renderDetail();

    expect(
      await screen.findByText("Rollback Performed"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("ROLLED_BACK").length).toBeGreaterThan(0);
    expect(screen.getByText("expected hash mismatch")).toBeInTheDocument();
  });

  it("shows no-rollback-required when the receipt supports it", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    expect(
      await screen.findByText(/No rollback was required/),
    ).toBeInTheDocument();
  });

  it("renders provenance identifiers in the technical details section", async () => {
    respondWith(mockPipelinePassed);
    renderDetail("pl_01F6ABC");

    expect(
      await screen.findByText("Pipeline identifiers & timestamps"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("pl_01F6ABC").length).toBeGreaterThan(0);
    expect(screen.getAllByText("snap_f6abc").length).toBeGreaterThan(0);
    expect(screen.getAllByText("exec_f6abc").length).toBeGreaterThan(0);
  });

  it("refreshes by re-fetching the pipeline result", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    await screen.findByText("Add authentication middleware");
    expect(getPipelineMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await vi.waitFor(() => expect(getPipelineMock).toHaveBeenCalledTimes(2));
  });

  it("navigates back to the dashboard", async () => {
    respondWith(mockPipelinePassed);
    renderDetail();

    await screen.findByText("Add authentication middleware");
    fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("does not crash when optional sections are missing", async () => {
    const minimal: PipelineResult = {
      ...mockPipelinePassed,
      report: {
        ...mockPipelinePassed.report,
        languages: [],
        frameworks: [],
        risks: [],
        doctor: undefined,
        projectModel: undefined,
      },
      plan: {
        ...mockPipelinePassed.plan,
        tasks: [],
        orderedTaskIds: [],
        risks: [],
        assumptions: [],
        unresolvedQuestions: [],
      },
      impact: {
        ...mockPipelinePassed.impact,
        directModules: [],
        indirectModules: [],
        relationships: [],
        risks: [],
        recommendations: [],
        verification: [],
        evidence: [],
        assumptions: [],
      },
      build: {
        ...mockPipelinePassed.build,
        fileChanges: [],
        dependencyChanges: [],
        testChanges: [],
        risks: [],
        assumptions: [],
      },
      execution: {
        ...mockPipelinePassed.execution!,
        appliedOperations: [],
        operations: [],
        diffSummary: {
          created: [],
          modified: [],
          renamed: [],
          deleted: [],
          unchanged: [],
          failed: [],
        },
      },
    };
    respondWith(minimal);
    renderDetail();

    expect(
      await screen.findByText("Add authentication middleware"),
    ).toBeInTheDocument();
    expect(screen.getByText("No file operations proposed.")).toBeInTheDocument();
  });
});
