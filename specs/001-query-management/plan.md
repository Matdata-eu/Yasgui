
# Implementation Plan: Query Management

**Branch**: `[001-query-management]` | **Date**: 2025-12-26 | **Spec**: `./spec.md`
**Input**: Feature specification from `/specs/001-query-management/spec.md`

## Summary

Add long-term, versioned query storage via configurable workspaces (Git-based and SPARQL endpoint-based) while keeping the existing short-term tab workflow intact.

The implementation will:
- Persist workspace configuration (including credentials) in YASGUI’s existing persisted config (`PersistentConfig`) in browser storage.
- Add a Query Browser drawer (hamburger entry point) that lists folders/queries for the active workspace and opens selected queries into new tabs.
- Add explicit “save as managed query” behavior (no autosave), including overwrite-on-same-path and version creation only when query text changes.
- Implement a backend abstraction (`WorkspaceBackend`) with concrete backends for:
  - Git-based storage: initial reference implementation via git hosting provider HTTP APIs (pluggable adapter), storing plain `.rq` files (with backwards compatibility for `.sparql` files).
  - SPARQL endpoint storage: SPARQL 1.1 operations using the existing request/auth stack and the existing yasgui RDF model.

Phase deliverables:
- Phase 0 (Research): `./research.md`
- Phase 1 (Design): `./data-model.md`, `./contracts/*`, `./quickstart.md`

## Technical Context

**Language/Version**: TypeScript (repo uses TypeScript 5.9.x; build toolchain runs on Node.js v20 LTS)

**Primary Dependencies**:
- Build/dev: Vite (dev), esbuild (prod bundling)
- Editor/results: `@matdata/yasqe`, `@matdata/yasr`
- Utilities: `@matdata/yasgui-utils`, `lodash-es`

**Storage**:
- Local persistence: `@matdata/yasgui-utils` `Storage` (localStorage-backed), used by `PersistentConfig`
- Remote persistence (new):
  - SPARQL endpoint: SPARQL 1.1 SELECT/UPDATE using the existing Yasqe request/auth stack
  - Git: provider HTTP APIs via a pluggable adapter (browser-first; avoids raw git protocol complexity/CORS)

**Testing**: Mocha + Chai (tests rely on build output; build-first is mandatory)

**Target Platform**:
- Product runtime: browser
- Build/test tooling: Node.js

**Project Type**: TypeScript monorepo (npm workspaces; packages under `packages/*`)

**Performance Goals**:
- Keep query browsing/search responsive for ~1,000 managed queries (search/filter results update < 1s in typical cases)

**Constraints**:
- No autosave; explicit save only
- WCAG 2.1 AA for any UI changes
- Do not commit generated artifacts (repo `build/`, package `packages/*/build/`)
- No new monorepo dependency cycles (`utils` remains bottom layer)

**Scale/Scope**:
- Support deep folder hierarchies and large lists without UI freezes (debounce input; avoid O(n) DOM work per keystroke; consider progressive rendering if needed)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Build-first enforced: plan and quickstart run `npm run build` before any tests.
- No build artifacts committed: feature changes will only touch `packages/*/src`, `test/`, and docs under `specs/`.
- Install reproducible: use `PUPPETEER_SKIP_DOWNLOAD=1 npm ci`.
- Monorepo integrity: add query management code under `packages/yasgui/src`; only move helpers to `packages/utils` if they are clearly cross-cutting.
- TypeScript discipline: keep existing `tsconfig*` roles intact and continue using `@matdata/*` aliases.
- Quality gates: `npm run util:lint` and `npm run util:validateTs` remain clean (no new errors introduced).
- Testing posture: prioritize unit tests that run without Chrome; document any E2E needs.
- Accessibility/UX: avoid breaking tab strip (`role="tablist"`) semantics; ensure keyboard/focus + theme compatibility.

**Post-Design Re-check (Phase 1):** No constitution violations required by the current design. Remaining risks are implementation-time (CORS/auth for Git APIs, large lists performance) and are documented in `research.md`.

## Project Structure

### Documentation (this feature)

```text
specs/001-query-management/
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks) - not created by /speckit.plan
```

### Source Code (repository root)

```text
packages/
├── yasgui/
│   └── src/
│       ├── PersistentConfig.ts          # extend persisted schema for workspaces
│       ├── Tab.ts                       # managed-tab metadata + save/open flows
│       ├── TabSettingsModal.ts          # workspace CRUD UI (new section/tab)
│       └── (new) queryManagement/
│           ├── QueryBrowser.ts          # drawer UI + search + open
│           ├── QueryBrowser.scss
│           ├── types.ts                 # WorkspaceConfig + managed metadata
│           └── backends/
│               ├── WorkspaceBackend.ts  # backend contract
│               ├── GitWorkspaceBackend.ts
│               └── SparqlWorkspaceBackend.ts
├── yasqe/
├── yasr/
└── utils/

test/
└── (add unit tests for backend logic + versioning rules)
```

**Structure Decision**: Feature code lives in `packages/yasgui/src` because query management is YASGUI-scope. Shared utilities move to `packages/utils` only when clearly cross-package.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | (n/a) | (n/a) |
