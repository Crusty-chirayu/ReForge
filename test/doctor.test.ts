import assert from "node:assert/strict";
import test from "node:test";
import { runProjectDoctor } from "../src/doctor.js";
import type { ProjectModel } from "../src/domain.js";

const model: ProjectModel = {
  name: "doctor-fixture", root: { path: "fixture" }, packageManagers: [], dependencies: [], sourceDirectories: ["src"], testDirectories: [], configurationFiles: [], environmentFiles: [], entryPoints: [], apiEndpoints: [], databaseTechnologies: [], authenticationTechnologies: [],
  files: [{ path: "src/a.ts", extension: ".ts", language: "TypeScript", size: 1, lineCount: 600, category: "SOURCE" }],
  modules: [
    { id: "src/a.ts", imports: [{ specifier: "./b", kind: "internal", target: "src/b.ts", symbols: [], evidence: { file: "src/a.ts", detail: "line 1: imports ./b" } }, { specifier: "zod", kind: "external", symbols: [], evidence: { file: "src/a.ts", detail: "line 2: imports zod" } }, { specifier: "zod", kind: "external", symbols: [], evidence: { file: "src/a.ts", detail: "line 3: imports zod" } }], exports: [], symbols: [], relationships: ["src/b.ts"] },
    { id: "src/b.ts", imports: [{ specifier: "./a", kind: "internal", target: "src/a.ts", symbols: [], evidence: { file: "src/b.ts", detail: "line 1: imports ./a" } }], exports: [], symbols: [], relationships: ["src/a.ts"] }
  ], symbols: [], metrics: { totalFiles: 2, sourceFiles: 6, testFiles: 0, totalLines: 600, sourceLines: 600, largestFiles: [], largestModules: [], dependencyCount: 55, internalModuleCount: 2, testSourceRatio: 0 }
};

test("produces evidence-backed deterministic Doctor findings", () => {
  const doctor = runProjectDoctor(model, [{ name: "Potential hard-coded secret", confidence: "low", evidence: [{ file: "src/a.ts", detail: "Matched secret assignment" }] }]);
  for (const rule of ["CQ-001", "CQ-003", "ARCH-003", "TEST-001", "DEP-001", "SEC-001"]) assert.ok(doctor.findings.some((item) => item.ruleId === rule));
  for (const item of doctor.findings) { assert.ok(item.evidence.length > 0); assert.ok(item.remediation.length > 0); }
  const secret = doctor.findings.find((item) => item.ruleId === "SEC-001")!;
  assert.ok(!secret.description.includes("actual-secret"));
  assert.ok(doctor.healthScore < 100 && doctor.healthScore >= 0);
  assert.equal(doctor.summary.bySeverity.HIGH, 2);
});

test("does not create testing or secret findings without evidence", () => {
  const safe: ProjectModel = { ...model, metrics: { ...model.metrics, testFiles: 2, sourceFiles: 2, testSourceRatio: 1, dependencyCount: 1 }, files: [{ ...model.files[0]!, lineCount: 10 }], modules: [] };
  const doctor = runProjectDoctor(safe);
  assert.ok(!doctor.findings.some((item) => item.ruleId === "TEST-001" || item.ruleId === "TEST-002" || item.ruleId === "SEC-001"));
});
