import type { AnalysisReport } from "@/lib/api/types";

/** Full, realistic analysis report mirroring the backend contract. */
export const mockAnalysisReport: AnalysisReport = {
  schemaVersion: "1.0",
  generatedAt: "2026-08-10T10:30:00.000Z",
  provenance: {
    source: { kind: "archive", reference: "acme-app.zip" },
    licenses: [{ file: "LICENSE", detail: "MIT License" }],
    copyrightNotices: [],
  },
  overview: {
    fileCount: 42,
    analyzableFileCount: 38,
    totalBytes: 1_024_000,
  },
  languages: [
    {
      name: "TypeScript",
      confidence: "high",
      evidence: [{ file: "tsconfig.json", detail: "present at project root" }],
    },
    {
      name: "JavaScript",
      confidence: "high",
      evidence: [{ file: "package.json", detail: '"main": "src/index.js"' }],
    },
  ],
  frameworks: [
    {
      name: "Next.js",
      confidence: "high",
      evidence: [{ file: "package.json", detail: '"next": "^16.0.0"' }],
    },
  ],
  dependencies: [
    {
      name: "react",
      confidence: "high",
      evidence: [{ file: "package.json", detail: '"react": "^19.0.0"' }],
    },
  ],
  structure: {
    topLevel: ["src", "public", "package.json", "tsconfig.json"],
    importantFiles: ["src/index.ts", "package.json", "src/server.ts"],
    ignoredDirectories: ["node_modules", ".git", "dist"],
  },
  entryPoints: [
    {
      name: "src/index.ts",
      confidence: "high",
      evidence: [{ file: "src/index.ts", detail: "contains exported entry" }],
    },
  ],
  apiHints: [
    {
      name: "GET /health",
      confidence: "high",
      evidence: [{ file: "src/server.ts", detail: "route registered" }],
    },
  ],
  databaseHints: [
    {
      name: "PostgreSQL",
      confidence: "medium",
      evidence: [{ file: "src/db.ts", detail: "pg client import" }],
    },
  ],
  authenticationHints: [
    {
      name: "JWT",
      confidence: "medium",
      evidence: [{ file: "src/auth.ts", detail: "jwt.sign call" }],
    },
  ],
  architecture: [
    {
      name: "Modular monolith with service layer",
      confidence: "medium",
      evidence: [
        { file: "src/services", detail: "service modules detected" },
      ],
    },
  ],
  codeQualityObservations: [
    {
      name: "Large module detected",
      confidence: "medium",
      evidence: [{ file: "src/engine.ts", detail: "exceeds 600 lines" }],
    },
  ],
  risks: [
    {
      name: "No test coverage for execution module",
      confidence: "medium",
      evidence: [{ file: "src/execution.ts", detail: "no sibling test file" }],
    },
  ],
  recommendedNextSteps: [
    "Run the project doctor for a deep-dive on the execution module",
    "Create an improvement plan targeting test coverage",
  ],
  projectModel: {
    name: "acme-app",
    root: { path: "/project" },
    files: [
      { path: "src/index.ts", extension: "ts", language: "TypeScript", size: 2048, lineCount: 120, category: "SOURCE" },
      { path: "src/server.ts", extension: "ts", language: "TypeScript", size: 4096, lineCount: 240, category: "SOURCE" },
      { path: "src/index.test.ts", extension: "ts", language: "TypeScript", size: 1024, lineCount: 60, category: "TEST" },
      { path: "package.json", extension: "json", size: 512, lineCount: 40, category: "CONFIG" },
    ],
    modules: [
      {
        id: "src/engine.ts",
        imports: [
          {
            specifier: "./domain",
            kind: "internal",
            target: "src/domain.ts",
            symbols: ["AnalysisReport"],
            evidence: { file: "src/engine.ts", detail: "import statement" },
          },
          {
            specifier: "fastify",
            kind: "external",
            symbols: ["Fastify"],
            evidence: { file: "src/engine.ts", detail: "import statement" },
          },
        ],
        exports: ["analyze"],
        symbols: ["analyze", "AnalysisEngine"],
        relationships: ["src/domain.ts"],
      },
    ],
    symbols: [
      {
        name: "analyze",
        type: "function",
        file: "src/engine.ts",
        line: 10,
        exported: true,
        imported: false,
      },
      {
        name: "AnalysisEngine",
        type: "class",
        file: "src/engine.ts",
        line: 24,
        exported: true,
        imported: true,
      },
    ],
    packageManagers: ["npm"],
    dependencies: [
      {
        name: "fastify",
        version: "5.0.0",
        type: "production",
        evidence: { file: "package.json", detail: '"fastify": "^5.0.0"' },
      },
      {
        name: "typescript",
        version: "5.7.2",
        type: "development",
        evidence: { file: "package.json", detail: '"typescript": "^5.7.2"' },
      },
    ],
    sourceDirectories: ["src"],
    testDirectories: ["test", "src"],
    configurationFiles: ["tsconfig.json", "package.json"],
    environmentFiles: [],
    entryPoints: ["src/index.ts"],
    apiEndpoints: [
      {
        method: "GET",
        path: "/health",
        file: "src/server.ts",
        handler: "healthHandler",
        evidence: { file: "src/server.ts", detail: "route defined" },
      },
    ],
    databaseTechnologies: [
      {
        name: "PostgreSQL",
        confidence: "medium",
        evidence: [{ file: "src/db.ts", detail: "pg client import" }],
      },
    ],
    authenticationTechnologies: [
      {
        name: "JWT",
        confidence: "medium",
        evidence: [{ file: "src/auth.ts", detail: "jwt.sign call" }],
      },
    ],
    metrics: {
      totalFiles: 42,
      sourceFiles: 30,
      testFiles: 6,
      totalLines: 12_000,
      sourceLines: 9_800,
      largestFiles: [
        { path: "src/engine.ts", size: 25_600 },
        { path: "src/server.ts", size: 20_480 },
      ],
      largestModules: [{ id: "src/engine.ts", symbolCount: 12 }],
      dependencyCount: 18,
      internalModuleCount: 5,
      testSourceRatio: 0.2,
    },
  },
  doctor: {
    healthScore: 76,
    summary: {
      findingCount: 4,
      bySeverity: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 1, INFO: 1 },
      byCategory: {
        CODE_QUALITY: 1,
        ARCHITECTURE: 1,
        SECURITY: 1,
        TESTING: 1,
      },
      scoring: "100 - min(100, sum(severityWeight * confidenceWeight))",
    },
    findings: [
      {
        ruleId: "SEC-001",
        category: "SECURITY",
        severity: "HIGH",
        confidence: "HIGH",
        title: "Hardcoded secret in configuration",
        description:
          "A secret-like value was detected in a tracked configuration file.",
        impact: "Credentials may be exposed to anyone with repository access.",
        remediation:
          "Move the value to an environment variable and rotate the secret.",
        evidence: [{ file: "src/config.ts", detail: "line 12: apiKey = \"sk-…\"" }],
        affectedFiles: ["src/config.ts"],
      },
      {
        ruleId: "CODE-002",
        category: "CODE_QUALITY",
        severity: "MEDIUM",
        confidence: "MEDIUM",
        title: "Large module exceeds recommended size",
        description: "src/engine.ts exceeds 600 lines.",
        impact: "Harder to maintain and review.",
        remediation: "Split the module into smaller focused units.",
        evidence: [{ file: "src/engine.ts", detail: "640 lines" }],
      },
      {
        ruleId: "ARCH-003",
        category: "ARCHITECTURE",
        severity: "LOW",
        confidence: "LOW",
        title: "Circular relationship risk",
        description: "Two modules reference each other's symbols.",
        impact: "May complicate dependency ordering.",
        remediation: "Extract the shared types into a common module.",
        evidence: [{ file: "src/domain.ts", detail: "imports engine types" }],
      },
      {
        ruleId: "TEST-004",
        category: "TESTING",
        severity: "INFO",
        confidence: "HIGH",
        title: "Test directories detected",
        description: "Tests are colocated under src and test.",
        impact: "—",
        remediation: "Keep the layout consistent across the repo.",
        evidence: [{ file: "package.json", detail: "test script present" }],
      },
    ],
  },
};

/** Minimal report exercising every optional section being absent/empty. */
export const minimalAnalysisReport: AnalysisReport = {
  schemaVersion: "1.0",
  generatedAt: "2026-08-10T11:00:00.000Z",
  provenance: {
    source: { kind: "repository", reference: "https://github.com/acme/empty" },
    licenses: [],
    copyrightNotices: [],
  },
  overview: {
    fileCount: 0,
    analyzableFileCount: 0,
    totalBytes: 0,
  },
  languages: [],
  frameworks: [],
  dependencies: [],
  structure: {
    topLevel: [],
    importantFiles: [],
    ignoredDirectories: [],
  },
  entryPoints: [],
  apiHints: [],
  databaseHints: [],
  authenticationHints: [],
  architecture: [],
  codeQualityObservations: [],
  risks: [],
  recommendedNextSteps: [],
};
