# ReForge AI

**Evidence-first software project analysis platform.**

ReForge ingests a software project, runs bounded deterministic static analysis over it, and returns a machine-readable, evidence-backed report. It is not a chatbot wrapper around an LLM — deterministic findings (structure, dependencies, risks, health scoring) are produced entirely without a language model. An optional, provider-agnostic AI layer ("Project Brain") sits on top of those deterministic facts to answer questions, and it is explicitly marked as inference rather than as a source of ground truth.

---

## Table of Contents

- [Overview](#overview)
- [Current Phase](#current-phase)
- [Current Capabilities](#current-capabilities)
- [Architecture](#architecture)
- [AI vs. Deterministic Analysis](#ai-vs-deterministic-analysis)
- [Install, Run, and Test](#install-run-and-test)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Limitations](#limitations)
- [Roadmap](#roadmap)
- [AI Agent Handoff](#ai-agent-handoff)
- [License](#license)

---

## Overview

Understanding an unfamiliar codebase — its structure, dependencies, risk areas, and the safe blast radius of a change — is a problem generic AI coding assistants handle poorly: they summarize code in natural language without grounding claims in verifiable, file-level evidence, and they don't separate "this is a static fact about the code" from "this is a plausible-sounding inference."

ReForge takes a different approach. It performs bounded, deterministic static analysis first — parsing, dependency extraction, route detection, risk indicators — and preserves the evidence (file paths, structural facts) behind every finding. An AI layer is available on top of that deterministic base to answer natural-language questions, but it operates on the deterministic report as its source of truth and is not permitted to substitute for it.

## Current Phase

**Phase 12 — Persistent Project / Workspace Intelligence** is complete. This phase adds deterministic historical snapshot comparison, file change frequency rankings, project churn metrics, evidence-grounded architecture drift detection, and project history timeline queries.

## Current Capabilities

- Ingest a public HTTPS GitHub repository or a ZIP archive. A local-filesystem-path ingestion endpoint exists but is disabled by default — it must be explicitly enabled for development use.
- Safely isolate temporary workspaces: reject ZIP path traversal and symbolic-link entries, and enforce limits on archive size, extraction size, and entry count.
- Scan relevant project files while ignoring `.git`, `node_modules`, `dist`, `build`, `coverage`, `.next`, `.cache`, `vendor`, binaries, and oversized text files.
- Detect languages, frameworks, manifest dependencies, entry points, licenses, copyright notices, and basic evidence-backed risks.
- Build a **Project X-Ray** model for TypeScript, JavaScript, and JSON: classified files, line/file metrics, AST-derived modules and symbols, imports/exports, resolved internal relationships, external imports, and production/development/peer dependencies.
- Detect common Fastify/Express-style route calls with literal paths, plus supported database and authentication technologies when project evidence exists.
- Preserve provenance and return evidence for important findings. Environment files are reported only as metadata — their values are never returned.
- Produce **Project Doctor** findings for selected large-file/module, duplicate-import, coupling/cycle, missing-test, dependency-count, and hardcoded-secret indicators, each with remediation guidance and a heuristic health score.
- Provide a provider-agnostic, stateless **Project Brain** query foundation. AI output is explicitly marked as inference and cannot replace deterministic facts.
- Generate deterministic plans with priorities, dependencies, affected modules, risks, acceptance criteria, and verification guidance (`POST /v1/plan`).
- Ingest a trusted ZIP, generate a server-controlled snapshot, re-hash files, apply approved patches inside a disposable workspace, return an `ExecutionReceipt`, and dispose of the workspace cleanly (`POST /v1/execute`).
- Run an end-to-end autonomous pipeline unifying ingestion, X-Ray, Doctor, planning, impact analysis, patch generation, isolated execution, server-derived verification, and receipts (`POST /v1/pipeline`).
- Persist pipeline executions, snapshots, and lifecycle audit events in `.reforge/store/`, with history listing and receipt/snapshot query endpoints.
- Compute deterministic snapshot comparisons, change frequency, churn, architecture drift, and project history.

## Architecture

```
HTTP API -> ingestion -> isolated workspace -> scanner -> modular analyzers -> versioned report
```

- **`AnalysisEngine`** orchestrates analyzers over a shared scan result.
- The **Project X-Ray** analyzer uses the TypeScript compiler API for TypeScript/JavaScript AST analysis.
- Static facts are kept separate from any AI inference layer by design.
- **Project Doctor** consumes the already-built `projectModel` rather than rescanning the project. Its health score is `100 - min(100, sum(severityWeight * confidenceWeight))` — this is stated by the project as a prioritization heuristic, not an objective quality measurement.
- **Project Brain** accepts a deterministic report plus a question at `POST /v1/brain/query`. It requires a configured AI provider; without one it returns a safe `503` and normal (non-AI) analysis remains fully available.

Further detail lives in the repository's `docs/architecture.md` and `docs/decisions.md`.

## AI vs. Deterministic Analysis

| Capability | Deterministic Engine | AI-Assisted |
|---|---|---|
| Project structure / X-Ray | Yes — AST-based (TypeScript compiler API) | No |
| Dependency analysis | Yes — manifest-derived | No |
| Route / risk detection | Yes — pattern-based, evidence-backed | No |
| Doctor findings & health score | Yes — heuristic, deterministic | No |
| Planning (`/v1/plan`) | Yes — deterministic plan generation | No |
| Brain question-answering (`/v1/brain/query`) | No | Yes — requires a configured provider; returns `503` without one; explicitly marked as inference |

## Install, Run, and Test

**Package manager:** pnpm (the repository is a pnpm workspace — `pnpm-workspace.yaml` is present).

```bash
git clone https://github.com/Crusty-chirayu/ReForge.git
cd ReForge
pnpm install
pnpm start
```

The server listens on `http://127.0.0.1:3000` by default.

Type-check and test (commands as published by the project, Windows-style paths shown):

```bash
node .\node_modules\typescript\bin\tsc --noEmit
node .\node_modules\tsx\dist\cli.mjs --test test\*.test.ts
```

On macOS/Linux the equivalent paths are `./node_modules/typescript/bin/tsc` and `./node_modules/tsx/dist/cli.mjs`.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Service health check |
| POST | `/v1/analyze/archive` | Analyze a multipart ZIP field named `archive` |
| POST | `/v1/analyze/repository` | Analyze a public HTTPS GitHub repository URL |
| POST | `/v1/snapshot` | Safely ingest a ZIP and return a compact execution snapshot |
| POST | `/v1/execute` | Ingest a trusted ZIP, apply approved patches inside a disposable workspace, return an execution receipt |
| POST | `/v1/execute/validate` | Validate snapshot-bound patches without applying them |
| POST | `/v1/pipeline` | Ingest a trusted ZIP and run the end-to-end autonomous engineering pipeline |
| GET | `/v1/pipeline/history` | List recent pipeline executions (optional `limit` query parameter) |
| GET | `/v1/pipeline/:pipelineId` | Get the full execution receipt for a recorded pipeline execution |
| GET | `/v1/snapshot/:snapshotId` | Get stored snapshot metadata by `snapshotId` |
| GET | `/v1/snapshots/:beforeId/compare/:afterId` | Compare two snapshots deterministically |
| GET | `/v1/snapshot/:snapshotId/intelligence` | Get historical intelligence, change frequency, churn, and drift |
| GET | `/v1/project/history` | Get the historical project snapshot timeline |
| POST | `/v1/analyze/local` | Development-only local-path analysis; requires `REFORGE_ENABLE_LOCAL_INGESTION=true` |

Example requests:

```bash
curl.exe -F "archive=@C:\path\project.zip" http://127.0.0.1:3000/v1/analyze/archive

Invoke-RestMethod -Method Post http://127.0.0.1:3000/v1/analyze/repository `
  -ContentType application/json `
  -Body '{"repositoryUrl":"https://github.com/owner/repository.git"}'
```

## Project Structure

```
ReForge/
├── src/
│   ├── ingestion.ts       # workspace, Git, upload, and safe ZIP handling
│   ├── scanner.ts         # bounded relevant-file scan
│   ├── analyzers.ts       # Phase 1 evidence-based analyzers
│   ├── xray-analyzer.ts   # Phase 2 Project X-Ray AST and model analysis
│   ├── engine.ts          # report orchestration
│   └── server.ts          # Fastify transport
├── test/                  # focused unit and fixture tests
├── docs/                  # architecture, decisions, state, and roadmap
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
└── README.md
```

No `frontend/` directory is present in the current repository — ReForge is currently an HTTP API with no bundled UI.

## Limitations

- Parser support is currently TypeScript/JavaScript/JSON only.
- Route detection supports a bounded set of common receiver patterns and literal paths; it does not execute code or infer dynamic routes.
- Module resolution does not yet implement TypeScript path aliases, package export maps, or monorepo workspaces.
- No UI, database, job queue, authentication, private-repository connector, security scanner, performance analyzer, LLM/RAG pipeline, or code generation exists yet.
- Git operations and cloning should run in an isolated worker before the service is exposed to untrusted production workloads.
- Doctor is static analysis only — it does not perform runtime profiling, test coverage measurement, or vulnerability-advisory lookups.

## Roadmap

The project's published roadmap names **Phase 3 — Project Doctor** as the next explicit milestone. This appears alongside "Phase 12" being described as the current completed phase, which is a discrepancy in the source repository's own documentation, not something introduced here — see `docs/roadmap.md` in the repository for the authoritative, up-to-date sequence before relying on this section.

## AI Agent Handoff

1. Read this README, then `docs/development-state.md`, `docs/architecture.md`, `docs/roadmap.md`, and `docs/decisions.md`.
2. Inspect the existing source and tests before modifying anything.
3. Do not rebuild completed phases; continue from the current Git state.
4. Preserve the evidence-first architecture and keep static facts separate from AI inference.
5. Do not start future phases without explicit instruction.

## License

No license file was identified in the repository's top-level listing at the time this README was written. Confirm this against the current repository before treating the project as licensed for reuse.

---

*This README was generated from the repository's own published landing-page documentation (capabilities list, architecture description, API table, install/test commands, project structure, and limitations), not from a full line-by-line source audit. Before merging, verify each API route against `src/server.ts`, each capability claim against the relevant analyzer, and check for any environment variables or configuration not reflected here.*
