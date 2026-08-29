"use client";

import { useSyncExternalStore } from "react";
import type {
  BuildPlan,
  ChangeImpactReport,
  NoveltyAnalysis,
  Plan,
} from "@/lib/api/types";

// ─────────────────────────────────────────────────────────────────────────────
// Workflow context — shared, in-memory intelligence produced by the F4
// workflows (Plan / Novelty / Impact) and consumed by Build (F5).
//
// Deliberately in-memory only: nothing here is persisted to localStorage or
// sessionStorage, so no source code or derived project contents ever hit
// storage. Server snapshots are always "empty" to keep SSR/hydration
// consistent.
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowData {
  plan: Plan | null;
  impact: ChangeImpactReport | null;
  novelty: NoveltyAnalysis | null;
  build: BuildPlan | null;
}

const EMPTY: WorkflowData = {
  plan: null,
  impact: null,
  novelty: null,
  build: null,
};

let state: WorkflowData = { ...EMPTY };
let cached: WorkflowData | null = null;
const listeners = new Set<() => void>();

function snapshot(): WorkflowData {
  if (
    cached &&
    cached.plan === state.plan &&
    cached.impact === state.impact &&
    cached.novelty === state.novelty &&
    cached.build === state.build
  ) {
    return cached;
  }
  cached = { ...state };
  return cached;
}

function emit(): void {
  cached = null;
  for (const listener of listeners) listener();
}

export const workflowStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot(): WorkflowData {
    return snapshot();
  },
  getServerSnapshot(): WorkflowData {
    return EMPTY;
  },
  setPlan(plan: Plan): void {
    state = { ...state, plan };
    emit();
  },
  setImpact(impact: ChangeImpactReport): void {
    state = { ...state, impact };
    emit();
  },
  setNovelty(novelty: NoveltyAnalysis): void {
    state = { ...state, novelty };
    emit();
  },
  setBuild(build: BuildPlan): void {
    state = { ...state, build };
    emit();
  },
  clear(): void {
    state = { ...EMPTY };
    emit();
  },
};

export interface WorkflowContextValue extends WorkflowData {
  setPlan: (plan: Plan) => void;
  setImpact: (impact: ChangeImpactReport) => void;
  setNovelty: (novelty: NoveltyAnalysis) => void;
  setBuild: (build: BuildPlan) => void;
}

/** Read the shared workflow intelligence (Plan / Impact / Novelty / Build). */
export function useWorkflow(): WorkflowContextValue {
  const data = useSyncExternalStore(
    workflowStore.subscribe,
    workflowStore.getSnapshot,
    workflowStore.getServerSnapshot,
  );

  return {
    ...data,
    setPlan: workflowStore.setPlan,
    setImpact: workflowStore.setImpact,
    setNovelty: workflowStore.setNovelty,
    setBuild: workflowStore.setBuild,
  };
}

/** Reset the shared workflow intelligence (used by tests and "start over"). */
export function clearWorkflow(): void {
  workflowStore.clear();
}
