import assert from "node:assert/strict";
import test from "node:test";
import { analyzeImpact, parseChangeRequest } from "../src/impact.js";
import type { AnalysisReport } from "../src/domain.js";
const report = { projectModel: { modules: [{ id: "src/db.ts", symbols: [], imports: [{ specifier: "mongodb" }], relationships: [] }, { id: "src/service.ts", symbols: [], imports: [], relationships: ["src/db.ts"] }, { id: "src/api.ts", symbols: [], imports: [], relationships: ["src/service.ts"] }], apiEndpoints: [{ file: "src/api.ts" }], dependencies: [{ name: "mongodb" }], files: [{ category: "TEST" }] }, doctor: { findings: [] } } as unknown as AnalysisReport;
test("parses and traverses transitive database impact", () => { const impact = analyzeImpact(report, { request: "Replace MongoDB with PostgreSQL" }); assert.equal(impact.request.category, "DATABASE"); assert.ok(impact.directModules.includes("src/db.ts")); assert.ok(impact.indirectModules.includes("src/service.ts")); assert.ok(impact.blastRadius.apiRoutes === 1); });
test("returns unknown conservatively", () => assert.equal(parseChangeRequest("make it better").category, "UNKNOWN"));
