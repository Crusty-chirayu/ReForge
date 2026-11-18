import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { AnalysisReport, BuildPlan } from "../src/domain.js";
import {
  deduplicateImportsInSource,
  generatePatchesForWorkspace,
  isValidTypeScript,
} from "../src/patch-generator.js";

test("isValidTypeScript: detects valid vs invalid syntax", () => {
  assert.equal(isValidTypeScript("export const x: number = 42;"), true);
  assert.equal(isValidTypeScript("export const x: = ;"), false);
});

test("deduplicateImportsInSource: consolidates multiple imports from the same specifier", () => {
  const code = `import { foo } from "./utils";\nimport { bar } from "./utils";\n\nexport function test() { return foo() + bar(); }\n`;
  const result = deduplicateImportsInSource(code, "test.ts");

  assert.ok(result);
  assert.ok(result.includes('import { bar, foo } from "./utils";'));
  assert.equal(result.split('from "./utils"').length - 1, 1);
  assert.ok(result.includes("export function test()"));
  assert.equal(isValidTypeScript(result), true);
});

test("generatePatchesForWorkspace: produces valid code patches without dummy strings", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reforge-patch-test-"));
  try {
    const existingCode = `export const originalFunction = () => "working";\n`;
    await fs.writeFile(path.join(tempDir, "existing.ts"), existingCode, "utf-8");

    const report: AnalysisReport = {
      schemaVersion: "1.0",
      generatedAt: new Date().toISOString(),
      provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
      overview: { fileCount: 1, analyzableFileCount: 1, totalBytes: 50 },
      languages: [],
      frameworks: [],
      dependencies: [],
      structure: { topLevel: [], importantFiles: [], ignoredDirectories: [] },
      entryPoints: [],
      apiHints: [],
      databaseHints: [],
      authenticationHints: [],
      architecture: [],
      codeQualityObservations: [],
      risks: [],
      recommendedNextSteps: [],
      doctor: undefined,
    };

    const build: BuildPlan = {
      objective: "Enhance existing modules",
      provenance: report.provenance,
      fileChanges: [
        {
          path: "existing.ts",
          operation: "MODIFY",
          status: "EXISTING_FILE",
          reason: "Enhancement",
          evidence: [],
        },
        {
          path: "migrations/2026_init.ts",
          operation: "CREATE",
          status: "PROPOSED_NEW_FILE",
          reason: "Database migration",
          evidence: [],
        },
      ],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    };

    const patches = await generatePatchesForWorkspace(tempDir, build, report);

    assert.equal(patches.length, 2);

    // Verify MODIFY patch: does NOT append fake tokens or dummy comments when unassisted
    const modifyPatch = patches.find((p) => p.path === "existing.ts");
    assert.ok(modifyPatch);
    assert.equal(modifyPatch.content, undefined);

    // Verify CREATE patch: creates syntactically valid migration
    const createPatch = patches.find((p) => p.path === "migrations/2026_init.ts");
    assert.ok(createPatch);
    assert.ok(createPatch.content);
    assert.ok(!createPatch.content.startsWith("// Created by ReForge Pipeline"));
    assert.ok(createPatch.content.includes("export async function up()"));
    assert.ok(createPatch.content.includes("export async function down()"));
    assert.equal(isValidTypeScript(createPatch.content), true);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("generatePatchesForWorkspace: performs LLM transformation when provider is configured", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reforge-patch-llm-"));
  try {
    const existingCode = `export const original = 1;\n`;
    await fs.writeFile(path.join(tempDir, "mod.ts"), existingCode, "utf-8");

    const report: AnalysisReport = {
      schemaVersion: "1.0",
      generatedAt: new Date().toISOString(),
      provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
      overview: { fileCount: 1, analyzableFileCount: 1, totalBytes: 30 },
      languages: [],
      frameworks: [],
      dependencies: [],
      structure: { topLevel: [], importantFiles: [], ignoredDirectories: [] },
      entryPoints: [],
      apiHints: [],
      databaseHints: [],
      authenticationHints: [],
      architecture: [],
      codeQualityObservations: [],
      risks: [],
      recommendedNextSteps: [],
      doctor: undefined,
    };

    const build: BuildPlan = {
      objective: "Update mod.ts",
      provenance: report.provenance,
      fileChanges: [
        {
          path: "mod.ts",
          operation: "MODIFY",
          status: "EXISTING_FILE",
          reason: "Targeted update",
          evidence: [],
        },
      ],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    };

    const mockProvider = {
      name: "mock-llm",
      isConfigured: () => true,
      generate: async () => ({
        answer: `export const original = 1;\nexport const updated = 2;\n`,
      }),
    };

    const patches = await generatePatchesForWorkspace(tempDir, build, report, {
      provider: mockProvider,
      goal: "Add updated export",
    });

    assert.equal(patches.length, 1);
    assert.ok(patches[0]?.content?.includes("export const updated = 2;"));
    assert.equal(isValidTypeScript(patches[0]!.content!), true);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});
