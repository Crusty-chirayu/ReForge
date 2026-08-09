# ReForge AI

ReForge AI is an evidence-first software project analysis platform. It ingests a project, performs bounded static analysis, and returns a machine-readable report. It does not use an LLM to create deterministic findings.

## Current phase

**Phase 11 - Autonomous Workflow State Store & Execution Audit Log** is complete. ReForge provides crash-safe file-backed state persistence (`StateStore`), snapshot indexing, execution history query APIs (`GET /v1/pipeline/history`, `GET /v1/pipeline/:id`), snapshot lookup (`GET /v1/snapshot/:id`), and append-only audit event logging (`audit.jsonl`).

## Current capabilities

- Ingest a public HTTPS GitHub repository or ZIP archive; a local-path endpoint is available only when explicitly enabled for development.
- Safely isolate temporary workspaces, reject ZIP traversal and symbolic-link entries, and limit archive size, extraction size, and entry count.
- Scan relevant project files while ignoring `.git`, `node_modules`, `dist`, `build`, `coverage`, `.next`, `.cache`, `vendor`, binaries, and oversized text.
- Detect languages, frameworks, manifest dependencies, entry points, licenses, copyright notices, and basic evidence-backed risks.
- Build a Project X-Ray model for TypeScript, JavaScript, and JSON: classified files, line/file metrics, AST-derived modules and symbols, imports/exports, resolved internal relationships, external imports, and production/development/peer dependencies.
- Detect common Fastify/Express-style route calls with literal paths, plus supported database and authentication technologies when project evidence exists.
- Preserve provenance and return evidence for important findings. Environment files are reported only as metadata; their values are never returned.
- Produce Project Doctor findings for selected large-file/module, duplicate-import, coupling/cycle, missing-test, dependency-count, and hardcoded-secret indicators, with remediation and a heuristic health score.
- Provide a provider-agnostic, stateless Project Brain query foundation. AI output is explicitly marked inference and cannot replace deterministic facts.
- Generate deterministic plans with priorities, dependencies, affected modules, risks, acceptance criteria, and verification guidance at `POST /v1/plan`.
- Ingest a trusted ZIP at `POST /v1/execute`, generate a server-controlled snapshot, re-hash files, apply approved patches inside a disposable workspace, return an `ExecutionReceipt`, and dispose of the workspace cleanly.
- Run end-to-end autonomous pipeline at `POST /v1/pipeline` unifying ingestion, X-Ray, Doctor, planning, impact analysis, patch generation, isolated execution, server-derived verification, and receipts.
- Persist pipeline executions, snapshots, and lifecycle audit events safely in `.reforge/store/` with history listing (`GET /v1/pipeline/history`) and receipt/snapshot query endpoints (`GET /v1/pipeline/:id`, `GET /v1/snapshot/:id`).

## Architecture

`HTTP API -> ingestion -> isolated workspace -> scanner -> modular analyzers -> versioned report`

`AnalysisEngine` orchestrates analyzers over a shared scan result. The Project X-Ray analyzer uses the TypeScript compiler API for TypeScript and JavaScript AST analysis. Static facts remain separate from any future AI inference.

Project Doctor consumes `projectModel` rather than rescanning projects. Its health score is `100 - min(100, sum(severityWeight * confidenceWeight))`; it is a prioritization heuristic, not an objective quality measurement.

Project Brain accepts a deterministic report and question at `POST /v1/brain/query`. It requires a configured provider; without one it returns a safe 503 and normal analysis remains available.

See [architecture documentation](docs/architecture.md) and [architectural decisions](docs/decisions.md).

## Install, run, and test

```powershell
pnpm install
pnpm start
```

The server listens on `http://127.0.0.1:3000` by default.

```powershell
node .\node_modules\typescript\bin\tsc --noEmit
node .\node_modules\tsx\dist\cli.mjs --test test\*.test.ts
```

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/v1/analyze/archive` | Analyze a multipart ZIP field named `archive` |
| POST | `/v1/analyze/repository` | Analyze a public HTTPS GitHub repository URL |
| POST | `/v1/snapshot` | Safely ingest a ZIP and return a compact execution snapshot |
| POST | `/v1/execute` | Ingest trusted ZIP, apply approved patches inside disposable workspace, and return execution receipt |
| POST | `/v1/execute/validate` | Validate snapshot-bound patches without applying them |
| POST | `/v1/pipeline` | Ingest trusted ZIP and run end-to-end autonomous engineering pipeline |
| GET | `/v1/pipeline/history` | List recent pipeline executions with optional limit query parameter |
| GET | `/v1/pipeline/:pipelineId` | Get full execution receipt for a recorded pipeline execution |
| GET | `/v1/snapshot/:snapshotId` | Get stored snapshot metadata by snapshotId |
| POST | `/v1/analyze/local` | Development-only local analysis; requires `REFORGE_ENABLE_LOCAL_INGESTION=true` |



Example requests:

```powershell
curl.exe -F "archive=@C:\path\project.zip" http://127.0.0.1:3000/v1/analyze/archive

Invoke-RestMethod -Method Post http://127.0.0.1:3000/v1/analyze/repository -ContentType application/json -Body '{"repositoryUrl":"https://github.com/owner/repository.git"}'
```

## Project structure

- `src/ingestion.ts` - workspace, Git, upload, and safe ZIP handling
- `src/scanner.ts` - bounded relevant-file scan
- `src/analyzers.ts` - Phase 1 evidence-based analyzers
- `src/xray-analyzer.ts` - Phase 2 Project X-Ray AST and model analysis
- `src/engine.ts` - report orchestration
- `src/server.ts` - Fastify transport
- `test/` - focused unit and fixture tests
- `docs/` - architecture, decisions, state, and roadmap

## Limitations

- Parser support is currently TypeScript/JavaScript/JSON only.
- Route detection supports a bounded set of common receiver patterns and literal paths; it does not execute code or infer dynamic routes.
- Module resolution does not yet implement TypeScript path aliases, package export maps, or monorepo workspaces.
- No UI, database, job queue, authentication, private-repository connector, security scanner, performance analyzer, LLM/RAG, or code generation exists yet.
- Git cloning should run in an isolated worker before the service is exposed to untrusted production workloads.
- Doctor is static analysis only: it does not perform runtime profiling, test coverage measurement, or vulnerability-advisory lookup.

## Roadmap

The next explicit milestone is **Phase 3 - Project Doctor**. See [docs/roadmap.md](docs/roadmap.md) for the complete planned sequence.

## AI AGENT HANDOFF

1. Read this README, then [development state](docs/development-state.md), [architecture](docs/architecture.md), [roadmap](docs/roadmap.md), and [decisions](docs/decisions.md).
2. Inspect the existing source and tests before modifying anything.
3. Do not rebuild completed phases; continue from the current Git state.
4. Preserve the evidence-first architecture and keep static facts separate from future AI inference.
5. Do not start future phases without explicit instruction.

The next major milestone is **Phase 3 - Project Doctor**.
