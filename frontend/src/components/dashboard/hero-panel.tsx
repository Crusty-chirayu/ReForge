"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Radio, Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Mono } from "@/components/ui/mono";
import { useHealth } from "@/lib/query/use-health";
import { formatRelativeTime } from "@/lib/utils/format";
import type { ActivityEvent } from "@/lib/utils/activity";

export interface HeroPanelProps {
  latestActivity: ActivityEvent | null;
}

/**
 * Project overview hero — ReForge identity, backend liveness, latest real
 * activity, and primary actions (wired for the Analyze / Pipeline phases).
 */
export function HeroPanel({ latestActivity }: HeroPanelProps) {
  const router = useRouter();
  const { data: health, isLoading, refetch } = useHealth();

  const isHealthy = health?.status === "ok";
  const state = isLoading
    ? ("checking" as const)
    : isHealthy
      ? ("connected" as const)
      : ("offline" as const);

  const statusVariant =
    state === "connected"
      ? "healthy"
      : state === "offline"
        ? "failed"
        : "running";

  const statusLabel =
    state === "connected"
      ? "CONNECTED"
      : state === "offline"
        ? "OFFLINE"
        : "CHECKING";

  return (
    <section className="relative overflow-hidden rounded border border-ink-border/60 bg-ink-card/60 px-6 py-8">
      <div
        aria-hidden="true"
        className="grid-overlay pointer-events-none absolute inset-0"
      />
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-forge text-sm font-bold text-forge-fg shadow-glow-sm">
              R
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-fg">
                ReForge
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                AI Engineering Intelligence Console
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant={statusVariant}>{statusLabel}</StatusBadge>
            <Mono className="text-ink-muted">
              {health?.service ?? "reforge-analysis-engine"}
            </Mono>
          </div>
        </div>

        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          Deterministic analysis engine with AI-augmented engineering
          workflows — ingest archives and repositories, generate
          evidence-backed plans, model change impact, and drive pipelines from
          proposal to verified execution.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="forge"
            size="md"
            icon={<Search size={14} />}
            onClick={() => router.push("/analyze")}
          >
            Analyze Project
          </Button>
          <Button
            variant="steel"
            size="md"
            icon={<Zap size={14} />}
            onClick={() => router.push("/pipeline")}
          >
            Run Pipeline
          </Button>
          {latestActivity && (
            <span className="flex min-w-0 items-center gap-2 text-xs text-ink-muted">
              <Radio size={12} className="shrink-0 text-steel" />
              <span className="truncate">
                Latest activity:{" "}
                <span className="text-ink-fg">{latestActivity.label}</span>
                <span className="text-ink-subtle">
                  {" "}
                  · {formatRelativeTime(latestActivity.createdAt)}
                </span>
              </span>
            </span>
          )}
        </div>

        {state === "offline" && (
          <div
            role="alert"
            className="flex flex-wrap items-center gap-3 rounded border border-rose-500/25 bg-rose-500/5 px-3 py-2"
          >
            <AlertTriangle size={13} className="shrink-0 text-rose-400" />
            <p className="min-w-0 flex-1 text-xs text-ink-muted">
              Backend unreachable — GET /health failed. Data sections below may
              be unavailable.
            </p>
            <Button variant="ghost" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
