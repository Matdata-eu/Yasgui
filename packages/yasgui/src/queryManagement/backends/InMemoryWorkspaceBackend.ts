import type { FolderEntry, ReadResult, VersionInfo, WriteQueryOptions, WorkspaceConfigBase } from "../types";
import { normalizeQueryText } from "../textHash";
import type { WorkspaceBackend } from "./WorkspaceBackend";
import { WorkspaceBackendError } from "./errors";

type InMemoryWorkspaceConfig = Pick<WorkspaceConfigBase, "id" | "label"> & {
  type: "memory";
};

type StoredVersion = {
  id: string;
  createdAt: string;
  queryText: string;
};

function normalizeFolderId(folderId?: string): string {
  if (!folderId) return "";
  return folderId.replace(/^\/+|\/+$/g, "");
}

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean);
}

function basename(path: string): string {
  const parts = splitPath(path);
  return parts[parts.length - 1] || "";
}

function dirname(path: string): string {
  const parts = splitPath(path);
  parts.pop();
  return parts.join("/");
}

function nowIso(): string {
  return new Date().toISOString();
}

export default class InMemoryWorkspaceBackend implements WorkspaceBackend {
  public readonly type = "git" as const;

  private versionsByQueryId = new Map<string, StoredVersion[]>();

  constructor(private _config?: InMemoryWorkspaceConfig) {}

  async validateAccess(): Promise<void> {
    return;
  }

  async listFolder(folderId?: string): Promise<FolderEntry[]> {
    const folder = normalizeFolderId(folderId);

    const folders = new Map<string, FolderEntry>();
    const queries: FolderEntry[] = [];

    for (const queryId of this.versionsByQueryId.keys()) {
      const queryDir = dirname(queryId);
      if (folder === "") {
        const top = splitPath(queryDir)[0];
        if (top) {
          folders.set(top, { kind: "folder", id: top, label: top, parentId: undefined });
          continue;
        }
        queries.push({
          kind: "query",
          id: queryId,
          label: basename(queryId).replace(/\.(rq|sparql)$/i, ""),
          parentId: undefined,
        });
        continue;
      }

      if (queryDir === folder) {
        queries.push({
          kind: "query",
          id: queryId,
          label: basename(queryId).replace(/\.(rq|sparql)$/i, ""),
          parentId: folder,
        });
        continue;
      }

      if (queryDir.startsWith(folder + "/")) {
        const rest = queryDir.slice(folder.length + 1);
        const child = splitPath(rest)[0];
        if (child) {
          const childId = folder + "/" + child;
          folders.set(childId, { kind: "folder", id: childId, label: child, parentId: folder });
        }
      }
    }

    const out = [...folders.values(), ...queries];
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out;
  }

  async searchByName(query: string): Promise<FolderEntry[]> {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hits: FolderEntry[] = [];
    for (const queryId of this.versionsByQueryId.keys()) {
      const label = basename(queryId).replace(/\.(rq|sparql)$/i, "");
      if (label.toLowerCase().includes(q)) {
        hits.push({ kind: "query", id: queryId, label, parentId: dirname(queryId) || undefined });
      }
    }
    hits.sort((a, b) => a.label.localeCompare(b.label));
    return hits;
  }

  async readQuery(queryId: string): Promise<ReadResult> {
    const versions = this.versionsByQueryId.get(queryId);
    if (!versions || versions.length === 0) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");
    const latest = versions[versions.length - 1];
    return { queryText: latest.queryText, versionTag: latest.id };
  }

  async writeQuery(queryId: string, queryText: string, options?: WriteQueryOptions): Promise<void> {
    const versions = this.versionsByQueryId.get(queryId) || [];

    const latest = versions[versions.length - 1];
    if (options?.expectedVersionTag && latest && options.expectedVersionTag !== latest.id) {
      throw new WorkspaceBackendError("CONFLICT", "Version tag mismatch");
    }

    if (latest && normalizeQueryText(latest.queryText) === normalizeQueryText(queryText)) {
      this.versionsByQueryId.set(queryId, versions);
      return;
    }

    const nextId = `v${versions.length + 1}`;
    versions.push({ id: nextId, createdAt: nowIso(), queryText });
    this.versionsByQueryId.set(queryId, versions);
  }

  async listVersions(queryId: string): Promise<VersionInfo[]> {
    const versions = this.versionsByQueryId.get(queryId);
    if (!versions || versions.length === 0) return [];
    return [...versions]
      .slice()
      .reverse()
      .map((v) => ({ id: v.id, createdAt: v.createdAt }));
  }

  async readVersion(queryId: string, versionId: string): Promise<ReadResult> {
    const versions = this.versionsByQueryId.get(queryId);
    if (!versions || versions.length === 0) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");
    const found = versions.find((v) => v.id === versionId);
    if (!found) throw new WorkspaceBackendError("NOT_FOUND", "Version not found");
    return { queryText: found.queryText, versionTag: found.id };
  }

  async renameQuery(queryId: string, newLabel: string): Promise<void> {
    const trimmed = newLabel.trim();
    if (!trimmed) throw new WorkspaceBackendError("UNKNOWN", "New name is required");

    const versions = this.versionsByQueryId.get(queryId);
    if (!versions || versions.length === 0) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");

    const newId = dirname(queryId) ? `${dirname(queryId)}/${trimmed}.rq` : `${trimmed}.rq`;
    if (newId === queryId) return;
    if (this.versionsByQueryId.has(newId))
      throw new WorkspaceBackendError("CONFLICT", "A query with this name already exists");

    this.versionsByQueryId.delete(queryId);
    this.versionsByQueryId.set(newId, versions);
  }

  async deleteQuery(queryId: string): Promise<void> {
    if (!this.versionsByQueryId.has(queryId)) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");
    this.versionsByQueryId.delete(queryId);
  }
}
