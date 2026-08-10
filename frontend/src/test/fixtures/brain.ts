import type { BrainResponse } from "@/lib/api/types";

/** Full, realistic Brain response mirroring the backend contract. */
export const mockBrainResponse: BrainResponse = {
  answer:
    "The highest-risk area is the authentication module: it contains a hardcoded secret (SEC-001) and duplicated token verification across three handlers. The execution module also lacks focused test coverage.",
  confidence: "HIGH",
  inferences: [
    {
      statement:
        "Refactoring token verification into a shared service would reduce duplication risk.",
      confidence: "MEDIUM",
      verified: false,
    },
  ],
  evidence: [
    { file: "src/config.ts", detail: "line 12: apiKey = \"sk-…\"" },
    { file: "src/auth.ts", detail: "token verification duplicated in 3 handlers" },
  ],
  limitations: [
    "AI output is inference; deterministic report facts remain authoritative.",
  ],
  contextUsed: ["project summary", "relevant modules", "doctor findings", "evidence"],
  contextTruncated: false,
};

/** Minimal response — every optional field empty, per the exact contract. */
export const mockBrainMinimal: BrainResponse = {
  answer: "No specific evidence was found for this question.",
  confidence: "LOW",
  inferences: [],
  evidence: [],
  limitations: [],
  contextUsed: [],
  contextTruncated: false,
};
