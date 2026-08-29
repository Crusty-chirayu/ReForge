import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AnalyzePage from "@/app/analyze/page";
import PipelineNewPage from "@/app/pipeline/new/page";
import SnapshotsPage from "@/app/snapshots/page";
import { MAX_ARCHIVE_BYTES } from "@/lib/utils/archive";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  analyzeArchiveMock,
  analyzeRepositoryMock,
  runPipelineMock,
  createSnapshotMock,
  getProjectHistoryMock,
  setReportMock,
  pushMock,
} = vi.hoisted(() => ({
  analyzeArchiveMock: vi.fn(),
  analyzeRepositoryMock: vi.fn(),
  runPipelineMock: vi.fn(),
  createSnapshotMock: vi.fn(),
  getProjectHistoryMock: vi.fn(),
  setReportMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  analyzeArchive: analyzeArchiveMock,
  analyzeRepository: analyzeRepositoryMock,
  runPipeline: runPipelineMock,
  createSnapshot: createSnapshotMock,
  getProjectHistory: getProjectHistoryMock,
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = "ApiError";
      this.status = status;
    }
  },
}));

vi.mock("@/lib/context/report-context", () => ({
  useReport: () => ({
    report: null,
    reportLoading: false,
    hasReport: false,
    setReport: setReportMock,
    clearReport: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/analyze",
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function bigZip(name: string, size: number): File {
  const file = new File(["zip"], name, { type: "application/zip" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function withQuery(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, retryDelay: 0, staleTime: 0, refetchInterval: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

// ── Analyze ───────────────────────────────────────────────────────────────────

describe("Analyze form hardening", () => {
  beforeEach(() => {
    analyzeArchiveMock.mockReset();
    analyzeRepositoryMock.mockReset();
    setReportMock.mockReset();
    pushMock.mockReset();
  });

  function selectFile(file: File) {
    fireEvent.change(screen.getByTestId("zip-input"), {
      target: { files: [file] },
    });
  }

  it("rejects an oversized archive before uploading it", () => {
    render(<AnalyzePage />);
    selectFile(bigZip("huge.zip", MAX_ARCHIVE_BYTES + 1));
    expect(screen.getByRole("alert")).toHaveTextContent(/larger than the 200 MB/i);
    expect(screen.getByRole("button", { name: "Analyze Archive" })).toBeDisabled();
    expect(analyzeArchiveMock).not.toHaveBeenCalled();
  });

  it("rejects an empty archive honestly", () => {
    render(<AnalyzePage />);
    selectFile(bigZip("empty.zip", 0));
    expect(screen.getByRole("alert")).toHaveTextContent(/empty/i);
  });

  it("does not retain a rejected file as if it were valid", () => {
    render(<AnalyzePage />);
    selectFile(bigZip("huge.zip", MAX_ARCHIVE_BYTES + 1));
    expect(screen.queryByText("huge.zip")).not.toBeInTheDocument();
  });

  it("validates a malformed repository URL client-side", async () => {
    render(<AnalyzePage />);
    fireEvent.click(screen.getByRole("button", { name: "GitHub URL" }));
    fireEvent.change(screen.getByLabelText("Repository URL"), {
      target: { value: "github.com/owner/repo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/full URL/i);
    expect(analyzeRepositoryMock).not.toHaveBeenCalled();
  });

  it("rejects a non-HTTPS repository URL", async () => {
    render(<AnalyzePage />);
    fireEvent.click(screen.getByRole("button", { name: "GitHub URL" }));
    fireEvent.change(screen.getByLabelText("Repository URL"), {
      target: { value: "http://github.com/owner/repo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/HTTPS/);
    expect(analyzeRepositoryMock).not.toHaveBeenCalled();
  });

  it("associates the validation error with the URL field", async () => {
    render(<AnalyzePage />);
    fireEvent.click(screen.getByRole("button", { name: "GitHub URL" }));
    fireEvent.change(screen.getByLabelText("Repository URL"), {
      target: { value: "nope" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    const input = await screen.findByLabelText("Repository URL");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "analyze-error");
    expect(document.getElementById("analyze-error")).not.toBeNull();
  });

  it("prevents a duplicate submission while an analysis is in flight", async () => {
    const { promise } = deferred<unknown>();
    analyzeArchiveMock.mockReturnValue(promise);
    render(<AnalyzePage />);
    selectFile(bigZip("acme.zip", 2048));

    fireEvent.click(screen.getByRole("button", { name: "Analyze Archive" }));
    await screen.findByText("Analyzing archive…");
    // The submit control is replaced by the running card — no second send.
    expect(
      screen.queryByRole("button", { name: "Analyze Archive" }),
    ).not.toBeInTheDocument();
    expect(analyzeArchiveMock).toHaveBeenCalledTimes(1);
  });

  it("resets the form back to a clean state after a failure", async () => {
    analyzeArchiveMock.mockRejectedValue(new Error("ZIP contains unsafe entries"));
    render(<AnalyzePage />);
    selectFile(bigZip("acme.zip", 2048));
    fireEvent.click(screen.getByRole("button", { name: "Analyze Archive" }));

    await screen.findByText("ZIP contains unsafe entries");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze Archive" })).toBeDisabled();
  });

  it("aborts the in-flight request when cancelled", async () => {
    const { promise } = deferred<unknown>();
    analyzeArchiveMock.mockReturnValue(promise);
    render(<AnalyzePage />);
    selectFile(bigZip("acme.zip", 2048));
    fireEvent.click(screen.getByRole("button", { name: "Analyze Archive" }));

    await screen.findByText("Analyzing archive…");
    const signal = analyzeArchiveMock.mock.calls[0]![1] as AbortSignal;
    expect(signal.aborted).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(signal.aborted).toBe(true);
    expect(
      screen.getByRole("button", { name: "Analyze Archive" }),
    ).toBeInTheDocument();
  });
});

// ── Pipeline ──────────────────────────────────────────────────────────────────

describe("Pipeline form hardening", () => {
  beforeEach(() => {
    runPipelineMock.mockReset();
    pushMock.mockReset();
  });

  function fill(goal = "Add authentication middleware") {
    fireEvent.change(screen.getByTestId("pipeline-zip-input"), {
      target: { files: [bigZip("acme.zip", 2048)] },
    });
    fireEvent.change(screen.getByLabelText("Pipeline Goal"), {
      target: { value: goal },
    });
  }

  it("rejects an oversized archive before submitting a run", () => {
    render(<PipelineNewPage />);
    fireEvent.change(screen.getByTestId("pipeline-zip-input"), {
      target: { files: [bigZip("huge.zip", MAX_ARCHIVE_BYTES + 1)] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/larger than the 200 MB/i);
    expect(runPipelineMock).not.toHaveBeenCalled();
  });

  it("keeps submit disabled until an archive and a goal are supplied", () => {
    render(<PipelineNewPage />);
    const submit = screen.getByRole("button", { name: "Generate Proposal" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByTestId("pipeline-zip-input"), {
      target: { files: [bigZip("acme.zip", 2048)] },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Pipeline Goal"), {
      target: { value: "Add caching" },
    });
    expect(submit).toBeEnabled();
  });

  it("refuses a whitespace-only goal", () => {
    render(<PipelineNewPage />);
    fireEvent.change(screen.getByTestId("pipeline-zip-input"), {
      target: { files: [bigZip("acme.zip", 2048)] },
    });
    fireEvent.change(screen.getByLabelText("Pipeline Goal"), {
      target: { value: "    " },
    });
    expect(screen.getByRole("button", { name: "Generate Proposal" })).toBeDisabled();
  });

  it("prevents duplicate pipeline submissions", async () => {
    const { promise } = deferred<unknown>();
    runPipelineMock.mockReturnValue(promise);
    render(<PipelineNewPage />);
    fill();

    const submit = screen.getByRole("button", { name: "Generate Proposal" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(runPipelineMock).toHaveBeenCalledTimes(1));
  });

  it("replaces the form with an explicit progress state while a run is in flight", async () => {
    const { promise } = deferred<unknown>();
    runPipelineMock.mockReturnValue(promise);
    render(<PipelineNewPage />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Generate Proposal" }));

    expect(
      await screen.findByText("Generating pipeline proposal…"),
    ).toBeInTheDocument();
    // The submit control is gone, so a second run cannot be started.
    expect(
      screen.queryByRole("button", { name: "Generate Proposal" }),
    ).not.toBeInTheDocument();
  });

  it("requires explicit confirmation before approved execution", () => {
    render(<PipelineNewPage />);
    fill();
    fireEvent.click(screen.getByRole("checkbox", { name: /Approved/ }));

    const submit = screen.getByRole("button", { name: "Approve & Execute" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByTestId("execution-confirm"));
    expect(submit).toBeEnabled();
  });

  it("restores a clean form when reset", () => {
    render(<PipelineNewPage />);
    fill("Add caching");
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByLabelText("Pipeline Goal")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Generate Proposal" })).toBeDisabled();
  });
});

// ── Snapshot upload ───────────────────────────────────────────────────────────

describe("Snapshot upload hardening", () => {
  beforeEach(() => {
    createSnapshotMock.mockReset();
    getProjectHistoryMock.mockReset();
    getProjectHistoryMock.mockResolvedValue({ history: [], limit: 50, count: 0 });
    pushMock.mockReset();
  });

  function openUpload() {
    fireEvent.click(screen.getByRole("button", { name: "New Snapshot" }));
  }

  it("applies the same archive limit as the rest of the console", async () => {
    withQuery(<SnapshotsPage />);
    openUpload();
    fireEvent.change(screen.getByTestId("snapshot-zip-input"), {
      target: { files: [bigZip("huge.zip", MAX_ARCHIVE_BYTES + 1)] },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /larger than the 200 MB/i,
    );
    expect(createSnapshotMock).not.toHaveBeenCalled();
  });

  it("prevents duplicate snapshot creation", async () => {
    const { promise } = deferred<unknown>();
    createSnapshotMock.mockReturnValue(promise);
    withQuery(<SnapshotsPage />);
    openUpload();
    fireEvent.change(screen.getByTestId("snapshot-zip-input"), {
      target: { files: [bigZip("acme.zip", 2048)] },
    });

    const submit = screen.getByRole("button", { name: "Create Snapshot" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(createSnapshotMock).toHaveBeenCalledTimes(1));
  });

  it("labels the hidden file input for assistive technology", () => {
    withQuery(<SnapshotsPage />);
    openUpload();
    expect(screen.getByLabelText("Snapshot ZIP archive")).toBeInTheDocument();
  });

  it("offers a clean path to creating another snapshot after success", async () => {
    createSnapshotMock.mockResolvedValue({
      snapshot: { snapshotId: "snap_new789" },
    });
    withQuery(<SnapshotsPage />);
    openUpload();
    fireEvent.change(screen.getByTestId("snapshot-zip-input"), {
      target: { files: [bigZip("acme.zip", 2048)] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Snapshot" }));

    await screen.findByText("Snapshot created");
    fireEvent.click(screen.getByRole("button", { name: "Create another" }));

    expect(screen.queryByText("Snapshot created")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Snapshot" })).toBeDisabled();
  });
});
