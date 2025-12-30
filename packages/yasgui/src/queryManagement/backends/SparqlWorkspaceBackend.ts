import type { SparqlWorkspaceConfig, FolderEntry, ReadResult, VersionInfo, WriteQueryOptions } from "../types";
import { normalizeQueryText } from "../textHash";
import type { WorkspaceBackend } from "./WorkspaceBackend";
import { WorkspaceBackendError } from "./errors";

type SparqlBindingValue = { type: string; value: string };
type SparqlBindingsRow = Record<string, SparqlBindingValue | undefined>;

type SparqlJsonResults = {
  head?: { vars?: string[] };
  results?: { bindings?: SparqlBindingsRow[] };
};

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function nowIso(): string {
  return new Date().toISOString();
}

function sparqlStringLiteral(value: string): string {
  // Keep this conservative; SPARQL supports the same escape sequences as Turtle string literals.
  // Use a normal quoted literal so we don't have to worry about triple-quote edge cases.
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t")
    .replace(/\"/g, '\\"');
  return `"${escaped}"`;
}

function iri(iriValue: string): string {
  const trimmed = iriValue.trim();
  if (!trimmed) throw new Error("IRI is required");
  return `<${trimmed.replace(/>/g, "%3E")}>`;
}

function uuidV4(): string {
  const cryptoObj = (globalThis as any).crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  // RFC4122 v4 fallback (best-effort)
  const rnds = new Uint8Array(16);
  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(rnds);
  } else {
    for (let i = 0; i < rnds.length; i++) rnds[i] = Math.floor(Math.random() * 256);
  }
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;
  const hex = Array.from(rnds, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function mintManagedQueryVersionIri(workspaceIri: string): string {
  return `${workspaceIri.trim()}_mq_v_${uuidV4()}`;
}

function isIriLike(value: string): boolean {
  // Conservative IRI check: scheme ':' ...
  return /^[a-z][a-z0-9+.-]*:/i.test(value.trim());
}

function mintFolderIri(workspaceIri: string, folderPath: string): string {
  const base = stripTrailingSlash(workspaceIri);
  return `${base}/folder/${encodeURIComponent(folderPath)}`;
}

function tryParseFolderPathFromFolderIri(workspaceIri: string, folderIri: string): string | undefined {
  const base = stripTrailingSlash(workspaceIri);
  const prefix = `${base}/folder/`;
  if (!folderIri.startsWith(prefix)) return undefined;
  const encoded = folderIri.slice(prefix.length);
  try {
    return decodeURIComponent(encoded);
  } catch {
    return undefined;
  }
}

function mapHttpError(status: number, message?: string): WorkspaceBackendError {
  if (status === 401) return new WorkspaceBackendError("AUTH_FAILED", message || "Authentication failed");
  if (status === 403) return new WorkspaceBackendError("FORBIDDEN", message || "Forbidden");
  if (status === 404) return new WorkspaceBackendError("NOT_FOUND", message || "Not found");
  if (status === 409) return new WorkspaceBackendError("CONFLICT", message || "Conflict");
  if (status === 429) return new WorkspaceBackendError("RATE_LIMITED", message || "Rate limited");
  if (status >= 500) return new WorkspaceBackendError("NETWORK_ERROR", message || "Server error");
  return new WorkspaceBackendError("UNKNOWN", message || `HTTP ${status}`);
}

export default class SparqlWorkspaceBackend implements WorkspaceBackend {
  public readonly type = "sparql" as const;

  constructor(
    private config: SparqlWorkspaceConfig,
    private options?: {
      authHeaders?: Record<string, string>;
      getAuthHeaders?: () => Promise<Record<string, string> | undefined>;
    },
  ) {}

  private async resolveAuthHeaders(): Promise<Record<string, string>> {
    try {
      const dynamic = await this.options?.getAuthHeaders?.();
      if (dynamic) return dynamic;
    } catch (e) {
      // Best-effort: if auth refresh fails, continue without auth so the endpoint can return a clear 401/403.
      console.error("Failed to resolve SPARQL auth headers", e);
    }
    return this.options?.authHeaders || {};
  }

  private async sparqlQuery<T = SparqlJsonResults>(query: string): Promise<T> {
    const body = new URLSearchParams();
    body.set("query", query);
    if (this.config.defaultGraph) body.set("default-graph-uri", this.config.defaultGraph);

    const authHeaders = await this.resolveAuthHeaders();

    let res: Response;
    try {
      res = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/sparql-results+json",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          ...authHeaders,
        },
        body: body.toString(),
      });
    } catch (e) {
      throw new WorkspaceBackendError("NETWORK_ERROR", e instanceof Error ? e.message : String(e));
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw mapHttpError(res.status, text || `SPARQL endpoint responded with ${res.status}`);
    }

    try {
      return (await res.json()) as T;
    } catch (e) {
      throw new WorkspaceBackendError("UNKNOWN", e instanceof Error ? e.message : "Invalid SPARQL JSON response");
    }
  }

  private async sparqlUpdate(update: string): Promise<void> {
    const body = new URLSearchParams();
    body.set("update", update);
    if (this.config.defaultGraph) body.set("default-graph-uri", this.config.defaultGraph);

    const authHeaders = await this.resolveAuthHeaders();

    let res: Response;
    try {
      res = await fetch(this.config.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/sparql-results+json, */*",
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          ...authHeaders,
        },
        body: body.toString(),
      });
    } catch (e) {
      throw new WorkspaceBackendError("NETWORK_ERROR", e instanceof Error ? e.message : String(e));
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw mapHttpError(res.status, text || `SPARQL endpoint responded with ${res.status}`);
    }
  }

  private getBindings(results: SparqlJsonResults): SparqlBindingsRow[] {
    return results?.results?.bindings || [];
  }

  private folderIriFromId(folderId?: string): string {
    if (!folderId) return this.config.workspaceIri;
    return mintFolderIri(this.config.workspaceIri, folderId);
  }

  private resolveManagedQueryIri(queryIdOrIri: string): string {
    const trimmed = queryIdOrIri.trim();
    if (!trimmed) throw new WorkspaceBackendError("UNKNOWN", "Query ID is required");

    // SPARQL workspace query IDs are immutable IRIs.
    if (isIriLike(trimmed)) return trimmed;
    throw new WorkspaceBackendError("UNKNOWN", "SPARQL managed query IDs must be IRIs");
  }

  async validateAccess(): Promise<void> {
    // Minimal check: endpoint is reachable and accepts SELECT.
    await this.sparqlQuery(`SELECT (1 AS ?ok) WHERE {} LIMIT 1`);
  }

  async listFolder(folderId?: string): Promise<FolderEntry[]> {
    const workspaceIri = this.config.workspaceIri;
    const containerIri = this.folderIriFromId(folderId);

    const folderFilter = folderId ? `?folder skos:broader ${iri(containerIri)} .` : `FILTER(!BOUND(?parent))`;

    const foldersQuery = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?folder ?label ?parent WHERE {
  ?folder a yasgui:WorkspaceFolder ;
          skos:inScheme ${iri(workspaceIri)} ;
          rdfs:label ?label .
  OPTIONAL { ?folder skos:broader ?parent }
  ${folderFilter}
}
ORDER BY LCASE(STR(?label))`;

    const queriesQuery = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?mq ?label WHERE {
  ?mq a yasgui:ManagedQuery ;
      rdfs:label ?label ;
      dcterms:isPartOf ${iri(containerIri)} .
}
ORDER BY LCASE(STR(?label))`;

    const [foldersRes, queriesRes] = await Promise.all([
      this.sparqlQuery<SparqlJsonResults>(foldersQuery),
      this.sparqlQuery<SparqlJsonResults>(queriesQuery),
    ]);

    const folders: FolderEntry[] = [];
    for (const row of this.getBindings(foldersRes)) {
      const folder = row.folder?.value;
      const label = row.label?.value;
      if (!folder || !label) continue;

      const folderPath = tryParseFolderPathFromFolderIri(workspaceIri, folder) || label;
      const parentIri = row.parent?.value;
      const parentPath = parentIri ? tryParseFolderPathFromFolderIri(workspaceIri, parentIri) : undefined;

      folders.push({
        kind: "folder",
        id: folderPath,
        label,
        parentId: parentPath,
      });
    }

    const queries: FolderEntry[] = [];
    for (const row of this.getBindings(queriesRes)) {
      const mqIri = row.mq?.value;
      const label = row.label?.value;
      if (!mqIri || !label) continue;
      queries.push({
        kind: "query",
        id: mqIri,
        label,
        parentId: folderId || undefined,
      });
    }

    const out = [...folders, ...queries];
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }

  async searchByName(query: string): Promise<FolderEntry[]> {
    const q = query.trim();
    if (!q) return [];

    const workspaceIri = this.config.workspaceIri;
    const queryText = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?mq ?label ?container WHERE {
  ?mq a yasgui:ManagedQuery ;
      rdfs:label ?label ;
      dcterms:isPartOf ?container .

  {
    FILTER(?container = ${iri(workspaceIri)})
  } UNION {
    ?container a yasgui:WorkspaceFolder ; skos:inScheme ${iri(workspaceIri)} .
  }

  FILTER(CONTAINS(LCASE(STR(?label)), LCASE(${sparqlStringLiteral(q)})))
}
ORDER BY LCASE(STR(?label))`;

    const res = await this.sparqlQuery<SparqlJsonResults>(queryText);
    const hits: FolderEntry[] = [];

    for (const row of this.getBindings(res)) {
      const mqIri = row.mq?.value;
      const label = row.label?.value;
      const container = row.container?.value;
      if (!mqIri || !label || !container) continue;
      const parentId =
        container === workspaceIri ? undefined : tryParseFolderPathFromFolderIri(workspaceIri, container) || undefined;
      hits.push({ kind: "query", id: mqIri, label, parentId });
    }

    hits.sort((a, b) => a.label.localeCompare(b.label));
    return hits;
  }

  async readQuery(queryId: string): Promise<ReadResult> {
    const mqIri = this.resolveManagedQueryIri(queryId);

    const query = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX prov:    <http://www.w3.org/ns/prov#>
PREFIX spin:    <http://spinrdf.org/spin#>
PREFIX sd:      <http://www.w3.org/ns/sparql-service-description#>

SELECT ?version ?created ?text ?endpoint ?description WHERE {
  ?version a yasgui:ManagedQueryVersion ;
           dcterms:isVersionOf ${iri(mqIri)} ;
           dcterms:created ?created ;
           spin:text ?text .

  OPTIONAL { ?version dcterms:description ?description }

  OPTIONAL {
    ?version prov:used ?svc .
    ?svc a sd:Service ;
         sd:endpoint ?endpoint .
  }

}
ORDER BY DESC(?created)
LIMIT 1`;

    const res = await this.sparqlQuery<SparqlJsonResults>(query);
    const row = this.getBindings(res)[0];
    if (!row) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");
    const text = row.text?.value;
    const version = row.version?.value;
    const endpoint = row.endpoint?.value;
    const description = row.description?.value;
    if (!text || !version) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");

    return {
      queryText: text,
      versionTag: version,
      associatedEndpoint: endpoint,
      description,
    };
  }

  async renameQuery(queryId: string, newLabel: string): Promise<void> {
    const label = newLabel.trim();
    if (!label) throw new WorkspaceBackendError("UNKNOWN", "New name is required");
    const mqIriValue = this.resolveManagedQueryIri(queryId);

    // Determine the container to enforce uniqueness within the same folder/workspace.
    const containerIriValue = await (async () => {
      const q = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?container WHERE {
  ${iri(mqIriValue)} a yasgui:ManagedQuery ;
    dcterms:isPartOf ?container .
}
LIMIT 1`;
      const res = await this.sparqlQuery<SparqlJsonResults>(q);
      const row = this.getBindings(res)[0];
      const container = row?.container?.value;
      if (!container) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");
      return container;
    })();

    // Prevent duplicate query names in the same folder (case-insensitive).
    {
      const dupCheck = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?mq WHERE {
  ?mq a yasgui:ManagedQuery ;
      dcterms:isPartOf ${iri(containerIriValue)} ;
      rdfs:label ?lbl .
  FILTER(LCASE(STR(?lbl)) = LCASE(${sparqlStringLiteral(label)}))
  FILTER(?mq != ${iri(mqIriValue)})
}
LIMIT 1`;

      const res = await this.sparqlQuery<SparqlJsonResults>(dupCheck);
      const row = this.getBindings(res)[0];
      if (row?.mq?.value) {
        throw new WorkspaceBackendError(
          "CONFLICT",
          `A query named '${label}' already exists in this folder. Please choose a different name.`,
        );
      }
    }

    const mqIri = mqIriValue;
    const update = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

DELETE { ${iri(mqIri)} rdfs:label ?oldLabel . }
INSERT { ${iri(mqIri)} rdfs:label ${sparqlStringLiteral(label)} . }
WHERE  { OPTIONAL { ${iri(mqIri)} rdfs:label ?oldLabel . } }
`;

    await this.sparqlUpdate(update);
  }

  async deleteQuery(queryId: string): Promise<void> {
    const mqIri = this.resolveManagedQueryIri(queryId);
    const update = `
PREFIX dcterms: <http://purl.org/dc/terms/>

DELETE {
  ${iri(mqIri)} ?p ?o .
  ?s ?pp ${iri(mqIri)} .
  ?v ?vp ?vo .
  ?sv ?svP ?v .
}
WHERE {
  OPTIONAL { ${iri(mqIri)} ?p ?o . }
  OPTIONAL { ?s ?pp ${iri(mqIri)} . }
  OPTIONAL {
    ?v dcterms:isVersionOf ${iri(mqIri)} .
    OPTIONAL { ?v ?vp ?vo . }
    OPTIONAL { ?sv ?svP ?v . }
  }
}
`;

    await this.sparqlUpdate(update);
  }

  async renameFolder(folderId: string, newLabel: string): Promise<void> {
    const label = newLabel.trim();
    if (!label) throw new WorkspaceBackendError("UNKNOWN", "New name is required");

    const folderIriValue = mintFolderIri(this.config.workspaceIri, folderId);
    const update = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

DELETE { ${iri(folderIriValue)} rdfs:label ?oldLabel . }
INSERT { ${iri(folderIriValue)} rdfs:label ${sparqlStringLiteral(label)} . }
WHERE  { OPTIONAL { ${iri(folderIriValue)} rdfs:label ?oldLabel . } }
`;

    await this.sparqlUpdate(update);
  }

  async deleteFolder(folderId: string): Promise<void> {
    const workspaceIri = this.config.workspaceIri;
    const rootFolderIri = mintFolderIri(workspaceIri, folderId);
    const update = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>

DELETE {
  ?folder ?fp ?fo .
  ?sf ?sfp ?folder .

  ?mq ?mp ?mo .
  ?sm ?smp ?mq .

  ?v ?vp ?vo .
  ?sv ?svP ?v .
}
WHERE {
  {
    SELECT DISTINCT ?folder WHERE {
      ?folder a yasgui:WorkspaceFolder ;
              skos:inScheme ${iri(workspaceIri)} .
      ?folder (skos:broader)* ${iri(rootFolderIri)} .
    }
  }

  OPTIONAL { ?folder ?fp ?fo . }
  OPTIONAL { ?sf ?sfp ?folder . }

  OPTIONAL {
    ?mq a yasgui:ManagedQuery ;
        dcterms:isPartOf ?folder .
    OPTIONAL { ?mq ?mp ?mo . }
    OPTIONAL { ?sm ?smp ?mq . }

    OPTIONAL {
      ?v dcterms:isVersionOf ?mq .
      OPTIONAL { ?v ?vp ?vo . }
      OPTIONAL { ?sv ?svP ?v . }
    }
  }
}
`;

    await this.sparqlUpdate(update);
  }

  async writeQuery(queryId: string, queryText: string, options?: WriteQueryOptions): Promise<void> {
    const workspaceIri = this.config.workspaceIri;
    const mqIriValue = this.resolveManagedQueryIri(queryId);

    // For new queries (Save-as-managed), UI provides label/folder.
    // For saving existing managed queries, label/folder might be omitted; derive/fetch them.
    let folderPath = (options?.folderId || "").trim();
    let label = (options?.label || "").trim();

    if (!label) {
      // QueryId is an IRI; fetch current label + container from the store.
      const q = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?label ?container WHERE {
  ${iri(mqIriValue)} a yasgui:ManagedQuery ;
    rdfs:label ?label ;
    dcterms:isPartOf ?container .
}
LIMIT 1`;
      const res = await this.sparqlQuery<SparqlJsonResults>(q);
      const row = this.getBindings(res)[0];
      const fetchedLabel = row?.label?.value;
      const container = row?.container?.value;
      if (!fetchedLabel || !container) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");
      label = fetchedLabel;
      if (!folderPath && container !== workspaceIri) {
        folderPath = tryParseFolderPathFromFolderIri(workspaceIri, container) || "";
      }
    }

    if (!label.trim()) throw new WorkspaceBackendError("UNKNOWN", "Query name is required");

    const containerIriValue = folderPath ? mintFolderIri(workspaceIri, folderPath) : workspaceIri;

    // Prevent duplicate query names in the same folder. This can happen if an existing query
    // was renamed to this label (so queryId differs), and a new query is then created.
    // Compare case-insensitively to avoid near-identical duplicates.
    {
      const dupCheck = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?mq WHERE {
  ?mq a yasgui:ManagedQuery ;
      dcterms:isPartOf ${iri(containerIriValue)} ;
      rdfs:label ?lbl .
  FILTER(LCASE(STR(?lbl)) = LCASE(${sparqlStringLiteral(label)}))
  FILTER(?mq != ${iri(mqIriValue)})
}
LIMIT 1`;

      const res = await this.sparqlQuery<SparqlJsonResults>(dupCheck);
      const row = this.getBindings(res)[0];
      if (row?.mq?.value) {
        throw new WorkspaceBackendError(
          "CONFLICT",
          `A query named '${label}' already exists in this folder. Please choose a different name.`,
        );
      }
    }

    // Conflict check (best-effort; not atomic across concurrent writers).
    if (options?.expectedVersionTag) {
      try {
        const current = await this.readQuery(queryId);
        if (current.versionTag && current.versionTag !== options.expectedVersionTag) {
          throw new WorkspaceBackendError("CONFLICT", "Version tag mismatch");
        }
      } catch (e) {
        const err = e as any;
        if (err?.code && err.code !== "NOT_FOUND") throw e;
      }
    }

    // Versioning rule: don't create a new version if normalized text is unchanged.
    try {
      const current = await this.readQuery(queryId);
      if (normalizeQueryText(current.queryText) === normalizeQueryText(queryText)) {
        return;
      }
    } catch (e) {
      const err = e as any;
      if (err?.code && err.code !== "NOT_FOUND") throw e;
    }

    const versionIriValue = mintManagedQueryVersionIri(workspaceIri);
    const createdAt = nowIso();
    const description = options?.message?.trim();
    const associatedEndpoint = options?.associatedEndpoint?.trim();

    const folderTriples: string[] = [];
    if (folderPath) {
      // Ensure each folder in the path exists and is linked to the workspace scheme.
      const parts = splitPath(folderPath);
      for (let i = 0; i < parts.length; i++) {
        const subPath = parts.slice(0, i + 1).join("/");
        const folderIriValue = mintFolderIri(workspaceIri, subPath);
        const folderLabel = parts[i];
        folderTriples.push(`${iri(folderIriValue)} a <https://matdata.eu/ns/yasgui#WorkspaceFolder> ;`);
        folderTriples.push(`  <http://www.w3.org/2004/02/skos/core#inScheme> ${iri(workspaceIri)} ;`);
        folderTriples.push(`  <http://www.w3.org/2000/01/rdf-schema#label> ${sparqlStringLiteral(folderLabel)} .`);

        if (i > 0) {
          const parentPath = parts.slice(0, i).join("/");
          const parentIri = mintFolderIri(workspaceIri, parentPath);
          folderTriples.push(
            `${iri(folderIriValue)} <http://www.w3.org/2004/02/skos/core#broader> ${iri(parentIri)} .`,
          );
        }
      }
    }

    const update = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX prov:    <http://www.w3.org/ns/prov#>
  PREFIX sd:      <http://www.w3.org/ns/sparql-service-description#>
PREFIX skos:    <http://www.w3.org/2004/02/skos/core#>
PREFIX spin:    <http://spinrdf.org/spin#>
PREFIX rdfs:    <http://www.w3.org/2000/01/rdf-schema#>

INSERT DATA {
  ${iri(workspaceIri)} a yasgui:Workspace .

  ${folderTriples.join("\n  ")}

  ${iri(mqIriValue)} a yasgui:ManagedQuery ;
    rdfs:label ${sparqlStringLiteral(label)} ;
    dcterms:isPartOf ${iri(containerIriValue)} .

  ${iri(versionIriValue)} a yasgui:ManagedQueryVersion ;
    dcterms:isVersionOf ${iri(mqIriValue)} ;
    dcterms:created ${sparqlStringLiteral(createdAt)}^^<http://www.w3.org/2001/XMLSchema#dateTime> ;
    spin:text ${sparqlStringLiteral(queryText)}${description ? `;\n    dcterms:description ${sparqlStringLiteral(description)}` : ""}${associatedEndpoint ? `;\n    prov:used _:svc` : ""} .

  ${associatedEndpoint ? `_:svc a sd:Service ;\n    sd:endpoint ${iri(associatedEndpoint)} .` : ""}
}`;

    await this.sparqlUpdate(update);
  }

  async listVersions(queryId: string): Promise<VersionInfo[]> {
    const mqIri = this.resolveManagedQueryIri(queryId);

    const query = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>

SELECT ?version ?created ?creator ?message WHERE {
  ?version a yasgui:ManagedQueryVersion ;
           dcterms:isVersionOf ${iri(mqIri)} ;
           dcterms:created ?created .
  OPTIONAL { ?version dcterms:creator ?creator }
  OPTIONAL { ?version dcterms:description ?message }
}
ORDER BY DESC(?created)`;

    const res = await this.sparqlQuery<SparqlJsonResults>(query);
    const versions: VersionInfo[] = [];

    for (const row of this.getBindings(res)) {
      const version = row.version?.value;
      const createdAt = row.created?.value;
      if (!version || !createdAt) continue;
      versions.push({
        id: version,
        createdAt,
        author: row.creator?.value,
        message: row.message?.value,
      });
    }

    return versions;
  }

  async readVersion(queryId: string, versionId: string): Promise<ReadResult> {
    const mqIri = this.resolveManagedQueryIri(queryId);

    const query = `
PREFIX yasgui:  <https://matdata.eu/ns/yasgui#>
PREFIX dcterms: <http://purl.org/dc/terms/>
PREFIX prov:    <http://www.w3.org/ns/prov#>
PREFIX spin:    <http://spinrdf.org/spin#>
PREFIX sd:      <http://www.w3.org/ns/sparql-service-description#>

SELECT ?text ?endpoint ?description WHERE {
  ${iri(versionId)} a yasgui:ManagedQueryVersion ;
    dcterms:isVersionOf ${iri(mqIri)} ;
    spin:text ?text .

  OPTIONAL { ${iri(versionId)} dcterms:description ?description }
  OPTIONAL {
    ${iri(versionId)} prov:used ?svc .
    ?svc a sd:Service ;
         sd:endpoint ?endpoint .
  }
}
LIMIT 1`;

    const res = await this.sparqlQuery<SparqlJsonResults>(query);
    const row = this.getBindings(res)[0];
    if (!row) throw new WorkspaceBackendError("NOT_FOUND", "Version not found");
    const text = row.text?.value;
    if (!text) throw new WorkspaceBackendError("NOT_FOUND", "Version not found");
    return {
      queryText: text,
      versionTag: versionId,
      associatedEndpoint: row.endpoint?.value,
      description: row.description?.value,
    };
  }
}
