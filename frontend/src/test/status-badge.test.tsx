import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/ui/status-badge";

describe("StatusBadge", () => {
  it("renders healthy status with emerald styling", () => {
    render(<StatusBadge variant="healthy">Live</StatusBadge>);
    const badge = screen.getByText("Live");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("span")).toHaveClass("bg-emerald-500/15");
  });

  it("renders failed status with rose styling", () => {
    render(<StatusBadge variant="failed">Failed</StatusBadge>);
    const badge = screen.getByText("Failed");
    expect(badge).toBeInTheDocument();
    expect(badge.closest("span")).toHaveClass("bg-rose-500/15");
  });

  it("renders running status with pulse animation", () => {
    render(<StatusBadge variant="running">Running</StatusBadge>);
    const badge = screen.getByText("Running");
    expect(badge).toBeInTheDocument();
    const dot = badge.closest("span")?.querySelector("span");
    expect(dot).toHaveClass("pulse-dot");
  });

  it("renders succeeded status", () => {
    render(<StatusBadge variant="succeeded">Passed</StatusBadge>);
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("renders blocked status", () => {
    render(<StatusBadge variant="blocked">Blocked</StatusBadge>);
    expect(screen.getByText("Blocked")).toBeInTheDocument();
  });

  it("renders proposal status", () => {
    render(<StatusBadge variant="proposal">Proposed</StatusBadge>);
    expect(screen.getByText("Proposed")).toBeInTheDocument();
  });

  it("renders muted status", () => {
    render(<StatusBadge variant="muted">Idle</StatusBadge>);
    expect(screen.getByText("Idle")).toBeInTheDocument();
  });

  it("renders small size", () => {
    render(
      <StatusBadge variant="healthy" size="sm">
        Live
      </StatusBadge>,
    );
    const badge = screen.getByText("Live");
    expect(badge.closest("span")).toHaveClass("text-[10px]");
  });
});
