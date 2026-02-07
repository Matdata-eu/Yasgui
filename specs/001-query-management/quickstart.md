# Quickstart: Query Management (Planned)

This quickstart is for validating the feature once implemented.

## Prerequisites

- Node.js v20 LTS
- Install dependencies deterministically:
  - `PUPPETEER_SKIP_DOWNLOAD=1 npm ci`

## Run locally (dev)

- `npm run dev`
- Open `http://localhost:4000` and use the pages in `dev/` to test YASGUI.

## Build + unit tests (recommended loop)

- `npm run build`
- `npm run unit-test`

(Full `npm test` runs puppeteer and may require Chrome + AppArmor changes; see repo docs.)

## Manual validation checklist

### Workspace configuration

1. Open YASGUI settings (per-tab Settings button) and go to the **Workspaces** tab.
2. Add a workspace configuration:
   - Git workspace: provide repo URL and a token (optional fields are under **Advanced**).
   - SPARQL workspace: provide endpoint URL, then select an existing workspace IRI from the dropdown or enter a new one.
3. Select a default workspace from the **Default workspace** dropdown.
4. (Optional) Use **Validate access** to confirm the backend can be reached.

### Browse and open

1. Open the Query Browser (button in the per-tab control bar).
2. Navigate folders.
3. Open a managed query and verify:
   - a new tab is created
   - query text is loaded
   - endpoint auto-switch happens only when the opened query version has an associated endpoint

### Save and version

1. From an unmanaged tab, save as managed query into a workspace.
2. Save again with unchanged text → no new version (FR-019).
3. Save again after changing text → new version created.
4. Save to an existing path/name → overwrite existing query (new version as applicable).

### Conflict and auth errors

- Git workspace: force a remote change and verify save fails with a clear conflict message.
- SPARQL workspace: configure invalid auth and verify failures are actionable.

## Validation notes (2025-12-28)

- The Workspaces UI stores credentials locally and never re-displays tokens after entry.
- Git workspace validation and conflict testing requires a real provider token + a repo with an API-accessible history.
- SPARQL workspace browsing/saving requires an endpoint that supports SPARQL Protocol over POST and returns JSON results for SELECT.

## Manual QA note: SPARQL endpoint requirements

For SPARQL workspaces to work end-to-end (browse + save + version history), the configured endpoint must support:

- **SPARQL 1.1 Query + Update** over HTTP POST:
  - `POST` with form body `query=...` (SELECT)
  - `POST` with form body `update=...` (INSERT DATA for saves)
- **SPARQL JSON results** for SELECT (e.g., `application/sparql-results+json`).
- **Write permissions** in the configured graph:
  - If you use a named graph, set **Default graph** in the workspace configuration (sent as `default-graph-uri`).

Data model (what YASGUI reads/writes) uses these terms:

- Types under `https://matdata.eu/ns/yasgui#`:
  - `yasgui:Workspace`, `yasgui:WorkspaceFolder`, `yasgui:ManagedQuery`, `yasgui:ManagedQueryVersion`
- Folder hierarchy:
  - `skos:inScheme <workspaceIri>`
  - `skos:broader` for parent folder links
- Query placement + versioning:
  - `dcterms:isPartOf` (folder → query membership)
  - `dcterms:isVersionOf` (version → managed query)
  - `dcterms:created` (version timestamp)
  - `spin:text` (SPARQL query text)
- Optional associated endpoint on a version:
  - `prov:used` → `sd:endpoint`

IRI conventions used by the implementation:

- Managed query IRI: `<workspaceIri>_mq_<uuid>`
- Folder IRI: `<workspaceIri>/folder/<url-encoded folderPath>`
- Version IRI: `<workspaceIri>_mq_v_<uuid>`

Rationale:

- Managed query identities must remain immutable even if the user renames the query or moves it between folders.
- The `.rq` (or `.sparql`) file extension is a Git workspace detail and is not part of the SPARQL-managed query identity.

## Test data for SPARQL backend

The repo contains example RDF and shapes:

- `spec-query-management/example-data.ttl`
- `spec-query-management/shapes.ttl`

Load these into a local triplestore and point the workspace endpoint at it to validate folder/query/version behavior.
