import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import HomePage from "@/app/page";

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function renderHome() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, refetchInterval: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <HomePage />
    </QueryClientProvider>,
  );
}

function healthResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Home page backend health", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("shows CONNECTED when GET /health returns ok", async () => {
    fetchMock.mockResolvedValue(
      healthResponse({ status: "ok", service: "reforge-analysis-engine" }),
    );
    renderHome();
    const badges = await screen.findAllByText("CONNECTED");
    expect(badges.length).toBeGreaterThan(0);
    expect(screen.getAllByText("reforge-analysis-engine").length).toBeGreaterThan(0);
  });

  it("shows OFFLINE when GET /health fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    renderHome();
    const badges = await screen.findAllByText("OFFLINE");
    expect(badges.length).toBeGreaterThan(0);
  });
});
