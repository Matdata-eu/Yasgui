# Data Model: Query Management

This document defines the data model needed to implement query management, including how it maps to each workspace backend.

## Client-Side (YASGUI persisted configuration)

### WorkspaceConfig
Represents a user-configured workspace stored locally (alongside existing endpoint config).

Fields:
- `id: string` (stable identifier; UUID-like)
- `label: string`
- `description?: string`
- `type: "git" | "sparql"`
- `createdAt?: string` (ISO datetime, optional)
- `updatedAt?: string` (ISO datetime, optional)

Type-specific:

#### GitWorkspaceConfig
- `remoteUrl: string` (HTTPS URL)
- `branch: string`
- `rootPath: string` (folder within repo; empty means repo root)
- `auth:`
  - `type: "pat"`
  - `token: string` (stored locally; never re-displayed)
  - `username?: string` (optional; some providers require)

#### SparqlWorkspaceConfig
- `endpoint: string` (SPARQL endpoint URL; should align with existing endpoint configuration)
- `workspaceIri: string` (IRI of the `yasgui:Workspace` concept scheme)
- `defaultGraph?: string` (if the store requires graph targeting)

### ManagedTabMetadata
Associates an open tab with a managed query.

Fields:
- `workspaceId: string`
- `backendType: "git" | "sparql"`
- `queryRef:`
  - Git: `{ path: string }`
  - SPARQL: `{ managedQueryIri: string }`
- `lastSavedVersionRef:`
  - Git: `{ commitSha?: string }` (or provider-specific version tag)
  - SPARQL: `{ managedQueryVersionIri: string }`
- `lastSavedTextHash?: string` (optional; supports FR-019)

## Backend-Neutral Domain Model

### Folder
- `id: string` (path for git; IRI for SPARQL)
- `label: string`
- `parentId?: string`

### ManagedQuery
- `id: string` (path for git; IRI for SPARQL)
- `label: string` (filename without extension, or `rdfs:label`)
- `folderId?: string` (path segment or folder IRI)

### ManagedQueryVersion
- `id: string` (commit hash or version IRI)
- `managedQueryId: string`
- `createdAt: string` (ISO datetime)
- `author?: string`
- `queryText: string`
- `associatedEndpoint?: string` (only for backends that store it; used for FR-020)

## Backend Mapping

### Git-Based Storage
- Folder hierarchy: repository directories under `rootPath`.
- ManagedQuery: `.rq` file (or `.sparql`) at `rootPath/<folder...>/<name>.rq` (or `.sparql`).
- Versioning: git commit history affecting a path (or provider equivalent history).
- Endpoint association: **none** (FR-022).

### SPARQL Endpoint-Based Storage (RDF)
Uses the vocabulary from `spec-query-management/ontology.ttl`:

- Workspace: `yasgui:Workspace` (subClassOf `skos:ConceptScheme`).
- WorkspaceFolder: `yasgui:WorkspaceFolder` (subClassOf `skos:Concept`).
  - `skos:inScheme` → the workspace
  - `skos:broader` → parent folder
  - `rdfs:label` → folder name
- ManagedQuery: `yasgui:ManagedQuery` (prov:Entity)
  - `rdfs:label` → query name
  - `dcterms:isPartOf` → workspace or folder
- ManagedQueryVersion: `yasgui:ManagedQueryVersion` (prov:Entity, spin:Query)
  - `dcterms:isVersionOf` → managed query
  - `dcterms:creator` → prov:Agent
  - `dcterms:created` → timestamp
  - `spin:text` → SPARQL query text
  - `prov:used` → `sd:Service` resources, which carry `sd:endpoint` (endpoint association for FR-020)
