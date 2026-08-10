"use client";

import { Radio, Terminal } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Mono } from "@/components/ui/mono";
import { ENDPOINT_INVENTORY } from "@/lib/api/endpoints";
import { useHealth } from "@/lib/query/use-health";

type BackendState = "checking" | "connected" | "offline";

function describe(state: BackendState): {
  label: string;
  variant: "running" | "healthy" | "failed";
} {
  switch (state) {
    case "connected":
      return { label: "CONNECTED", variant: "healthy" };
    case "offline":
      return { label: "OFFLINE", variant: "failed" };
    default:
      return { label: "CHECKING", variant: "running" };
  }
}

export default function HomePage() {
  const { data: health, isLoading, error } = useHealth();

  const state: BackendState = isLoading
    ? "checking"
    : health?.status === "ok"
      ? "connected"
      : "offline";

  const { label, variant } = describe(state);
  const probeError = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded border border-ink-border/60 bg-ink-card/60 px-6 py-10">
        <div
          aria-hidden="true"
          className="grid-overlay pointer-events-none absolute inset-0"
        />
        <div className="relative flex flex-col items-start gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-forge text-sm font-bold text-forge-fg shadow-glow-sm">
              R
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-fg">
              ReForge
            </h1>
          </div>
          <div className="max-w-2xl">
            <p className="text-sm leading-relaxed text-ink-muted">
              AI Engineering Intelligence — analyze, plan, impact-model, build,
              execute, and verify changes to your codebase. The frozen
              analysis engine is up; the console foundation is live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={variant}>{label}</StatusBadge>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
              backend · GET /health
            </span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Backend status */}
        <Card padding="lg" className="lg:col-span-2">
          <CardHeader
            title="Backend"
            subtitle="ReForge analysis engine liveness"
            action={<Radio size={15} className="text-steel" aria-hidden="true" />}
          />
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded border border-ink-border/40 bg-ink-1/40 px-3 py-2.5">
              <span className="text-xs text-ink-muted">Status</span>
              <StatusBadge variant={variant}>{label}</StatusBadge>
            </div>
            <div className="flex items-center justify-between rounded border border-ink-border/40 bg-ink-1/40 px-3 py-2.5">
              <span className="text-xs text-ink-muted">Service</span>
              <Mono>{health?.service ?? "—"}</Mono>
            </div>
            <div className="flex items-center justify-between rounded border border-ink-border/40 bg-ink-1/40 px-3 py-2.5">
              <span className="text-xs text-ink-muted">Probe</span>
              <Mono className="text-ink-fg">/health</Mono>
            </div>
            {probeError && (
              <p className="text-xs text-rose-400" role="alert">
                {probeError}
              </p>
            )}
          </div>
        </Card>

        {/* Health probe console */}
        <Card padding="lg" className="lg:col-span-3">
          <CardHeader
            title="Liveness Probe"
            subtitle="What the console receives when it pings the backend"
            action={<Terminal size={15} className="text-forge" aria-hidden="true" />}
          />
          <pre className="overflow-x-auto rounded border border-ink-border/40 bg-ink-0/70 p-4 font-mono text-xs leading-relaxed">
            <code>
              <span className="text-ink-subtle">$</span>{" "}
              <span className="text-ink-fg">curl -s</span>{" "}
              <span className="text-steel">http://127.0.0.1:3000/health</span>
              {"\n"}
              {state === "connected" ? (
                <>
                  <span className="text-emerald-400">→</span>{" "}
                  <span className="text-ink-muted">
                    {JSON.stringify(health)}
                  </span>
                </>
              ) : state === "offline" ? (
                <>
                  <span className="text-rose-400">→</span>{" "}
                  <span className="text-rose-400">
                    connection refused — backend unreachable
                  </span>
                </>
              ) : (
                <>
                  <span className="text-amber-400">→</span>{" "}
                  <span className="text-ink-muted">probing…</span>
                  <span className="caret-blink text-forge">▍</span>
                </>
              )}
            </code>
          </pre>
        </Card>
      </div>

      {/* API foundation inventory */}
      <Card padding="none">
        <CardHeader
          title="API Foundation"
          subtitle={`${ENDPOINT_INVENTORY.length} backend routes registered in the client`}
        />
        <div className="px-4 pb-4">
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {ENDPOINT_INVENTORY.map((ep) => (
              <div
                key={`${ep.method}-${ep.path}`}
                className="flex items-center gap-2 rounded border border-ink-border/30 bg-ink-1/30 px-2.5 py-1.5"
              >
                <span className="shrink-0 font-mono text-[9px] font-bold text-forge">
                  {ep.method}
                </span>
                <Mono className="truncate text-ink-fg">{ep.path}</Mono>
                <span className="ml-auto shrink-0 truncate text-[9px] text-ink-subtle">
                  {ep.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
