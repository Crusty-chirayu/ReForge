# Architecture decisions

The first milestone uses a synchronous API only to make the analysis pipeline easy to verify. `AnalysisEngine` owns orchestration; analyzers neither mutate project files nor make network calls. Inputs are copied into `.reforge/workspaces` and deleted after a request completes.

Reports include a schema version and evidence objects. Future AI output should be attached as explicitly labelled inference with source evidence, never merged invisibly with static facts.

## Project X-Ray

`projectXRayAnalyzer` is a deterministic analyzer that consumes the shared scan result and adds `projectModel` to the report. It does not mutate input files or make network calls.

- **File model:** classifies files as source, test, config, documentation, asset, generated, dependency, or unknown. Environment files record only path and presence.
- **Code model:** the TypeScript compiler API parses TypeScript and JavaScript files to extract imports, exports, functions, classes, interfaces, types, and variables. Relative imports are resolved against scanned project files; package imports are kept external.
- **Technology model:** package-manifest and import evidence identify supported database and authentication libraries.
- **API model:** AST call expressions recognize common `app`, `router`, `fastify`, and `server` verb calls when their literal path is available. Unknown values are represented as `unknown`, never inferred.
- **Metrics:** calculated directly from scanned files and modules, including file/line totals, largest files/modules, dependency count, internal relationship count, and test/source ratio.

Project X-Ray supports TypeScript, JavaScript, and JSON today. Other language analyzers can implement the same `Analyzer` interface without changing ingestion, scanning, or HTTP transport.

## Project Doctor

`runProjectDoctor` is a model-aware second pass called by `AnalysisEngine` after Project X-Ray. It consumes the existing project model and inherited evidence-backed risks; it does not rescan files. Doctor findings contain a rule ID, category, severity, confidence, evidence, affected files/modules, impact, and remediation.

Health score is `100 - min(100, sum(severityWeight * confidenceWeight))`, using severity weights Critical 10, High 7, Medium 4, Low 2, and Info 1. Confidence weights are High 1, Medium 0.65, and Low 0.35. This is a prioritization heuristic, not a measure of software quality. Current Doctor analysis is static only; it does not perform runtime profiling or vulnerability-advisory lookup.

## Project Brain

Project Brain is a stateless, provider-agnostic layer over deterministic reports. `ContextBuilder` selects compact project facts, relevant modules, Doctor findings, and known evidence under a fixed budget. Providers receive a strict system contract; their output is returned as explicitly unverified inference. Evidence citations are retained only when they exactly match supplied evidence. No source dump, API key logging, persistence, embeddings, or RAG infrastructure is used.

## Planning Department

`PlanningDepartment` consumes the submitted deterministic report and maps Doctor findings to actionable tasks. It calculates transparent priorities, validates affected modules and dependencies, topologically orders tasks, and surfaces dependency cycles instead of returning an impossible order. Planning is deterministic today; no LLM call is required.

The `/v1/analyze/local` endpoint is provided for local development and is disabled unless `REFORGE_ENABLE_LOCAL_INGESTION=true`; this prevents a deployed service from reading arbitrary host paths by default.

## Execution snapshot and patch contract

Phase 9A adds a compact `ProjectSnapshot` at the existing archive-ingestion boundary. It contains normalized paths, SHA-256 fingerprints, sizes, classifications, dependency metadata, and inherited source/license provenance—never file contents or secrets. Snapshot identity lets a BuildPlan identify the reviewed state. Patch operations require explicit content where needed and expected hashes for modifications. Validation rejects unsafe paths, stale fingerprints, incomplete patches, and unknown task references; it never accesses arbitrary host paths or modifies anything.

## Ingestion Hardening & Stream Processing

- **Multipart Stream Lifecycle**: Endpoints consuming multipart archives (`POST /v1/pipeline`, `POST /v1/execute`) consume each file stream directly during iteration rather than caching readable streams, preventing parser backpressure deadlocks under Fastify 5.
- **Archive Safety Metering**: Ingestion streams pass through a byte-counting `Transform` stream checking against `MAX_SINGLE_FILE_BYTES` (100 MB), `MAX_EXTRACTED_BYTES` (500 MB), and `MAX_ARCHIVE_BYTES` (200 MB), rejecting zip bombs before disk exhaustion.
- **Host Workspace Containment**: All file operations resolve within temporary workspaces; path traversal, drive letters, and null bytes are rejected.

## AI Provider Integration (Project Brain)

- **Native Fetch REST Providers**: Implements `GeminiProvider` and `OpenAIProvider` using native Node.js `fetch` with AbortSignal timeouts.
- **Prompt Injection Defense**: Repository context is wrapped in `<project_context>` tags with explicit instructions preventing model persona override.
- **Citation Filtering**: Model-returned evidence is strictly intersected with deterministic evidence; unverified citations are removed and all inferences are labeled `verified: false`.
- **Honest Degradation**: When no API key is configured, Project Brain returns HTTP 503 rather than fabricating responses.

## Builder & Code Transformation Engine

- **AST Deduplication**: Uses TypeScript compiler AST traversal to identify and consolidate duplicate module import declarations (`CQ-003`).
- **Migration Scaffolding**: Synthesizes type-safe database migration templates with reversible `up` and `down` handlers.
- **Unified Diff Generation**: Implements Myers-style line diff algorithm producing standard POSIX / Git unified diffs (`DiffSummary.unifiedDiff`).
- **Pre-Mutation Validation & Rollback**: Validates file hashes against the snapshot prior to mutation, captures recursive workspace backups, and rolls back atomically upon verification failure.
