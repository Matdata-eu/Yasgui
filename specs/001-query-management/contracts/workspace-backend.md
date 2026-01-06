# Contract: Workspace Backend

This contract defines the boundary between YASGUI UI/state and workspace storage backends.

## Goals

- Support both backend types (`git`, `sparql`) behind a shared interface.
- Ensure explicit save (no autosave).
- Ensure version history can be retrieved.
- Ensure conflict detection blocks overwrites for git-style flows.

## Types

### BackendType

- `"git" | "sparql"`

### FolderEntry

- `kind: "folder" | "query"`
- `id: string` (path or IRI)
- `label: string`
- `parentId?: string`

### ReadResult

- `queryText: string`
- `versionTag?: string` (commit SHA / ETag / SPARQL version IRI)
- `associatedEndpoint?: string` (present only when backend stores endpoint association)

### VersionInfo

- `id: string` (commit SHA / version IRI)
- `createdAt: string` (ISO datetime)
- `author?: string`
- `message?: string`

## Operations

### validateAccess()

Checks that credentials/config are usable.

Returns:

- success, or
- an error with `code` in:
  - `AUTH_FAILED`
  - `FORBIDDEN`
  - `NOT_FOUND`
  - `NETWORK_ERROR`
  - `RATE_LIMITED`

### listFolder(folderId)

Returns `FolderEntry[]` for the given folder (or root).

### searchByName(query)

Optional optimization. If not supported, UI must implement search client-side over cached listings.

### readQuery(queryId)

Returns `ReadResult`.

### writeQuery(queryId, queryText, options)

Options:

- `message?: string` (commit/save message)
- `expectedVersionTag?: string` (for optimistic concurrency)

Rules:

- If `expectedVersionTag` is provided and does not match remote state, throw `CONFLICT`.
- If `queryText` is unchanged from the latest version, backend may no-op (FR-019).

### listVersions(queryId)

Returns `VersionInfo[]` ordered newest-first.

### readVersion(queryId, versionId)

Returns `ReadResult` for a historical version.

## Git Backend Notes

- Query storage is plain `.rq` (or `.sparql`) text (FR-022).
- Endpoint association is not stored, so `associatedEndpoint` is always absent.
- Conflicts must be surfaced as `CONFLICT` and instruct external resolution (FR-013).

## SPARQL Backend Notes

- Backend uses the yasgui vocabulary; endpoint association is stored via `prov:used` → `sd:endpoint` on versions.
- Authentication is inherited from the configured endpoint auth (FR-015).
