# Query management

- [Query management](#query-management)
  - [Overview](#overview)
  - [Storage Options](#storage-options)
  - [Technical Architecture](#technical-architecture)
    - [Git Integration](#git-integration)
      - [Conflict Resolution](#conflict-resolution)
    - [SPARQL Endpoint Storage](#sparql-endpoint-storage)
      - [Ontology](#ontology)
      - [SHACL shape](#shacl-shape)
      - [Example data](#example-data)
  - [User stories](#user-stories)
    - [Navigating managed queries](#navigating-managed-queries)
    - [Activating a managed query](#activating-a-managed-query)
    - [Updating a managed query](#updating-a-managed-query)
    - [Creating new managed queries](#creating-new-managed-queries)
    - [Managing workspaces](#managing-workspaces)

## Overview

This new specification should enhance Yasgui with a 'long term memory' capability that offers version control. The current tab functionality is perfect for short term ends. But in the long term, the tabs might disappear (expiration of cache, or changing of the browser, ...). The tabs are also not doable once the user reaches more than 10+ tabs. We would need a solution with more than just tabs. This means that we need another storage options besides the persistent browser storage.

Scope: mainly Yasgui

## Storage Options

The workspace is the top level component in the query management system and is linked to one storage system types.

We want to support 2 long term persistent storage system types:

- Git-based storage
- SPARQL endpoint-based storage

The user can configure multiple workspaces of either type and switch between them simultaneously. Workspaces contains:

- 1 storage system type
- Their own folder structure
- Authentication credentials
- Metadata (label, description, ...)
- Managed queries inside the folder structure

## Technical Architecture

### Git Integration

- **Storage Location**: Remote repositories (GitHub, GitLab, or any HTTPS-accessible git server)
- **Authentication**: HTTPS with Personal Access Tokens
- **File Format**: Plain `.rq` files (or `.sparql` for backwards compatibility) containing only the SPARQL query text
- **Version Control**: git history
- **Folder Structure**: Hierarchical folders in the repository

#### Conflict Resolution

Git conflicts must be resolved outside of Yasgui (using git client or GitHub/GitLab web interface). Query save operations will fail with an error message if conflicts exist, prompting the user to sync/resolve externally.

### SPARQL Endpoint Storage

- **Storage Location**: SPARQL endpoint
- **Authentication**: As defined in the sparql endpoint configuration
- **Ontology**: SPIN, DCTerms, PROV-based vocabulary with some additional classes/properties under `yasgui:` namespace
- **Additional classes**:
  - `yasgui:ManagedQuery` - Represents a saved query
  - `yasgui:ManagedQueryVersion` - Represents a version of a query
  - `yasgui:Workspace` - Represents a version of a query
  - `yasgui:WorkspaceFolder` - Represents a version of a query
- **Additional properties**: none required
- **Version Control**: Use `dcterms:isVersionOf` to link versions, full history retained
- **Metadata Stored**:
  - Endpoint URL
  - Last modified date/author
  - Version history
  - Query content
- **Folder Structure**: SKOS-based hierarchy using `skos:ConceptScheme` and `skos:narrower`

#### Ontology

```turtle

@prefix yasgui:  <https://matdata.eu/ns/yasgui#> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix prov:    <http://www.w3.org/ns/prov#> .
@prefix skos:    <http://www.w3.org/2004/02/skos/core#> .
@prefix spin:    <http://spinrdf.org/spin#> .
@prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#> .

yasgui:Workspace
  a rdfs:Class ;
  rdfs:label "YASGUI Workspace" ;
  rdfs:comment "A SKOS ConceptScheme representing a YASGUI workspace. May contain folders (yasgui:WorkspaceFolder) and/or managed queries directly." ;
  rdfs:subClassOf skos:ConceptScheme .

yasgui:WorkspaceFolder
  a rdfs:Class ;
  rdfs:label "YASGUI Workspace Folder" ;
  rdfs:comment "A SKOS Concept that belongs to a workspace scheme and organizes managed queries hierarchically." ;
  rdfs:subClassOf skos:Concept .

yasgui:ManagedQuery
  a rdfs:Class ;
  rdfs:label "Managed Query" ;
  rdfs:comment "A logical SPARQL query artifact. It is placed either in a workspace (root) or a workspace folder. Versions are separate entities." ;
  rdfs:subClassOf prov:Entity .

yasgui:ManagedQueryVersion
  a rdfs:Class ;
  rdfs:label "Managed Query Version" ;
  rdfs:comment "An immutable version of a SPARQL query, with author, timestamp, endpoints, and textual representation." ;
  rdfs:subClassOf prov:Entity , spin:Query .
```

#### SHACL shape

```turtle


@prefix sh:       <http://www.w3.org/ns/shacl#> .
@prefix yasgui:   <https://matdata.eu/ns/yasgui#> .
@prefix dcterms:  <http://purl.org/dc/terms/> .
@prefix prov:     <http://www.w3.org/ns/prov#> .
@prefix skos:     <http://www.w3.org/2004/02/skos/core#> .
@prefix sd:       <http://www.w3.org/ns/sparql-service-description#> .
@prefix spin:     <http://spinrdf.org/spin#> .
@prefix rdfs:     <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:      <http://www.w3.org/2001/XMLSchema#> .
@prefix rdf:      <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

#################################################################
# Workspace (ConceptScheme)
#################################################################

yasgui:WorkspaceShape
  a sh:NodeShape ;
  sh:targetClass yasgui:Workspace ;
  sh:closed false ;
  sh:ignoredProperties ( rdf:type ) ;

  sh:property [
    sh:path rdfs:label ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:message "Workspace must have rdfs:label." ;
  ] .

#################################################################
# WorkspaceFolder (skos:Concept)
#################################################################

yasgui:WorkspaceFolderShape
  a sh:NodeShape ;
  sh:targetClass yasgui:WorkspaceFolder ;
  sh:closed false ;
  sh:ignoredProperties ( rdf:type ) ;

  sh:property [
    sh:path skos:inScheme ;
    sh:minCount 1 ;
    sh:class yasgui:Workspace ;
    sh:message "WorkspaceFolder must belong to a yasgui:Workspace (skos:ConceptScheme)." ;
  ] ;

  sh:property [
    sh:path rdfs:label ;
    sh:minCount 1 ;
    sh:datatype xsd:string ;
    sh:message "WorkspaceFolder must have rdfs:label." ;
  ] ;

  sh:property [
    sh:path skos:broader ;
    sh:minCount 0 ;
    sh:class yasgui:WorkspaceFolder ;
    sh:message "If present, skos:broader should point to another WorkspaceFolder." ;
  ] ;

  sh:sparql [
    a sh:SPARQLConstraint ;
    sh:message "Folder hierarchy must be acyclic (no folder broader+ itself)." ;
    sh:select """
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      SELECT $this WHERE { $this (skos:broader)+ $this . }
    """ ;
  ] .

#################################################################
# ManagedQuery (logical artifact)
#################################################################

yasgui:ManagedQueryShape
  a sh:NodeShape ;
  sh:targetClass yasgui:ManagedQuery ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;

  sh:property [
    sh:path rdfs:label ;
    sh:datatype xsd:string ;
    sh:minCount 1 ;
    sh:message "ManagedQuery must have rdfs:label." ;
  ] ;

  sh:property [
    sh:path dcterms:description ;
    sh:datatype xsd:string ;
    sh:minCount 0 ;
    sh:message "Optional dcterms:description is a string." ;
  ] ;

  sh:property [
    sh:path dcterms:isPartOf ;
    sh:minCount 1 ;
    sh:or (
      [ sh:class yasgui:WorkspaceFolder ]
      [ sh:class yasgui:Workspace ]
    ) ;
    sh:message "ManagedQuery must be placed in a WorkspaceFolder or directly in a Workspace (root document)." ;
  ] .

#################################################################
# ManagedQueryVersion (immutable)
#################################################################

yasgui:ManagedQueryVersionShape
  a sh:NodeShape ;
  sh:targetClass yasgui:ManagedQueryVersion ;
  sh:closed true ;
  sh:ignoredProperties ( rdf:type ) ;

  sh:property [
    sh:path dcterms:isVersionOf ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:class yasgui:ManagedQuery ;
    sh:message "Version must declare which ManagedQuery it is a version of (dcterms:isVersionOf)." ;
  ] ;

  sh:property [
    sh:path dcterms:creator ;
    sh:minCount 1 ;
    sh:node yasgui:AgentShape ;
    sh:message "Each version must have a dcterms:creator (author)." ;
  ] ;

  sh:property [
    sh:path dcterms:created ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:dateTime ;
    sh:message "Each version must have dcterms:created (xsd:dateTime)." ;
  ] ;

  sh:property [
    sh:path spin:text ;
    sh:minCount 1 ;
    sh:maxCount 1 ;
    sh:datatype xsd:string ;
    sh:message "Each version must carry the SPARQL query text in spin:text." ;
  ] ;

  sh:property [
    sh:path prov:used ;
    sh:minCount 1 ;
    sh:node yasgui:SdServiceShape ;
    sh:message "Each version must reference at least one sd:Service via prov:used." ;
  ] ;
.

#################################################################
# sd:Service (endpoint)
#################################################################

yasgui:SdServiceShape
  a sh:NodeShape ;
  sh:targetClass sd:Service ;

  sh:property [
    sh:path sd:endpoint ;
    sh:minCount 1 ;
    sh:nodeKind sh:IRI ;
    sh:message "sd:Service must have at least one sd:endpoint (IRI)." ;
  ] .

#################################################################
# Agents (authors / attribution)
#################################################################

yasgui:AgentShape
  a sh:NodeShape ;
  sh:targetClass prov:Agent ;

  sh:or (
    [ sh:class prov:Person ]
    [ sh:class prov:Organization ]
    [ sh:hasValue prov:Agent ]
  ) ;

  sh:property [
    sh:path rdfs:label ;
    sh:minCount 0 ;
    sh:datatype xsd:string ;
    sh:message "Agents should have rdfs:label for display." ;
    sh:severity sh:Info ;
  ] .


```

#### Example data

```turtle

@prefix yasgui:  <https://matdata.eu/ns/yasgui#> .
@prefix ex:      <https://matdata.eu/id/> .
@prefix dcterms: <http://purl.org/dc/terms/> .
@prefix prov:    <http://www.w3.org/ns/prov#> .
@prefix skos:    <http://www.w3.org/2004/02/skos/core#> .
@prefix spin:    <http://spinrdf.org/spin#> .
@prefix sd:      <http://www.w3.org/ns/sparql-service-description#> .
@prefix rdfs:    <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:     <http://www.w3.org/2001/XMLSchema#> .

#############################
# Endpoints (sd:Service)
#############################

ex:eraEndpoint
  a sd:Service ;
  rdfs:label "ERA SPARQL Endpoint" ;
  sd:endpoint <https://data-interop.era.europa.eu/api/sparql> .

ex:wikidataEndpoint
  a sd:Service ;
  rdfs:label "Wikidata SPARQL Endpoint" ;
  sd:endpoint <https://query.wikidata.org/sparql> .

#############################
# Workspaces (ConceptSchemes)
#############################

ex:Workspace_RailwayOps
  a yasgui:Workspace ;
  rdfs:label "Railway Ops Workspace" .

ex:Workspace_ERA_Examples
  a yasgui:Workspace ;
  rdfs:label "ERA Examples Workspace" .

#############################
# Folders (WorkspaceFolder) under Railway Ops
#############################

ex:railway
  a yasgui:WorkspaceFolder ;
  skos:inScheme ex:Workspace_RailwayOps ;
  rdfs:label "railway" .

ex:analytics
  a yasgui:WorkspaceFolder ;
  skos:inScheme ex:Workspace_RailwayOps ;
  rdfs:label "analytics" .

ex:safety
  a yasgui:WorkspaceFolder ;
  skos:inScheme ex:Workspace_RailwayOps ;
  rdfs:label "safety" ;
  skos:broader ex:railway .

ex:infrastructure
  a yasgui:WorkspaceFolder ;
  skos:inScheme ex:Workspace_RailwayOps ;
  rdfs:label "infrastructure" ;
  skos:broader ex:railway .

#############################
# Agent (author)
#############################

ex:mathias
  a prov:Person ;
  rdfs:label "Mathias Vanden Auweele" .

#############################
# Managed Queries in Railway Ops
#############################

# Query A: placed inside 'railway' folder; latest version uses ERA
ex:RailwayAssetsQuery
  a yasgui:ManagedQuery ;
  rdfs:label "Railway assets listing" ;
  dcterms:description "Lists railway asset identifiers via ERA data." ;
  dcterms:isPartOf ex:railway .

# Query B: placed at the workspace root; latest version uses Wikidata
ex:OperatorLookupQuery
  a yasgui:ManagedQuery ;
  rdfs:label "Operator lookup" ;
  dcterms:description "Look up railway operators; uses an external reference source." ;
  dcterms:isPartOf ex:Workspace_RailwayOps .

#############################
# Versions for Railway Ops
#############################

# --- RailwayAssetsQuery versions ---
ex:RailwayAssets_v1
  a yasgui:ManagedQueryVersion ;
  dcterms:isVersionOf ex:RailwayAssetsQuery ;
  dcterms:creator ex:mathias ;
  dcterms:created "2025-10-20T09:30:00Z"^^xsd:dateTime ;
  prov:used ex:eraEndpoint ;
  spin:text """
# ERA example: list some railway-related resources
PREFIX era: <https://data-interop.era.europa.eu/ontology/>
SELECT ?asset
WHERE {
  ?asset a era:RailwayAsset .
}
LIMIT 50
""" .

ex:RailwayAssets_v2
  a yasgui:ManagedQueryVersion ;
  dcterms:isVersionOf ex:RailwayAssetsQuery ;
  dcterms:creator ex:mathias ;
  dcterms:created "2025-12-21T09:45:00Z"^^xsd:dateTime ;
  prov:used ex:eraEndpoint ;
  spin:text """
# ERA example: list railway assets with optional label
PREFIX era:  <https://data-interop.era.europa.eu/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?asset ?label
WHERE {
  ?asset a era:RailwayAsset .
  OPTIONAL { ?asset rdfs:label ?label }
}
LIMIT 100
""" .

# --- OperatorLookupQuery versions ---
ex:OperatorLookup_v1
  a yasgui:ManagedQueryVersion ;
  dcterms:isVersionOf ex:OperatorLookupQuery ;
  dcterms:creator ex:mathias ;
  dcterms:created "2025-11-05T14:00:00Z"^^xsd:dateTime ;
  prov:used ex:wikidataEndpoint ;
  spin:text """
# Wikidata example: railway operators (illustrative)
PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?operator ?label
WHERE {
  ?operator wdt:P31 wd:Q494423 .     # instance of railway company
  ?operator rdfs:label ?label .
  FILTER(LANG(?label) = "en")
}
LIMIT 50
""" .

#############################
# ERA-only Workspace (ConceptScheme)
#############################

# Queries under ERA-only workspace (all versions use ERA)

# Query C: placed in 'ERA Examples Workspace' root
ex:EraRollingStockQuery
  a yasgui:ManagedQuery ;
  rdfs:label "ERA rolling stock listing" ;
  dcterms:description "List rolling stock items from ERA data." ;
  dcterms:isPartOf ex:Workspace_ERA_Examples .

ex:EraRollingStock_v1
  a yasgui:ManagedQueryVersion ;
  dcterms:isVersionOf ex:EraRollingStockQuery ;
  dcterms:creator ex:mathias ;
  dcterms:created "2025-09-15T10:00:00Z"^^xsd:dateTime ;
  prov:used ex:eraEndpoint ;
  spin:text """
# ERA example: list rolling stock
PREFIX era:  <https://data-interop.era.europa.eu/ontology/>
SELECT ?rs
WHERE {
  ?rs a era:RollingStock .
}
LIMIT 100
""" .

# Query D: placed inside an ERA-only folder
ex:era_examples
  a yasgui:WorkspaceFolder ;
  skos:inScheme ex:Workspace_ERA_Examples ;
  rdfs:label "examples" .

ex:EraInfrastructureQuery
  a yasgui:ManagedQuery ;
  rdfs:label "ERA infrastructure overview" ;
  dcterms:description "List infrastructure elements from ERA." ;
  dcterms:isPartOf ex:era_examples .

ex:EraInfrastructure_v1
  a yasgui:ManagedQueryVersion ;
  dcterms:isVersionOf ex:EraInfrastructureQuery ;
  dcterms:creator ex:mathias ;
  dcterms:created "2025-10-01T12:00:00Z"^^xsd:dateTime ;
  prov:used ex:eraEndpoint ;
  spin:text """
# ERA example: infrastructure elements
PREFIX era:  <https://data-interop.era.europa.eu/ontology/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?infra ?label
WHERE {
  ?infra a era:InfrastructureElement .
  OPTIONAL { ?infra rdfs:label ?label }
}
LIMIT 100
""" .

```

## User stories

### Navigating managed queries

A hamburger icon on the left side of the tabs opens a resizable and collapsible file browser sidebar.

**Structure:**

- **First level**: Workspace selector (users can have multiple workspaces)
- **Git-based workspace**: Shows folder structure and `.rq` (or `.sparql`) files from the repository
- **SPARQL endpoint workspace**: Uses SKOS hierarchy with `skos:ConceptScheme` (`yasgui:ManagedQueryFileSystem`) as root, `skos:narrower` concepts representing folders, and managed queries linked to folder concepts

**Features:**

- Filename filtering with regex support
- Search by query name
- Visual hierarchy with expand/collapse

### Activating a managed query

User selects a query from the file browser, and a new tab opens with the query loaded. The tab is visually distinct to indicate it is linked to a managed query.

### Updating a managed query

A user can change a managed query in a tab like a regular tab. Once a change in the query has been made, this should be visible with a small dot in the tab name (like unsaved changes in editors).

**Visual Distinction:**
**Saving:**

- Save button located next to the query execution button in yasqe
- Keyboard shortcut: `Ctrl+S` (Windows/Linux) or `Cmd+S` (Mac)
- **No auto-save** - user must explicitly save changes
- Visual indicator: Small dot in tab name when unsaved changes exist

**Commit Messages:**

- User can customize commit message template in settings
- Default template: `"feat: updated query [query name]"`
- Eachny tab (including regular unmanaged tabs), when the user clicks the save button:

**Workflow:**

1. User clicks save button
2. If not linked to managed query, dialog prompts:
   - Select workspace (from configured workspaces)
   - Select or create folder path
   - Enter filename (with `.rq` extension auto-added if omitted; `.sparql` also accepted)
3. User can interactively create new folders in the dialog
4. Query is saved and tab becomes linked to managed query
5. Tab appearance updates to show managed query visual styling

### Creating new managed queries

User can save legacy tabs as managed queries or create a new managed query from the file browser.

- Existing tabs continue to work as before (unmanaged)
- Any tab can be saved as a managed query at any time
- Managed and unmanaged tabs coexist

Two entry points:

- create a new empty tab and save it as managed query
- create a new managed query from the file browser

### Managing workspaces

The settings modal window should contain a new section to configure the query management options.

Two entry points:

1. **From file browser**: Click "Add Workspace" button/icon → redirects to settings modal, Query Management section
2. **From settings**: Open settings modal → navigate to Query Management section → click "Add Workspace"

**General properties for all workspaces:**

- **Label**: User-friendly name for the workspace
- **Type selection**: Git-based or SPARQL endpoint-based

**Git workspace configuration:**

- HTTPS only, e.g., `https://github.com/user/repo.git`
- Personal Access Token for authentication
  - Token must have repository read/write permissions
  - GitHub: Settings → Developer settings → Personal access tokens → Generate new token (select `repo` scope)
  - GitLab: Preferences → Access Tokens → Add new token (select `write_repository` scope)
- User selects repo branch (e.g., `main`, `master` or any other available branch), no further branch management in Yasgui
- Optional: Author name and email for commits (defaults to token owner)
- Works with any HTTPS-accessible git repository (GitHub, GitLab, Gitea, self-hosted, etc.
- Supported providers: GitHub, GitLab (extensible for other git hosts)
- User can specify commit message template
- Template supports placeholders:
  - `[query name]` - replaced with filename without extension
  - `[timestamp]` - replaced with ISO timestamp
  - `[workspace]` - replaced with workspace label
- Default template: `"feat: updated query [query name]"`

**SPARQL endpoint workspace configuration:**

- Select from existing configured SPARQL endpoints (dropdown)
- Endpoint URL and credentials inherited from endpoint configuration
- No additional authentication needed (reuses endpoint credentials)

**Credential storage:**

- Stored in persistent storage (same mechanism as current endpoint credentials)
- Encrypted/secured similar to existing credential handling

**Workspace management:**

- List all configured workspaces
- Edit workspace settings
- Delete workspace (does not delete remote data)
- Set active/default workspace
