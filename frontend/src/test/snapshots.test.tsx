import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SnapshotsPage from "@/app/snapshots/page";
import { mockProjectHistory } from "./fixtures/snapshot";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { getProjectHistoryMock, createSnapshotMock } = vi.hoisted(() => ({
  getProjectHistoryMock: vi.fn(),
  createSnapshotMock: vi.fn(),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  getProjectHistory: getProjectHistoryMock,
  createSnapshot: createSnapshotMock,
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

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, staleTime: 0, refetchInterval: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <SnapshotsPage />
    </QueryClientProvider>,
  );
}

function seedHistory() {
  getProjectHistoryMock.mockResolvedValue({
    history: mockProjectHistory,
    limit: 50,
    count: mockProjectHistory.length,
  });
}

function zipFile(name = "acme-app.zip"): File {
  return new File(["zip"], name, { type: "application/zip" });
}

function openUpload() {
  fireEvent.click(screen.getByRole("button", { name: "New Snapshot" }));
}

/** React 19 + jsdom: controlled <select> needs the native value setter + change event. */
function setSelect(testId: string, value: string) {
  const select = screen.getByTestId(testId) as HTMLSelectElement;
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLSelectElement.prototype,
    "value",
  )?.set;
  setter?.call(select, value);
  fireEvent.change(select);
}

function selectFile(name?: string) {
  const input = screen.getByTestId("snapshot-zip-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [zipFile(name)] } });
}

describe("Snapshots index", () => {
  beforeEach(() => {
    getProjectHistoryMock.mockReset();
    createSnapshotMock.mockReset();
    pushMock.mockReset();
  });

  it("shows a loading state while fetching history", () => {
    getProjectHistoryMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(
      screen.getByRole("status", { name: "Loading snapshots" }),
    ).toBeInTheDocument();
  });

  it("renders a populated snapshot list", async () => {
    seedHistory();
    renderPage();

    expect((await screen.findAllByText(/snap_after456/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/snap_before123/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/4 files/).length).toBeGreaterThan(0);
    expect(screen.getByText("PASSED")).toBeInTheDocument();
  });

  it("renders an empty state when there is no history", async () => {
    getProjectHistoryMock.mockResolvedValue({ history: [], limit: 50, count: 0 });
    renderPage();
    expect(await screen.findByText("No snapshots yet")).toBeInTheDocument();
  });

  it("renders an error state when history fails", async () => {
    getProjectHistoryMock.mockRejectedValue(new Error("backend down"));
    renderPage();
    expect(
      await screen.findByText("Unable to load snapshots"),
    ).toBeInTheDocument();
    expect(screen.getByText("backend down")).toBeInTheDocument();
  });

  it("navigates to snapshot detail when a row is clicked", async () => {
    seedHistory();
    renderPage();

    const row = await screen.findByRole("button", {
      name: "View snapshot snap_after456",
    });
    fireEvent.click(row);
    expect(pushMock).toHaveBeenCalledWith("/snapshot/snap_after456");
  });

  it("validates against comparing a snapshot with itself", async () => {
    seedHistory();
    renderPage();

    await screen.findAllByText(/snap_after456/);
    setSelect("compare-before", "snap_after456");
    setSelect("compare-after", "snap_after456");

    expect(
      await screen.findByText(
        "Before and After must be different snapshots.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare" })).toBeDisabled();
  });

  it("navigates to the comparison page for distinct snapshots", async () => {
    seedHistory();
    renderPage();

    await screen.findAllByText(/snap_before123/);
    setSelect("compare-before", "snap_before123");
    setSelect("compare-after", "snap_after456");

    fireEvent.click(await screen.findByRole("button", { name: "Compare" }));
    expect(pushMock).toHaveBeenCalledWith(
      "/snapshot/compare/snap_before123/snap_after456",
    );
  });

  it("rejects a non-zip upload file", async () => {
    seedHistory();
    renderPage();
    openUpload();
    selectFile("notes.txt");
    expect(
      await screen.findByText("Only .zip archives are accepted."),
    ).toBeInTheDocument();
  });

  it("creates a snapshot on successful upload", async () => {
    seedHistory();
    createSnapshotMock.mockResolvedValue({
      snapshot: {
        snapshotId: "snap_new789",
        provenance: { source: { kind: "archive", reference: "acme-app.zip" } },
      },
    });
    renderPage();
    openUpload();
    selectFile();
    fireEvent.click(screen.getByRole("button", { name: "Create Snapshot" }));

    expect(await screen.findByText("Snapshot created")).toBeInTheDocument();
    expect(screen.getByText("snap_new789")).toBeInTheDocument();
    expect(createSnapshotMock).toHaveBeenCalledTimes(1);
    const [arg] = createSnapshotMock.mock.calls[0] as [File];
    expect(arg.name).toBe("acme-app.zip");
  });

  it("navigates to the created snapshot detail", async () => {
    seedHistory();
    createSnapshotMock.mockResolvedValue({
      snapshot: {
        snapshotId: "snap_new789",
        provenance: { source: { kind: "archive" } },
      },
    });
    renderPage();
    openUpload();
    selectFile();
    fireEvent.click(screen.getByRole("button", { name: "Create Snapshot" }));
    await screen.findByText("Snapshot created");

    fireEvent.click(screen.getByRole("button", { name: "View Snapshot" }));
    expect(pushMock).toHaveBeenCalledWith("/snapshot/snap_new789");
  });

  it("shows an API error on failed upload", async () => {
    seedHistory();
    createSnapshotMock.mockRejectedValue(
      new (class extends Error {
        status = 400;
      })("ZIP contains unsafe entries"),
    );
    renderPage();
    openUpload();
    selectFile();
    fireEvent.click(screen.getByRole("button", { name: "Create Snapshot" }));

    expect(
      await screen.findByText("ZIP contains unsafe entries"),
    ).toBeInTheDocument();
  });
});
