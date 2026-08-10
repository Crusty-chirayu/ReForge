import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SnapshotDetailPage from "@/app/snapshot/[snapshotId]/page";
import { ApiError } from "@/lib/api/client";
import {
  mockIntelligence,
  mockIntelligenceEmpty,
  mockSnapshotAfter,
} from "./fixtures/snapshot";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { getSnapshotMock, getSnapshotIntelligenceMock } = vi.hoisted(() => ({
  getSnapshotMock: vi.fn(),
  getSnapshotIntelligenceMock: vi.fn(),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  getSnapshot: getSnapshotMock,
  getSnapshotIntelligence: getSnapshotIntelligenceMock,
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

/** React 19 `use(params)` requires a pre-fulfilled thenable in tests. */
function resolvedParams(snapshotId: string): Promise<{ snapshotId: string }> {
  const value = { snapshotId };
  const promise = Promise.resolve(value) as Promise<{ snapshotId: string }> & {
    status: "fulfilled";
    value: { snapshotId: string };
  };
  promise.status = "fulfilled";
  promise.value = value;
  return promise;
}

function renderDetail(snapshotId = "snap_after456") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, staleTime: 0, refetchInterval: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <SnapshotDetailPage params={resolvedParams(snapshotId)} />
    </QueryClientProvider>,
  );
}

function seedSnapshot() {
  getSnapshotMock.mockResolvedValue({ snapshot: mockSnapshotAfter });
  getSnapshotIntelligenceMock.mockResolvedValue({ intelligence: mockIntelligence });
}

describe("Snapshot detail", () => {
  beforeEach(() => {
    getSnapshotMock.mockReset();
    getSnapshotIntelligenceMock.mockReset();
    pushMock.mockReset();
  });

  it("shows a loading state while fetching", () => {
    getSnapshotMock.mockReturnValue(new Promise(() => {}));
    renderDetail();
    expect(
      screen.getByRole("status", { name: "Loading snapshot" }),
    ).toBeInTheDocument();
  });

  it("renders the snapshot overview", async () => {
    seedSnapshot();
    renderDetail();

    expect(await screen.findByText("Snapshot Details")).toBeInTheDocument();
    expect(screen.getByText("archive")).toBeInTheDocument();
    expect(screen.getByText("acme-app.zip")).toBeInTheDocument();
    expect(screen.getByText(/4 files captured/)).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();
    expect(screen.getByText("19.0.0")).toBeInTheDocument();
  });

  it("shows a 404 state when the snapshot does not exist", async () => {
    getSnapshotMock.mockRejectedValue(new ApiError("Snapshot not found.", 404));
    getSnapshotIntelligenceMock.mockRejectedValue(
      new ApiError("Snapshot not found.", 404),
    );
    renderDetail("snap_missing");
    expect(await screen.findByText("Snapshot not found")).toBeInTheDocument();
    expect(
      screen.getByText("The requested snapshot does not exist (404)."),
    ).toBeInTheDocument();
  });

  it("renders intelligence when the tab is opened", async () => {
    seedSnapshot();
    renderDetail();

    fireEvent.click(await screen.findByRole("button", { name: /Intelligence/ }));

    expect(await screen.findByTestId("intelligence-section")).toBeInTheDocument();
    expect(screen.getByText("Churn Summary")).toBeInTheDocument();
    expect(screen.getByText("Architecture Drift")).toBeInTheDocument();
    expect(screen.getByText("Detected")).toBeInTheDocument();
    expect(screen.getByText("src/index.ts")).toBeInTheDocument();
  });

  it("renders an intelligence empty state when no history exists", async () => {
    getSnapshotMock.mockResolvedValue({ snapshot: mockSnapshotAfter });
    getSnapshotIntelligenceMock.mockResolvedValue({
      intelligence: mockIntelligenceEmpty,
    });
    renderDetail();

    fireEvent.click(await screen.findByRole("button", { name: /Intelligence/ }));

    expect(
      await screen.findByText("Not Detected"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This is the only snapshot in history/),
    ).toBeInTheDocument();
  });

  it("renders an intelligence error state", async () => {
    getSnapshotMock.mockResolvedValue({ snapshot: mockSnapshotAfter });
    getSnapshotIntelligenceMock.mockRejectedValue(new Error("intel failed"));
    renderDetail();

    fireEvent.click(await screen.findByRole("button", { name: /Intelligence/ }));

    expect(
      await screen.findByText("Unable to load snapshot intelligence"),
    ).toBeInTheDocument();
    expect(screen.getByText("intel failed")).toBeInTheDocument();
  });

  it("navigates back to the snapshots index", async () => {
    seedSnapshot();
    renderDetail();

    await screen.findByText("Snapshot Details");
    fireEvent.click(screen.getByRole("button", { name: "Snapshots" }));
    expect(pushMock).toHaveBeenCalledWith("/snapshots");
  });

  it("navigates to the compare selector", async () => {
    seedSnapshot();
    renderDetail();

    await screen.findByText("Snapshot Details");
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(pushMock).toHaveBeenCalledWith("/snapshots");
  });
});
