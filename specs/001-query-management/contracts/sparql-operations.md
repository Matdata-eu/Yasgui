# Contract: SPARQL Workspace Operations

This document sketches the canonical SPARQL operations needed for endpoint-based workspaces.

## Prefixes

```sparql
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX prov:    <http://www.w3.org/ns/prov#>
PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
PREFIX spin:    <http://spinrdf.org/spin#>
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>
PREFIX sd:      <http://www.w3.org/ns/sparql-service-description#>
```

## List folders in a workspace

```sparql
SELECT ?folder ?label ?parent WHERE {
  ?folder a yasgui:WorkspaceFolder ;
          skos:inScheme <WORKSPACE_IRI> ;
          rdfs:label ?label .
  OPTIONAL { ?folder skos:broader ?parent }
}
ORDER BY LCASE(STR(?label))
```

## List managed queries in a folder or workspace root

```sparql
SELECT ?mq ?label WHERE {
  ?mq a yasgui:ManagedQuery ;
      rdfs:label ?label ;
      dcterms:isPartOf <CONTAINER_IRI> .
}
ORDER BY LCASE(STR(?label))
```

Where `CONTAINER_IRI` is either a `yasgui:Workspace` (root) or a `yasgui:WorkspaceFolder`.

## Get latest version for a managed query

```sparql
SELECT ?version ?created ?text ?endpoint WHERE {
  ?version a yasgui:ManagedQueryVersion ;
           dcterms:isVersionOf <MANAGED_QUERY_IRI> ;
           dcterms:created ?created ;
           spin:text ?text .

  OPTIONAL {
    ?version prov:used ?svc .
    ?svc a sd:Service ;
         sd:endpoint ?endpoint .
  }
}
ORDER BY DESC(?created)
LIMIT 1
```

## Create a new version (SPARQL UPDATE)

```sparql
INSERT DATA {
  <NEW_VERSION_IRI> a yasgui:ManagedQueryVersion ;
    dcterms:isVersionOf <MANAGED_QUERY_IRI> ;
    dcterms:created "2025-01-01T00:00:00Z"^^<http://www.w3.org/2001/XMLSchema#dateTime> ;
    dcterms:creator <AGENT_IRI> ;
    spin:text """<SPARQL_TEXT>""" .

  # Optional endpoint association
  <NEW_VERSION_IRI> prov:used <SERVICE_IRI> .
  <SERVICE_IRI> a sd:Service ; sd:endpoint <ENDPOINT_IRI> .
}
```

## Notes
- The exact minting strategy for IRIs must be deterministic and safe (e.g., workspace base IRI + UUID).
- For large workspaces, prefer paging (LIMIT/OFFSET) and/or server-side full-text if available.
