import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";
import type {
  AnalysisReport,
  BuildPlan,
  ExecutionRequest,
  ProjectSnapshot,
} from "../src/domain.js";
import {
  deduplicateImportsInSource,
  generatePatchesForWorkspace,
  isValidTypeScript,
} from "../src/patch-generator.js";
import { executePatchesInWorkspace, validateExecution } from "../src/execution.js";

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function createMinimalReport(overrides?: Partial<AnalysisReport>): AnalysisReport {
  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
    overview: { fileCount: 1, analyzableFileCount: 1, totalBytes: 100 },
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
    ...overrides,
  };
}

function createMinimalSnapshot(files: { path: string; content: string }[]): ProjectSnapshot {
  return {
    snapshotId: "snap-test-1",
    createdAt: new Date().toISOString(),
    provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
    dependencies: [],
    files: files.map((f) => ({
      path: f.path,
      hash: sha256(f.content),
      size: Buffer.byteLength(f.content),
      category: "SOURCE" as const,
    })),
  };
}

test("Scenario 1: Deterministic AST duplicate import consolidation (CQ-003)", async () => {
  const code = [
    'import { alpha } from "./lib";',
    'import { beta } from "./lib";',
    'import { gamma } from "./other";',
    "",
    "export function run(): string {",
    "  return alpha() + beta() + gamma();",
    "}",
  ].join("\n");

  const consolidated = deduplicateImportsInSource(code, "test.ts");
  assert.ok(consolidated);
  assert.ok(consolidated.includes('import { alpha, beta } from "./lib";'));
  assert.equal(consolidated.split('from "./lib"').length - 1, 1);
  assert.equal(isValidTypeScript(consolidated), true);
});

test("Scenario 2: LLM-assisted targeted code modification", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reforge-scen2-"));
  try {
    const original = 'export const initial = "value";\n';
    await fs.writeFile(path.join(tempDir, "feature.ts"), original, "utf-8");

    const report = createMinimalReport();
    const build: BuildPlan = {
      objective: "Add new feature flag",
      provenance: report.provenance,
      fileChanges: [
        {
          path: "feature.ts",
          operation: "MODIFY",
          status: "EXISTING_FILE",
          reason: "Feature update",
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
      name: "test-llm",
      isConfigured: () => true,
      generate: async () => ({
        answer: 'export const initial = "value";\nexport const featureEnabled = true;\n',
      }),
    };

    const patches = await generatePatchesForWorkspace(tempDir, build, report, {
      provider: mockProvider,
      goal: "Add feature flag",
    });

    assert.equal(patches.length, 1);
    assert.ok(patches[0]?.content?.includes("export const featureEnabled = true;"));
    assert.equal(isValidTypeScript(patches[0]!.content!), true);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("Scenario 3: CREATE file generates syntactically valid scaffolding", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reforge-scen3-"));
  try {
    const report = createMinimalReport();
    const build: BuildPlan = {
      objective: "Add migration and config module",
      provenance: report.provenance,
      fileChanges: [
        {
          path: "migrations/2026_users.ts",
          operation: "CREATE",
          status: "PROPOSED_NEW_FILE",
          reason: "User migration",
          evidence: [],
        },
        {
          path: "src/settings.ts",
          operation: "CREATE",
          status: "PROPOSED_NEW_FILE",
          reason: "Settings module",
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

    const migrationPatch = patches.find((p) => p.path === "migrations/2026_users.ts");
    assert.ok(migrationPatch?.content?.includes("export async function up()"));
    assert.ok(migrationPatch?.content?.includes("export async function down()"));
    assert.equal(isValidTypeScript(migrationPatch!.content!), true);

    const settingsPatch = patches.find((p) => p.path === "src/settings.ts");
    assert.ok(settingsPatch?.content?.includes("export interface SettingsConfig"));
    assert.equal(isValidTypeScript(settingsPatch!.content!), true);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("Scenario 4: Safe rename operation requires fromPath and matching hash", () => {
  const content = 'export const name = "service";\n';
  const snapshot = createMinimalSnapshot([{ path: "old-name.ts", content }]);

  const build: BuildPlan = {
    objective: "Rename service",
    provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
    sourceSnapshotId: snapshot.snapshotId,
    fileChanges: [],
    dependencyChanges: [],
    testChanges: [],
    risks: [],
    validation: { valid: true, errors: [] },
    assumptions: [],
  };

  const req: ExecutionRequest = {
    approved: true,
    snapshot,
    snapshotId: snapshot.snapshotId,
    build,
    patches: [
      {
        path: "new-name.ts",
        operation: "RENAME",
        fromPath: "old-name.ts",
        expectedExistingHash: sha256(content),
        evidence: [],
        provenance: build.provenance,
      },
    ],
  };

  const result = validateExecution(req);
  assert.equal(result.validation.valid, true);
  assert.equal(result.validation.errors.length, 0);
});

test("Scenario 5: Deletion requires explicit allowDelete approval", () => {
  const content = 'export const legacy = true;\n';
  const snapshot = createMinimalSnapshot([{ path: "legacy.ts", content }]);

  const build: BuildPlan = {
    objective: "Remove legacy",
    provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
    sourceSnapshotId: snapshot.snapshotId,
    fileChanges: [],
    dependencyChanges: [],
    testChanges: [],
    risks: [],
    validation: { valid: true, errors: [] },
    assumptions: [],
  };

  const patch = {
    path: "legacy.ts",
    operation: "DELETE" as const,
    expectedExistingHash: sha256(content),
    evidence: [],
    provenance: build.provenance,
  };

  // Without allowDelete -> rejected
  const reqRejected: ExecutionRequest = {
    approved: true,
    allowDelete: false,
    snapshot,
    snapshotId: snapshot.snapshotId,
    build,
    patches: [patch],
  };
  const valRejected = validateExecution(reqRejected);
  assert.equal(valRejected.validation.valid, false);
  assert.ok(valRejected.validation.details?.some((e) => e.code === "DELETE_APPROVAL_REQUIRED"));

  // With allowDelete -> approved
  const reqApproved: ExecutionRequest = {
    approved: true,
    allowDelete: true,
    snapshot,
    snapshotId: snapshot.snapshotId,
    build,
    patches: [patch],
  };
  const valApproved = validateExecution(reqApproved);
  assert.equal(valApproved.validation.valid, true);
});

test("Scenario 6: Unsupported modification without LLM/rule honestly returns undefined content and rejects execution", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reforge-scen6-"));
  try {
    const content = 'export const core = 1;\n';
    await fs.writeFile(path.join(tempDir, "core.ts"), content, "utf-8");

    const report = createMinimalReport(); // No doctor duplicate import findings
    const build: BuildPlan = {
      objective: "Unknown arbitrary modification",
      provenance: report.provenance,
      fileChanges: [
        {
          path: "core.ts",
          operation: "MODIFY",
          status: "EXISTING_FILE",
          reason: "Unknown change",
          evidence: [],
        },
      ],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    };

    // No provider passed
    const patches = await generatePatchesForWorkspace(tempDir, build, report);
    assert.equal(patches.length, 1);
    // Honest: does NOT inject fake verification tokens
    assert.equal(patches[0]?.content, undefined);

    // When validated for execution, it cleanly flags MISSING_CONTENT
    const req: ExecutionRequest = {
      approved: true,
      snapshot: createMinimalSnapshot([{ path: "core.ts", content }]),
      snapshotId: "snap-test-1",
      build,
      patches,
    };
    const result = validateExecution(req);
    assert.equal(result.validation.valid, false);
    assert.ok(result.validation.details?.some((e) => e.code === "MISSING_CONTENT"));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("Scenario 7: Broken syntax from LLM is rejected by isValidTypeScript", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reforge-scen7-"));
  try {
    const content = 'export const original = 100;\n';
    await fs.writeFile(path.join(tempDir, "broken.ts"), content, "utf-8");

    const report = createMinimalReport();
    const build: BuildPlan = {
      objective: "Try broken modification",
      provenance: report.provenance,
      fileChanges: [
        {
          path: "broken.ts",
          operation: "MODIFY",
          status: "EXISTING_FILE",
          reason: "Broken update",
          evidence: [],
        },
      ],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    };

    const brokenProvider = {
      name: "broken-llm",
      isConfigured: () => true,
      generate: async () => ({
        answer: 'export const broken = ; // INVALID SYNTAX',
      }),
    };

    const patches = await generatePatchesForWorkspace(tempDir, build, report, {
      provider: brokenProvider,
      goal: "Modify with broken syntax",
    });

    assert.equal(patches.length, 1);
    // The invalid syntax is rejected, so content remains undefined rather than corrupting code
    assert.equal(patches[0]?.content, undefined);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});

test("Scenario 8: Stale snapshot (hash mismatch) is rejected with STALE_PLAN", () => {
  const snapshot = createMinimalSnapshot([{ path: "app.ts", content: "actual version" }]);

  const build: BuildPlan = {
    objective: "Modify app",
    provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
    fileChanges: [],
    dependencyChanges: [],
    testChanges: [],
    risks: [],
    validation: { valid: true, errors: [] },
    assumptions: [],
  };

  const req: ExecutionRequest = {
    approved: true,
    snapshot,
    snapshotId: snapshot.snapshotId,
    build,
    patches: [
      {
        path: "app.ts",
        operation: "MODIFY",
        expectedExistingHash: "stale-mismatched-hash-value",
        content: "new version",
        evidence: [],
        provenance: build.provenance,
      },
    ],
  };

  const result = validateExecution(req);
  assert.equal(result.validation.valid, false);
  assert.ok(result.validation.details?.some((e) => e.code === "STALE_PLAN"));
});

test("Scenario 9: Unsafe path traversal in patch is rejected with UNSAFE_PATH", () => {
  const snapshot = createMinimalSnapshot([{ path: "safe.ts", content: "safe" }]);

  const build: BuildPlan = {
    objective: "Escape directory",
    provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
    fileChanges: [],
    dependencyChanges: [],
    testChanges: [],
    risks: [],
    validation: { valid: true, errors: [] },
    assumptions: [],
  };

  const req: ExecutionRequest = {
    approved: true,
    snapshot,
    snapshotId: snapshot.snapshotId,
    build,
    patches: [
      {
        path: "../../etc/passwd",
        operation: "CREATE",
        content: "malicious",
        evidence: [],
        provenance: build.provenance,
      },
    ],
  };

  const result = validateExecution(req);
  assert.equal(result.validation.valid, false);
  assert.ok(result.validation.details?.some((e) => e.code === "UNSAFE_PATH"));
});

test("Scenario 10: Atomic rollback preserves original files when verification fails", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reforge-scen10-"));
  try {
    const originalContent = 'export const untouched: string = "original";\n';
    await fs.writeFile(path.join(tempDir, "file.ts"), originalContent, "utf-8");
    const tsconfigContent = JSON.stringify({
      compilerOptions: { noEmit: true, target: "es2022", module: "NodeNext" },
    });
    await fs.writeFile(path.join(tempDir, "tsconfig.json"), tsconfigContent, "utf-8");

    const snapshot = createMinimalSnapshot([
      { path: "file.ts", content: originalContent },
      { path: "tsconfig.json", content: tsconfigContent },
    ]);

    const build: BuildPlan = {
      objective: "Test rollback",
      provenance: { source: { kind: "local" }, licenses: [], copyrightNotices: [] },
      sourceSnapshotId: snapshot.snapshotId,
      fileChanges: [],
      dependencyChanges: [],
      testChanges: [],
      risks: [],
      validation: { valid: true, errors: [] },
      assumptions: [],
    };

    const req: ExecutionRequest = {
      approved: true,
      verify: true,
      snapshot,
      snapshotId: snapshot.snapshotId,
      build,
      patches: [
        {
          path: "file.ts",
          operation: "MODIFY",
          expectedExistingHash: sha256(originalContent),
          content: 'export const untouched: number = "type error string";\n',
          evidence: [],
          provenance: build.provenance,
        },
      ],
    };

    const receipt = await executePatchesInWorkspace(tempDir, req);
    assert.equal(receipt.status, "FAILED");
    assert.equal(receipt.rollback.attempted, true);
    assert.equal(receipt.rollback.succeeded, true);

    // File MUST be rolled back to original content
    const restored = await fs.readFile(path.join(tempDir, "file.ts"), "utf-8");
    assert.equal(restored, originalContent);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
});
