"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { AnalysisReport } from "@/lib/api/types";

// ─────────────────────────────────────────────────────────────────────────────
// Analysis report store.
//
// The report produced by /analyze is kept in an external store so it survives
// client-side navigation to /analyze/report and the next-step workflows. A
// sessionStorage fallback preserves it across a same-tab reload. SessionStorage
// is per-tab and cleared when the tab closes — analysis reports are never
// persisted to localStorage.
//
// `useSyncExternalStore` with a distinct server snapshot keeps SSR/hydration
// consistent: the server renders the "loading" snapshot and the client swaps
// to the hydrated snapshot after mount.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "reforge-report";

interface ReportSnapshot {
  report: AnalysisReport | null;
  status: "loading" | "ready";
}

const SERVER_SNAPSHOT: ReportSnapshot = { report: null, status: "loading" };

function readStoredReport(): AnalysisReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnalysisReport;
    return parsed && parsed.schemaVersion === "1.0" ? parsed : null;
  } catch {
    return null;
  }
}

let storedReport: AnalysisReport | null = null;
let initialized = false;
let cachedSnapshot: ReportSnapshot | null = null;
const listeners = new Set<() => void>();

function getSnapshot(): ReportSnapshot {
  if (!initialized) {
    initialized = true;
    storedReport = readStoredReport();
  }
  if (cachedSnapshot && cachedSnapshot.report === storedReport) {
    return cachedSnapshot;
  }
  cachedSnapshot = { report: storedReport, status: "ready" };
  return cachedSnapshot;
}

function emit(): void {
  cachedSnapshot = null;
  for (const listener of listeners) listener();
}

export const reportStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot,
  getServerSnapshot(): ReportSnapshot {
    return SERVER_SNAPSHOT;
  },
  set(next: AnalysisReport): void {
    storedReport = next;
    initialized = true;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (quota/private mode) — keep in memory only.
    }
    emit();
  },
  clear(): void {
    storedReport = null;
    initialized = true;
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    emit();
  },
};

interface ReportContextValue {
  report: AnalysisReport | null;
  reportLoading: boolean;
  hasReport: boolean;
  setReport: (report: AnalysisReport) => void;
  clearReport: () => void;
}

const ReportContext = createContext<ReportContextValue | null>(null);

export function ReportProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    reportStore.subscribe,
    reportStore.getSnapshot,
    reportStore.getServerSnapshot,
  );

  const report = snapshot.report;
  const reportLoading = snapshot.status === "loading";

  const setReport = useCallback((next: AnalysisReport) => {
    reportStore.set(next);
  }, []);

  const clearReport = useCallback(() => {
    reportStore.clear();
  }, []);

  const value = useMemo(
    () => ({ report, reportLoading, hasReport: report !== null, setReport, clearReport }),
    [report, reportLoading, setReport, clearReport],
  );

  return (
    <ReportContext.Provider value={value}>{children}</ReportContext.Provider>
  );
}

export function useReport(): ReportContextValue {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error("useReport must be used within ReportProvider");
  }
  return context;
}
