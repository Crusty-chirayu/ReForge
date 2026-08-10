import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API client error handling", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("throws ApiError with status and error message on 400", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, { error: "Invalid request body" }),
    );
    const { getHealth } = await import("@/lib/api/client");
    const err = await getHealth().then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toBe("Invalid request body");
  });

  it("throws ApiError on 404", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: "Not found" }));
    const { getHealth } = await import("@/lib/api/client");
    const err = await getHealth().then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
  });

  it("throws ApiError on 503 (brain provider unconfigured path)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(503, { error: "Inference provider not configured" }),
    );
    const { getHealth } = await import("@/lib/api/client");
    const err = await getHealth().then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(503);
  });

  it("throws the raw error on network failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));
    const { getHealth } = await import("@/lib/api/client");
    await expect(getHealth()).rejects.toThrow("fetch failed");
  });

  it("returns parsed JSON on success", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: "ok", service: "reforge-analysis-engine" }),
    );
    const { getHealth } = await import("@/lib/api/client");
    const result = await getHealth();
    expect(result).toEqual({
      status: "ok",
      service: "reforge-analysis-engine",
    });
  });

  it("ApiError carries name, status, and body", () => {
    const apiError = new ApiError("Test error", 400, { details: "x" });
    expect(apiError.message).toBe("Test error");
    expect(apiError.status).toBe(400);
    expect(apiError.body).toEqual({ details: "x" });
    expect(apiError.name).toBe("ApiError");
  });
});
