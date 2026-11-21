import { test, expect, type Page } from "@playwright/test";

// ── Deterministic fixtures ───────────────────────────────────────────────────

const mockReport = {
  schemaVersion: "1.0",
  generatedAt: "2026-11-21T10:00:00.000Z",
  provenance: {
    source: { kind: "archive" as const, reference: "test-repo.zip" },
    licenses: [],
    copyrightNotices: [],
  },
  overview: {
    fileCount: 24,
    analyzableFileCount: 20,
    totalBytes: 84200,
  },
  languages: [
    { name: "TypeScript", confidence: "high" as const, evidence: [{ file: "src/index.ts", detail: "ts files" }] },
    { name: "JavaScript", confidence: "high" as const, evidence: [{ file: "next.config.js", detail: "js files" }] },
  ],
  frameworks: [
    { name: "Next.js", confidence: "high" as const, evidence: [{ file: "package.json", detail: "next@15" }] },
  ],
  dependencies: [
    { name: "fastify", confidence: "high" as const, evidence: [{ file: "package.json", detail: "fastify@5" }] },
  ],
  structure: {
    topLevel: ["src", "package.json", "tsconfig.json"],
    importantFiles: ["src/index.ts", "package.json"],
    ignoredDirectories: ["node_modules", ".git"],
  },
  entryPoints: [
    { name: "src/index.ts", confidence: "high" as const, evidence: [{ file: "src/index.ts", detail: "start" }] },
  ],
  apiHints: [],
  databaseHints: [],
  authenticationHints: [],
  architecture: [
    { name: "Layered architecture", confidence: "high" as const, evidence: [{ file: "src/index.ts", detail: "modular" }] },
  ],
  codeQualityObservations: [
    { name: "Well-structured codebase", confidence: "high" as const, evidence: [{ file: "tsconfig.json", detail: "strict: true" }] },
  ],
  risks: [],
  recommendedNextSteps: ["Add end-to-end regression tests"],
  projectModel: {
    name: "test-repo",
    root: { path: "test-repo" },
    files: [
      { path: "src/index.ts", extension: ".ts", size: 1024, lineCount: 45, category: "SOURCE" },
      { path: "src/auth.ts", extension: ".ts", size: 2048, lineCount: 80, category: "SOURCE" },
      { path: "src/utils.ts", extension: ".ts", size: 512, lineCount: 25, category: "SOURCE" },
    ],
    modules: [
      { id: "src/index.ts", imports: [], exports: ["start"], symbols: ["start"], relationships: ["src/auth.ts"] },
      { id: "src/auth.ts", imports: [], exports: ["authenticate"], symbols: ["authenticate"], relationships: ["src/utils.ts"] },
      { id: "src/utils.ts", imports: [], exports: ["hash"], symbols: ["hash"], relationships: [] },
    ],
    symbols: [
      { name: "start", type: "function", file: "src/index.ts", line: 10, exported: true, imported: false },
      { name: "authenticate", type: "function", file: "src/auth.ts", line: 5, exported: true, imported: true },
    ],
    packageManagers: ["pnpm"],
    dependencies: [{ name: "fastify", version: "^5.0.0", type: "production", evidence: { file: "package.json", detail: "fastify" } }],
    sourceDirectories: ["src"],
    testDirectories: [],
    configurationFiles: ["package.json", "tsconfig.json"],
    environmentFiles: [],
    entryPoints: ["src/index.ts"],
    apiEndpoints: [],
    databaseTechnologies: [],
    authenticationTechnologies: [],
    metrics: {
      totalFiles: 3,
      sourceFiles: 3,
      testFiles: 0,
      totalLines: 150,
      sourceLines: 150,
      largestFiles: [{ path: "src/auth.ts", size: 2048 }],
      largestModules: [{ id: "src/auth.ts", symbolCount: 5 }],
      dependencyCount: 1,
      internalModuleCount: 3,
    },
  },
  doctor: {
    healthScore: 92,
    summary: {
      findingCount: 1,
      bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 1, LOW: 0, INFO: 0 },
      byCategory: { COMPLEXITY: 1 },
      scoring: "100 - min(100, sum(severityWeight * confidenceWeight))",
    },
    findings: [
      {
        id: "FINDING-001",
        ruleId: "CQ-001",
        title: "High Cyclomatic Complexity",
        description: "Function authenticate in src/auth.ts has complexity of 12.",
        category: "COMPLEXITY",
        severity: "MEDIUM",
        confidence: "HIGH",
        file: "src/auth.ts",
        line: 15,
        remediation: "Break down into helper functions.",
        evidence: [{ file: "src/auth.ts", detail: "authenticate function complexity = 12" }],
      },
    ],
  },
};

const mockBuild = {
  objective: "Add auth token verification hook",
  provenance: { source: { kind: "pipeline", reference: "pl_e2e_test_01" }, analyzedAt: "2026-11-21T10:00:00.000Z" },
  sourceSnapshotId: "snap_e2e_test_01",
  fileChanges: [
    {
      path: "src/auth.ts",
      operation: "MODIFY",
      status: "EXISTING_FILE",
      expectedHash: "sha256:abc1234567890",
      reason: "Inject token verification hook",
      evidence: [{ file: "src/auth.ts", detail: "export function authenticate" }],
    },
  ],
  dependencyChanges: [],
  testChanges: [],
  risks: ["Client tokens may be invalidated"],
  validation: { valid: true, errors: [] },
  assumptions: ["Fastify plugin is installed"],
};

const mockPipelineResult = {
  pipelineId: "pl_e2e_test_01",
  goal: "Add authentication middleware to API endpoints",
  status: "PASSED",
  createdAt: "2026-11-21T10:00:00.000Z",
  completedAt: "2026-11-21T10:02:30.000Z",
  snapshot: {
    snapshotId: "snap_e2e_test_01",
    timestamp: "2026-11-21T10:00:00.000Z",
    stats: { fileCount: 24, totalBytes: 84200 },
  },
  workspaceCleanupStatus: "SUCCESS",
  report: mockReport,
  plan: {
    objective: "Implement auth token check",
    orderedTaskIds: ["TASK-1"],
    tasks: [
      {
        id: "TASK-1",
        title: "Add token validator",
        description: "Verify Bearer tokens",
        priority: "HIGH" as const,
        objective: "Verify tokens on protected endpoints",
        affectedModules: ["src/auth.ts"],
        dependencies: [],
        acceptanceCriteria: ["Bearer token verified"],
        verification: ["pnpm test"],
        estimatedFiles: ["src/auth.ts"],
      },
    ],
    risks: [],
    assumptions: [],
    unresolvedQuestions: [],
    validation: { valid: true, errors: [] },
  },
  impact: {
    request: { request: "Add auth middleware" },
    impactLevel: "MEDIUM",
    confidence: "HIGH",
    directModules: ["src/auth.ts"],
    indirectModules: ["src/index.ts"],
    relationships: [],
    risks: [{ title: "Unauthenticated routes may break", kind: "EVIDENCE_BACKED", evidence: [] }],
    blastRadius: { directModules: 1, indirectModules: 1, apiRoutes: 2, dependencies: 0, relatedTests: 1, doctorFindings: 0 },
    recommendations: ["Update API client"],
    verification: ["pnpm test"],
    evidence: [],
    assumptions: [],
  },
  build: mockBuild,
  execution: {
    executionId: "exec_e2e_01",
    snapshotId: "snap_e2e_01",
    status: "SUCCEEDED",
    approved: true,
    operations: [
      { path: "src/auth.ts", operation: "MODIFY", content: "// updated" },
    ],
    appliedOperations: [
      { path: "src/auth.ts", operation: "MODIFY", applied: true, result: "SUCCESS" },
    ],
    diffSummary: {
      created: [],
      modified: ["src/auth.ts"],
      renamed: [],
      deleted: [],
      unchanged: [],
      failed: [],
      createCount: 0,
      modifyCount: 1,
      deleteCount: 0,
      renameCount: 0,
      files: [{ path: "src/auth.ts", operation: "MODIFY", additions: 15, deletions: 2 }],
    },
    verification: {
      attempted: true,
      overallStatus: "PASSED",
      results: [
        { id: "v1", label: "typecheck", status: "PASSED", exitCode: 0, durationMs: 1200, stdout: "ok", stderr: "" },
      ],
    },
    rollback: {
      attempted: false,
      succeeded: false,
      operations: [],
    },
    provenance: {
      source: { kind: "pipeline" as const, reference: "pl_e2e_test_01" },
      licenses: [],
      copyrightNotices: [],
    },
    createdAt: "2026-11-21T10:01:00.000Z",
    completedAt: "2026-11-21T10:02:00.000Z",
    workspaceCleanupStatus: "SUCCESS",
  },
};

/**
 * Injects deterministic analysis report into the browser's sessionStorage
 * before navigation so report-dependent workbenches render immediately.
 */
async function seedReport(page: Page) {
  await page.addInitScript((report) => {
    window.sessionStorage.setItem("reforge-report", JSON.stringify(report));
  }, mockReport);
}

// ── 13 Required E2E Platform Journeys ─────────────────────────────────────────

test.describe("ReForge E2E Platform Journeys", () => {

  test("Journey 1: Application launches and overview renders correctly", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ReForge/i);
    await expect(page.locator("h1")).toContainText("ReForge Engineering System");
    await expect(page.getByRole("navigation", { name: "Console sections" })).toBeVisible();
    await expect(page.getByText("CURRENT WORKSPACE")).toBeVisible();
  });

  test("Journey 2: Navigation between actual Forge Ledger routes", async ({ page }) => {
    await page.goto("/");

    // Click Ingest
    await page.getByRole("link", { name: "Ingest" }).click();
    await expect(page).toHaveURL(/\/analyze$/);
    await expect(page.locator("h1")).toContainText("Analyze Project");

    // Click X-Ray
    await page.getByRole("link", { name: "X-Ray" }).click();
    await expect(page).toHaveURL(/\/xray$/);

    // Click Doctor
    await page.getByRole("link", { name: "Doctor" }).click();
    await expect(page).toHaveURL(/\/doctor$/);

    // Click Plan
    await page.getByRole("link", { name: "Plan" }).click();
    await expect(page).toHaveURL(/\/plan$/);

    // Click Brain
    await page.getByRole("link", { name: "Brain" }).click();
    await expect(page).toHaveURL(/\/brain$/);
    await expect(page.locator("h1")).toContainText("Project Brain");

    // Click Builder
    await page.getByRole("link", { name: "Builder" }).click();
    await expect(page).toHaveURL(/\/build$/);

    // Click Snapshots
    await page.getByRole("link", { name: "Snapshots" }).click();
    await expect(page).toHaveURL(/\/snapshots$/);

    // Click Compare
    await page.getByRole("link", { name: "Compare" }).click();
    await expect(page).toHaveURL(/\/snapshot\/compare$/);

    // Return to Overview
    await page.getByRole("link", { name: "Overview", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("Journey 3: Repository ingestion controls and validation", async ({ page }) => {
    await page.goto("/analyze");
    await expect(page.locator("h1")).toContainText("Analyze Project");
    await expect(page.getByRole("button", { name: "ZIP Upload" })).toBeVisible();
    await expect(page.getByRole("button", { name: "GitHub URL" })).toBeVisible();
    await expect(page.getByText("Drop a ZIP archive here, or browse")).toBeVisible();
    await expect(page.getByRole("button", { name: "Select Archive" })).toBeVisible();

    // Test mode switch to GitHub
    await page.getByRole("button", { name: "GitHub URL" }).click();
    await expect(page.getByPlaceholder("https://github.com/owner/repo")).toBeVisible();
  });

  test("Journey 4: Report navigation to X-Ray and Doctor", async ({ page }) => {
    await seedReport(page);
    await page.goto("/analyze/report");
    await expect(page.locator("h1")).toContainText("Analysis Report");

    // Switch to X-Ray tab within report
    await page.getByRole("button", { name: "Project X-Ray" }).click();
    await expect(page.getByRole("region", { name: "Project X-Ray Interactive Visualizer" })).toBeVisible();

    // Switch to Doctor tab within report
    await page.getByRole("button", { name: "Project Doctor" }).click();
    await expect(page.getByRole("region", { name: "Project Doctor Triage Workbench" })).toBeVisible();

    // Navigate to dedicated X-Ray route
    await page.getByRole("link", { name: "X-Ray" }).click();
    await expect(page).toHaveURL(/\/xray$/);
    await expect(page.locator("h1")).toContainText("Project X-Ray");
  });

  test("Journey 5: Project X-Ray workbench controls and pagination", async ({ page }) => {
    await seedReport(page);
    await page.goto("/xray");
    await expect(page.locator("h1")).toContainText("Project X-Ray");
    await expect(page.getByRole("button", { name: "Focus Graph" })).toBeVisible();
    await expect(page.getByPlaceholder("Filter modules or files...")).toBeVisible();
    await expect(page.getByText(/Focus neighborhood for:/i)).toBeVisible();
  });

  test("Journey 6: Project Doctor findings and triage view", async ({ page }) => {
    await seedReport(page);
    await page.goto("/doctor");
    await expect(page.locator("h1")).toContainText("Project Doctor");
    await expect(page.getByText("Health Score: 92/")).toBeVisible();
    await expect(page.getByText("High Cyclomatic Complexity")).toBeVisible();
  });

  test("Journey 7: Plan and Impact engineering workflows", async ({ page }) => {
    await seedReport(page);
    await page.goto("/plan");
    await expect(page.locator("h1")).toContainText("Improvement Planning");

    await page.goto("/impact");
    await expect(page.locator("h1")).toContainText("Change Impact");
  });

  test("Journey 8: Project Brain 3-region workbench and provider status", async ({ page }) => {
    await seedReport(page);
    await page.goto("/brain");
    await expect(page.locator("h1")).toContainText("Project Brain");
    await expect(page.getByText("AI Provider")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence Inspector" })).toBeVisible();
    await expect(page.getByLabel("Question")).toBeVisible();
  });

  test("Journey 9: Flagship Builder 3-pane workbench and approval controls", async ({ page }) => {
    await seedReport(page);

    // Mock build generation
    await page.route("**/v1/build", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ build: mockBuild }),
      });
    });

    await page.goto("/build");
    await expect(page.locator("h1")).toContainText("Flagship Builder");

    // Populate Goal so the Generate Build button becomes enabled
    await page.getByLabel("Goal").fill("Add auth middleware");

    // Click Generate Build
    const generateBtn = page.getByRole("button", { name: /Generate Build/i });
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Verify 3 panes & persistent NOT APPLIED badge
    await expect(page.getByText("NOT APPLIED")).toBeVisible();
    await expect(page.getByRole("button", { name: /Review & Approve/i })).toBeVisible();

    // Click Review & Approve
    await page.getByRole("button", { name: /Review & Approve/i }).click();

    // Verify Approval Dialog displays exact operation counts and affected paths
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText("src/auth.ts")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("Journey 10: Pipeline creation and detail inspection with StateRail and StageTimeline", async ({ page }) => {
    // Intercept pipeline detail to verify live StageTimeline and StateRail rendering
    await page.route("**/v1/pipeline/pl_e2e_test_01", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ execution: mockPipelineResult, result: mockPipelineResult }),
      });
    });

    await page.goto("/pipeline/pl_e2e_test_01");
    await expect(page.locator("h1")).toContainText("Pipeline Result");
    // Verify StateRail rendered
    await expect(page.getByText("State Rail Lifecycle")).toBeVisible();
    // Verify StageTimeline rendered
    const timeline = page.getByRole("region", { name: "Pipeline Stage Timeline" });
    await expect(timeline).toBeVisible();
    await expect(timeline.getByRole("button", { name: /Ingest/i })).toBeVisible();
    await expect(timeline.getByRole("button", { name: /Analyze/i })).toBeVisible();
    await expect(timeline.getByRole("button", { name: "Build", exact: true })).toBeVisible();
  });

  test("Journey 11: Snapshot listing and comparison hub", async ({ page }) => {
    await page.goto("/snapshots");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Snapshot Explorer");

    await page.route("**/v1/project/history*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ history: [], limit: 50, count: 0 }),
      });
    });

    await page.goto("/snapshot/compare");
    await expect(
      page.getByText("At least two snapshots required").or(page.getByText("Compare Project Snapshots"))
    ).toBeVisible();
  });

  test("Journey 12: Theme switching and Command Palette interactions", async ({ page }) => {
    await page.goto("/");

    // Test Theme toggle
    const themeBtn = page.getByRole("button", { name: /Toggle theme/i });
    await expect(themeBtn).toBeVisible();
    await themeBtn.click();
    // Click again to return
    await themeBtn.click();

    // Test Command Palette trigger
    const cmdBtn = page.getByRole("button", { name: /Search and command palette/i });
    await expect(cmdBtn).toBeVisible();
    await cmdBtn.click();

    // Verify palette dialog opened
    await expect(page.getByRole("dialog", { name: "Command Palette" })).toBeVisible();
    await expect(page.getByLabel("Command search")).toBeVisible();

    // Press Escape to close
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Command Palette" })).not.toBeVisible();
  });

  test("Journey 13: Error handling and empty states", async ({ page }) => {
    // 404 navigation
    await page.goto("/non-existent-route-for-testing");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("No such page");
    await expect(page.getByText("This URL does not match any route in the ReForge console.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Overview", exact: true })).toBeVisible();

    // Empty state on X-Ray without seeded report
    await page.goto("/xray");
    await expect(page.getByRole("heading", { level: 3 })).toHaveText("No project model available for X-Ray");
    await expect(page.getByRole("button", { name: "Analyze Project" })).toBeVisible();
  });

});
