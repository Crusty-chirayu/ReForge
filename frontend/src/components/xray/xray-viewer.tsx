"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Layers,
  Folder,
  FileCode,
  ArrowRight,
  Table as TableIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { GraphCanvas, type GraphNode, type GraphEdge } from "@/components/ui/graph-canvas";
import { formatBytes } from "@/lib/utils/format";
import type { ProjectModel, DoctorFinding } from "@/lib/api/types";

export interface XRayViewerProps {
  model?: ProjectModel;
  doctorFindings?: DoctorFinding[];
  className?: string;
}

export function XRayViewer({
  model,
  doctorFindings = [],
  className = "",
}: XRayViewerProps) {
  const [viewMode, setViewMode] = useState<"graph" | "tree" | "matrix">("graph");
  const [search, setSearch] = useState("");
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [neighborLimit, setNeighborLimit] = useState<number>(12);
  const [matrixPage, setMatrixPage] = useState<number>(0);
  const [matrixPageSize, setMatrixPageSize] = useState<number>(15);

  const modules = useMemo(() => model?.modules ?? [], [model]);
  const files = useMemo(() => model?.files ?? [], [model]);

  // Default selected module
  const activeModuleId = selectedModuleId ?? modules[0]?.id ?? null;
  const activeModule = useMemo(
    () => modules.find((m) => m.id === activeModuleId) ?? modules[0] ?? null,
    [modules, activeModuleId],
  );

  // Compute metrics for active module
  const moduleMetrics = useMemo(() => {
    if (!activeModule) return null;

    // Fan-out: number of modules this module imports
    const dependencies = activeModule.imports
      .map((imp) => imp.target ?? imp.specifier)
      .filter(Boolean);

    // Fan-in: number of other modules that import this module
    const dependents = modules
      .filter((m) =>
        m.id !== activeModule.id &&
        m.imports.some((imp) => (imp.target ?? imp.specifier) === activeModule.id),
      )
      .map((m) => m.id);

    const fanOut = dependencies.length;
    const fanIn = dependents.length;
    const total = fanIn + fanOut;
    const coupling = total > 0 ? (fanOut / total).toFixed(2) : "0.00";

    // Related doctor findings
    const relatedFindings = doctorFindings.filter((f) =>
      f.affectedModules?.includes(activeModule.id) ||
      f.affectedFiles?.some((af) => af.includes(activeModule.id)),
    );

    return {
      fanIn,
      fanOut,
      coupling,
      dependencies,
      dependents,
      relatedFindings,
    };
  }, [activeModule, modules, doctorFindings]);

  // Graph nodes & edges for Focus Graph (depth 1 neighborhood around active module)
  const { graphNodes, graphEdges } = useMemo(() => {
    if (!activeModule || !moduleMetrics) return { graphNodes: [], graphEdges: [] };

    const nodeMap = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];

    // Center node
    nodeMap.set(activeModule.id, {
      id: activeModule.id,
      label: activeModule.id.split("/").pop() ?? activeModule.id,
      type: "module",
      isCenter: true,
      fanIn: moduleMetrics.fanIn,
      fanOut: moduleMetrics.fanOut,
    });

    const depList =
      neighborLimit > 0
        ? moduleMetrics.dependencies.slice(0, neighborLimit)
        : moduleMetrics.dependencies;

    const dependentList =
      neighborLimit > 0
        ? moduleMetrics.dependents.slice(0, neighborLimit)
        : moduleMetrics.dependents;

    // Dependencies (outbound)
    depList.forEach((depId) => {
      if (!nodeMap.has(depId)) {
        nodeMap.set(depId, {
          id: depId,
          label: depId.split("/").pop() ?? depId,
          type: "module",
        });
      }
      edges.push({
        from: activeModule.id,
        to: depId,
        type: "IMPORTS",
      });
    });

    // Dependents (inbound)
    dependentList.forEach((depId) => {
      if (!nodeMap.has(depId)) {
        nodeMap.set(depId, {
          id: depId,
          label: depId.split("/").pop() ?? depId,
          type: "module",
        });
      }
      edges.push({
        from: depId,
        to: activeModule.id,
        type: "DEPENDS_ON",
      });
    });

    return {
      graphNodes: Array.from(nodeMap.values()),
      graphEdges: edges,
    };
  }, [activeModule, moduleMetrics, neighborLimit]);

  // Filtered files for Tree view
  const filteredFiles = useMemo(() => {
    return files.filter((f) => {
      if (search && !f.path.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (categoryFilter !== "ALL" && f.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [files, search, categoryFilter]);

  if (!model) {
    return (
      <div className={`rounded-[6px] border border-border-subtle bg-bg-surface p-8 text-center font-mono text-meta text-text-tertiary ${className}`}>
        No project model available. Ingest a project to enable Project X-Ray.
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* View Switcher & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border-subtle bg-bg-surface p-2.5">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded border border-border-default bg-bg-raised p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("graph")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-meta font-medium transition-colors ${
              viewMode === "graph"
                ? "bg-bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Layers size={13} aria-hidden="true" />
            <span>Focus Graph</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("tree")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-meta font-medium transition-colors ${
              viewMode === "tree"
                ? "bg-bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Folder size={13} aria-hidden="true" />
            <span>Structure Tree</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("matrix")}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-meta font-medium transition-colors ${
              viewMode === "matrix"
                ? "bg-bg-surface text-text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <TableIcon size={13} aria-hidden="true" />
            <span>Coupling Matrix</span>
          </button>
        </div>

        {/* Search & Module filter */}
        <div className="flex items-center gap-2">
          <div className="w-56">
            <Input
              placeholder="Filter modules or files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={13} />}
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-[4px] border border-border-default bg-bg-surface px-2 text-meta text-text-primary outline-none"
            aria-label="Filter file category"
          >
            <option value="ALL">All Categories</option>
            <option value="SOURCE">Source</option>
            <option value="TEST">Tests</option>
            <option value="CONFIG">Config</option>
            <option value="DEPENDENCY">Dependencies</option>
          </select>
        </div>
      </div>

      {/* Main Coordinate Views & Right Inspector Layout */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left/Center Visualizer (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === "graph" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-meta font-mono text-text-secondary px-1">
                <span>
                  Focus neighborhood for:{" "}
                  <strong className="text-text-primary">{activeModule?.id ?? "None"}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-text-tertiary">
                    Showing {graphNodes.length - 1} of {(moduleMetrics?.dependencies.length ?? 0) + (moduleMetrics?.dependents.length ?? 0)} neighbors
                  </span>
                  <div className="flex items-center gap-1">
                    {[12, 24, 0].map((lim) => (
                      <button
                        key={lim}
                        type="button"
                        onClick={() => setNeighborLimit(lim)}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                          neighborLimit === lim
                            ? "bg-accent/20 text-accent font-semibold border border-accent/40"
                            : "bg-bg-raised text-text-tertiary hover:text-text-secondary border border-border-subtle"
                        }`}
                        title={lim === 0 ? "Show all direct neighbors" : `Show top ${lim} direct neighbors`}
                      >
                        {lim === 0 ? "All" : lim}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <GraphCanvas
                nodes={graphNodes}
                edges={graphEdges}
                selectedNodeId={activeModule?.id}
                onSelectNode={(nodeId) => setSelectedModuleId(nodeId)}
                height={460}
              />
            </div>
          ) : viewMode === "tree" ? (
            /* Virtualized / Filterable File Tree */
            <div className="rounded-[6px] border border-border-default bg-bg-surface overflow-hidden">
              <div className="border-b border-border-subtle bg-bg-raised px-3 py-2 font-mono text-[10px] uppercase text-text-tertiary flex justify-between">
                <span>File Path ({filteredFiles.length})</span>
                <span>Category · Size · Lines</span>
              </div>
              <div className="max-h-[460px] overflow-y-auto divide-y divide-border-subtle/50 font-mono text-meta">
                {filteredFiles.map((file) => (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => {
                      const mod = modules.find((m) => m.id === file.path);
                      if (mod) setSelectedModuleId(mod.id);
                    }}
                    className="flex w-full items-center justify-between px-3 py-1.5 text-left transition-colors hover:bg-bg-raised"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCode size={13} className="text-text-tertiary shrink-0" />
                      <span className="truncate text-text-primary">{file.path}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-[11px] text-text-secondary tabular-nums">
                      <span className="rounded bg-bg-raised px-1 py-0.5 text-[10px] text-text-tertiary">
                        {file.category}
                      </span>
                      <span>{formatBytes(file.size)}</span>
                      <span>{file.lineCount} L</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Module x Module Coupling Heatmap Matrix */
            <div className="rounded-[6px] border border-border-default bg-bg-surface overflow-x-auto p-4 max-h-[520px] space-y-3">
              {(() => {
                const totalMatrixPages =
                  matrixPageSize === 0 ? 1 : Math.ceil(modules.length / matrixPageSize) || 1;
                const safeMatrixPage = Math.min(matrixPage, totalMatrixPages - 1);
                const startIdx = matrixPageSize === 0 ? 0 : safeMatrixPage * matrixPageSize;
                const endIdx =
                  matrixPageSize === 0
                    ? modules.length
                    : Math.min(startIdx + matrixPageSize, modules.length);
                const pagedModules =
                  matrixPageSize === 0 ? modules : modules.slice(startIdx, endIdx);
                const activeIndex = modules.findIndex((m) => m.id === activeModule?.id);

                return (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-2.5 font-mono text-meta">
                      <div>
                        <span className="text-text-secondary font-medium">Coupling Matrix</span>
                        <span className="ml-2 text-[11px] text-text-tertiary">
                          Showing modules {modules.length === 0 ? 0 : startIdx + 1}–{endIdx} of {modules.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeIndex >= 0 && matrixPageSize > 0 && (
                          <button
                            type="button"
                            onClick={() => setMatrixPage(Math.floor(activeIndex / matrixPageSize))}
                            className="rounded border border-border-subtle bg-bg-raised px-2 py-0.5 text-[11px] text-text-secondary hover:text-accent transition-colors"
                            title="Jump matrix page to selected module"
                          >
                            Jump to selected
                          </button>
                        )}

                        {/* Page size toggle */}
                        <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
                          <span>View:</span>
                          {[15, 30, 0].map((sz) => (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => {
                                setMatrixPageSize(sz);
                                setMatrixPage(0);
                              }}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                                matrixPageSize === sz
                                  ? "bg-accent/20 text-accent font-semibold border border-accent/40"
                                  : "bg-bg-raised text-text-tertiary hover:text-text-secondary border border-border-subtle"
                              }`}
                            >
                              {sz === 0 ? "All" : sz}
                            </button>
                          ))}
                        </div>

                        {/* Prev / Next Page controls */}
                        {matrixPageSize > 0 && totalMatrixPages > 1 && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <button
                              type="button"
                              disabled={safeMatrixPage === 0}
                              onClick={() => setMatrixPage((p) => Math.max(0, p - 1))}
                              className="rounded border border-border-subtle bg-bg-raised px-1.5 py-0.5 text-text-secondary disabled:opacity-40"
                            >
                              Prev
                            </button>
                            <span className="text-text-tertiary px-1">
                              {safeMatrixPage + 1}/{totalMatrixPages}
                            </span>
                            <button
                              type="button"
                              disabled={safeMatrixPage >= totalMatrixPages - 1}
                              onClick={() => setMatrixPage((p) => Math.min(totalMatrixPages - 1, p + 1))}
                              className="rounded border border-border-subtle bg-bg-raised px-1.5 py-0.5 text-text-secondary disabled:opacity-40"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <table className="border-collapse font-mono text-[10px]">
                      <thead>
                        <tr>
                          <th className="p-1 text-left text-text-tertiary">Module</th>
                          {pagedModules.map((m) => (
                            <th
                              key={m.id}
                              className="p-1 text-center text-text-secondary font-medium w-8 truncate"
                              title={m.id}
                            >
                              {m.id.split("/").pop()?.substring(0, 3)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedModules.map((rowMod) => (
                          <tr key={rowMod.id} className="hover:bg-bg-raised">
                            <td
                              className="p-1 text-text-primary truncate max-w-[140px] cursor-pointer hover:text-accent font-medium"
                              onClick={() => setSelectedModuleId(rowMod.id)}
                              title={rowMod.id}
                            >
                              {rowMod.id.split("/").pop()}
                            </td>
                            {pagedModules.map((colMod) => {
                              const importsCol = rowMod.imports.some(
                                (imp) => (imp.target ?? imp.specifier) === colMod.id,
                              );
                              return (
                                <td
                                  key={colMod.id}
                                  className={`p-1 text-center border border-border-subtle/40 ${
                                    importsCol
                                      ? "bg-accent/25 text-accent font-bold"
                                      : rowMod.id === colMod.id
                                      ? "bg-bg-raised text-text-tertiary opacity-40"
                                      : "text-text-tertiary/20"
                                  }`}
                                >
                                  {importsCol ? "●" : "·"}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right Inspector (4 cols) */}
        <div className="lg:col-span-4 rounded-[6px] border border-border-default bg-bg-surface p-4 space-y-4">
          <div className="border-b border-border-subtle pb-3">
            <span className="font-mono text-[9px] uppercase tracking-wider text-text-tertiary">
              NODE INSPECTOR
            </span>
            <h3 className="text-ui-dense font-semibold text-text-primary truncate mt-0.5" title={activeModule?.id}>
              {activeModule?.id ?? "No selection"}
            </h3>
          </div>

          {activeModule && moduleMetrics ? (
            <div className="space-y-4 text-ui-dense font-sans">
              {/* Fan-in / Fan-out / Coupling metrics */}
              <div className="grid grid-cols-3 gap-2 text-center select-none font-mono">
                <div className="rounded border border-border-subtle bg-bg-raised p-2">
                  <span className="text-[10px] uppercase text-text-tertiary block">Fan-In</span>
                  <span className="text-h3-dense font-semibold text-text-primary tabular-nums">
                    {moduleMetrics.fanIn}
                  </span>
                </div>
                <div className="rounded border border-border-subtle bg-bg-raised p-2">
                  <span className="text-[10px] uppercase text-text-tertiary block">Fan-Out</span>
                  <span className="text-h3-dense font-semibold text-text-primary tabular-nums">
                    {moduleMetrics.fanOut}
                  </span>
                </div>
                <div className="rounded border border-border-subtle bg-bg-raised p-2">
                  <span className="text-[10px] uppercase text-text-tertiary block">Coupling</span>
                  <span className="text-h3-dense font-semibold text-accent tabular-nums">
                    {moduleMetrics.coupling}
                  </span>
                </div>
              </div>

              {/* Dependencies (Fan-Out) */}
              <div>
                <p className="font-mono text-meta uppercase tracking-wider text-text-secondary mb-1.5 flex items-center justify-between">
                  <span>Dependencies ({moduleMetrics.dependencies.length})</span>
                  <span className="text-[10px] text-text-tertiary">Imports</span>
                </p>
                {moduleMetrics.dependencies.length === 0 ? (
                  <p className="text-meta text-text-tertiary italic">No dependencies imported</p>
                ) : (
                  <ul className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px]">
                    {moduleMetrics.dependencies.map((dep, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => setSelectedModuleId(dep)}
                          className="flex w-full items-center justify-between rounded px-1.5 py-0.5 text-left text-text-primary hover:bg-bg-raised hover:text-accent transition-colors"
                        >
                          <span className="truncate">{dep}</span>
                          <ArrowRight size={11} className="shrink-0 text-text-tertiary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Dependents (Fan-In) */}
              <div>
                <p className="font-mono text-meta uppercase tracking-wider text-text-secondary mb-1.5 flex items-center justify-between">
                  <span>Dependents ({moduleMetrics.dependents.length})</span>
                  <span className="text-[10px] text-text-tertiary">Imported by</span>
                </p>
                {moduleMetrics.dependents.length === 0 ? (
                  <p className="text-meta text-text-tertiary italic">No dependents import this module</p>
                ) : (
                  <ul className="max-h-28 overflow-y-auto space-y-1 font-mono text-[11px]">
                    {moduleMetrics.dependents.map((dep, i) => (
                      <li key={i}>
                        <button
                          type="button"
                          onClick={() => setSelectedModuleId(dep)}
                          className="flex w-full items-center justify-between rounded px-1.5 py-0.5 text-left text-text-primary hover:bg-bg-raised hover:text-accent transition-colors"
                        >
                          <span className="truncate">{dep}</span>
                          <ArrowRight size={11} className="shrink-0 text-text-tertiary" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Related Doctor Findings */}
              {moduleMetrics.relatedFindings.length > 0 && (
                <div className="pt-2 border-t border-border-subtle">
                  <p className="font-mono text-meta uppercase tracking-wider text-critical mb-1.5">
                    Related Findings ({moduleMetrics.relatedFindings.length})
                  </p>
                  <ul className="space-y-1.5 text-meta">
                    {moduleMetrics.relatedFindings.map((f, i) => (
                      <li key={i} className="rounded border border-critical/30 bg-critical/5 p-2">
                        <span className="font-semibold text-text-primary block">{f.title}</span>
                        <span className="font-mono text-[10px] text-text-tertiary">{f.ruleId}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <p className="text-meta text-text-tertiary">Select a module to view its architecture metrics.</p>
          )}
        </div>
      </div>
    </div>
  );
}
