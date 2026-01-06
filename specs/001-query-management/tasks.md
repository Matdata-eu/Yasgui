---
description: "Task list for Query Management feature"
---

# Tasks: Query Management

**Input**: Design documents from `/specs/001-query-management/`

**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included by default (per template). These are Node-based unit tests to avoid requiring Chrome.

## Format: `- [ ] T### [P?] [US#] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US#]**: Which user story this task belongs to (US1/US2/US3)

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create query management module folder + barrel in packages/yasgui/src/queryManagement/index.ts
- [x] T002 [P] Add Query Browser styling scaffold in packages/yasgui/src/queryManagement/QueryBrowser.scss
- [x] T003 [P] Define initial domain + config types in packages/yasgui/src/queryManagement/types.ts
- [x] T004 Create backend folder + contract scaffold in packages/yasgui/src/queryManagement/backends/WorkspaceBackend.ts
- [x] T005 [P] Export query management module from packages/yasgui/src/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Checkpoint**: After this phase, US1 can be implemented and tested with a pre-populated workspace config.

- [x] T006 Extend persisted config schema for workspaces in packages/yasgui/src/PersistentConfig.ts
- [x] T007 [P] Add stable query text hashing helper for FR-019 comparisons in packages/yasgui/src/queryManagement/textHash.ts
- [x] T008 Add managed-tab metadata storage/accessors in packages/yasgui/src/Tab.ts
- [x] T009 [P] Define backend error codes + mapping helpers in packages/yasgui/src/queryManagement/backends/errors.ts
- [x] T010 Implement backend factory/registry for workspace configs in packages/yasgui/src/queryManagement/backends/getWorkspaceBackend.ts
- [x] T011 Implement SPARQL workspace backend skeleton using contracts/sparql-operations.md in packages/yasgui/src/queryManagement/backends/SparqlWorkspaceBackend.ts
- [x] T012 Implement Git workspace backend skeleton + pluggable provider client interface in packages/yasgui/src/queryManagement/backends/GitWorkspaceBackend.ts
- [x] T013 [P] Add in-memory backend for dev/unit tests in packages/yasgui/src/queryManagement/backends/InMemoryWorkspaceBackend.ts

### Unit test harness (required for this feature)

- [x] T014 Update tsconfig-test to compile Node unit tests under test/unit/ in tsconfig-test.json
- [x] T015 [P] Add backend contract unit tests (list/read/write/version basics) in test/unit/query-management-backend-test.ts
- [x] T016 [P] Add versioning rule unit tests (FR-019: only new version on text change) in test/unit/query-management-versioning-test.ts
- [x] T017 [P] Add backend error mapping unit tests (AUTH_FAILED/CONFLICT/etc) in test/unit/query-management-errors-test.ts

---

## Phase 3: User Story 1 - Browse and open managed queries (Priority: P1) 🎯 MVP

**Goal**: Browse hierarchical managed queries and open a selected query into a new tab.

**Independent Test**: With a pre-populated workspace in persisted config, the user can open the Query Browser, search/select a query, and see a new tab with the correct query text loaded.

### Tests for User Story 1

- [x] T018 [P] [US1] Add unit tests for client-side search/filter behavior in test/unit/query-management-browser-filter-test.ts
- [x] T019 [P] [US1] Add unit tests for endpoint auto-switch only when association exists (FR-020/FR-022) in test/unit/query-management-endpoint-switch-test.ts

### Implementation for User Story 1

- [x] T020 [P] [US1] Implement Query Browser drawer component scaffold in packages/yasgui/src/queryManagement/QueryBrowser.ts
- [x] T021 [P] [US1] Add Query Browser entry point button to per-tab control bar in packages/yasgui/src/Tab.ts
- [x] T022 [US1] Mount a single Query Browser instance at Yasgui root in packages/yasgui/src/index.ts
- [x] T023 [US1] Implement workspace selector + empty-state when no workspaces exist in packages/yasgui/src/queryManagement/QueryBrowser.ts
- [x] T024 [US1] Implement folder browsing + query listing via WorkspaceBackend.listFolder in packages/yasgui/src/queryManagement/QueryBrowser.ts
- [x] T025 [US1] Implement debounced name search over listing (client-side fallback) in packages/yasgui/src/queryManagement/QueryBrowser.ts
- [x] T026 [P] [US1] Implement open-managed-query helper (readQuery + create tab + set text) in packages/yasgui/src/queryManagement/openManagedQuery.ts
- [x] T027 [US1] Wire open flow from QueryBrowser selection to openManagedQuery in packages/yasgui/src/queryManagement/QueryBrowser.ts
- [x] T028 [US1] Implement endpoint auto-switch only when ReadResult.associatedEndpoint exists (FR-020) in packages/yasgui/src/queryManagement/openManagedQuery.ts
- [x] T029 [US1] Ensure Git-based reads never auto-switch endpoint (FR-022) in packages/yasgui/src/queryManagement/openManagedQuery.ts
- [x] T030 [US1] Add a11y behaviors (keyboard open/close, aria labels, focus management) in packages/yasgui/src/queryManagement/QueryBrowser.ts

**Checkpoint**: US1 works end-to-end with an in-memory or pre-configured backend.

---

## Phase 4: User Story 2 - Save a tab as a managed query (Priority: P2)

**Goal**: Explicitly save current tab into a workspace, overwriting by path and creating versions only when text changes.

**Independent Test**: From an unmanaged tab with query text, save to a workspace path, then read back and confirm the stored text; saving unchanged text does not create a new version.

### Tests for User Story 2

- [x] T031 [P] [US2] Add unit tests for overwrite-to-same-path semantics (FR-021) in test/unit/query-management-save-overwrite-test.ts
- [x] T032 [P] [US2] Add unit tests for version creation only on text change (FR-019) in test/unit/query-management-save-versioning-test.ts

### Implementation for User Story 2

- [x] T033 [P] [US2] Implement filename normalization to `.rq` (with `.sparql` backwards compatibility) in packages/yasgui/src/queryManagement/normalizeQueryFilename.ts
- [x] T034 [P] [US2] Implement Save Managed Query modal UI scaffold in packages/yasgui/src/queryManagement/SaveManagedQueryModal.ts
- [x] T035 [US2] Add “Save as managed query” action to tab UI/menu in packages/yasgui/src/TabContextMenu.ts
- [x] T036 [P] [US2] Implement save flow helper (choose workspace/path, call backend.writeQuery) in packages/yasgui/src/queryManagement/saveManagedQuery.ts
- [x] T037 [US2] Persist managed metadata on successful save (workspaceId/queryRef/versionRef/hash) in packages/yasgui/src/Tab.ts
- [x] T038 [US2] Add managed-tab indicator styling/labeling in packages/yasgui/src/TabElements.ts
- [x] T039 [US2] Add unsaved-changes tracking for managed tabs (compare current text hash vs lastSavedTextHash) in packages/yasgui/src/Tab.ts
- [x] T040 [US2] Warn on close when managed tab has unsaved changes in packages/yasgui/src/Tab.ts
- [x] T041 [US2] Surface CONFLICT errors with actionable message (resolve externally for Git) in packages/yasgui/src/queryManagement/saveManagedQuery.ts

**Checkpoint**: US2 save/version rules work and are testable without needing US3 UI.

---

## Phase 5: User Story 3 - Configure and manage workspaces (Priority: P3)

**Goal**: Add/edit/remove workspaces and switch active workspace.

**Independent Test**: User can add a workspace, set it active, and see its contents in the Query Browser; deleting a workspace removes only the local config.

### Tests for User Story 3

- [x] T042 [P] [US3] Add unit tests for workspace config validation (required fields per backend) in test/unit/query-management-workspace-validate-test.ts

### Implementation for User Story 3

- [x] T043 [US3] Add Workspaces section to settings UI in packages/yasgui/src/TabSettingsModal.ts
- [x] T044 [P] [US3] Implement workspace settings form component in packages/yasgui/src/queryManagement/WorkspaceSettingsForm.ts
- [x] T045 [US3] Implement workspace add/edit/remove persistence + timestamps in packages/yasgui/src/PersistentConfig.ts
- [x] T046 [US3] Implement active workspace selection persistence in packages/yasgui/src/PersistentConfig.ts
- [x] T047 [US3] Wire QueryBrowser workspace selector to persisted active workspace in packages/yasgui/src/queryManagement/QueryBrowser.ts
- [x] T048 [US3] Ensure workspace credentials are never re-displayed after entry in packages/yasgui/src/queryManagement/WorkspaceSettingsForm.ts
- [x] T049 [US3] Add “Validate access” action (calls validateAccess) with clear errors in packages/yasgui/src/queryManagement/WorkspaceSettingsForm.ts
- [x] T050 [US3] Implement delete confirmation that preserves remote data (FR-018) in packages/yasgui/src/TabSettingsModal.ts

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T051 [P] Update manual validation steps if implementation details changed in specs/001-query-management/quickstart.md
- [x] T052 [P] Add a dev-only prepopulation snippet for workspaces (for manual QA) in dev/yasgui.html
- [x] T053 Add basic performance guardrails (debounce + avoid O(n) DOM rebuild per keystroke) in packages/yasgui/src/queryManagement/QueryBrowser.ts
- [x] T054 [P] Add user-facing documentation entry for workspaces/query browser in docs/user-guide.md
- [x] T055 Run the full quickstart validation checklist and record any follow-ups in specs/001-query-management/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → blocks Foundational
- **Foundational (Phase 2)** → blocks all User Stories
- **US1** can start immediately after Foundational
- **US2** can start after Foundational, but best validated after US1 (to re-open saved queries via the browser)
- **US3** can start after Foundational; it improves UX but is not required for US1/US2 to be testable with pre-populated config

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories (depends only on Foundational)
- **US2 (P2)**: Depends on Foundational; for full UX verification, depends on US1
- **US3 (P3)**: Depends only on Foundational

---

## Parallel Example: User Story 1

The following can be developed in parallel (different files):

- T018 (tests) + T019 (tests)
- T020 (QueryBrowser scaffold) + T021 (button wiring) + T026 (open helper)

## Parallel Example: User Story 2

- T031 (tests) + T032 (tests)
- T033 (filename normalization) + T034 (modal scaffold) + T036 (save helper)

## Parallel Example: User Story 3

- T042 (tests) + T044 (form component)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 + Phase 2
2. Complete US1 (Phase 3)
3. Validate via specs/001-query-management/quickstart.md

### Incremental Delivery

- Add US2 save/versioning next
- Add US3 workspace CRUD last

---

## Post-spec follow-ups (UX + docs)

- [x] T056 Clarify Git workspace provider support and SSH remoteUrl semantics in docs (docs/user-guide.md and website docs)
- [x] T057 Add an Advanced toggle to the Git workspace add/edit modal and move optional fields into it
- [x] T058 Make Bitbucket Cloud work without a configured branch by resolving the repository default branch

## Post-spec follow-ups (Backend correctness + cleanup)

- [x] T059 Persist associated endpoint on save (wire current tab endpoint into SPARQL save flow)
- [x] T060 Persist associated endpoint triples in SPARQL backend write (packages/yasgui/src/queryManagement/backends/SparqlWorkspaceBackend.ts)
- [x] T061 Remove legacy SPARQL managed query support (/mq/ mapping) (packages/yasgui/src/queryManagement/backends/SparqlWorkspaceBackend.ts)
- [x] T062 Add local Apache Jena/Fuseki Docker tip to user docs (docs/user-guide.md)
- [x] T063 Add workspace IRI reuse/create note in SPARQL workspace form (packages/yasgui/src/queryManagement/WorkspaceSettingsForm.ts)
