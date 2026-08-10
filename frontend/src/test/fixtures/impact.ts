import type { ChangeImpactReport } from "@/lib/api/types";

/** Realistic change-impact report mirroring the backend contract. */
export const mockImpact: ChangeImpactReport = {
  request: {
    request: "Replace MongoDB with PostgreSQL",
    category: "TECHNOLOGY_MIGRATION",
  },
  impactLevel: "HIGH",
  confidence: "HIGH",
  directModules: ["src/repository.ts"],
  indirectModules: ["src/services/orders.ts", "src/api/orders.ts"],
  relationships: [
    {
      from: "src/repository.ts",
      to: "src/services/orders.ts",
      type: "IMPORTS",
    },
    {
      from: "src/services/orders.ts",
      to: "src/api/orders.ts",
      type: "IMPORTS",
    },
  ],
  risks: [
    {
      title: "Data migration is the highest-risk step",
      evidence: [
        { file: "src/repository.ts", detail: "queries depend on Mongo aggregation" },
      ],
      kind: "EVIDENCE_BACKED",
    },
  ],
  blastRadius: {
    directModules: 1,
    indirectModules: 2,
    apiRoutes: 3,
    dependencies: 2,
    relatedTests: 4,
    doctorFindings: 1,
  },
  recommendations: [
    "Introduce a repository abstraction before swapping storage",
    "Run a parallel-read migration to validate query parity",
  ],
  verification: [
    "Run integration tests against a PostgreSQL container",
    "Verify API response parity with golden fixtures",
  ],
  evidence: [
    { file: "src/repository.ts", detail: "uses the Mongo client directly" },
  ],
  assumptions: [
    "A short downtime window is acceptable during migration",
  ],
};
