import type { Plan } from "@/lib/api/types";

/** Realistic plan response mirroring the backend contract. */
export const mockPlan: Plan = {
  objective: "Reduce technical debt in the authentication module",
  assumptions: [
    "The authentication module is isolated to src/auth",
    "Breaking token changes can ship behind a feature flag",
  ],
  tasks: [
    {
      id: "TASK-001",
      title: "Extract token verification into a dedicated service",
      objective:
        "Move JWT verification out of the route handlers into a focused service with unit coverage.",
      priority: "HIGH",
      dependencies: [],
      affectedModules: ["src/auth.ts", "src/tokens.ts"],
      evidence: [
        { file: "src/auth.ts", detail: "token verification duplicated in 3 handlers" },
      ],
      acceptanceCriteria: [
        "All handlers call the shared verifyToken service",
        "Existing token format remains valid",
      ],
      verification: ["npm test -- auth", "npm run lint"],
    },
    {
      id: "TASK-002",
      title: "Introduce refresh-token rotation",
      objective:
        "Rotate refresh tokens on every refresh to reduce replay risk.",
      priority: "MEDIUM",
      dependencies: ["TASK-001"],
      affectedModules: ["src/auth.ts", "src/tokens.ts"],
      evidence: [
        { file: "src/tokens.ts", detail: "refresh tokens never rotate today" },
      ],
      acceptanceCriteria: [],
      verification: [],
    },
  ],
  orderedTaskIds: ["TASK-001", "TASK-002"],
  risks: [
    {
      title: "Token rotation may break existing active sessions",
      probability: "MEDIUM",
      impact: "HIGH",
      mitigation:
        "Roll the change out behind a feature flag and monitor session failures.",
      evidence: [
        { file: "src/tokens.ts", detail: "sessions issued without rotation metadata" },
      ],
    },
  ],
  unresolvedQuestions: [
    "Should refresh tokens rotate on every request or on a time window?",
  ],
  validation: {
    valid: true,
    errors: [],
    priorityFormula: "severityWeight + confidenceWeight - effortWeight",
  },
};
