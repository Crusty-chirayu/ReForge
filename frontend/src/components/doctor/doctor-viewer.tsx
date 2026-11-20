"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Target,
  Brain,
  FileCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SeverityBadge, type SeverityLevel } from "@/components/ui/severity-badge";
import { Drawer } from "@/components/ui/drawer";
import { Mono } from "@/components/ui/mono";
import type { DoctorFinding, DoctorReport } from "@/lib/api/types";

export interface DoctorViewerProps {
  doctor?: DoctorReport;
  className?: string;
}

export function DoctorViewer({ doctor, className = "" }: DoctorViewerProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedFinding, setSelectedFinding] = useState<DoctorFinding | null>(null);

  const findings = useMemo(() => doctor?.findings ?? [], [doctor]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      if (search) {
        const query = search.toLowerCase();
        const matchTitle = f.title.toLowerCase().includes(query);
        const matchRule = f.ruleId.toLowerCase().includes(query);
        const matchDesc = f.description.toLowerCase().includes(query);
        if (!matchTitle && !matchRule && !matchDesc) return false;
      }
      if (severityFilter !== "ALL" && f.severity !== severityFilter) {
        return false;
      }
      if (categoryFilter !== "ALL" && f.category !== categoryFilter) {
        return false;
      }
      return true;
    });
  }, [findings, search, severityFilter, categoryFilter]);

  if (!doctor) {
    return (
      <div className={`rounded-[6px] border border-border-subtle bg-bg-surface p-8 text-center font-mono text-meta text-text-tertiary ${className}`}>
        The Doctor report was not included in this analysis.
      </div>
    );
  }

  const handleSendToPlan = (finding: DoctorFinding) => {
    const goal = `Resolve ${finding.ruleId}: ${finding.title}`;
    router.push(`/plan?goal=${encodeURIComponent(goal)}`);
  };

  const handleAskBrain = (finding: DoctorFinding) => {
    const question = `How do we remediate ${finding.ruleId} (${finding.title})? ${finding.description}`;
    router.push(`/brain?q=${encodeURIComponent(question)}`);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Health Score & Overview Summary Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[6px] border border-border-default bg-bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-border-default bg-bg-raised font-mono text-xl font-bold tabular-nums">
            <span
              className={
                doctor.healthScore >= 70
                  ? "text-success"
                  : doctor.healthScore >= 50
                  ? "text-medium"
                  : "text-critical"
              }
            >
              {doctor.healthScore}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
                PROJECT HEALTH SCORE
              </span>
              <span className="rounded bg-bg-raised px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                {doctor.healthScore >= 70
                  ? "HEALTHY"
                  : doctor.healthScore >= 50
                  ? "NEEDS ATTENTION"
                  : "CRITICAL RISKS"}
              </span>
            </div>
            <p className="text-ui-dense text-text-secondary mt-0.5">
              {doctor.summary.findingCount} active finding{doctor.summary.findingCount === 1 ? "" : "s"} across codebase rules
            </p>
          </div>
        </div>

        {/* Severity Counts Pill List */}
        <div className="flex items-center gap-2 select-none font-mono text-meta">
          {Object.entries(doctor.summary.bySeverity).map(([sev, count]) => (
            <div
              key={sev}
              className="flex items-center gap-1.5 rounded border border-border-subtle bg-bg-raised px-2.5 py-1"
            >
              <span className="text-[10px] uppercase text-text-tertiary">{sev}</span>
              <span className="font-bold text-text-primary tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border-subtle bg-bg-surface p-2.5">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Input
            placeholder="Search by rule, title, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={13} />}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-8 rounded-[4px] border border-border-default bg-bg-surface px-2 text-meta text-text-primary outline-none"
            aria-label="Filter by severity"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 rounded-[4px] border border-border-default bg-bg-surface px-2 text-meta text-text-primary outline-none"
            aria-label="Filter by category"
          >
            <option value="ALL">All Categories</option>
            <option value="SECURITY">Security</option>
            <option value="ARCHITECTURE">Architecture</option>
            <option value="CODE_QUALITY">Code Quality</option>
            <option value="PERFORMANCE">Performance</option>
            <option value="TESTING">Testing</option>
            <option value="MAINTAINABILITY">Maintainability</option>
          </select>
        </div>
      </div>

      {/* Master Findings Table */}
      <div className="rounded-[6px] border border-border-default bg-bg-surface overflow-hidden">
        <table className="w-full text-left border-collapse text-ui-dense font-sans">
          <thead>
            <tr className="border-b border-border-default bg-bg-raised font-mono text-[10px] uppercase tracking-wider text-text-tertiary select-none">
              <th className="h-9 px-3 py-2 w-28">Severity</th>
              <th className="h-9 px-3 py-2 w-24">Rule ID</th>
              <th className="h-9 px-3 py-2">Finding Title</th>
              <th className="h-9 px-3 py-2 w-32">Category</th>
              <th className="h-9 px-3 py-2 w-24 text-right">Confidence</th>
              <th className="h-9 px-3 py-2 w-12" aria-hidden="true" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/60">
            {filteredFindings.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center font-mono text-meta text-text-tertiary">
                  No findings matching filters
                </td>
              </tr>
            ) : (
              filteredFindings.map((finding, idx) => (
                <tr
                  key={`${finding.ruleId}-${idx}`}
                  onClick={() => setSelectedFinding(finding)}
                  className="h-10 cursor-pointer transition-colors hover:bg-bg-raised"
                >
                  <td className="px-3 py-2 align-middle">
                    <SeverityBadge severity={finding.severity as SeverityLevel} size="sm" />
                  </td>
                  <td className="px-3 py-2 align-middle font-mono text-meta font-medium text-text-primary">
                    {finding.ruleId}
                  </td>
                  <td className="px-3 py-2 align-middle">
                    <span className="font-semibold text-text-primary block">{finding.title}</span>
                    <span className="text-meta text-text-secondary truncate block max-w-xl">
                      {finding.description}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-middle font-mono text-[11px] text-text-secondary uppercase">
                    {finding.category.replace("_", " ")}
                  </td>
                  <td className="px-3 py-2 align-middle text-right font-mono text-meta text-text-tertiary">
                    {finding.confidence}
                  </td>
                  <td className="px-3 py-2 align-middle text-right">
                    <ArrowRight size={13} className="text-text-tertiary" aria-hidden="true" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer for Selected Finding */}
      <Drawer
        open={Boolean(selectedFinding)}
        onClose={() => setSelectedFinding(null)}
        width="lg"
        title={
          selectedFinding ? (
            <div className="flex items-center gap-2">
              <SeverityBadge severity={selectedFinding.severity as SeverityLevel} size="sm" />
              <Mono className="font-bold text-text-primary">{selectedFinding.ruleId}</Mono>
            </div>
          ) : (
            "Finding Detail"
          )
        }
      >
        {selectedFinding && (
          <div className="space-y-5 text-ui-dense font-sans">
            <div>
              <h3 className="text-h3-dense font-semibold text-text-primary leading-tight">
                {selectedFinding.title}
              </h3>
              <p className="mt-1.5 text-text-secondary leading-relaxed">
                {selectedFinding.description}
              </p>
            </div>

            {/* Why it matters (Impact) */}
            <div className="rounded-[4px] border border-border-default bg-bg-raised p-3">
              <span className="font-mono text-[10px] uppercase font-bold text-text-primary block mb-1">
                Why It Matters
              </span>
              <p className="text-meta text-text-secondary leading-relaxed">
                {selectedFinding.impact}
              </p>
            </div>

            {/* Recommendation (Remediation) */}
            <div className="rounded-[4px] border border-success/30 bg-success/5 p-3">
              <span className="font-mono text-[10px] uppercase font-bold text-success block mb-1">
                Remediation Recommendation
              </span>
              <p className="text-meta text-text-primary leading-relaxed">
                {selectedFinding.remediation}
              </p>
            </div>

            {/* Evidence snippets */}
            {selectedFinding.evidence && selectedFinding.evidence.length > 0 && (
              <div>
                <span className="font-mono text-meta uppercase font-bold text-text-tertiary block mb-2">
                  Grounding Evidence ({selectedFinding.evidence.length})
                </span>
                <div className="space-y-2">
                  {selectedFinding.evidence.map((ev, i) => (
                    <div key={i} className="rounded border border-border-subtle bg-bg-surface p-2.5 font-mono text-meta">
                      <div className="flex items-center gap-1.5 text-text-primary font-medium">
                        <FileCode size={12} className="text-text-tertiary" />
                        <span>{ev.file}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-text-secondary whitespace-pre-wrap">
                        {ev.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected files */}
            {selectedFinding.affectedFiles && selectedFinding.affectedFiles.length > 0 && (
              <div>
                <span className="font-mono text-meta uppercase font-bold text-text-tertiary block mb-1.5">
                  Affected Files
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFinding.affectedFiles.map((af, i) => (
                    <Mono key={i} className="rounded bg-bg-raised px-2 py-0.5 text-meta border border-border-subtle">
                      {af}
                    </Mono>
                  ))}
                </div>
              </div>
            )}

            {/* Functional Actions */}
            <div className="pt-4 border-t border-border-subtle flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Target size={13} />}
                onClick={() => handleSendToPlan(selectedFinding)}
              >
                Send to Plan
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Brain size={13} />}
                onClick={() => handleAskBrain(selectedFinding)}
              >
                Ask Brain
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
