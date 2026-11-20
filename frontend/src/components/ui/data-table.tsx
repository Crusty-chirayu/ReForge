"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedId?: string;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedId,
  emptyState,
  className = "",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortKey(null);
        setSortDir("asc");
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = (a as unknown as Record<string, unknown>)[sortKey];
      const valB = (b as unknown as Record<string, unknown>)[sortKey];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      const cmp = valA < valB ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  if (data.length === 0 && emptyState) {
    return <div className={className}>{emptyState}</div>;
  }

  return (
    <div className={`w-full overflow-x-auto rounded-[6px] border border-border-subtle bg-bg-surface ${className}`}>
      <table className="w-full text-left border-collapse text-ui-dense">
        <thead>
          <tr className="border-b border-border-default bg-bg-raised text-meta font-mono uppercase tracking-wider text-text-secondary select-none">
            {columns.map((col) => {
              const isSorted = sortKey === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  className={`h-9 px-3 py-2 font-medium ${col.className ?? ""}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center gap-1.5 hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:text-accent"
                    >
                      <span>{col.header}</span>
                      {isSorted ? (
                        sortDir === "asc" ? (
                          <ArrowUp size={12} className="text-accent" aria-hidden="true" />
                        ) : (
                          <ArrowDown size={12} className="text-accent" aria-hidden="true" />
                        )
                      ) : (
                        <ArrowUpDown size={12} className="text-text-tertiary opacity-60" aria-hidden="true" />
                      )}
                    </button>
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/60">
          {sortedData.map((row, index) => {
            const key = keyExtractor(row);
            const isSelected = selectedId === key;

            return (
              <tr
                key={key}
                onClick={() => onRowClick?.(row)}
                className={[
                  "h-9 transition-colors duration-120",
                  onRowClick ? "cursor-pointer hover:bg-bg-raised" : "",
                  isSelected
                    ? "bg-accent-subtle/50 border-l-2 border-l-accent"
                    : "",
                ].join(" ")}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-3 py-1.5 align-middle text-text-primary ${col.className ?? ""}`}
                  >
                    {col.render
                      ? col.render(row, index)
                      : String((row as unknown as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
