# ReForge roadmap

## Phase 9A - Execution snapshot and patch contract

Completed: safe snapshot and patch-validation foundation. Remaining Phase 9 work requires separately authorized isolated execution; this checkpoint makes no mutation.

## Phase 1 - Foundation

Objective: safely ingest and scan projects. Major capabilities: Git/ZIP ingestion, workspace isolation, scanner, modular evidence-based reports, and API. It establishes the trustworthy data boundary required by every later phase.

## Phase 2 - Project X-Ray

Objective: turn scanned files into a structured static project model. Major capabilities: AST code structure, modules, symbols, dependencies, relationships, basic routes/technology detection, and metrics. It depends on Phase 1's safe, bounded scan and supplies the facts needed for diagnosis.

## Phase 3 - Project Doctor

Objective: diagnose quality, security, testing, dependency, and maintainability risks. It depends on the X-Ray model to make findings traceable to files, symbols, dependencies, and evidence.

## Phase 4 - Project Brain

Objective: build evidence-aware LLM reasoning over verified static and diagnostic facts. Major capabilities: bounded context construction, provider abstraction, inference separation, and citation validation. It depends on X-Ray and Doctor outputs to ground AI responses.

## Phase 5 - Planning Department

Objective: turn verified findings into prioritized, dependency-aware improvement plans. Major capabilities: deterministic task generation, explicit dependencies, risks, acceptance criteria, and plan validation. It depends on project understanding and diagnosis to avoid unsupported recommendations.

## Phase 6 - Novelty Engine

Objective: identify evidence-grounded product and technical opportunities. It depends on reliable project context and planning constraints.

## Phase 7 - Change Impact Analysis

Objective: model the likely effects of proposed changes across modules, APIs, tests, and risks. It depends on the project graph and later understanding layers.

## Phase 8 - ReForge Builder

Objective: propose and eventually implement bounded, reviewable changes with tests and documentation. It depends on planning and impact analysis to keep generation safe and intentional.

## Phase 9 - Verification and autonomous engineering workflows

Objective: verify changes and coordinate controlled engineering workflows. It depends on all prior evidence, planning, impact, and builder capabilities.
