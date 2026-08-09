# ReForge AI — Project Analysis Engine foundation

ReForge is an AI-assisted software engineering platform. This repository contains the first, deliberately bounded milestone: a real, local project analysis engine and JSON API.

## Architecture

`HTTP API → ingestion → safe workspace → file scan → analyzers → versioned report`

The analysis core is independent of Fastify. Each analyzer implements a small interface, so richer parsers, LLM-backed analysis, and security tools can be added without changing ingestion or reporting.

Key decisions:

- **Evidence over invention:** detectors only report files, manifest data, and source patterns actually observed.
- **Provenance first:** source type, URL where supplied, detected license files, and copyright notices are recorded.
- **Safe archives:** ZIP entries are validated against traversal before extraction; files are size- and count-limited.
- **Bounded scan:** generated/vendor directories, binaries, and oversized files are excluded from analysis.

## Run

```powershell
pnpm install
pnpm dev
```

The API listens on `http://127.0.0.1:3000` by default.

```powershell
# Analyze a checked-out local project (development-only endpoint)
Invoke-RestMethod -Method Post http://127.0.0.1:3000/v1/analyze/local -ContentType application/json -Body '{"path":"E:\\some-project"}'

# Analyze a public Git repository
Invoke-RestMethod -Method Post http://127.0.0.1:3000/v1/analyze/repository -ContentType application/json -Body '{"repositoryUrl":"https://github.com/owner/repository.git"}'

# Upload a ZIP
curl.exe -F "archive=@C:\path\project.zip" http://127.0.0.1:3000/v1/analyze/archive
```

## Status and limitations

Working now: local folder analysis, Git URL ingestion, ZIP upload/extraction, scanning, language/framework/dependency detection, structural summary, provenance and license reporting, basic evidence-backed risks, and the **Project X-Ray** model.

## Project X-Ray (Phase 2)

Every analysis report now includes `projectModel`, a structured static-fact model. It contains classified files and metrics, TypeScript/JavaScript AST modules and symbols, resolved internal imports, external package imports, manifest dependencies (including peer dependencies), basic Express/Fastify routes, supported database/authentication technologies, configuration and environment-file metadata, and evidence for detected facts.

TypeScript, JavaScript, and JSON are supported. TypeScript's compiler API performs the TypeScript/JavaScript AST work; this is not regex-based parsing. Environment files are only reported as present—ReForge never includes their values in the project model.

`projectModel` is static analysis output. Future AI-generated conclusions must remain separate from these facts and retain their own evidence/provenance.

This is not yet a full multi-language parser, authentication system, job queue, persistent storage, UI, private-repository connector, malware scanner, or LLM-powered architectural analyst. AST support currently covers TypeScript/JavaScript and recognizes a deliberately bounded set of route patterns. Repository cloning is intentionally limited to HTTPS Git URLs and should be moved to an isolated worker in production.

## Next milestone

Add persistent analysis jobs and storage, parser-backed symbol/API extraction, a React report UI, and isolated worker execution before accepting untrusted production workloads.
