"use client";

import React, { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { RadioCard } from "@/components/ui/radio-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Mono } from "@/components/ui/mono";
import { useTheme } from "@/lib/theme";
import { Shield, Info } from "lucide-react";

export interface BrainStatus {
  configured: boolean;
  provider?: string;
  model?: string;
}

export interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ open, onClose }: SettingsDrawerProps) {
  const { theme, setTheme } = useTheme();
  const [density, setDensity] = useState<"dense" | "comfortable">("dense");
  const [brainStatus, setBrainStatus] = useState<BrainStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    if (open) {
      fetch("/v1/brain/status")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: BrainStatus | null) => {
          if (!ignore) {
            setBrainStatus(data);
            setStatusLoading(false);
          }
        })
        .catch(() => {
          if (!ignore) {
            setBrainStatus(null);
            setStatusLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [open]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Settings"
      description="Console preferences, environment telemetry, and AI engine status"
      width="md"
    >
      <div className="space-y-6 py-2">
        {/* Appearance / Theme */}
        <section className="space-y-2">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Interface Theme
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <RadioCard
              name="theme"
              value="dark"
              title="Dark"
              description="High contrast dark"
              checked={theme === "dark"}
              onChange={() => setTheme("dark")}
            />
            <RadioCard
              name="theme"
              value="light"
              title="Light"
              description="Calm warm paper"
              checked={theme === "light"}
              onChange={() => setTheme("light")}
            />
            <RadioCard
              name="theme"
              value="system"
              title="System"
              description="OS preference"
              checked={theme === "system"}
              onChange={() => setTheme("system")}
            />
          </div>
        </section>

        {/* Density */}
        <section className="space-y-2">
          <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
            Information Density
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <RadioCard
              name="density"
              value="dense"
              title="Dense"
              description="Instrument-grade 32px inputs"
              checked={density === "dense"}
              onChange={() => setDensity("dense")}
            />
            <RadioCard
              name="density"
              value="comfortable"
              title="Comfortable"
              description="Spacious 36px controls"
              checked={density === "comfortable"}
              onChange={() => setDensity("comfortable")}
            />
          </div>
        </section>

        {/* AI Provider Status */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Project Brain Engine
            </h3>
            {statusLoading ? (
              <span className="font-mono text-[10px] text-text-tertiary">Checking…</span>
            ) : brainStatus?.configured ? (
              <StatusBadge variant="healthy" size="sm">Configured</StatusBadge>
            ) : (
              <StatusBadge variant="warning" size="sm">Unconfigured</StatusBadge>
            )}
          </div>

          <div className="rounded-[4px] border border-border-subtle bg-bg-raised p-3 space-y-2 font-mono text-meta">
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Provider:</span>
              <span className="text-text-primary font-medium">
                {brainStatus?.provider ?? "None (503 Fallback)"}
              </span>
            </div>
            {brainStatus?.model && (
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">Active Model:</span>
                <span className="text-text-primary font-medium">{brainStatus.model}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-text-secondary">Fallback Mode:</span>
              <span className="text-text-primary">Deterministic Doctor</span>
            </div>
          </div>
        </section>

        {/* Telemetry / Privacy */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Shield size={13} className="text-accent" />
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Telemetry & Privacy
            </h3>
          </div>
          <div className="rounded-[4px] border border-border-subtle bg-bg-raised p-3 space-y-1 text-meta">
            <p className="font-medium text-text-primary">100% Local Execution</p>
            <p className="text-text-secondary text-[11px]">
              ReForge does not transmit telemetry, analytics, or repository content to any third party. All analysis and workspace executions remain on your machine.
            </p>
          </div>
        </section>

        {/* About */}
        <section className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Info size={13} className="text-text-tertiary" />
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-tertiary">
              Build Provenance
            </h3>
          </div>
          <div className="rounded-[4px] border border-border-subtle bg-bg-surface p-3 space-y-1.5 font-mono text-[11px] text-text-secondary">
            <div className="flex justify-between">
              <span>Frontend:</span>
              <span className="text-text-primary">v0.1.0-forge-ledger</span>
            </div>
            <div className="flex justify-between">
              <span>Backend Freeze:</span>
              <Mono className="text-text-primary">commit 0507a7e</Mono>
            </div>
            <div className="flex justify-between">
              <span>License:</span>
              <span className="text-text-primary">Apache-2.0</span>
            </div>
          </div>
        </section>

        <div className="pt-2">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Close Settings
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
