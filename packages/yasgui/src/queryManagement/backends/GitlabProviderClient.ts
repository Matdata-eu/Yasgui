import type { GitWorkspaceConfig, FolderEntry, ReadResult, VersionInfo, WriteQueryOptions } from "../types";
import type { GitProviderClient } from "./GitWorkspaceBackend";
import { WorkspaceBackendError } from "./errors";
import { parseGitRemote } from "./gitRemote";

function joinPath(...parts: Array<string | undefined>): string {
  const cleaned = parts
    .filter((p): p is string => !!p)
    .map((p) => p.replace(/^\/+|\/+$/g, ""))
    .filter((p) => p.length > 0);
  return cleaned.join("/");
}

function base64DecodeUtf8(value: string): string {
  const cleaned = value.replace(/\s+/g, "");

  if (typeof (globalThis as any).atob === "function") {
    const binary = (globalThis as any).atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  const buf = (globalThis as any).Buffer;
  if (buf && typeof buf.from === "function") return buf.from(cleaned, "base64").toString("utf8");
  throw new Error("Base64 decoding not available in this environment");
}

type GitlabProject = {
  default_branch?: string;
};

type GitlabTreeItem = {
  type: "tree" | "blob";
  name: string;
  path: string;
};

type GitlabFileResponse = {
  content?: string;
  encoding?: "base64";
  last_commit_id?: string;
};

type GitlabCommit = {
  id: string;
  created_at?: string;
  author_name?: string;
  message?: string;
};

function inferApiBase(config: GitWorkspaceConfig, host: string): string {
  const configured = (config as any).apiBaseUrl as string | undefined;
  if (configured?.trim()) return configured.trim().replace(/\/+$/g, "");
  if (host === "gitlab.com") return "https://gitlab.com/api/v4";
  return `https://${host}/api/v4`;
}

export class GitlabProviderClient implements GitProviderClient {
  public static canHandle(config: GitWorkspaceConfig): boolean {
    const provider = (config as any).provider as string | undefined;
    if (provider && provider !== "auto") return provider === "gitlab";

    try {
      const { host } = parseGitRemote(config.remoteUrl);
      return host === "gitlab.com" || host.includes("gitlab");
    } catch {
      return false;
    }
  }

  private async request<T>(
    apiBase: string,
    config: GitWorkspaceConfig,
    path: string,
    init?: RequestInit,
  ): Promise<{ status: number; json?: T }> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const token = config.auth.token?.trim();
    if (token) headers["PRIVATE-TOKEN"] = token;

    const res = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as any),
      },
    });

    const status = res.status;
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await res.json()) as T;
      return { status, json };
    }

    return { status };
  }

  private ensureOk(status: number, message: string): void {
    if (status >= 200 && status < 300) return;
    if (status === 401) throw new WorkspaceBackendError("AUTH_FAILED", message);
    if (status === 403) throw new WorkspaceBackendError("FORBIDDEN", message);
    if (status === 404) throw new WorkspaceBackendError("NOT_FOUND", message);
    if (status === 409) throw new WorkspaceBackendError("CONFLICT", message);
    if (status === 429) throw new WorkspaceBackendError("RATE_LIMITED", message);
    throw new WorkspaceBackendError("UNKNOWN", message);
  }

  private getProjectId(config: GitWorkspaceConfig): string {
    const { repoPath } = parseGitRemote(config.remoteUrl);
    // GitLab uses the full namespace path, URL-encoded.
    return encodeURIComponent(repoPath);
  }

  private async getBranch(config: GitWorkspaceConfig, apiBase: string): Promise<string> {
    const configured = config.branch?.trim();
    if (configured) return configured;

    const projectId = this.getProjectId(config);
    const { status, json } = await this.request<GitlabProject>(apiBase, config, `/projects/${projectId}`);
    this.ensureOk(status, "Failed to resolve repository default branch.");

    const branch = json?.default_branch?.trim();
    if (!branch) throw new WorkspaceBackendError("UNKNOWN", "Could not determine default branch.");
    return branch;
  }

  async validateAccess(config: GitWorkspaceConfig): Promise<void> {
    const { host } = parseGitRemote(config.remoteUrl);
    const apiBase = inferApiBase(config, host);
    const projectId = this.getProjectId(config);

    const { status } = await this.request(apiBase, config, `/projects/${projectId}`);
    this.ensureOk(status, "Could not access GitLab project with the provided token.");
  }

  async listFolder(config: GitWorkspaceConfig, folderId?: string): Promise<FolderEntry[]> {
    const { host } = parseGitRemote(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const relPath = folderId?.trim() || "";
    const fullPath = joinPath(config.rootPath, relPath);

    const projectId = this.getProjectId(config);
    const branch = await this.getBranch(config, apiBase);

    const qsBase = new URLSearchParams();
    qsBase.set("ref", branch);
    qsBase.set("per_page", "100");
    if (fullPath) qsBase.set("path", fullPath);

    // Paginate to avoid silently missing items.
    const items: GitlabTreeItem[] = [];
    for (let page = 1; page <= 50; page++) {
      const qs = new URLSearchParams(qsBase);
      qs.set("page", String(page));

      const { status, json } = await this.request<GitlabTreeItem[]>(
        apiBase,
        config,
        `/projects/${projectId}/repository/tree?${qs.toString()}`,
      );

      if (status === 404) return [];
      this.ensureOk(status, "Failed to list folder contents.");

      const batch = Array.isArray(json) ? json : [];
      items.push(...batch);
      if (batch.length < 100) break;
    }

    const entries: FolderEntry[] = [];
    for (const item of items) {
      if (item.type === "tree") {
        const id = relPath ? joinPath(relPath, item.name) : item.name;
        entries.push({ kind: "folder", id, label: item.name, parentId: relPath || undefined });
        continue;
      }

      if (item.type === "blob") {
        if (!/\.sparql$/i.test(item.name)) continue;
        const id = relPath ? joinPath(relPath, item.name) : item.name;
        const label = item.name.replace(/\.sparql$/i, "");
        entries.push({ kind: "query", id, label, parentId: relPath || undefined });
      }
    }

    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });

    return entries;
  }

  private async readFileAtRef(
    config: GitWorkspaceConfig,
    apiBase: string,
    queryId: string,
    ref?: string,
  ): Promise<{ text: string; lastCommitId?: string }> {
    const projectId = this.getProjectId(config);
    const filePath = joinPath(config.rootPath, queryId);

    const branch = ref || (await this.getBranch(config, apiBase));

    const { status, json } = await this.request<GitlabFileResponse>(
      apiBase,
      config,
      `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(branch)}`,
      { method: "GET", headers: { "Content-Type": undefined as any } },
    );

    this.ensureOk(status, "Failed to read query.");

    const content = json?.content;
    if (!content) throw new WorkspaceBackendError("NOT_FOUND", "Query not found");

    const text = json?.encoding === "base64" ? base64DecodeUtf8(content) : content;
    return { text, lastCommitId: json?.last_commit_id };
  }

  async readQuery(config: GitWorkspaceConfig, queryId: string): Promise<ReadResult> {
    const { host } = parseGitRemote(config.remoteUrl);
    const apiBase = inferApiBase(config, host);
    const { text, lastCommitId } = await this.readFileAtRef(config, apiBase, queryId);
    return { queryText: text, versionTag: lastCommitId };
  }

  async writeQuery(
    config: GitWorkspaceConfig,
    queryId: string,
    queryText: string,
    options?: WriteQueryOptions,
  ): Promise<void> {
    const { host } = parseGitRemote(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const projectId = this.getProjectId(config);
    const filePath = joinPath(config.rootPath, queryId);
    const branch = await this.getBranch(config, apiBase);

    // Check existence + optimistic concurrency.
    let exists = true;
    let lastCommitId: string | undefined;
    try {
      const res = await this.readFileAtRef(config, apiBase, queryId);
      lastCommitId = res.lastCommitId;
    } catch (e) {
      const err = e as any;
      exists = false;
      if (err?.code && err.code !== "NOT_FOUND") throw e;
    }

    if (options?.expectedVersionTag && lastCommitId && options.expectedVersionTag !== lastCommitId) {
      throw new WorkspaceBackendError(
        "CONFLICT",
        "The file changed remotely since it was last opened. Please reload the managed query and try saving again.",
      );
    }

    const message = (options?.message || `Update ${queryId}`).trim();
    const body: any = {
      branch,
      content: queryText,
      commit_message: message,
    };

    const method = exists ? "PUT" : "POST";
    const { status } = await this.request(
      apiBase,
      config,
      `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
      {
        method,
        body: JSON.stringify(body),
      },
    );

    this.ensureOk(status, "Failed to save query to GitLab workspace.");
  }

  async listVersions(config: GitWorkspaceConfig, queryId: string): Promise<VersionInfo[]> {
    const { host } = parseGitRemote(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const projectId = this.getProjectId(config);
    const filePath = joinPath(config.rootPath, queryId);
    const branch = await this.getBranch(config, apiBase);

    const qs = new URLSearchParams();
    qs.set("ref_name", branch);
    qs.set("path", filePath);
    qs.set("per_page", "30");

    const { status, json } = await this.request<GitlabCommit[]>(
      apiBase,
      config,
      `/projects/${projectId}/repository/commits?${qs.toString()}`,
    );

    this.ensureOk(status, "Failed to list query versions.");

    const commits = Array.isArray(json) ? json : [];
    return commits
      .map((c) => {
        const createdAt = c.created_at || new Date().toISOString();
        return { id: c.id, createdAt, author: c.author_name, message: c.message } satisfies VersionInfo;
      })
      .filter((v) => !!v.id);
  }

  async readVersion(config: GitWorkspaceConfig, queryId: string, versionId: string): Promise<ReadResult> {
    const { host } = parseGitRemote(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const { text } = await this.readFileAtRef(config, apiBase, queryId, versionId);
    return { queryText: text, versionTag: versionId };
  }

  async deleteQuery(config: GitWorkspaceConfig, queryId: string): Promise<void> {
    const { host } = parseGitRemote(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const projectId = this.getProjectId(config);
    const filePath = joinPath(config.rootPath, queryId);
    const branch = await this.getBranch(config, apiBase);

    const body: any = {
      branch,
      commit_message: `Delete ${queryId}`,
    };

    const { status } = await this.request(
      apiBase,
      config,
      `/projects/${projectId}/repository/files/${encodeURIComponent(filePath)}`,
      { method: "DELETE", body: JSON.stringify(body) },
    );

    if (status === 404) return;
    this.ensureOk(status, "Failed to delete query from GitLab workspace.");
  }
}
