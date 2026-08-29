import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DashboardPage from "@/app/page";
import type {
  PipelineExecutionSummary,
  ProjectHistoryItem,
} from "@/lib/api/types";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  getHealthMock,
  getProjectHistoryMock,
  getPipelineHistoryMock,
} = vi.hoisted(() => ({
  getHealthMock: vi.fn(),
  getProjectHistoryMock: vi.fn(),
  getPipelineHistoryMock: vi.fn(),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  getHealth: getHealthMock,
  getProjectHistory: getProjectHistoryMock,
  getPipelineHistory: getPipelineHistoryMock,
  getPipeline: vi.fn(),
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

// ── Fixtures (realistic backend shapes) ───────────────────────────────────────

const now = Date.now();

const PROJECT_HISTORY: ProjectHistoryItem[] = [
  {
    snapshotId: "snap_A1b2C3d4E5f6G7h8",
    pipelineId: "pl_01J2XYZ",
    createdAt: new Date(now - 60_000).toISOString(),
    fileCount: 42,
    dependencyFingerprint: "dep-fp-abc123",
    projectModelFingerprint: "model-fp-def456",
    verificationStatus: "PASSED",
  },
  {
    snapshotId: "snap_H8g7F6e5D4c3B2a1",
    createdAt: new Date(now - 3_600_000).toISOString(),
    fileCount: 17,
    projectModelFingerprint: "model-fp-xyz789",
  },
];

const PIPELINE_HISTORY: PipelineExecutionSummary[] = [
  {
    pipelineId: "pl_01J2XYZ",
    goal: "Add authentication middleware",
    status: "PASSED",
    snapshotId: "snap_A1b2C3d4E5f6G7h8",
    approved: true,
    appliedPatchCount: 3,
    verificationStatus: "PASSED",
    createdAt: new Date(now - 60_000).toISOString(),
    completedAt: new Date(now - 30_000).toISOString(),
  },
  {
    pipelineId: "pl_02QWERTY",
    goal: "Migrate storage layer",
    status: "FAILED",
    snapshotId: "snap_H8g7F6e5D4c3B2a1",
    approved: false,
    appliedPatchCount: 0,
    verificationStatus: "FAILED",
    createdAt: new Date(now - 3_600_000).toISOString(),
    completedAt: new Date(now - 3_500_000).toISOString(),
  },
];

function projectResponse(items: ProjectHistoryItem[]) {
  return { history: items, limit: 20, count: items.length };
}

function pipelineResponse(items: PipelineExecutionSummary[]) {
  return { history: items, limit: 50, count: items.length };
}

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, staleTime: 0, refetchInterval: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

function seedConnectedData() {
  getHealthMock.mockResolvedValue({
    status: "ok",
    service: "reforge-analysis-engine",
  });
  getProjectHistoryMock.mockResolvedValue(projectResponse(PROJECT_HISTORY));
  getPipelineHistoryMock.mockResolvedValue(pipelineResponse(PIPELINE_HISTORY));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ReForge Dashboard", () => {
  beforeEach(() => {
    getHealthMock.mockReset();
    getProjectHistoryMock.mockReset();
    getPipelineHistoryMock.mockReset();
    pushMock.mockReset();
  });

  it("renders loading skeletons while data is pending", () => {
    getHealthMock.mockReturnValue(new Promise(() => {}));
    getProjectHistoryMock.mockReturnValue(new Promise(() => {}));
    getPipelineHistoryMock.mockReturnValue(new Promise(() => {}));

    renderDashboard();

    expect(screen.getByText("CHECKING")).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading project history" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading pipeline history" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "Loading overview statistics" }),
    ).toBeInTheDocument();
  });

  it("renders a populated dashboard from backend data", async () => {
    seedConnectedData();
    renderDashboard();

    expect((await screen.findAllByText("CONNECTED")).length).toBeGreaterThan(0);

    // Overview stats (derived values)
    await screen.findByTestId("overview-stats");
    expect(within(screen.getByTestId("stat-snapshots")).getByText("2")).toBeInTheDocument();
    expect(
      within(screen.getByTestId("stat-files-tracked")).getByText("59"),
    ).toBeInTheDocument(); // 42 + 17
    expect(
      within(screen.getByTestId("stat-pipeline-runs")).getByText("2"),
    ).toBeInTheDocument();
    expect(within(screen.getByTestId("stat-passed")).getByText("1")).toBeInTheDocument();
    expect(within(screen.getByTestId("stat-failed")).getByText("1")).toBeInTheDocument();

    // Project history rows
    const projectSection = within(screen.getByTestId("project-history-section"));
    expect(
      projectSection.getByText(/snap_A1b2C3d4E/),
    ).toBeInTheDocument();
    expect(projectSection.getByText("42")).toBeInTheDocument();
    expect(projectSection.getByText("model-fp-def456")).toBeInTheDocument();
    expect(projectSection.getAllByText("PASSED").length).toBeGreaterThan(0);

    // Pipeline history rows
    const pipelineSection = within(
      screen.getByTestId("pipeline-history-section"),
    );
    expect(
      pipelineSection.getByText("Add authentication middleware"),
    ).toBeInTheDocument();
    expect(pipelineSection.getByText("Migrate storage layer")).toBeInTheDocument();
    expect(pipelineSection.getByText("pl_01J2XYZ")).toBeInTheDocument();
    expect(pipelineSection.getByText("YES")).toBeInTheDocument();
    expect(pipelineSection.getAllByText("NO").length).toBe(1);
    expect(pipelineSection.getByText("3")).toBeInTheDocument();

    // Recent activity feed derived from real data
    expect(screen.getByTestId("recent-activity")).toBeInTheDocument();
  });

  it("renders empty states when the backend has no data", async () => {
    getHealthMock.mockResolvedValue({
      status: "ok",
      service: "reforge-analysis-engine",
    });
    getProjectHistoryMock.mockResolvedValue(projectResponse([]));
    getPipelineHistoryMock.mockResolvedValue(pipelineResponse([]));

    renderDashboard();

    expect(await screen.findByText("No snapshots yet")).toBeInTheDocument();
    expect(screen.getByText("No pipelines yet")).toBeInTheDocument();
    expect(screen.queryByTestId("recent-activity")).not.toBeInTheDocument();
  });

  it("renders error states when the history APIs fail", async () => {
    getHealthMock.mockResolvedValue({
      status: "ok",
      service: "reforge-analysis-engine",
    });
    getProjectHistoryMock.mockRejectedValue(new Error("boom project"));
    getPipelineHistoryMock.mockRejectedValue(new Error("boom pipeline"));

    renderDashboard();

    expect(
      await screen.findByText("Unable to load project history"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Unable to load pipeline history"),
    ).toBeInTheDocument();
    expect(screen.getByText("boom project")).toBeInTheDocument();
    expect(screen.getByText("boom pipeline")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(2);
  });

  it("renders pipeline history details", async () => {
    seedConnectedData();
    renderDashboard();

    const pipelineSection = within(
      screen.getByTestId("pipeline-history-section"),
    );
    expect(
      await pipelineSection.findByText("Add authentication middleware"),
    ).toBeInTheDocument();
    expect(pipelineSection.getByText("pl_01J2XYZ")).toBeInTheDocument();
    expect(pipelineSection.getByText("YES")).toBeInTheDocument();
    expect(pipelineSection.getByText("3")).toBeInTheDocument();
    expect(pipelineSection.getAllByText("PASSED").length).toBeGreaterThan(0);
    expect(pipelineSection.getAllByText("FAILED").length).toBeGreaterThan(0);
  });

  it("renders project history details", async () => {
    seedConnectedData();
    renderDashboard();

    const projectSection = within(
      screen.getByTestId("project-history-section"),
    );
    expect(await projectSection.findByText(/snap_A1b2C3d4E/)).toBeInTheDocument();
    expect(projectSection.getByText("pl_01J2XYZ")).toBeInTheDocument();
    expect(projectSection.getByText("42")).toBeInTheDocument();
    expect(projectSection.getByText("model-fp-def456")).toBeInTheDocument();
    expect(projectSection.getByText("model-fp-xyz789")).toBeInTheDocument();
  });

  it("navigates to pipeline detail when a pipeline row is clicked", async () => {
    seedConnectedData();
    renderDashboard();

    const row = await screen.findByRole("button", {
      name: "View pipeline pl_01J2XYZ",
    });
    fireEvent.click(row);

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/pipeline/pl_01J2XYZ"),
    );
  });

  it("navigates to snapshot detail when a snapshot row is clicked", async () => {
    seedConnectedData();
    renderDashboard();

    const row = await screen.findByRole("button", {
      name: "View snapshot snap_A1b2C3d4E5f6G7h8",
    });
    fireEvent.click(row);

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/snapshot/snap_A1b2C3d4E5f6G7h8"),
    );
  });

  it("shows offline state when the health check fails", async () => {
    getHealthMock.mockRejectedValue(new TypeError("fetch failed"));
    getProjectHistoryMock.mockResolvedValue(projectResponse([]));
    getPipelineHistoryMock.mockResolvedValue(pipelineResponse([]));

    renderDashboard();

    expect((await screen.findAllByText("OFFLINE")).length).toBeGreaterThan(0);
    expect(
      await screen.findByText(/Backend unreachable/),
    ).toBeInTheDocument();
  });
});
