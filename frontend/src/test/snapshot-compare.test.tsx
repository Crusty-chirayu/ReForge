import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SnapshotComparePage from "@/app/snapshot/compare/[beforeId]/[afterId]/page";
import { ApiError } from "@/lib/api/client";
import { mockSnapshotDiff } from "./fixtures/snapshot";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { compareSnapshotsMock } = vi.hoisted(() => ({
  compareSnapshotsMock: vi.fn(),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  compareSnapshots: compareSnapshotsMock,
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

function resolvedParams(beforeId: string, afterId: string) {
  const value = { beforeId, afterId };
  const promise = Promise.resolve(value) as Promise<{
    beforeId: string;
    afterId: string;
  }> & { status: "fulfilled"; value: typeof value };
  promise.status = "fulfilled";
  promise.value = value;
  return promise;
}

function renderCompare(beforeId = "snap_before123", afterId = "snap_after456") {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, staleTime: 0, refetchInterval: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <SnapshotComparePage params={resolvedParams(beforeId, afterId)} />
    </QueryClientProvider>,
  );
}

describe("Snapshot comparison", () => {
  beforeEach(() => {
    compareSnapshotsMock.mockReset();
    pushMock.mockReset();
  });

  it("shows a loading state while fetching", () => {
    compareSnapshotsMock.mockReturnValue(new Promise(() => {}));
    renderCompare();
    expect(
      screen.getByRole("status", { name: "Loading snapshot comparison" }),
    ).toBeInTheDocument();
  });

  it("renders the comparison header with before/after IDs", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    expect(await screen.findByText("Snapshot Comparison")).toBeInTheDocument();
    expect(screen.getByText(/snap_before123/)).toBeInTheDocument();
    expect(screen.getByText(/snap_after456/)).toBeInTheDocument();
    expect(screen.getByText("Project Model Changed")).toBeInTheDocument();
  });

  it("renders diff summary counts for all change types", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    const summary = await screen.findByTestId("diff-summary");
    expect(within(summary).getByText("Created")).toBeInTheDocument();
    expect(within(summary).getAllByText("1").length).toBeGreaterThanOrEqual(3); // created / deleted / renamed
    expect(within(summary).getByText("Modified")).toBeInTheDocument();
    expect(within(summary).getByText("2")).toBeInTheDocument(); // modified
    expect(within(summary).getByText("Deleted")).toBeInTheDocument();
    expect(within(summary).getByText("Renamed")).toBeInTheDocument();
  });

  it("renders numeric byte deltas", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    expect(await screen.findByText(/\+1\.0 KB added/)).toBeInTheDocument();
    expect(screen.getByText(/−4\.0 KB deleted/)).toBeInTheDocument();
  });

  it("renders added files", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    expect(await screen.findByText("Added Files")).toBeInTheDocument();
    expect(screen.getByText("src/new-util.ts")).toBeInTheDocument();
  });

  it("renders removed files", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    expect(await screen.findByText("Removed Files")).toBeInTheDocument();
    expect(screen.getByText("src/legacy.ts")).toBeInTheDocument();
  });

  it("renders modified files with hash transitions", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    expect(await screen.findByText("Modified Files")).toBeInTheDocument();
    expect(screen.getByText("src/index.ts")).toBeInTheDocument();
    expect(screen.getByText(/hash-i… → hash-i…/)).toBeInTheDocument();
  });

  it("renders renamed files with from → to paths", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    expect(await screen.findByText("Renamed Files")).toBeInTheDocument();
    expect(screen.getByText("src/old-name.ts")).toBeInTheDocument();
    expect(screen.getByText("src/renamed.ts")).toBeInTheDocument();
  });

  it("renders dependency changes", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    expect(await screen.findByText("Dependency Changes")).toBeInTheDocument();
    expect(screen.getByText("dayjs")).toBeInTheDocument();
    expect(screen.getByText("moment")).toBeInTheDocument();
    expect(screen.getAllByText("react").length).toBeGreaterThan(0);
    expect(screen.getByText("VERSION_CHANGE")).toBeInTheDocument();
  });

  it("renders category distribution with before → after", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    expect(
      await screen.findByText("Category Distribution"),
    ).toBeInTheDocument();
    // The arrow renders inside an inline span, so match on full textContent.
    expect(
      screen.getByText((_, element) => element?.textContent === "3 → 3"),
    ).toBeInTheDocument();
    expect(screen.getByText("SOURCE")).toBeInTheDocument();
    expect(screen.getByText("CONFIG")).toBeInTheDocument();
  });

  it("shows a 404 state when snapshots are missing", async () => {
    compareSnapshotsMock.mockRejectedValue(
      new ApiError("One or both requested snapshots were not found.", 404),
    );
    renderCompare("snap_missing", "snap_after456");

    expect(await screen.findByText("Snapshots not found")).toBeInTheDocument();
    expect(
      screen.getByText(/One or both of the requested snapshots do not exist/),
    ).toBeInTheDocument();
  });

  it("shows an error state on API failure", async () => {
    compareSnapshotsMock.mockRejectedValue(new TypeError("fetch failed"));
    renderCompare();

    expect(
      await screen.findByText("Unable to compare snapshots"),
    ).toBeInTheDocument();
  });

  it("navigates back to the snapshots index", async () => {
    compareSnapshotsMock.mockResolvedValue({ diff: mockSnapshotDiff });
    renderCompare();

    await screen.findByText("Snapshot Comparison");
    const back = screen.getByRole("button", { name: "Snapshots" });
    back.click();
    expect(pushMock).toHaveBeenCalledWith("/snapshots");
  });
});
