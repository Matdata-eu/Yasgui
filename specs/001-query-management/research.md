# Phase 0 Research: Query Management

## Goal
Turn the feature spec into an implementable design that fits YASGUI’s current architecture (TypeScript monorepo, browser-first runtime, localStorage persistence, SPARQL request plumbing) and the repo constitution gates.

## Key Repo Findings (Existing Capabilities)

### Persistence + credentials (local)
- YASGUI already persists user config in browser storage via `PersistentConfig` (stored in `@matdata/yasgui-utils` `Storage`, backed by localStorage).
- Endpoint configurations (including authentication) are stored per-endpoint in `PersistentConfig` (`endpointConfigs`).
- The settings modal explicitly warns that credentials live in browser localStorage.

### SPARQL request + auth stack
- SPARQL HTTP requests are already implemented in `@matdata/yasqe` (`sparql.ts`), including headers/auth (Basic/Bearer/API-key/OAuth2).
- OAuth2 PKCE helpers exist (`OAuth2Utils.ts`) and are already integrated into query execution + token refresh.

### UI patterns
- Per-tab control bar already hosts multiple “context” buttons (settings/prefix/theme/orientation/etc.).
- There are existing patterns for dropdowns/menus with `aria-expanded` and `aria-haspopup`.
- The global tab strip uses `role="tablist"` and roving-focus logic; adding non-tab controls into the tab strip is riskier.

### Git integration
- There is no existing git runtime dependency or implementation in the product code.
- The repo contains a prior design reference in `spec-query-management/` that matches the feature spec, but there is no implementation.

## Decisions

### D1 — Where workspace configs live
**Decision:** Store workspace configurations (including credentials) in YASGUI’s existing persisted config (`PersistentConfig`) alongside endpoint configs.

**Rationale:**
- Aligns with FR-017 (same persistence/protection approach as endpoint credentials).
- Keeps all user-level configuration in one well-understood place.

**Alternatives considered:**
- Separate storage namespace or a new persistence mechanism (rejected: unnecessary complexity; violates “smallest change” principle).

---

### D2 — Query Browser UI entry point
**Decision:** Add a “Query Browser” hamburger button to the per-tab control bar (like existing settings/prefix buttons), and mount the browser drawer at the YASGUI root (single instance).

**Rationale:**
- Avoids breaking the tab strip’s `role="tablist"` semantics and roving-focus behavior.
- Matches the feature concept: the browser is app-level navigation that opens queries into *new tabs*.

**Alternatives considered:**
- Put the hamburger inside the tab strip (rejected: high a11y/keyboard risk and likely refactor of tablist navigation logic).

---

### D3 — Git-based workspace implementation approach
**Decision:** Implement git-based workspaces via a *pluggable backend interface*, with the initial “reference” backend targeting Git hosting provider HTTP APIs (e.g., GitHub/GitLab) rather than raw git protocol.

**Rationale:**
- YASGUI is browser-first; raw git “smart HTTP” is frequently blocked by CORS and is complex to implement robustly.
- Provider APIs support hierarchical listing, file read/write, and history, all over HTTPS, satisfying the intent of FR-010/FR-011/FR-012.
- Conflicts can be handled as explicit “write rejected due to mismatch” and surfaced per FR-013.

**Alternatives considered:**
- Full browser git client (e.g., isomorphic-git style) + IndexedDB filesystem (rejected for initial implementation: high complexity + CORS fragility; revisit only if truly required).
- “Any git server URL” without provider API support (marked as follow-up: depends on deployment constraints and CORS/proxy story).

**Implications:**
- The plan must define a `GitWorkspaceBackend` contract that can be implemented by:
  - provider HTTP APIs, or
  - a consumer-supplied adapter (e.g., host app provides its own server/proxy).

---

### D4 — SPARQL endpoint workspace storage protocol
**Decision:** Use the existing ontology + SHACL reference in `spec-query-management/` and implement endpoint-based workspaces using SPARQL 1.1 SELECT/CONSTRUCT/UPDATE over the configured endpoint.

**Rationale:**
- Matches existing spec artifacts (yasgui:Workspace, yasgui:WorkspaceFolder, yasgui:ManagedQuery, yasgui:ManagedQueryVersion; SKOS-based hierarchy).
- Reuses existing request/auth stack (no new HTTP client needed).

**Alternatives considered:**
- Graph Store Protocol PUT/POST for Turtle uploads (defer: would require new endpoint handling + content-type flows).

---

### D5 — Versioning rule enforcement
**Decision:** Create a new managed-query version only when query text changes (FR-019). Use a deterministic comparison strategy:
- compare trimmed query text string to last-saved text, or
- compare a stable hash of query text (e.g., SHA-256) persisted alongside the tab’s managed metadata.

**Rationale:**
- Avoids “version spam” from metadata-only saves.

## Open Questions (resolved to proceed)

### Q1 — “Any HTTPS-accessible git server” feasibility in the browser
**Resolution for planning:** Treat “raw git protocol support” as optional/advanced; primary supported route is provider APIs or consumer-supplied adapter.

### Q2 — Endpoint auto-switch for Git-based queries
**Resolution for planning:** Since Git-based queries store only `.sparql` text (FR-022), they have no endpoint association. Auto-switch behavior (FR-020) applies only when the opened managed query has an associated endpoint (e.g., endpoint-based workspace versions).

## Risks
- Browser CORS may block provider APIs or git servers in some environments; plan must include clear errors and documentation guidance.
- Storing PATs/tokens in localStorage has security implications; UI should mirror existing endpoint-auth warnings.
- Large workspaces: listing/searching must avoid UI freezes (debounce + progressive rendering/virtualization if needed).
