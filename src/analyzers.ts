import path from "node:path";
import type { AnalysisReport, Analyzer, Evidence, Finding, ScanResult } from "./domain.js";
import { projectXRayAnalyzer } from "./xray-analyzer.js";

const LANGUAGE_BY_EXTENSION: Record<string, string> = { ".ts": "TypeScript", ".tsx": "TypeScript", ".js": "JavaScript", ".jsx": "JavaScript", ".py": "Python", ".java": "Java", ".go": "Go", ".rs": "Rust", ".cs": "C#", ".php": "PHP", ".rb": "Ruby", ".swift": "Swift", ".kt": "Kotlin", ".c": "C", ".h": "C/C++", ".cpp": "C++", ".vue": "Vue", ".svelte": "Svelte", ".html": "HTML", ".css": "CSS", ".sql": "SQL" };
const textFiles = (scan: ScanResult) => scan.files.filter((f) => f.text !== undefined);
const matching = (scan: ScanResult, pattern: RegExp): Evidence[] => textFiles(scan).filter((f) => pattern.test(f.text!)).slice(0, 10).map((f) => ({ file: f.relativePath, detail: `Matched ${pattern.source}` }));
const finding = (name: string, evidence: Evidence[], confidence: Finding["confidence"] = "high"): Finding => ({ name, confidence, evidence });

export const languageAnalyzer: Analyzer = { name: "language", analyze(scan) {
  const counts = new Map<string, Evidence[]>();
  for (const file of scan.files) {
    const language = LANGUAGE_BY_EXTENSION[file.extension];
    if (language) counts.set(language, [...(counts.get(language) ?? []), { file: file.relativePath, detail: file.extension }]);
  }
  return { languages: [...counts.entries()].map(([name, evidence]) => finding(name, evidence.slice(0, 10))).sort((a, b) => b.evidence.length - a.evidence.length) };
}};

export const manifestAnalyzer: Analyzer = { name: "manifest", analyze(scan) {
  const dependencies: Finding[] = [];
  const frameworks: Finding[] = [];
  for (const file of scan.files.filter((f) => f.relativePath.endsWith("package.json") && f.text)) {
    try {
      const pkg = JSON.parse(file.text!) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; peerDependencies?: Record<string, string> };
      const all = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
      for (const [name, version] of Object.entries(all)) dependencies.push(finding(name, [{ file: file.relativePath, detail: version }]));
      const frameworkNames = ["next", "react", "vue", "@angular/core", "express", "fastify", "nestjs", "@nestjs/core"];
      for (const name of frameworkNames) if (all[name]) frameworks.push(finding(name, [{ file: file.relativePath, detail: all[name] }]));
    } catch { /* invalid manifests are reported as a risk */ }
  }
  const files = new Set(scan.files.map((f) => f.relativePath));
  if (files.has("requirements.txt") || files.has("pyproject.toml")) frameworks.push(finding("Python project", [{ file: files.has("pyproject.toml") ? "pyproject.toml" : "requirements.txt", detail: "Python manifest detected" }]));
  if (files.has("Cargo.toml")) frameworks.push(finding("Rust project", [{ file: "Cargo.toml", detail: "Rust manifest detected" }]));
  return { dependencies, frameworks };
}};

export const sourceHintAnalyzer: Analyzer = { name: "source-hints", analyze(scan) {
  const entryPoints = scan.files.filter((f) => /(^|\/)(main|index|server|app)\.(ts|tsx|js|jsx|py|java|go)$/i.test(f.relativePath)).slice(0, 15).map((f) => finding(path.basename(f.relativePath), [{ file: f.relativePath, detail: "Conventional entry-point filename" }], "medium"));
  const apiHints = matching(scan, /\b(app|router)\.(get|post|put|patch|delete)\s*\(|@(Get|Post|Put|Delete)\b|\bRoute\s*\(/).map((e) => finding("HTTP route definition", [e], "medium"));
  const databaseHints = matching(scan, /\b(prisma|mongoose|sequelize|typeorm|knex|postgres|mysql|mongodb|sqlite)\b/i).map((e) => finding("Database technology reference", [e], "medium"));
  const authenticationHints = matching(scan, /\b(jwt|jsonwebtoken|passport|oauth|nextauth|auth0|firebase auth)\b/i).map((e) => finding("Authentication technology reference", [e], "medium"));
  const architecture = [] as Finding[];
  if (scan.files.some((f) => /(^|\/)(controllers?|routes?)\//i.test(f.relativePath)) && scan.files.some((f) => /(^|\/)(services?)\//i.test(f.relativePath))) architecture.push(finding("Layered HTTP application", [{ file: "(directory structure)", detail: "Both controller/route and service directories observed" }], "medium"));
  return { entryPoints, apiHints, databaseHints, authenticationHints, architecture };
}};

export const provenanceAndRiskAnalyzer: Analyzer = { name: "provenance-and-risks", analyze(scan) {
  const licenses = scan.files.filter((f) => /(^|\/)(license|copying|notice)(\.|$)/i.test(f.relativePath)).map((f) => ({ file: f.relativePath, detail: "Potential license or notice file" }));
  const copyrightNotices = matching(scan, /copyright\s*(\(c\))?/i);
  const risks: Finding[] = [];
  const secrets = matching(scan, /(api[_-]?key|secret|password)\s*[:=]\s*["'][^"']{8,}/i);
  if (secrets.length) risks.push(finding("Potential hard-coded secret", secrets, "low"));
  const todos = matching(scan, /\b(TODO|FIXME|HACK)\b/);
  if (todos.length) risks.push(finding("Unresolved code markers", todos, "low"));
  const quality: Finding[] = [];
  if (scan.skippedFiles) quality.push(finding("Some files were not text-analyzed", [{ file: "(scan)", detail: `${scan.skippedFiles} file(s) skipped due to limits or decoding` }], "high"));
  for (const file of scan.files.filter((item) => item.relativePath === "package.json" && item.text)) {
    try { JSON.parse(file.text!); } catch { quality.push(finding("Malformed package manifest", [{ file: file.relativePath, detail: "package.json could not be parsed as JSON" }], "high")); }
  }
  return { provenance: { source: { kind: "local" }, licenses, copyrightNotices }, risks, codeQualityObservations: quality };
}};

export const defaultAnalyzers = [languageAnalyzer, manifestAnalyzer, sourceHintAnalyzer, provenanceAndRiskAnalyzer, projectXRayAnalyzer];
