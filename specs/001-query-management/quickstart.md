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
1. Open YASGUI settings and add a workspace configuration:
   - Git workspace: provide repo URL, branch, root folder, and a token.
   - SPARQL workspace: choose an existing endpoint and a workspace IRI.
2. Switch active workspace and ensure the query browser reflects the correct contents.

### Browse and open
1. Open query browser (hamburger).
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

## Test data for SPARQL backend
The repo contains example RDF and shapes:
- `spec-query-management/example-data.ttl`
- `spec-query-management/shapes.ttl`

Load these into a local triplestore and point the workspace endpoint at it to validate folder/query/version behavior.
