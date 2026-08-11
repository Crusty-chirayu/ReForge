# ReForge — Frontend Console

The web console for **ReForge**, an AI engineering intelligence system. ReForge
analyzes a codebase, then reasons about it: it produces a structured analysis
report, plans changes against that report, models their impact, generates a
build specification, and executes changes through a verified, snapshot-backed
pipeline that can roll back.

This frontend is the operator surface for that engine. It never analyzes code
itself and never invents findings — every fact it renders comes from a backend
response.

---

## Table of contents

- [Architecture boundary](#architecture-boundary)
- [Frontend architecture](#frontend-architecture)
- [Directory structure](#directory-structure)
- [Installation](#installation)
- [Running the backend](#running-the-backend)
- [Running the frontend](#running-the-frontend)
- [Environment variables](#environment-variables)
- [API proxy configuration](#api-proxy-configuration)
- [Routes](#routes)
- [Testing](#testing)
- [Production build](#production-build)
- [Known limitations](#known-limitations)
- [Backend freeze boundary](#backend-freeze-boundary)

---

## Architecture boundary

ReForge is two independently deployable halves that share nothing but HTTP.

```
┌─────────────────────────┐        same-origin         ┌──────────────────────────┐
│  Frontend (this dir)    │   /health, /v1/*  ──────▶  │  Backend (repo root)     │
│  Next.js 16 · React 19  │      via rewrites          │  Fastify 5 · TypeScript  │
│  Renders state only     │  ◀──────  JSON / report    │  All analysis + AI       │
└─────────────────────────┘                            └──────────────────────────┘
```

**The backend owns all intelligence.** Repository ingestion, archive
extraction, the analysis report, the Brain (Q&A over a report), planning,
novelty detection, impact modelling, build specification, pipeline execution,
snapshots, diffing, and verification all happen server-side in `src/`.

**The frontend owns presentation only.** It uploads archives, submits requests,
renders responses, and moves the operator between workflow steps. It performs
no code analysis, holds no business rules about what a "good" plan is, and
derives no findings of its own.

The backend is the **single source of truth for the API contract**. Frontend
types in `src/lib/api/types.ts` mirror the backend's zod schemas; when they
disagree, the frontend is what changes.

## Frontend architecture

| Concern | Approach |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript strict (`noUncheckedIndexedAccess`) |
| Styling | Tailwind CSS v4, CSS-first design tokens in `src/app/globals.css` |
| Server data | TanStack Query v5 — 5-minute `staleTime`, no refetch on window focus, 4xx never retried |
| Workflow data | React context — report store with per-tab `sessionStorage`, workflow store in memory |
| API access | One typed client (`src/lib/api/client.ts`); components never call `fetch` directly |
| Icons | `lucide-react` |
| Tests | Vitest + Testing Library + jsdom |

**Data flow.** A page calls a hook (`src/lib/query/*`) or a client function
(`src/lib/api/client.ts`), which returns typed data or throws `ApiError
{ status, body }`. `describeApiError()` maps that into operator-facing title
and description text — never a stack trace, never a server filesystem path.
Malformed 2xx bodies are rejected as errors rather than rendered as truth.

**Workflow state is deliberately session-scoped.** An analysis report can
describe private source code, so it must never outlive the tab. The report
store keeps it in an external store backed by **per-tab `sessionStorage`**, so
it survives a same-tab reload and client-side navigation but is discarded when
the tab closes. Reads are guarded (private mode and quota failures fall back to
memory) and validated by `schemaVersion` before being trusted. Derived
artifacts — plan, novelty, impact, build — are held **in memory only**.

Nothing is ever written to `localStorage` or cookies. The cost of this design
is that derived artifacts are cleared by a hard refresh — handled explicitly,
see [Known limitations](#known-limitations).

**Honest rendering contract.** Every surface distinguishes *loading* /
*success* / *empty* / *error*, using the shared `Skeleton`, `EmptyState`,
`ErrorState`, and `StatusBadge` primitives. Absent optional fields are hidden
or shown as an explicit empty state; they are never replaced with placeholder
or invented values.

## Directory structure

```
frontend/
├── src/
│   ├── app/                     # App Router routes (one dir per route)
│   │   ├── layout.tsx           # Root layout, providers, app shell
│   │   ├── globals.css          # Tailwind v4 tokens + base styles
│   │   ├── error.tsx            # Route-level error boundary
│   │   ├── not-found.tsx        # 404 with links to every real destination
│   │   ├── page.tsx             # Dashboard
│   │   ├── analyze/             # Ingest + analysis report
│   │   ├── plan/ novelty/ impact/ build/
│   │   ├── pipeline/            # index → new, and [pipelineId] receipt
│   │   ├── snapshots/ snapshot/ # explorer, detail, compare
│   │   └── brain/               # Q&A over the current report
│   ├── components/
│   │   ├── ui/                  # Button, Card, Skeleton, EmptyState, ErrorState…
│   │   ├── layout/              # Shell, header, sidebar, mobile drawer
│   │   ├── workflow/            # Workflow header, report-required guard
│   │   ├── report/ pipeline/ dashboard/ brain/
│   │   └── providers.tsx
│   ├── lib/
│   │   ├── api/                 # client.ts, endpoints.ts, types.ts
│   │   ├── query/               # TanStack Query hooks + keys
│   │   ├── context/             # report + workflow context
│   │   ├── utils/               # api-error, archive, format, status, stats…
│   │   └── navigation.ts        # NAV_ITEMS, breadcrumbs, active-route logic
│   └── test/                    # Vitest suites + fixtures
├── next.config.ts               # Backend rewrites/proxy
├── vitest.config.ts             # jsdom environment, setup file
├── .env.example                 # Safe placeholders (no secrets)
└── package.json
```

## Installation

Requires **Node.js >= 20.9**.

```bash
# from the repository root — backend dependencies
npm install

# frontend dependencies
cd frontend
npm install
```

## Running the backend

The frontend needs the backend running to return real data. From the
**repository root** (not `frontend/`):

```bash
npm run dev     # tsx watch src/server.ts  → http://127.0.0.1:3000
# or
npm start       # tsx src/server.ts
```

Verify it is up:

```bash
curl http://127.0.0.1:3000/health
# {"status":"ok","service":"reforge-analysis-engine"}
```

AI-backed routes (Brain, plan, novelty, impact, build) require the backend's
own model configuration. Without it the backend returns **503**, and the
frontend renders an explicit "not configured" state rather than failing
silently — the rest of the console keeps working.

## Running the frontend

In a second terminal:

```bash
cd frontend
npm run dev     # http://localhost:3000 by default
```

If the backend already occupies port 3000, run the frontend elsewhere:

```bash
npm run dev -- -p 3100
```

The header shows a live backend status indicator (polled every 15s) so it is
immediately obvious whether the API is reachable.

## Environment variables

Both variables are optional; the defaults work for local development. Copy the
template to get started:

```bash
cp .env.example .env.local     # .env.local is git-ignored
```

| Variable | Scope | Default | Purpose |
| --- | --- | --- | --- |
| `REFORGE_BACKEND_URL` | Server only | `http://127.0.0.1:3000` | Origin the Next.js rewrites proxy `/health` and `/v1/*` to. |
| `NEXT_PUBLIC_API_URL` | **Browser** | `""` (same-origin) | Base URL prefixed onto API requests. Leave empty to use the proxy. |

**This frontend requires no API keys, tokens, or secrets.** Model credentials
belong to the backend and are never sent to or read by the browser. Anything
named `NEXT_PUBLIC_*` is inlined into the client bundle and is publicly
readable, so it must never hold a secret. Real `.env` files are git-ignored;
only `.env.example` is committed.

## API proxy configuration

`next.config.ts` rewrites two path prefixes to the backend:

| Frontend path | Proxied to |
| --- | --- |
| `/health` | `${REFORGE_BACKEND_URL}/health` |
| `/v1/:path*` | `${REFORGE_BACKEND_URL}/v1/:path*` |

Because the browser only ever calls the frontend origin, **no CORS
configuration is required on the backend**, and no backend origin is exposed to
the client. This applies to `next dev` and `next start` alike.

To point at a remote backend instead, either set `REFORGE_BACKEND_URL` (keeps
the same-origin proxy) or set `NEXT_PUBLIC_API_URL` to an absolute origin that
serves its own CORS headers.

## Routes

14 routes, all reachable through the sidebar, dashboard, or workflow
navigation — there are no dead links and no orphaned pages.

| Route | Purpose |
| --- | --- |
| `/` | Dashboard — backend health, project/pipeline history, recent activity |
| `/analyze` | Ingest a repository URL or `.zip` archive |
| `/analyze/report` | Full analysis report (findings, modules, dependencies, evidence) |
| `/plan` | Generate an implementation plan from the report |
| `/novelty` | Novelty assessment for a goal against the report |
| `/impact` | Impact model for a proposed change |
| `/build` | Build specification from report + plan/impact context |
| `/pipeline` | Redirects to `/pipeline/new` (flagship entry point) |
| `/pipeline/new` | Submit a pipeline: archive + goal + approval + verification |
| `/pipeline/[pipelineId]` | Execution receipt — stages, changes, verification, rollback |
| `/snapshots` | Snapshot explorer / project history |
| `/snapshot/[snapshotId]` | Snapshot detail + intelligence tab |
| `/snapshot/compare/[beforeId]/[afterId]` | Structural diff between two snapshots |
| `/brain` | Ask questions about the current analysis report |

Every route renders a loading, empty, and error state. Deep links to a missing
pipeline or snapshot return an honest 404 surface with a recovery path rather
than a blank screen, and unknown URLs render `not-found.tsx`, which lists every
real destination. Workflow routes that need an analysis report first show a
"report required" guard linking back to `/analyze` instead of failing.

## Testing

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src --max-warnings=0
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
```

**287 tests across 24 files**, all passing, none skipped. Coverage spans every
page, the API client and its error mapping, navigation and breadcrumbs, form
validation, resilience against malformed/failed responses, workflow-context
recovery, and data-honesty guarantees (no fabricated values when fields are
absent). Tests run entirely against fixtures in jsdom — no backend, no network.

## Production build

```bash
npm run build        # next build   → 15 prerendered routes
npm start            # serve the production build
```

Set `REFORGE_BACKEND_URL` in the serving environment so the rewrites reach the
real backend. `next build` also runs type checking and must complete with zero
errors before release.

## Known limitations

- **Session-scoped workflow state.** The analysis report survives a same-tab
  reload via `sessionStorage`, but derived artifacts (plan, novelty, impact,
  build) are in-memory and are cleared by a hard refresh. Opening a cold deep
  link into `/plan`, `/impact`, `/build`, or `/brain` without context shows a
  guard that routes back to `/analyze`. Closing the tab discards everything.
  This is a deliberate privacy trade-off, not a defect.
- **No result polling.** Pipeline results are immutable terminal receipts, so
  the console fetches them once. The only recurring request is the 15-second
  backend health check.
- **AI routes depend on backend configuration.** Without model configuration
  the backend answers 503 and those pages show a "not configured" state.
- **Archive uploads are capped at 200 MB** client-side, validated as `.zip`
  before upload to avoid a pointless large transfer.
- **No visual regression testing.** Playwright is not installed; responsive and
  accessibility guarantees rest on unit tests, rendered-HTML inspection, and
  structural review rather than screenshots across real viewports.
- **Single-user, no auth.** The console assumes a trusted local operator; it
  has no login, sessions, or multi-tenancy.

## Backend freeze boundary

The backend is **frozen** at commit `0507a7e`. Everything under `src/` and
`test/` at the repository root, along with the root `package.json` and backend
security configuration, is off-limits to frontend work.

Consequences for contributors:

- All frontend changes stay inside `frontend/`.
- When the frontend and backend disagree about a payload, **the frontend is
  corrected** — the contract is not renegotiated.
- Needed backend capabilities are documented as limitations rather than
  patched in from this side.

Verify the boundary at any time:

```bash
git diff --name-only 0507a7e..HEAD -- src/ test/    # must print nothing
```
