# Feature Specification: Query Management

- [Feature Specification: Query Management](#feature-specification-query-management)
  - [Clarifications](#clarifications)
    - [Session 2025-12-26](#session-2025-12-26)
  - [User Scenarios \& Testing *(mandatory)*](#user-scenarios--testing-mandatory)
    - [User Story 1 - Browse and open managed queries (Priority: P1)](#user-story-1---browse-and-open-managed-queries-priority-p1)
    - [User Story 2 - Save a tab as a managed query (Priority: P2)](#user-story-2---save-a-tab-as-a-managed-query-priority-p2)
    - [User Story 3 - Configure and manage workspaces (Priority: P3)](#user-story-3---configure-and-manage-workspaces-priority-p3)
    - [Edge Cases](#edge-cases)
  - [Requirements *(mandatory)*](#requirements-mandatory)
    - [Functional Requirements](#functional-requirements)
    - [Assumptions](#assumptions)
    - [Dependencies](#dependencies)
    - [Key Entities *(include if feature involves data)*](#key-entities-include-if-feature-involves-data)
  - [Success Criteria *(mandatory)*](#success-criteria-mandatory)
    - [Measurable Outcomes](#measurable-outcomes)


**Feature Branch**: `[001-query-management]`  
**Created**: 2025-12-26  
**Status**: Draft  
**Input**: User description: "Add long-term, versioned query storage via workspaces"

## Clarifications

### Session 2025-12-26

- Q: When a user saves a managed query, when should a new version be created? → A: Create a new version only when query text changed.
- Q: When opening a managed query, how should endpoint selection behave? → A: Auto-switch to the managed query’s stored endpoint.
- Q: If a managed query is saved to an existing filename/path, what should happen? → A: Overwrite it (create a new version).
- Q: For Git-based workspaces, should endpoint association be stored with the query? → A: No; Git-based queries store only the query text (no endpoint association).

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Browse and open managed queries (Priority: P1)

As a user, I can browse long-term stored queries in a workspace (with folders) and open any stored query into a new editor tab.

**Why this priority**: This is the core value: users can reliably find and reuse queries beyond the limitations of temporary tabs and browser storage.

**Independent Test**: With a pre-populated workspace, a user can locate a query via browsing/search and open it into a new tab with the correct content.

**Acceptance Scenarios**:

1. **Given** at least one workspace exists and contains folders and queries, **When** the user opens the query browser and selects a query, **Then** a new tab opens with the stored query text loaded.
2. **Given** the active workspace has many queries, **When** the user filters/searches by query name, **Then** matching queries are shown and can be opened.
3. **Given** no workspaces are configured, **When** the user opens the query browser, **Then** the UI clearly indicates there are no workspaces and provides a path to add one.
4. **Given** a managed query has an associated endpoint, **When** the user opens it from the query browser, **Then** the active endpoint switches to the stored endpoint before executing.
5. **Given** a Git-based managed query has no associated endpoint, **When** the user opens it from the query browser, **Then** the query text loads without changing the currently active endpoint.

---

### User Story 2 - Save a tab as a managed query (Priority: P2)

As a user, I can explicitly save my current query tab into a workspace as a managed query so it becomes part of my long-term, versioned query library.

**Why this priority**: It converts “short-term work” into “long-term assets” without changing existing workflows for users who prefer ad-hoc tabs.

**Independent Test**: From an unmanaged tab, the user can save into a chosen workspace and then re-open the saved query from the browser and see the exact content.

**Acceptance Scenarios**:

1. **Given** the user has an unmanaged tab with query text, **When** they choose to save it as a managed query, **Then** they can select a workspace and folder path, enter a filename, and complete the save.
2. **Given** the user omits a file extension when naming a managed query, **When** saving, **Then** the system stores it using a consistent “SPARQL query file” naming convention.
3. **Given** a managed query tab has unsaved changes, **When** the user attempts to close the tab, **Then** the user is warned about unsaved changes and can choose to save or discard.
4. **Given** the user saves a managed query to a filename/path that already exists in the selected workspace folder, **When** they save, **Then** the existing managed query is updated (new version created) rather than creating a second query with the same name.

---

### User Story 3 - Configure and manage workspaces (Priority: P3)

As a user, I can add, edit, and remove workspaces so I can organize queries across multiple long-term storage backends (Git-based or SPARQL endpoint-based).

**Why this priority**: Workspaces unlock the feature for real usage (teams, projects, different endpoints, different repositories).

**Independent Test**: A user can add a new workspace, set it as active, and see its contents in the query browser.

**Acceptance Scenarios**:

1. **Given** the user is in settings, **When** they add a workspace of a supported type and save settings, **Then** the workspace appears in the workspace selector.
2. **Given** multiple workspaces exist, **When** the user switches the active workspace in the query browser, **Then** the folder/query list updates to match that workspace.
3. **Given** the user deletes a workspace, **When** they confirm deletion, **Then** it is removed from the UI while remote data remains unchanged.

---

### Edge Cases

- Workspace authentication fails (invalid credentials, revoked token, expired access): show a clear error and do not overwrite remote data.
- Remote data changes out of band (someone edits/deletes a query): refresh indicates change and prevents accidental overwrite.
- Write conflict in Git-based storage: save fails with a clear message that conflicts must be resolved externally.
- Network unavailable or storage backend unreachable: browsing may use last-known state where applicable; saving fails with actionable error.
- Duplicate names/paths: saving to an existing filename/path overwrites the existing managed query (new version) rather than creating a duplicate.
- Very large workspaces: browsing and searching remain usable (no UI freeze) and support deep folder hierarchies.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST support long-term query storage using workspaces, in addition to existing short-term tab behavior.
- **FR-002**: The system MUST allow configuring multiple workspaces and switching between them.
- **FR-003**: Each workspace MUST be of exactly one supported storage type: Git-based storage or SPARQL endpoint-based storage.
- **FR-004**: The query browser MUST display a hierarchical folder structure and the queries within it for the active workspace.
- **FR-005**: Users MUST be able to search/filter managed queries by name and quickly open a selected query into a new tab.
- **FR-006**: Users MUST be able to save any tab as a managed query into a chosen workspace, selecting/creating a folder path and providing a filename.
- **FR-007**: The system MUST clearly distinguish managed-query tabs from unmanaged tabs.
- **FR-008**: The system MUST show an “unsaved changes” indicator for a managed-query tab when the in-tab query content differs from the last saved version.
- **FR-009**: Saving managed queries MUST be explicit (no automatic saving).
- **FR-010**: For Git-based workspaces, the system MUST support reading and writing query files in a remote repository accessible over HTTPS.
- **FR-011**: For Git-based workspaces, users MUST be able to provide credentials suitable for repository read/write access.
- **FR-012**: For Git-based workspaces, users MUST be able to choose the branch used by the workspace.
- **FR-013**: If the Git-based workspace is in a conflicting state, the system MUST block saving and instruct the user to resolve conflicts externally.
- **FR-014**: For SPARQL endpoint-based workspaces, the system MUST store and retrieve managed queries, folders, and version history from a SPARQL endpoint.
- **FR-015**: For SPARQL endpoint-based workspaces, the system MUST reuse the endpoint’s existing authentication configuration.
- **FR-016**: The system MUST retain full version history of managed queries for both storage types.
- **FR-017**: Workspace credentials MUST be stored using the same persistence and protection approach as existing endpoint credentials.
- **FR-018**: Users MUST be able to delete a workspace configuration without deleting remote data.
- **FR-019**: The system MUST create a new managed-query version only when the query text changes.
- **FR-020**: When opening a managed query that has an associated endpoint, the system MUST set the active endpoint to the endpoint associated with that query/version.
- **FR-021**: If the user saves a managed query to an existing filename/path, the system MUST overwrite the existing managed query (creating a new version as applicable).
- **FR-022**: For Git-based workspaces, managed queries MUST be stored as plain `.sparql` files containing only the SPARQL query text (no endpoint metadata).

### Assumptions

- Existing “unmanaged” tabs continue to work as they do today.
- Managed queries are only updated when the user explicitly saves (no background/automatic saving).
- For Git-based storage, conflict resolution happens outside the application.
- For SPARQL endpoint-based storage, authentication is inherited from the endpoint configuration.

### Dependencies

- Users must have access rights to the selected long-term storage (repository or endpoint) for read/write operations.
- The chosen storage backend must be reachable over the network for browsing and saving.

### Key Entities *(include if feature involves data)*

- **Workspace**: A named configuration that points to exactly one long-term storage backend; includes label/description, authentication details, and a folder hierarchy.
- **Workspace Folder**: A node in a workspace’s hierarchy used to organize managed queries; may be nested.
- **Managed Query**: A saved query artifact with a stable identity (name, location in folder hierarchy, optional description).
- **Managed Query Version**: An immutable snapshot of a managed query at a point in time, including query text, author attribution (when available), timestamp, and associated endpoint(s) used (endpoint association may be absent for Git-based workspaces).
- **Commit/Save Message Template**: A user-configurable template used when persisting a new version to Git-based storage.
- **Credential**: A stored secret used to access a workspace’s backing store (e.g., repository access token); never displayed after entry.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: Users can find and open a previously saved query within 30 seconds in at least 90% of attempts.
- **SC-002**: After clearing browser storage or moving to a new device, users can still access queries saved in long-term storage (workspaces) with no manual recovery steps.
- **SC-003**: At least 95% of save attempts either succeed or fail with a clear, actionable error message (e.g., authentication failure, conflict, invalid name).
- **SC-004**: With 1,000 managed queries in a workspace, users see search/filter results update within 1 second in at least 95% of attempts.
