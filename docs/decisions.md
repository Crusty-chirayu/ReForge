# Architectural decisions

## Modular analyzer architecture

Analyzers implement a small shared interface and consume a common scan result. This keeps ingestion, scanning, analysis, and report delivery separate and permits later analyzers without rewrites.

## AnalysisEngine orchestration

`AnalysisEngine` owns analyzer execution and creates the versioned report. Analyzers do not mutate source projects or perform network work.

## Synchronous initial API

The first API is synchronous to make behavior simple and testable. Persistent jobs and workers are deferred until their operational need is explicit.

## Evidence-first static facts

Findings retain file and line/detail evidence. Future AI output must be labelled inference and never silently merged with deterministic static facts.

## Workspace isolation and safe archives

Inputs are placed in temporary workspaces and removed after analysis. ZIP extraction rejects traversal and symbolic-link entries and applies compressed/extracted-size and entry-count limits.

## Local ingestion is disabled by default

The local-path endpoint requires `REFORGE_ENABLE_LOCAL_INGESTION=true`, avoiding arbitrary host reads in normal deployments.

## Provenance and ownership awareness

Reports retain source references and detected license/copyright evidence. ReForge must not remove third-party ownership, licenses, authorship, or attribution.

## No database yet

The current milestone is stateless and has no unnecessary persistence layer. Storage is deferred until analysis jobs or product requirements need it.

## AI remains modular

Project Brain exposes only a provider abstraction; no provider SDK, RAG, or AI-generated facts are embedded in deterministic reports. Any future AI component must preserve the static-fact/evidence boundary.

## Project Brain provider boundary

Project Brain depends only on an internal `LLMProvider` interface, not a provider SDK. It is stateless: callers supply the deterministic report with each question. AI output is marked inference, context is budgeted, and provider citations are accepted only when they match known evidence.
