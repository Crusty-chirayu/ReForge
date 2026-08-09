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

The `/v1/analyze/local` endpoint is provided for local development and is disabled unless `REFORGE_ENABLE_LOCAL_INGESTION=true`; this prevents a deployed service from reading arbitrary host paths by default.
