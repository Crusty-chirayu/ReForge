import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import PipelineNewPage from "@/app/pipeline/new/page";
import { mockPipelineResult } from "./fixtures/build";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { runPipelineMock } = vi.hoisted(() => ({
  runPipelineMock: vi.fn(),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("@/lib/api/client", () => ({
  runPipeline: runPipelineMock,
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

function renderPipeline() {
  return render(<PipelineNewPage />);
}

function selectZip(name = "acme-app.zip") {
  const input = screen.getByTestId("pipeline-zip-input") as HTMLInputElement;
  fireEvent.change(input, {
    target: { files: [new File(["zip"], name, { type: "application/zip" })] },
  });
}

function typeGoal(value: string) {
  fireEvent.change(screen.getByLabelText("Pipeline Goal"), {
    target: { value },
  });
}

function togglePolicy(label: string) {
  fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(label) }));
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

describe("Pipeline new workflow", () => {
  beforeEach(() => {
    runPipelineMock.mockReset();
    pushMock.mockReset();
  });

  it("renders the pipeline control surface", () => {
    renderPipeline();
    expect(
      screen.getByText("Pipeline Execution"),
    ).toBeInTheDocument();
    expect(screen.getByText("A · Source")).toBeInTheDocument();
    expect(screen.getByText("B · Goal")).toBeInTheDocument();
    expect(screen.getByText("C · Execution Policy")).toBeInTheDocument();
    expect(screen.getByText("Trust & Safety")).toBeInTheDocument();
  });

  it("accepts a ZIP archive selection", () => {
    renderPipeline();
    selectZip();
    expect(screen.getAllByText("acme-app.zip").length).toBeGreaterThan(0);
  });

  it("rejects a non-zip file", () => {
    renderPipeline();
    const input = screen.getByTestId("pipeline-zip-input") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
    });
    expect(
      screen.getByText(
        "Only .zip archives are accepted for pipeline execution.",
      ),
    ).toBeInTheDocument();
  });

  it("collects the pipeline goal", () => {
    renderPipeline();
    typeGoal("Add authentication middleware");
    expect(
      screen.getAllByText("Add authentication middleware").length,
    ).toBeGreaterThan(0);
  });

  it("defaults to proposal mode and disables submit without source or goal", () => {
    renderPipeline();
    expect(screen.getByText("Proposal Mode")).toBeInTheDocument();
    expect(screen.getByText("NO — proposal only")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "Generate Proposal" });
    expect(submit).toBeDisabled();

    selectZip();
    expect(submit).toBeDisabled();

    typeGoal("Add authentication middleware");
    expect(submit).toBeEnabled();
  });

  it("switches to execution mode when approved is enabled", () => {
    renderPipeline();
    togglePolicy("Approved");
    expect(screen.getByText("Execution Mode")).toBeInTheDocument();
    expect(screen.getByText("YES — apply patches")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Approve & Execute" }),
    ).toBeInTheDocument();
  });

  it("toggles allowDelete and verify in the review", () => {
    renderPipeline();
    togglePolicy("Allow Delete");
    expect(screen.getByText("ALLOW DELETE")).toBeInTheDocument();
    togglePolicy("Verify");
    expect(screen.getByText("ON")).toBeInTheDocument();
  });

  it("requires explicit confirmation before approved submission", () => {
    renderPipeline();
    togglePolicy("Approved");
    selectZip();
    typeGoal("Add authentication middleware");

    const submit = screen.getByRole("button", { name: "Approve & Execute" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByTestId("execution-confirm"));
    expect(submit).toBeEnabled();
  });

  it("sends the correct multipart request in proposal mode", async () => {
    runPipelineMock.mockResolvedValue({ pipeline: mockPipelineResult, result: mockPipelineResult });
    renderPipeline();
    selectZip();
    typeGoal("Add authentication middleware");
    fireEvent.click(screen.getByRole("button", { name: "Generate Proposal" }));

    await vi.waitFor(() => expect(runPipelineMock).toHaveBeenCalledTimes(1));
    const [file, payload, signal] = runPipelineMock.mock.calls[0] as [
      File,
      { goal: string; approved: boolean; allowDelete: boolean; verify: boolean },
      AbortSignal,
    ];
    expect(file.name).toBe("acme-app.zip");
    expect(payload).toEqual({
      goal: "Add authentication middleware",
      approved: false,
      allowDelete: false,
      verify: false,
    });
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("sends approved execution with allowDelete and verify flags", async () => {
    runPipelineMock.mockResolvedValue({ pipeline: mockPipelineResult, result: mockPipelineResult });
    renderPipeline();
    selectZip();
    typeGoal("Add authentication middleware");
    togglePolicy("Approved");
    togglePolicy("Allow Delete");
    togglePolicy("Verify");
    fireEvent.click(screen.getByTestId("execution-confirm"));
    fireEvent.click(screen.getByRole("button", { name: "Approve & Execute" }));

    await vi.waitFor(() => expect(runPipelineMock).toHaveBeenCalledTimes(1));
    const [, payload] = runPipelineMock.mock.calls[0] as [
      File,
      { goal: string; approved: boolean; allowDelete: boolean; verify: boolean },
    ];
    expect(payload).toEqual({
      goal: "Add authentication middleware",
      approved: true,
      allowDelete: true,
      verify: true,
    });
  });

  it("shows a loading state while submitting", () => {
    const { promise } = deferred<{ pipeline: typeof mockPipelineResult; result: typeof mockPipelineResult }>();
    runPipelineMock.mockReturnValue(promise);
    renderPipeline();
    selectZip();
    typeGoal("Add authentication middleware");
    fireEvent.click(screen.getByRole("button", { name: "Generate Proposal" }));
    expect(
      screen.getByText("Generating pipeline proposal…"),
    ).toBeInTheDocument();
  });

  it("shows an API error without hiding the failure", async () => {
    runPipelineMock.mockRejectedValue(
      new (class extends Error {
        status = 400;
      })("Invalid pipeline request: goal and approved are required."),
    );
    renderPipeline();
    selectZip();
    typeGoal("Add authentication middleware");
    fireEvent.click(screen.getByRole("button", { name: "Generate Proposal" }));

    expect(
      await screen.findByText("Invalid pipeline request: goal and approved are required."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Pipeline submission failed"),
    ).toBeInTheDocument();
    // The form is not stuck — submission can be retried.
    expect(
      screen.getByRole("button", { name: "Generate Proposal" }),
    ).toBeEnabled();
  });

  it("navigates to the pipeline detail page on success", async () => {
    runPipelineMock.mockResolvedValue({ pipeline: mockPipelineResult, result: mockPipelineResult });
    renderPipeline();
    selectZip();
    typeGoal("Add authentication middleware");
    fireEvent.click(screen.getByRole("button", { name: "Generate Proposal" }));

    await vi.waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/pipeline/pl_01F5ABC"),
    );
  });

  it("renders the trust and safety panel with verified safeguards", () => {
    renderPipeline();
    expect(screen.getByText("Disposable workspace")).toBeInTheDocument();
    expect(screen.getByText("No shell access")).toBeInTheDocument();
    expect(screen.getByText("Expected-hash checks")).toBeInTheDocument();
    expect(
      screen.getByText("Your host project files are never modified"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No npm installs or external package installation"),
    ).toBeInTheDocument();
  });
});
