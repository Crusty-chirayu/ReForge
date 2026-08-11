import type { ReactNode } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Mono } from "@/components/ui/mono";
import { StatusBadge, type StatusVariant } from "@/components/ui/status-badge";
import type {
  AnalysisReport,
  DoctorSeverity,
  Evidence,
  Finding,
} from "@/lib/api/types";
import { formatBytes } from "@/lib/utils/format";

// ── Shared primitives ─────────────────────────────────────────────────────────

export function SectionTitle({
  kicker,
  title,
}: {
  kicker: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="h-4 w-0.5 rounded bg-forge"
      />
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-forge">
          {kicker}
        </p>
        <h2 className="text-base font-semibold tracking-tight text-ink-fg">
          {title}
        </h2>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded border border-ink-border/40 bg-ink-card/60 px-3 py-2.5">
      <p className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold leading-tight text-ink-fg">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[10px] text-ink-subtle">{hint}</p>}
    </div>
  );
}

export function EvidenceList({
  evidence,
  limit = 4,
}: {
  evidence: Evidence[];
  limit?: number;
}) {
  if (evidence.length === 0) return null;
  const visible = evidence.slice(0, limit);
  const rest = evidence.slice(limit);

  return (
    <div className="mt-2 space-y-1">
      {visible.map((ev, i) => (
        <div
          key={i}
          className="rounded border border-ink-border/20 bg-ink-0/50 px-2 py-1 font-mono text-[11px] text-ink-muted"
        >
          <span className="text-steel">{ev.file}</span>
          <span className="text-ink-subtle">: </span>
          {ev.detail}
        </div>
      ))}
      {rest.length > 0 && (
        <details className="text-[11px]">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-ink-subtle transition-colors hover:text-ink-muted">
            +{rest.length} more evidence
          </summary>
          <div className="mt-1 space-y-1">
            {rest.map((ev, i) => (
              <div
                key={i}
                className="rounded border border-ink-border/20 bg-ink-0/50 px-2 py-1 font-mono text-[11px] text-ink-muted"
              >
                <span className="text-steel">{ev.file}</span>
                <span className="text-ink-subtle">: </span>
                {ev.detail}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function FindingList({
  findings,
  emptyText,
}: {
  findings: Finding[];
  emptyText?: string;
}) {
  if (findings.length === 0) {
    return emptyText ? (
      <p className="py-1 text-xs text-ink-subtle">{emptyText}</p>
    ) : null;
  }
  return (
    <div className="space-y-1.5">
      {findings.map((f, i) => (
        <details
          key={i}
          className="group rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              size={11}
              className="shrink-0 text-ink-subtle transition-transform group-open:rotate-90"
            />
            <span className="min-w-0 truncate text-sm text-ink-fg">
              {f.name}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[10px] uppercase text-ink-subtle">
              {f.confidence}
            </span>
          </summary>
          <EvidenceList evidence={f.evidence} />
        </details>
      ))}
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-xs text-ink-subtle">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="rounded border border-ink-border/30 bg-ink-1/40 px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

const severityVariant: Record<DoctorSeverity, StatusVariant> = {
  CRITICAL: "critical",
  HIGH: "failed",
  MEDIUM: "warning",
  LOW: "info",
  INFO: "muted",
};

export function SeverityBadge({ severity }: { severity: DoctorSeverity }) {
  return (
    <StatusBadge variant={severityVariant[severity]} size="sm">
      {severity}
    </StatusBadge>
  );
}

// ── 01 · Project overview ─────────────────────────────────────────────────────

function OverviewSection({ report }: { report: AnalysisReport }) {
  const { overview, languages, frameworks, structure, projectModel } = report;

  return (
    <section id="overview" className="scroll-mt-28 space-y-4">
      <SectionTitle kicker="01 · Project Overview" title="Overview" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile label="Files" value={overview.fileCount} />
        <MetricTile label="Analyzable" value={overview.analyzableFileCount} />
        <MetricTile label="Total Size" value={formatBytes(overview.totalBytes)} />
        <MetricTile label="Languages" value={languages.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card padding="none">
          <CardHeader
            title="Languages"
            subtitle={`${languages.length} detected`}
          />
          <div className="px-4 pb-4">
            <FindingList findings={languages} emptyText="No languages detected" />
          </div>
        </Card>
        <Card padding="none">
          <CardHeader
            title="Frameworks"
            subtitle={`${frameworks.length} detected`}
          />
          <div className="px-4 pb-4">
            <FindingList findings={frameworks} emptyText="No frameworks detected" />
          </div>
        </Card>
        <Card padding="none">
          <CardHeader title="Structure" subtitle="Layout of the project" />
          <div className="space-y-3 px-4 pb-4">
            <div>
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                Top level
              </p>
              <ChipList items={structure.topLevel} />
            </div>
            <div>
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                Important files
              </p>
              <div className="space-y-0.5">
                {structure.importantFiles.map((f) => (
                  <Mono key={f} className="block text-ink-muted">
                    {f}
                  </Mono>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                Ignored directories
              </p>
              <ChipList items={structure.ignoredDirectories} />
            </div>
          </div>
        </Card>
      </div>

      {projectModel && (
        <Card padding="none">
          <CardHeader
            title="Project Model"
            subtitle={`${projectModel.name} · ${projectModel.files.length} files · ${projectModel.modules.length} modules · ${projectModel.symbols.length} symbols`}
          />
          <div className="grid gap-4 px-4 pb-4 lg:grid-cols-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricTile label="Total Files" value={projectModel.metrics.totalFiles} />
              <MetricTile label="Source" value={projectModel.metrics.sourceFiles} />
              <MetricTile label="Tests" value={projectModel.metrics.testFiles} />
              <MetricTile label="Dep Count" value={projectModel.metrics.dependencyCount} />
              <MetricTile label="Total Lines" value={projectModel.metrics.totalLines.toLocaleString()} />
              <MetricTile label="Source Lines" value={projectModel.metrics.sourceLines.toLocaleString()} />
              <MetricTile label="Modules" value={projectModel.metrics.internalModuleCount} />
              <MetricTile
                label="Test Ratio"
                value={
                  projectModel.metrics.testSourceRatio !== undefined
                    ? `${Math.round(projectModel.metrics.testSourceRatio * 100)}%`
                    : "—"
                }
              />
            </div>
            <div className="space-y-3">
              <div>
                <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                  Package managers
                </p>
                <ChipList items={projectModel.packageManagers} />
              </div>
              <div>
                <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                  Source directories
                </p>
                <ChipList items={projectModel.sourceDirectories} />
              </div>
              <div>
                <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                  Test directories
                </p>
                <ChipList items={projectModel.testDirectories} />
              </div>
              <details className="rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2">
                <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-wider text-ink-subtle">
                  Largest files ({projectModel.metrics.largestFiles.length})
                </summary>
                <div className="mt-1.5 space-y-0.5">
                  {projectModel.metrics.largestFiles.map((f) => (
                    <div key={f.path} className="flex items-center justify-between gap-2 text-[11px]">
                      <Mono truncate className="text-ink-muted">
                        {f.path}
                      </Mono>
                      <Mono className="text-ink-fg">{formatBytes(f.size)}</Mono>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}

// ── 02 · Code intelligence ────────────────────────────────────────────────────

function CodeSection({ report }: { report: AnalysisReport }) {
  const { entryPoints, apiHints, databaseHints, authenticationHints, projectModel } =
    report;

  return (
    <section id="code" className="scroll-mt-28 space-y-4">
      <SectionTitle kicker="02 · Code Intelligence" title="Code Intelligence" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card padding="none">
          <CardHeader
            title="Entry Points"
            subtitle={`${entryPoints.length} discovered`}
          />
          <div className="px-4 pb-4">
            <FindingList findings={entryPoints} emptyText="No entry points detected" />
          </div>
        </Card>
        <Card padding="none">
          <CardHeader title="API Routes" subtitle={`${apiHints.length} discovered`} />
          <div className="px-4 pb-4">
            <FindingList findings={apiHints} emptyText="No API routes detected" />
          </div>
        </Card>
        <Card padding="none">
          <CardHeader
            title="Database Indicators"
            subtitle={`${databaseHints.length} detected`}
          />
          <div className="px-4 pb-4">
            <FindingList
              findings={databaseHints}
              emptyText="No database indicators detected"
            />
          </div>
        </Card>
        <Card padding="none">
          <CardHeader
            title="Authentication"
            subtitle={`${authenticationHints.length} detected`}
          />
          <div className="px-4 pb-4">
            <FindingList
              findings={authenticationHints}
              emptyText="No authentication indicators detected"
            />
          </div>
        </Card>
      </div>

      {projectModel && projectModel.symbols.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Symbols"
            subtitle={`${projectModel.symbols.length} symbols across the model`}
          />
          <div className="max-h-80 overflow-auto px-4 pb-4">
            <table className="w-full min-w-[640px] text-left text-xs">
              <caption className="sr-only">
                Symbols discovered across the project model
              </caption>
              <thead className="sticky top-0 bg-ink-card font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                <tr>
                  <th scope="col" className="py-2 pr-3">Name</th>
                  <th scope="col" className="pr-3">Type</th>
                  <th scope="col" className="pr-3">File</th>
                  <th scope="col" className="pr-3">Line</th>
                  <th scope="col" className="pr-3">Exported</th>
                  <th scope="col">Imported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-border/20">
                {projectModel.symbols.map((sym) => (
                  <tr key={`${sym.file}:${sym.line}:${sym.name}`}>
                    <td className="py-1.5 pr-3 font-mono text-steel">
                      {sym.name}
                    </td>
                    <td className="pr-3 font-mono text-ink-muted">{sym.type}</td>
                    <td className="pr-3 font-mono text-ink-muted">{sym.file}</td>
                    <td className="pr-3 font-mono text-ink-muted">{sym.line}</td>
                    <td className="pr-3">
                      {sym.exported ? (
                        <StatusBadge variant="succeeded" size="sm">
                          yes
                        </StatusBadge>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </td>
                    <td>
                      {sym.imported ? (
                        <StatusBadge variant="info" size="sm">
                          yes
                        </StatusBadge>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {projectModel && projectModel.modules.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Modules"
            subtitle={`${projectModel.modules.length} modules with import relationships`}
          />
          <div className="space-y-1.5 px-4 pb-4">
            {projectModel.modules.map((mod) => (
              <details
                key={mod.id}
                className="group rounded border border-ink-border/30 bg-ink-1/30 px-3 py-2"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                  <ChevronRight
                    size={11}
                    className="shrink-0 text-ink-subtle transition-transform group-open:rotate-90"
                  />
                  <Mono className="min-w-0 truncate text-ink-fg">{mod.id}</Mono>
                  <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-wider text-ink-subtle">
                    {mod.imports.length} imports · {mod.exports.length} exports ·{" "}
                    {mod.symbols.length} symbols
                  </span>
                </summary>
                <div className="mt-2 space-y-1">
                  {mod.imports.map((imp, i) => (
                    <div
                      key={i}
                      className="font-mono text-[11px] text-ink-muted"
                    >
                      <span
                        className={
                          imp.kind === "internal" ? "text-steel" : "text-amber-400"
                        }
                      >
                        {imp.kind}
                      </span>
                      <span className="text-ink-subtle"> {imp.specifier}</span>
                      {imp.target && (
                        <span className="text-ink-subtle"> → {imp.target}</span>
                      )}
                    </div>
                  ))}
                  {mod.imports.length === 0 && (
                    <p className="text-[11px] text-ink-subtle">No imports</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

// ── 03 · Dependencies ─────────────────────────────────────────────────────────

function DependenciesSection({ report }: { report: AnalysisReport }) {
  const resolved = report.projectModel?.dependencies ?? [];

  return (
    <section id="dependencies" className="scroll-mt-28 space-y-4">
      <SectionTitle kicker="03 · Dependencies" title="Dependencies" />

      <Card padding="none">
        <CardHeader
          title="Resolved Dependencies"
          subtitle={`${resolved.length} from the project model`}
        />
        {resolved.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-ink-subtle">
            No resolved dependencies in the project model.
          </p>
        ) : (
          <div className="overflow-x-auto px-4 pb-4">
            <table className="w-full min-w-[520px] text-left text-xs">
              <caption className="sr-only">
                Resolved dependencies with supporting evidence
              </caption>
              <thead className="font-mono text-[9px] uppercase tracking-widest text-ink-subtle">
                <tr>
                  <th scope="col" className="py-2 pr-3">Name</th>
                  <th scope="col" className="pr-3">Version</th>
                  <th scope="col" className="pr-3">Type</th>
                  <th scope="col">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-border/20">
                {resolved.map((dep) => (
                  <tr key={dep.name}>
                    <td className="py-1.5 pr-3 font-mono text-steel">{dep.name}</td>
                    <td className="pr-3 font-mono text-ink-muted">
                      {dep.version}
                    </td>
                    <td className="pr-3">
                      <StatusBadge
                        variant={
                          dep.type === "production"
                            ? "info"
                            : dep.type === "development"
                              ? "proposal"
                              : "muted"
                        }
                        size="sm"
                      >
                        {dep.type}
                      </StatusBadge>
                    </td>
                    <td className="font-mono text-ink-subtle">
                      {dep.evidence.file}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="none">
        <CardHeader
          title="Detected Dependency Findings"
          subtitle={`${report.dependencies.length} findings`}
        />
        <div className="px-4 pb-4">
          <FindingList
            findings={report.dependencies}
            emptyText="No dependency findings detected"
          />
        </div>
      </Card>
    </section>
  );
}

// ── 04 · Doctor findings ──────────────────────────────────────────────────────

function DoctorSection({ report }: { report: AnalysisReport }) {
  const doctor = report.doctor;

  return (
    <section id="doctor" className="scroll-mt-28 space-y-4">
      <SectionTitle kicker="04 · Doctor" title="Doctor Findings" />

      {!doctor ? (
        <Card padding="lg">
          <p className="text-xs text-ink-subtle">
            The Doctor report was not included in this analysis.
          </p>
        </Card>
      ) : (
        <>
          <Card padding="lg">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-end gap-1">
                <p className="text-4xl font-bold leading-none text-ink-fg">
                  {doctor.healthScore}
                </p>
                <p className="pb-1 text-sm text-ink-muted">/ 100</p>
              </div>
              <StatusBadge
                variant={
                  doctor.healthScore >= 70
                    ? "healthy"
                    : doctor.healthScore >= 50
                      ? "degraded"
                      : "unhealthy"
                }
              >
                {doctor.healthScore >= 70
                  ? "Healthy"
                  : doctor.healthScore >= 50
                    ? "Needs Attention"
                    : "Critical"}
              </StatusBadge>
              <div className="flex flex-wrap gap-1.5">
                {(
                  Object.entries(doctor.summary.bySeverity) as [
                    DoctorSeverity,
                    number,
                  ][]
                )
                  .filter(([, count]) => count > 0)
                  .map(([severity, count]) => (
                    <span
                      key={severity}
                      className="flex items-center gap-1.5 rounded border border-ink-border/30 bg-ink-1/40 px-2 py-1"
                    >
                      <SeverityBadge severity={severity} />
                      <span className="font-mono text-[10px] text-ink-muted">
                        ×{count}
                      </span>
                    </span>
                  ))}
              </div>
              <p className="ml-auto font-mono text-[10px] text-ink-subtle">
                {doctor.summary.scoring}
              </p>
            </div>
          </Card>

          <div className="space-y-2">
            {/*
              `ruleId` identifies the Doctor *rule*, not the finding, so one
              rule legitimately reports against several modules — e.g. two
              ARCH-002 "high fan-out module" findings for different files.
              Keying on it alone collides. The list is rendered in backend
              order and is never sorted or filtered client-side, so the index
              disambiguates duplicates without reordering risk.
            */}
            {doctor.findings.map((finding, i) => (
              <div
                key={`${finding.ruleId}-${i}`}
                className="space-y-2 rounded border border-ink-border/30 bg-ink-1/30 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={finding.severity} />
                  <h4 className="text-sm font-semibold text-ink-fg">
                    {finding.title}
                  </h4>
                  <span className="ml-auto font-mono text-[10px] text-ink-subtle">
                    {finding.ruleId}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-ink-muted">
                  {finding.description}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="rounded border border-ink-border/30 bg-ink-1/40 px-1.5 py-0.5 font-mono uppercase tracking-wider text-ink-muted">
                    {finding.category}
                  </span>
                  <span className="rounded border border-ink-border/30 bg-ink-1/40 px-1.5 py-0.5 font-mono uppercase tracking-wider text-ink-muted">
                    {finding.confidence}
                  </span>
                </div>
                {finding.impact && (
                  <p className="text-xs text-ink-muted">
                    <span className="text-ink-subtle">Impact: </span>
                    {finding.impact}
                  </p>
                )}
                {finding.remediation && (
                  <p className="text-xs text-steel">
                    <span className="text-steel-muted">Remediation: </span>
                    {finding.remediation}
                  </p>
                )}
                {(finding.affectedFiles?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {finding.affectedFiles?.map((file) => (
                      <Mono
                        key={file}
                        className="border border-rose-500/20 bg-rose-500/5 text-[10px] text-ink-muted"
                      >
                        {file}
                      </Mono>
                    ))}
                  </div>
                )}
                <EvidenceList evidence={finding.evidence} />
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ── 05 · Risks / architecture ─────────────────────────────────────────────────

function RisksSection({ report }: { report: AnalysisReport }) {
  return (
    <section id="risks" className="scroll-mt-28 space-y-4">
      <SectionTitle kicker="05 · Risks & Architecture" title="Risks & Architecture" />

      <Card padding="none">
        <CardHeader title="Risks" subtitle={`${report.risks.length} identified`} />
        <div className="px-4 pb-4">
          {report.risks.length === 0 ? (
            <p className="text-xs text-ink-subtle">No risks identified.</p>
          ) : (
            <div className="space-y-1.5">
              {report.risks.map((risk, i) => (
                <details
                  key={i}
                  className="group rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2"
                >
                  <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                    <AlertTriangle
                      size={12}
                      className="shrink-0 text-amber-400"
                    />
                    <span className="min-w-0 truncate text-sm text-ink-fg">
                      {risk.name}
                    </span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] uppercase text-ink-subtle">
                      {risk.confidence}
                    </span>
                  </summary>
                  <EvidenceList evidence={risk.evidence} />
                </details>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card padding="none">
        <CardHeader
          title="Architecture"
          subtitle={`${report.architecture.length} observations`}
        />
        <div className="px-4 pb-4">
          <FindingList
            findings={report.architecture}
            emptyText="No architectural observations recorded"
          />
        </div>
      </Card>

      <Card padding="none">
        <CardHeader
          title="Code Quality"
          subtitle={`${report.codeQualityObservations.length} observations`}
        />
        <div className="px-4 pb-4">
          <FindingList
            findings={report.codeQualityObservations}
            emptyText="No code quality observations recorded"
          />
        </div>
      </Card>

      {report.recommendedNextSteps.length > 0 && (
        <Card padding="none">
          <CardHeader
            title="Recommended Next Steps"
            subtitle={`${report.recommendedNextSteps.length} suggested actions`}
          />
          <ol className="space-y-1.5 px-4 pb-4">
            {report.recommendedNextSteps.map((step, i) => (
              <li
                key={`${i}-${step}`}
                className="flex items-start gap-2 text-sm text-ink-fg"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-forge/30 bg-forge/10 font-mono text-[10px] font-bold text-forge">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </section>
  );
}

// ── Composed report body ──────────────────────────────────────────────────────

export function ReportSections({ report }: { report: AnalysisReport }) {
  return (
    <div className="space-y-8">
      <OverviewSection report={report} />
      <CodeSection report={report} />
      <DependenciesSection report={report} />
      <DoctorSection report={report} />
      <RisksSection report={report} />
    </div>
  );
}
