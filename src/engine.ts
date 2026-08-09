import path from "node:path";
import type { AnalysisReport, Analyzer, ProjectSource } from "./domain.js";
import { defaultAnalyzers } from "./analyzers.js";
import { scanProject } from "./scanner.js";
import { runProjectDoctor } from "./doctor.js";

export class AnalysisEngine {
  public constructor(private readonly analyzers: Analyzer[] = defaultAnalyzers) {}
  public async analyze(root: string, source: ProjectSource): Promise<AnalysisReport> {
    const scan = await scanProject(root);
    const partials = this.analyzers.map((analyzer) => analyzer.analyze(scan));
    const merged = Object.assign({}, ...partials) as Partial<AnalysisReport>;
    const model = merged.projectModel;
    const doctor = model ? runProjectDoctor(model, merged.risks) : undefined;
    return {
      schemaVersion: "1.0", generatedAt: new Date().toISOString(),
      provenance: { ...(merged.provenance ?? { licenses: [], copyrightNotices: [] }), source },
      overview: { fileCount: scan.files.length, analyzableFileCount: scan.files.filter((f) => f.text !== undefined).length, totalBytes: scan.files.reduce((sum, f) => sum + f.size, 0) },
      languages: merged.languages ?? [], frameworks: merged.frameworks ?? [], dependencies: merged.dependencies ?? [],
      structure: { topLevel: [...new Set(scan.files.map((f) => f.relativePath.split("/")[0] ?? f.relativePath))].sort(), importantFiles: scan.files.filter((f) => /(^|\/)(package\.json|README|dockerfile|compose\.ya?ml|main\.|index\.|server\.|app\.)/i.test(f.relativePath)).slice(0, 30).map((f) => f.relativePath), ignoredDirectories: scan.ignoredDirectories },
      entryPoints: merged.entryPoints ?? [], apiHints: model?.apiEndpoints.map((endpoint) => ({ name: `${endpoint.method} ${endpoint.path}`, confidence: "high", evidence: [endpoint.evidence] })) ?? merged.apiHints ?? [], databaseHints: model?.databaseTechnologies ?? merged.databaseHints ?? [], authenticationHints: model?.authenticationTechnologies ?? merged.authenticationHints ?? [], architecture: merged.architecture ?? [], codeQualityObservations: merged.codeQualityObservations ?? [], risks: merged.risks ?? [], projectModel: model,
      recommendedNextSteps: ["Run parser-backed symbol and call-graph analysis.", "Review detected licenses and provenance before reuse.", "Run dependency vulnerability and test-coverage analysis."], doctor,
    };
  }
}
