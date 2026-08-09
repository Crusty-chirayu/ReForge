import type { AnalysisReport, BrainResponse, Evidence } from "./domain.js";

export interface LLMProvider { generate(request: { system: string; prompt: string }): Promise<{ answer: string; confidence?: "HIGH" | "MEDIUM" | "LOW"; inferences?: { statement: string; confidence?: "HIGH" | "MEDIUM" | "LOW" }[]; evidence?: Evidence[] }>; }
export const PROJECT_BRAIN_SYSTEM = "You are ReForge Project Brain. Deterministic facts are authoritative. Do not invent files, dependencies, APIs, vulnerabilities, or evidence. Separate inference from facts; cite only supplied evidence; say when context is insufficient. Respect provenance and never remove attribution. You are not an autonomous code modifier.";
const words = (value: string) => value.toLowerCase().match(/[a-z0-9_./-]+/g) ?? [];
const uniqueEvidence = (report: AnalysisReport): Evidence[] => {
  const items: Evidence[] = [...report.provenance.licenses, ...report.provenance.copyrightNotices, ...report.languages.flatMap((x) => x.evidence), ...report.frameworks.flatMap((x) => x.evidence), ...(report.doctor?.findings.flatMap((x) => x.evidence) ?? [])];
  return items.filter((item, index) => items.findIndex((other) => other.file === item.file && other.detail === item.detail) === index);
};
export function buildBrainContext(report: AnalysisReport, question: string, budget = 8_000): { text: string; used: string[]; truncated: boolean; evidence: Evidence[] } {
  const model = report.projectModel; if (!model) throw new Error("Project Brain requires a Project X-Ray report.");
  const terms = new Set(words(question)); const score = (value: string) => words(value).filter((word) => terms.has(word)).length;
  const modules = [...model.modules].sort((a, b) => score(`${b.id} ${b.symbols.join(" ")}`) - score(`${a.id} ${a.symbols.join(" ")}`)).slice(0, 12);
  const findings = [...(report.doctor?.findings ?? [])].sort((a, b) => score(`${b.title} ${b.description}`) - score(`${a.title} ${a.description}`)).slice(0, 10);
  const allEvidence = uniqueEvidence(report); const matchedEvidence = allEvidence.filter((item) => score(`${item.file} ${item.detail}`) > 0);
  const evidence = (matchedEvidence.length ? matchedEvidence : allEvidence).slice(0, 20);
  const payload = { project: { name: model.name, languages: report.languages, frameworks: report.frameworks, dependencies: model.dependencies.slice(0, 30), APIs: model.apiEndpoints, database: model.databaseTechnologies, authentication: model.authenticationTechnologies, metrics: model.metrics, provenance: report.provenance }, relevantModules: modules, doctorFindings: findings, evidence };
  const full = JSON.stringify(payload); return { text: full.slice(0, budget), used: ["project summary", "relevant modules", "doctor findings", "evidence"], truncated: full.length > budget, evidence };
}
export class ProjectBrain {
  public constructor(private readonly provider?: LLMProvider) {}
  public async query(report: AnalysisReport, question: string): Promise<BrainResponse> {
    if (!this.provider) throw new Error("Project Brain is not configured. Configure an LLM provider before querying.");
    const context = buildBrainContext(report, question);
    let raw: Awaited<ReturnType<LLMProvider["generate"]>>; try { raw = await this.provider.generate({ system: PROJECT_BRAIN_SYSTEM, prompt: `Question: ${question}\nDeterministic context: ${context.text}` }); } catch { throw new Error("Project Brain provider request failed."); }
    if (!raw || typeof raw.answer !== "string") throw new Error("Project Brain provider returned an invalid response.");
    const known = context.evidence; const evidence = (raw.evidence ?? []).filter((item) => known.some((knownItem) => knownItem.file === item.file && knownItem.detail === item.detail));
    return { answer: raw.answer, confidence: raw.confidence ?? "LOW", inferences: (raw.inferences ?? []).filter((item) => typeof item.statement === "string").map((item) => ({ statement: item.statement, confidence: item.confidence ?? "LOW", verified: false })), evidence, limitations: ["AI output is inference; deterministic report facts remain authoritative.", ...(context.truncated ? ["Context was truncated; omitted project details were not provided to the model."] : [])], contextUsed: context.used, contextTruncated: context.truncated };
  }
}
