import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import AnalyzePage from "@/app/analyze/page";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { analyzeArchiveMock, analyzeRepositoryMock, setReportMock, pushMock } =
  vi.hoisted(() => ({
    analyzeArchiveMock: vi.fn(),
    analyzeRepositoryMock: vi.fn(),
    setReportMock: vi.fn(),
    pushMock: vi.fn(),
  }));

vi.mock("@/lib/api/client", () => ({
  analyzeArchive: analyzeArchiveMock,
  analyzeRepository: analyzeRepositoryMock,
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
    report: null,
    reportLoading: false,
    hasReport: false,
    setReport: setReportMock,
    clearReport: vi.fn(),
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function zipFile(name = "acme-app.zip"): File {
  return new File(["zip-content"], name, { type: "application/zip" });
}

function renderAnalyze() {
  return render(<AnalyzePage />);
}

async function selectZipFile(name?: string) {
  const input = screen.getByTestId("zip-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [zipFile(name)] } });
}

async function switchToGithub() {
  fireEvent.click(screen.getByRole("button", { name: "GitHub URL" }));
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Analyze page", () => {
  beforeEach(() => {
    analyzeArchiveMock.mockReset();
    analyzeRepositoryMock.mockReset();
    setReportMock.mockReset();
    pushMock.mockReset();
  });

  it("renders ZIP upload mode by default", () => {
    renderAnalyze();
    expect(screen.getByText("Drop a ZIP archive here, or browse")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select Archive" })).toBeInTheDocument();
    const input = screen.getByTestId("zip-input") as HTMLInputElement;
    expect(input.accept).toContain(".zip");
  });

  it("renders GitHub mode with repository URL input", () => {
    renderAnalyze();
    switchToGithub();
    expect(screen.getByLabelText("Repository URL")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("https://github.com/owner/repo"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Analyze Repository" }),
    ).toBeInTheDocument();
  });

  it("rejects a non-zip file with a validation error", async () => {
    renderAnalyze();
    const input = screen.getByTestId("zip-input") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
    });
    expect(
      await screen.findByText("Only .zip archives are accepted."),
    ).toBeInTheDocument();
  });

  it("disables submit while no input is provided", () => {
    renderAnalyze();
    const analyzeButton = screen.getByRole("button", { name: "Analyze Archive" });
    expect(analyzeButton).toBeDisabled();

    switchToGithub();
    expect(
      screen.getByRole("button", { name: "Analyze Repository" }),
    ).toBeDisabled();
  });

  it("calls analyzeArchive with the selected file and navigates to the report", async () => {
    analyzeArchiveMock.mockResolvedValue({ schemaVersion: "1.0" });
    renderAnalyze();
    await selectZipFile();
    fireEvent.click(screen.getByRole("button", { name: "Analyze Archive" }));

    await waitFor(() => expect(analyzeArchiveMock).toHaveBeenCalled());
    const [arg1, arg2] = analyzeArchiveMock.mock.calls[0] as [
      File,
      AbortSignal,
    ];
    expect(arg1.name).toBe("acme-app.zip");
    expect(arg2).toBeInstanceOf(AbortSignal);
    await waitFor(() => expect(setReportMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/analyze/report");
  });

  it("calls analyzeRepository with the URL and navigates to the report", async () => {
    analyzeRepositoryMock.mockResolvedValue({ schemaVersion: "1.0" });
    renderAnalyze();
    switchToGithub();
    fireEvent.change(screen.getByLabelText("Repository URL"), {
      target: { value: "https://github.com/vercel/next.js" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    await waitFor(() => expect(analyzeRepositoryMock).toHaveBeenCalled());
    const [url, signal] = analyzeRepositoryMock.mock.calls[0] as [
      string,
      AbortSignal,
    ];
    expect(url).toBe("https://github.com/vercel/next.js");
    expect(signal).toBeInstanceOf(AbortSignal);
    await waitFor(() => expect(setReportMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/analyze/report");
  });

  it("shows a loading state with stages, elapsed time, and cancel", async () => {
    const { promise } = deferred<{ schemaVersion: string }>();
    analyzeArchiveMock.mockReturnValue(promise);
    renderAnalyze();
    await selectZipFile();
    fireEvent.click(screen.getByRole("button", { name: "Analyze Archive" }));

    expect(await screen.findByText("Analyzing archive…")).toBeInTheDocument();
    expect(screen.getByText("INGEST")).toBeInTheDocument();
    expect(screen.getByText("REPORT")).toBeInTheDocument();
    expect(screen.getByText(/elapsed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByText(/acme-app\.zip/)).toBeInTheDocument();
  });

  it("shows a backend error message on API failure", async () => {
    analyzeArchiveMock.mockRejectedValue(
      new (class extends Error {
        status = 400;
      })("ZIP contains unsafe entries"),
    );
    renderAnalyze();
    await selectZipFile();
    fireEvent.click(screen.getByRole("button", { name: "Analyze Archive" }));

    expect(
      await screen.findByText("ZIP contains unsafe entries"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze Archive" })).toBeEnabled();
  });
});
