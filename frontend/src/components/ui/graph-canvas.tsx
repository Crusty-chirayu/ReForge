"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, List, Network } from "lucide-react";
import { Button } from "./button";

export interface GraphNode {
  id: string;
  label: string;
  type?: "module" | "file" | "symbol";
  category?: string;
  fanIn?: number;
  fanOut?: number;
  isCenter?: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  label?: string;
  type?: "IMPORTS" | "DEPENDS_ON" | "CALLS";
}

export interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
  height?: number | string;
  className?: string;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  height = 420,
  className = "",
}: GraphCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Position nodes in radial or force neighborhood layout around center
  const layout = useMemo(() => {
    const width = 600;
    const canvasHeight = 400;
    const centerNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[0];

    const positions: Record<string, { x: number; y: number; isCenter: boolean }> = {};

    if (!centerNode) return positions;

    // Center position
    positions[centerNode.id] = {
      x: width / 2,
      y: canvasHeight / 2,
      isCenter: true,
    };

    // Other nodes placed radially in neighborhood
    const otherNodes = nodes.filter((n) => n.id !== centerNode.id);
    const radius = Math.min(width, canvasHeight) * 0.36;
    const angleStep = otherNodes.length > 0 ? (2 * Math.PI) / otherNodes.length : 0;

    otherNodes.forEach((node, i) => {
      const angle = i * angleStep;
      positions[node.id] = {
        x: width / 2 + radius * Math.cos(angle),
        y: canvasHeight / 2 + radius * Math.sin(angle),
        isCenter: false,
      };
    });

    return positions;
  }, [nodes, selectedNodeId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isPanning, dragStart],
  );

  const handleMouseUp = () => setIsPanning(false);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  if (nodes.length === 0) {
    return (
      <div
        style={{ height }}
        className={`flex items-center justify-center rounded-[6px] border border-border-subtle bg-bg-surface font-mono text-meta text-text-tertiary ${className}`}
      >
        No nodes in graph
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`relative flex flex-col rounded-[6px] border border-border-default bg-bg-surface overflow-hidden select-none ${className}`}
    >
      {/* Controls toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 rounded border border-border-default bg-bg-overlay/90 p-1 shadow-sm backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          icon={<ZoomIn size={13} />}
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
          aria-label="Zoom in"
          title="Zoom in"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<ZoomOut size={13} />}
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
          aria-label="Zoom out"
          title="Zoom out"
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Maximize2 size={13} />}
          onClick={resetView}
          aria-label="Fit view"
          title="Fit view"
        />
        <div className="h-4 w-[1px] bg-border-subtle mx-0.5" />
        <Button
          variant={viewMode === "list" ? "secondary" : "ghost"}
          size="sm"
          icon={viewMode === "list" ? <Network size={13} /> : <List size={13} />}
          onClick={() => setViewMode((m) => (m === "graph" ? "list" : "graph"))}
          aria-label={viewMode === "list" ? "Switch to graph" : "Switch to accessible list"}
          title={viewMode === "list" ? "Switch to graph" : "Switch to accessible list"}
        />
      </div>

      {viewMode === "list" ? (
        /* Accessible List Fallback (WCAG 2.2 AA alternative) */
        <div className="flex-1 overflow-y-auto p-4 font-mono text-meta">
          <p className="text-text-secondary mb-3 font-sans text-ui-dense font-medium">
            Graph Node Neighborhood ({nodes.length} nodes, {edges.length} connections)
          </p>
          <ul className="space-y-2">
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const relatedEdges = edges.filter(
                (e) => e.from === node.id || e.to === node.id,
              );
              return (
                <li
                  key={node.id}
                  className={`rounded border p-2.5 transition-colors ${
                    isSelected
                      ? "border-accent bg-accent-subtle/30"
                      : "border-border-subtle bg-bg-raised hover:border-border-default"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectNode?.(node.id)}
                    className="w-full text-left font-semibold text-text-primary flex items-center justify-between"
                  >
                    <span>{node.label}</span>
                    <span className="text-[10px] text-text-tertiary uppercase">
                      {node.type ?? "node"}
                    </span>
                  </button>
                  {relatedEdges.length > 0 && (
                    <div className="mt-1.5 text-[11px] text-text-secondary space-y-0.5">
                      {relatedEdges.map((e, idx) => (
                        <div key={idx} className="flex items-center gap-1">
                          <span className="text-text-tertiary">
                            {e.from === node.id ? "→ connects to:" : "← depended on by:"}
                          </span>
                          <span className="text-text-primary">
                            {e.from === node.id ? e.to : e.from}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        /* SVG Interactive Graph Canvas */
        <svg
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="7"
              markerHeight="7"
              refX="17"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 7 3.5, 0 7"
                fill="var(--border-strong, #4A4A53)"
              />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="7"
              markerHeight="7"
              refX="17"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 7 3.5, 0 7" fill="var(--accent, #F2672A)" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Edges */}
            {edges.map((edge, idx) => {
              const start = layout[edge.from];
              const end = layout[edge.to];
              if (!start || !end) return null;

              const isEdgeActive =
                edge.from === selectedNodeId ||
                edge.to === selectedNodeId ||
                edge.from === hoveredNodeId ||
                edge.to === hoveredNodeId;

              return (
                <line
                  key={idx}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isEdgeActive ? "var(--accent)" : "var(--border-default)"}
                  strokeWidth={isEdgeActive ? 2 : 1}
                  strokeDasharray={edge.type === "DEPENDS_ON" ? "4 3" : undefined}
                  markerEnd={isEdgeActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                  opacity={isEdgeActive ? 1 : 0.6}
                  className="transition-all duration-120"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const pos = layout[node.id];
              if (!pos) return null;

              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isCenter = pos.isCenter;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectNode?.(node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  <circle
                    r={isCenter ? 24 : 18}
                    fill={
                      isSelected
                        ? "var(--accent)"
                        : isHovered
                        ? "var(--bg-overlay)"
                        : "var(--bg-raised)"
                    }
                    stroke={
                      isSelected
                        ? "var(--accent-hover)"
                        : isCenter
                        ? "var(--accent)"
                        : "var(--border-default)"
                    }
                    strokeWidth={isSelected || isCenter ? 2 : 1}
                    className="transition-all duration-120"
                  />
                  <text
                    textAnchor="middle"
                    dy=".3em"
                    fontSize={isCenter ? "11px" : "9px"}
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                    fill={isSelected ? "var(--on-accent)" : "var(--text-primary)"}
                    className="pointer-events-none select-none"
                  >
                    {node.label.substring(0, 4).toUpperCase()}
                  </text>
                  <text
                    textAnchor="middle"
                    y={isCenter ? 36 : 28}
                    fontSize="10px"
                    fontFamily="var(--font-mono)"
                    fill="var(--text-secondary)"
                    className="pointer-events-none select-none truncate max-w-[120px]"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}
