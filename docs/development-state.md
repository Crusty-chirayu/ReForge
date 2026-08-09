# Development state

## Current phase

**Phase 4 - Project Brain**

## Completed

- Phase 1 ingestion, including public GitHub URLs and ZIP uploads
- Safe ZIP extraction, workspace isolation, project scanning, and ignored-directory handling
- Basic modular analyzers, provenance/license reporting, evidence-based reports, API endpoints, and tests
- Phase 2 Project X-Ray structured project model
- TypeScript/JavaScript code structure analysis, imports/exports, symbols, dependencies, and module relationships
- Basic API discovery, database/authentication detection, file classification, and project metrics
- Deterministic Project Doctor findings, severity/confidence summaries, remediation, and heuristic health scoring
- Provider-agnostic Project Brain context construction, inference separation, evidence validation, and bounded context

## Current capabilities

ReForge accepts a bounded project input and returns a versioned JSON report. The report includes Phase 1 summary findings plus `projectModel`: files and categories, package manager/manifest metadata, dependency records, AST-derived modules and symbols, internal/external imports, route findings, supported technology findings, metrics, provenance, and evidence. ZIP ingestion is guarded against traversal, symbolic links, excessive entry count, and excessive extracted size. Local filesystem ingestion is disabled by default.

## Known limitations

- Static parser support covers TypeScript, JavaScript, and JSON only.
- Internal import resolution is extension/index based; it does not handle aliases, package export maps, or workspace protocols.
- Route discovery is deliberately conservative and only recognizes common receiver/verb calls with static string paths.
- Database/authentication detection is dependency/import evidence, not runtime verification.
- The service has no persistence, asynchronous jobs, frontend, user authentication, private Git credentials, malware scanning, AI/RAG, or code generation.

## Next milestone

**Phase 5 - Planning Department**: create evidence-grounded, prioritized plans from verified facts, Doctor findings, and Brain output.

## Future sequence

Project Doctor, security/performance/testing intelligence, Project Brain, AI/RAG, Planning Department, Novelty Engine, Change Impact Analysis, and ReForge Builder remain future work. None is implemented in this repository today.
