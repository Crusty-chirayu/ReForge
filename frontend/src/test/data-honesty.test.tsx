import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/page";
import PipelineDetailPage from "@/app/pipeline/[pipelineId]/page";
import SnapshotDetailPage from "@/app/snapshot/[snapshotId]/page";
import SnapshotComparePage from "@/app/snapshot/compare/[beforeId]/[afterId]/page";
import { ApiError } from "@/lib/api/client";
import { mockPipelinePassed } from "./fixtures/pipeline";
import type { ProjectHistoryItem } from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  getHealthMock,
  getProjectHistoryMock,
  getPipelineHistoryMock,
  getPipelineMock,
  getSnapshotMock,
  getSnapshotIntelligenceMock,
  compareSnapshotsMock,
} = vi.hoisted(() => ({
  getHealthMock: vi.fn(),
  getProjectHistoryMock: vi.fn(),
  getPipelineHistoryMock: vi.fn(),
  getPipelineMock: vi.fn(),
  getSnapshotMock: vi.fn(),
  getSnapshotIntelligenceMock: vi.fn(),
  compareSnapshotsMock: vi.fn(),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/api/client")>("@/lib/api/client");
  return {
    ApiError: actual.ApiError,
    getHealth: getHealthMock,
    getProjectHistory: getProjectHistoryMock,
    getPipelineHistory: getPipelineHistoryMock,
    getPipeline: getPipelineMock,
    getSnapshot: getSnapshotMock,
    getSnapshotIntelligence: getSnapshotIntelligenceMock,
    compareSnapshots: compareSnapshotsMock,
    createSnapshot: vi.fn(),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/",
}));

/**
 * Next.js passes page params as a Promise and React 19's `use()` suspends on a
 * pending thenable. Pre-marking it fulfilled lets `use(params)` resolve
 * synchronously so these tests assert on rendered output, not a fallback.
 */
function resolvedParams<T extends object>(value: T): Promise<T> {
  const promise = Promise.resolve(value) as unknown as Promise<T> & {
    status: "fulfilled";
    value: T;
  };
  promise.status = "fulfilled";
  promise.value = value;
  return promise;
}

function withQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, staleTime: 0, refetchInterval: false },
    },
  });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** Text that must never appear — it would imply invented project facts. */
const FABRICATION_MARKERS = [
  /lorem ipsum/i,
  /example\.com/i,
  /placeholder/i,
  /dummy/i,
  /sample data/i,
  /john doe/i,
  /foo\.bar/i,
];

function expectNoFabrication() {
  const text = document.body.textContent ?? "";
  for (const marker of FABRICATION_MARKERS) {
    expect(text, `matched ${marker}`).not.toMatch(marker);
  }
}

// ── Empty backend → honest empty states ───────────────────────────────────────

describe("Dashboard with an empty backend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHealthMock.mockResolvedValue({ status: "ok", service: "reforge" });
  });

  it("shows empty states rather than invented statistics", async () => {
    getProjectHistoryMock.mockResolvedValue({ history: [], limit: 20, count: 0 });
    getPipelineHistoryMock.mockResolvedValue({ history: [], limit: 50, count: 0 });
    withQuery(<DashboardPage />);

    expect(await screen.findByText("No snapshots yet")).toBeInTheDocument();
    expect(screen.getByText("No pipelines yet")).toBeInTheDocument();
    expectNoFabrication();
  });

  it("omits the activity feed entirely when there is no activity", async () => {
    getProjectHistoryMock.mockResolvedValue({ history: [], limit: 20, count: 0 });
    getPipelineHistoryMock.mockResolvedValue({ history: [], limit: 50, count: 0 });
    withQuery(<DashboardPage />);

    await screen.findByText("No snapshots yet");
    expect(screen.queryByTestId("recent-activity")).not.toBeInTheDocument();
  });

  it("does not invent verification status for a snapshot that has none", async () => {
    const item: ProjectHistoryItem = {
      snapshotId: "snap_no_verify",
      createdAt: new Date().toISOString(),
      fileCount: 3,
      // verificationStatus and pipelineId are deliberately absent.
    };
    getProjectHistoryMock.mockResolvedValue({
      history: [item],
      limit: 20,
      count: 1,
    });
    getPipelineHistoryMock.mockResolvedValue({ history: [], limit: 50, count: 0 });
    withQuery(<DashboardPage />);

    await screen.findAllByText(/snap_no_verify/);
    for (const status of ["PASSED", "FAILED", "BLOCKED", "ERROR"]) {
      expect(screen.queryByText(status)).not.toBeInTheDocument();
    }
  });
});

// ── Deep links to missing data ────────────────────────────────────────────────

describe("Deep-link safety for dynamic routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHealthMock.mockResolvedValue({ status: "ok", service: "reforge" });
  });

  it("a pipeline deep link that 404s offers a real recovery path", async () => {
    getPipelineMock.mockRejectedValue(new ApiError("Not found.", 404));
    withQuery(
      <PipelineDetailPage params={resolvedParams({ pipelineId: "pl_missing" })} />,
    );

    expect(await screen.findByText("Pipeline not found")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pipeline History" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Start a new run" }),
    ).toBeInTheDocument();
    expectNoFabrication();
  });

  it("a pipeline deep link renders no result sections when the fetch fails", async () => {
    getPipelineMock.mockRejectedValue(new ApiError("Not found.", 404));
    withQuery(
      <PipelineDetailPage params={resolvedParams({ pipelineId: "pl_missing" })} />,
    );

    await screen.findByText("Pipeline not found");
    // No invented verification / execution outcome may be shown.
    expect(screen.queryByText("Verification")).not.toBeInTheDocument();
    expect(screen.queryByText("Execution")).not.toBeInTheDocument();
  });

  it("an unreachable backend is reported as such, not as a missing pipeline", async () => {
    getPipelineMock.mockRejectedValue(new TypeError("fetch failed"));
    withQuery(
      <PipelineDetailPage params={resolvedParams({ pipelineId: "pl_1" })} />,
    );

    expect(await screen.findByText("Backend unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Pipeline not found")).not.toBeInTheDocument();
  });

  it("a snapshot deep link that 404s routes back to the explorer", async () => {
    getSnapshotMock.mockRejectedValue(new ApiError("Snapshot not found.", 404));
    getSnapshotIntelligenceMock.mockRejectedValue(
      new ApiError("Snapshot not found.", 404),
    );
    withQuery(
      <SnapshotDetailPage params={resolvedParams({ snapshotId: "snap_missing" })} />,
    );

    expect(await screen.findByText("Snapshot not found")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Snapshots" })).toBeInTheDocument();
  });

  it("a comparison deep link that 404s explains which side is missing", async () => {
    compareSnapshotsMock.mockRejectedValue(
      new ApiError("One or both requested snapshots were not found.", 404),
    );
    withQuery(
      <SnapshotComparePage
        params={resolvedParams({ beforeId: "snap_a", afterId: "snap_b" })}
      />,
    );

    expect(await screen.findByText("Snapshots not found")).toBeInTheDocument();
    expect(
      screen.getByText(/One or both of the requested snapshots do not exist/),
    ).toBeInTheDocument();
  });

  it("renders a real pipeline result straight from a deep link", async () => {
    getPipelineMock.mockResolvedValue({ result: mockPipelinePassed });
    withQuery(
      <PipelineDetailPage
        params={resolvedParams({ pipelineId: mockPipelinePassed.pipelineId })}
      />,
    );

    expect(await screen.findByText("Pipeline Result")).toBeInTheDocument();
    expect(screen.getByText(mockPipelinePassed.goal)).toBeInTheDocument();
    expectNoFabrication();
  });
});

// ── Optional-field honesty ────────────────────────────────────────────────────

describe("Optional backend fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHealthMock.mockResolvedValue({ status: "ok", service: "reforge" });
  });

  it("never presents a fabricated verification outcome when none was recorded", async () => {
    const noVerification = {
      ...mockPipelinePassed,
      execution: {
        ...mockPipelinePassed.execution,
        verification: undefined,
      },
    };
    getPipelineMock.mockResolvedValue({ result: noVerification });
    withQuery(
      <PipelineDetailPage
        params={resolvedParams({ pipelineId: noVerification.pipelineId })}
      />,
    );

    await screen.findByText("Pipeline Result");
    expect(screen.getAllByText(/Not run/i).length).toBeGreaterThan(0);
    expectNoFabrication();
  });
});
