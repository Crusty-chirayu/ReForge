import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  describeApiError,
  isAbortError,
  isClientError,
  isNetworkError,
  isProviderUnavailable,
  retryPolicy,
  statusOf,
} from "@/lib/utils/api-error";
import {
  MAX_ARCHIVE_BYTES,
  MAX_ARCHIVE_LABEL,
  isZipFile,
  validateArchive,
  validateRepositoryUrl,
} from "@/lib/utils/archive";

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function response(status: number, body: string, contentType = "application/json"): Response {
  return new Response(body, { status, headers: { "Content-Type": contentType } });
}

function fileOf(name: string, size: number): File {
  const file = new File(["x"], name, { type: "application/zip" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

// ── Error classification ──────────────────────────────────────────────────────

describe("API error classification", () => {
  it("reads the status from an ApiError", () => {
    expect(statusOf(new ApiError("nope", 404))).toBe(404);
  });

  it("reports no status for a transport failure", () => {
    expect(statusOf(new TypeError("fetch failed"))).toBeNull();
    expect(isNetworkError(new TypeError("fetch failed"))).toBe(true);
  });

  it("does not treat an HTTP error as a network error", () => {
    expect(isNetworkError(new ApiError("bad", 400))).toBe(false);
  });

  it("recognizes aborts and excludes them from network errors", () => {
    const abort = new DOMException("aborted", "AbortError");
    expect(isAbortError(abort)).toBe(true);
    expect(isNetworkError(abort)).toBe(false);
  });

  it("identifies 503 as an unconfigured capability, not a user error", () => {
    expect(isProviderUnavailable(new ApiError("no provider", 503))).toBe(true);
    expect(isProviderUnavailable(new ApiError("bad input", 400))).toBe(false);
  });

  it("identifies 4xx as client errors", () => {
    expect(isClientError(new ApiError("bad", 400))).toBe(true);
    expect(isClientError(new ApiError("gone", 404))).toBe(true);
    expect(isClientError(new ApiError("boom", 500))).toBe(false);
  });
});

// ── Honest, actionable messaging ──────────────────────────────────────────────

describe("Error messaging", () => {
  it("explains an unreachable backend with a concrete remedy", () => {
    const { title, description } = describeApiError(new TypeError("fetch failed"));
    expect(title).toBe("Backend unavailable");
    expect(description).toMatch(/127\.0\.0\.1:3000/);
  });

  it("uses resource-specific copy for a 404", () => {
    const { title } = describeApiError(new ApiError("gone", 404), {
      resource: "pipeline",
    });
    expect(title).toBe("Pipeline not found");
  });

  it("honours an explicit 404 override", () => {
    const { title, description } = describeApiError(new ApiError("gone", 404), {
      notFoundTitle: "Snapshots not found",
      notFoundDescription: "Custom copy.",
    });
    expect(title).toBe("Snapshots not found");
    expect(description).toBe("Custom copy.");
  });

  it("states plainly that a 503 fabricated nothing", () => {
    const { description } = describeApiError(new ApiError("no provider", 503));
    expect(description).toMatch(/not configured/i);
    expect(description).toMatch(/fabricated/i);
  });

  it("distinguishes 400, 413, 429, and 5xx", () => {
    expect(describeApiError(new ApiError("x", 400)).title).toBe("Request rejected");
    expect(describeApiError(new ApiError("x", 413)).title).toBe("Archive too large");
    expect(describeApiError(new ApiError("x", 429)).title).toBe("Too many requests");
    expect(describeApiError(new ApiError("x", 500)).title).toBe("Backend error (500)");
  });

  it("never leaks a stack trace or filesystem path", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n  at /home/user/ReForge/src/server.ts:31:7";
    const { title, description } = describeApiError(err);
    expect(`${title} ${description}`).not.toContain("/home/user");
    expect(`${title} ${description}`).not.toContain("at ");
  });
});

// ── Retry policy ──────────────────────────────────────────────────────────────

describe("Retry policy", () => {
  it("never retries a definitive 4xx answer", () => {
    expect(retryPolicy(0, new ApiError("bad", 400))).toBe(false);
    expect(retryPolicy(0, new ApiError("gone", 404))).toBe(false);
  });

  it("retries a transport failure exactly once", () => {
    const err = new TypeError("fetch failed");
    expect(retryPolicy(0, err)).toBe(true);
    expect(retryPolicy(1, err)).toBe(false);
  });

  it("retries a 5xx once", () => {
    const err = new ApiError("boom", 500);
    expect(retryPolicy(0, err)).toBe(true);
    expect(retryPolicy(1, err)).toBe(false);
  });
});

// ── Client behaviour ──────────────────────────────────────────────────────────

describe("API client resilience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("rejects a 2xx response whose body is not JSON instead of faking success", async () => {
    fetchMock.mockResolvedValueOnce(
      response(200, "<!doctype html><html>proxy error</html>", "text/html"),
    );
    const { getHealth } = await import("@/lib/api/client");
    await expect(getHealth()).rejects.toBeInstanceOf(ApiError);
  });

  it("prefers the backend's own error message over a generic one", async () => {
    fetchMock.mockResolvedValueOnce(
      response(400, JSON.stringify({ error: "ZIP contains unsafe entries" })),
    );
    const { getHealth } = await import("@/lib/api/client");
    await expect(getHealth()).rejects.toThrow("ZIP contains unsafe entries");
  });

  it("falls back to a status message when the error body is unparseable", async () => {
    fetchMock.mockResolvedValueOnce(response(500, "not json", "text/plain"));
    const { getHealth } = await import("@/lib/api/client");
    const err = await getHealth().then(
      () => null,
      (e: unknown) => e as ApiError,
    );
    expect(err?.status).toBe(500);
    expect(err?.message).toBe("Request failed (500)");
  });

  it("treats an empty 200 body as an empty result, not a parse failure", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    const { getHealth } = await import("@/lib/api/client");
    await expect(getHealth()).resolves.toBeNull();
  });

  it("propagates an abort so callers can ignore cancelled work", async () => {
    fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    const { analyzeRepository } = await import("@/lib/api/client");
    const err = await analyzeRepository("https://github.com/a/b").then(
      () => null,
      (e: unknown) => e,
    );
    expect(isAbortError(err)).toBe(true);
  });
});

// ── Archive validation ────────────────────────────────────────────────────────

describe("Archive validation", () => {
  it("accepts a normal .zip", () => {
    expect(validateArchive(fileOf("acme.zip", 1024))).toBeNull();
  });

  it("rejects a non-zip extension", () => {
    expect(validateArchive(fileOf("notes.txt", 10))).toBe(
      "Only .zip archives are accepted.",
    );
  });

  it("supports a surface-specific extension message", () => {
    expect(
      validateArchive(fileOf("notes.txt", 10), {
        extensionMessage: "Only .zip archives are accepted for pipeline execution.",
      }),
    ).toBe("Only .zip archives are accepted for pipeline execution.");
  });

  it("rejects an empty archive honestly", () => {
    expect(validateArchive(fileOf("empty.zip", 0))).toMatch(/empty/i);
  });

  it("rejects an archive beyond the backend limit and names the limit", () => {
    const problem = validateArchive(fileOf("huge.zip", MAX_ARCHIVE_BYTES + 1));
    expect(problem).toContain(MAX_ARCHIVE_LABEL);
  });

  it("accepts an archive exactly at the limit", () => {
    expect(validateArchive(fileOf("edge.zip", MAX_ARCHIVE_BYTES))).toBeNull();
  });

  it("matches the extension case-insensitively", () => {
    expect(isZipFile("Acme.ZIP")).toBe(true);
    expect(isZipFile("acme.zip.txt")).toBe(false);
  });
});

describe("Repository URL validation", () => {
  it("accepts an https URL", () => {
    expect(validateRepositoryUrl("https://github.com/vercel/next.js")).toBeNull();
  });

  it("rejects an empty value", () => {
    expect(validateRepositoryUrl("   ")).toBe("Enter a repository URL.");
  });

  it("rejects a malformed URL", () => {
    expect(validateRepositoryUrl("github.com/a/b")).toMatch(/full URL/i);
  });

  it("rejects a non-https scheme", () => {
    expect(validateRepositoryUrl("http://github.com/a/b")).toMatch(/HTTPS/);
  });
});
