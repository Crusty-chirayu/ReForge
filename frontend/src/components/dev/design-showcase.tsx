"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StateRail } from "@/components/ui/state-rail";
import { SeverityBadge } from "@/components/ui/severity-badge";
import { DiffViewer } from "@/components/ui/diff-viewer";
import { FactInferenceBlock } from "@/components/ui/fact-inference-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { Mono } from "@/components/ui/mono";

export interface DesignShowcaseProps {
  open: boolean;
  onClose: () => void;
}

const SAMPLE_DIFF = `--- a/src/auth/session.ts
+++ b/src/auth/session.ts
@@ -10,6 +10,12 @@ export interface Session {
   userId: string;
   expiresAt: number;
+  roles: string[];
+  deviceId?: string;
 }

-export function createSession(userId: string): Session {
-  return { userId, expiresAt: Date.now() + 3600000 };
+export function createSession(userId: string, roles: string[] = []): Session {
+  return {
+    userId,
+    expiresAt: Date.now() + 3600000,
+    roles,
+  };
 }`;

export function DesignShowcase({ open, onClose }: DesignShowcaseProps) {
  const [activeTab, setActiveTab] = useState<"primitives" | "staterail" | "diff" | "typography">("primitives");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Forge Ledger — Design System Showcase"
      description="Interactive component matrix, signature State Rail variants, and diff engine"
      maxWidth="xl"
    >
      <div className="space-y-6 py-2">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 border-b border-border-subtle pb-2 font-mono text-meta">
          <button
            type="button"
            onClick={() => setActiveTab("primitives")}
            className={`rounded px-2.5 py-1 transition-colors ${
              activeTab === "primitives"
                ? "bg-accent-subtle text-accent font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            UI Primitives
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staterail")}
            className={`rounded px-2.5 py-1 transition-colors ${
              activeTab === "staterail"
                ? "bg-accent-subtle text-accent font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            State Rail Matrix
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("diff")}
            className={`rounded px-2.5 py-1 transition-colors ${
              activeTab === "diff"
                ? "bg-accent-subtle text-accent font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Diff Engine
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("typography")}
            className={`rounded px-2.5 py-1 transition-colors ${
              activeTab === "typography"
                ? "bg-accent-subtle text-accent font-semibold"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Typography & Tokens
          </button>
        </div>

        {/* Tab 1: UI Primitives */}
        {activeTab === "primitives" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h4 className="font-mono text-meta font-semibold uppercase tracking-wider text-text-tertiary">
                Button Variants × Sizes
              </h4>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">Primary SM</Button>
                <Button variant="primary" size="md">Primary MD</Button>
                <Button variant="secondary" size="md">Secondary</Button>
                <Button variant="ghost" size="md">Ghost</Button>
                <Button variant="danger" size="md">Danger</Button>
                <Button variant="primary" size="md" disabled>Disabled</Button>
                <Button variant="primary" size="md" loading>Loading</Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-mono text-meta font-semibold uppercase tracking-wider text-text-tertiary">
                Severity Badges (Color + Shape)
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity="CRITICAL" />
                <SeverityBadge severity="HIGH" />
                <SeverityBadge severity="MEDIUM" />
                <SeverityBadge severity="LOW" />
                <SeverityBadge severity="INFO" />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-mono text-meta font-semibold uppercase tracking-wider text-text-tertiary">
                Status Badges
              </h4>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant="healthy">healthy</StatusBadge>
                <StatusBadge variant="warning">warning</StatusBadge>
                <StatusBadge variant="failed">failed</StatusBadge>
                <StatusBadge variant="proposal">proposal</StatusBadge>
                <StatusBadge variant="info">info</StatusBadge>
                <StatusBadge variant="succeeded">succeeded</StatusBadge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-mono text-meta font-semibold uppercase tracking-wider text-text-tertiary">
                Fact vs Inference Separation
              </h4>
              <div className="space-y-2">
                <FactInferenceBlock
                  type="fact"
                  statement="Project contains 42 source files analyzed across TypeScript and JavaScript modules."
                  confidence="HIGH"
                  evidence={[{ file: "src/server.ts", detail: "Fastify application entry point" }]}
                />
                <FactInferenceBlock
                  type="inference"
                  statement="Authentication middleware should likely be migrated before updating session storage."
                  confidence="MEDIUM"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: State Rail Matrix */}
        {activeTab === "staterail" && (
          <div className="space-y-6">
            <p className="text-meta text-text-secondary">
              Core UX law: Proposed, Approved, Executed, and Verified are distinct states and never look alike.
            </p>
            <div className="space-y-4 rounded-[6px] border border-border-subtle bg-bg-surface p-4">
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-tertiary">1. Proposed</span>
                <StateRail state="proposed" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-tertiary">2. Approved</span>
                <StateRail state="approved" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-tertiary">3. Executing</span>
                <StateRail state="executing" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-tertiary">4. Executed</span>
                <StateRail state="executed" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-tertiary">5. Verifying</span>
                <StateRail state="verifying" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-tertiary">6. Verified</span>
                <StateRail state="verified" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-tertiary">7. Failed</span>
                <StateRail state="failed" />
              </div>
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-tertiary">8. Rolled Back</span>
                <StateRail state="rolled_back" />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Diff Engine */}
        {activeTab === "diff" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-meta font-semibold uppercase tracking-wider text-text-tertiary">
                POSIX Unified Diff Viewer with Hunk Navigation
              </h4>
              <Mono className="text-text-secondary">src/auth/session.ts</Mono>
            </div>
            <DiffViewer diffText={SAMPLE_DIFF} filePath="src/auth/session.ts" />
          </div>
        )}

        {/* Tab 4: Typography & Tokens */}
        {activeTab === "typography" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[4px] border border-border-subtle bg-bg-raised p-3 space-y-1">
                <p className="font-mono text-[10px] uppercase text-text-tertiary">UI Typography</p>
                <p className="text-h2-dense font-semibold text-text-primary">Geist Sans UI</p>
                <p className="text-body text-text-secondary">
                  The quick brown fox jumps over the lazy dog. Instrument-grade typography tuned for information density.
                </p>
              </div>
              <div className="rounded-[4px] border border-border-subtle bg-bg-raised p-3 space-y-1">
                <p className="font-mono text-[10px] uppercase text-text-tertiary">Evidence & Code</p>
                <p className="font-mono text-h3-dense font-semibold text-text-primary">Geist Mono</p>
                <p className="font-mono text-meta text-text-secondary">
                  sha256: 01f6abc89de... | 1,234,567.89 ops/sec
                </p>
              </div>
            </div>

            <div className="rounded-[4px] border border-border-subtle bg-bg-surface p-3 space-y-2">
              <p className="font-mono text-[10px] uppercase text-text-tertiary">Palette Elevation Tokens</p>
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                <div className="rounded bg-bg-canvas border border-border-subtle p-2 text-text-primary">bg-canvas</div>
                <div className="rounded bg-bg-surface border border-border-subtle p-2 text-text-primary">bg-surface</div>
                <div className="rounded bg-bg-raised border border-border-subtle p-2 text-text-primary">bg-raised</div>
                <div className="rounded bg-bg-overlay border border-border-subtle p-2 text-text-primary">bg-overlay</div>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close Showcase
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
