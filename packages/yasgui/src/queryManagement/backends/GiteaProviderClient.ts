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

function encodePath(path: string): string {
  return path
    .split("/")
    .filter((p) => p.length > 0)
    .map((p) => encodeURIComponent(p))
    .join("/");
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

function base64EncodeUtf8(value: string): string {
  if (typeof (globalThis as any).btoa === "function") {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return (globalThis as any).btoa(binary);
  }

  const buf = (globalThis as any).Buffer;
  if (buf && typeof buf.from === "function") return buf.from(value, "utf8").toString("base64");
  throw new Error("Base64 encoding not available in this environment");
}

type GiteaContentItem = {
  type: "file" | "dir";
  name: string;
  path: string;
  sha?: string;
  content?: string;
  encoding?: "base64";
};

type GiteaCommit = {
  sha: string;
  created?: string;
  commit?: {
    message?: string;
    author?: { name?: string; date?: string };
    committer?: { name?: string; date?: string };
  };
  author?: { login?: string };
};

function inferApiBase(config: GitWorkspaceConfig, host: string): string {
  const configured = (config as any).apiBaseUrl as string | undefined;
  if (configured?.trim()) return configured.trim().replace(/\/+$/g, "");
  return `https://${host}/api/v1`;
}

function parseOwnerRepo(remoteUrl: string): { owner: string; repo: string; host: string } {
  const { host, repoPath } = parseGitRemote(remoteUrl);
  const parts = repoPath.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid git remote URL");
  const owner = parts[0];
  const repo = parts[1];
  return { owner, repo, host };
}

export class GiteaProviderClient implements GitProviderClient {
  public static canHandle(config: GitWorkspaceConfig): boolean {
    const provider = (config as any).provider as string | undefined;
    if (provider && provider !== "auto") return provider === "gitea";

    try {
      const { host } = parseGitRemote(config.remoteUrl);
      return host.includes("gitea");
    } catch {
      return false;
    }
  }

  private async request<T>(
    apiBase: string,
    config: GitWorkspaceConfig,
    path: string,
    init?: RequestInit,
  ): Promise<{ status: number; json?: T; text?: string }> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const token = config.auth.token?.trim();
    if (token) headers.Authorization = `token ${token}`;

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

    const text = await res.text();
    return { status, text };
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

  async validateAccess(config: GitWorkspaceConfig): Promise<void> {
    const { owner, repo, host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const { status } = await this.request(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    );
    this.ensureOk(status, "Could not access repository with the provided token.");
  }

  async listFolder(config: GitWorkspaceConfig, folderId?: string): Promise<FolderEntry[]> {
    const { owner, repo, host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const relPath = folderId?.trim() || "";
    const fullPath = joinPath(config.rootPath, relPath);

    const pathPart = fullPath ? `/${encodePath(fullPath)}` : "";
    const ref = config.branch?.trim() ? `?ref=${encodeURIComponent(config.branch.trim())}` : "";

    const { status, json } = await this.request<GiteaContentItem[] | GiteaContentItem>(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${pathPart}${ref}`,
    );

    if (status === 404) return [];
    this.ensureOk(status, "Failed to list folder contents.");

    const items = Array.isArray(json) ? json : [];

    const entries: FolderEntry[] = [];
    for (const item of items) {
      if (item.type === "dir") {
        const id = relPath ? joinPath(relPath, item.name) : item.name;
        entries.push({ kind: "folder", id, label: item.name, parentId: relPath || undefined });
        continue;
      }

      if (item.type === "file") {
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
    owner: string,
    repo: string,
    queryId: string,
    ref?: string,
  ): Promise<{ text: string; sha?: string }> {
    const filePath = joinPath(config.rootPath, queryId);
    const refQ = ref
      ? `?ref=${encodeURIComponent(ref)}`
      : config.branch?.trim()
        ? `?ref=${encodeURIComponent(config.branch.trim())}`
        : "";

    const { status, json } = await this.request<GiteaContentItem>(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(filePath)}${refQ}`,
    );

    this.ensureOk(status, "Failed to read query.");

    const content = json?.content || "";
    const text = json?.encoding === "base64" ? base64DecodeUtf8(content) : content;
    return { text, sha: json?.sha };
  }

  async readQuery(config: GitWorkspaceConfig, queryId: string): Promise<ReadResult> {
    const { owner, repo, host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const { text, sha } = await this.readFileAtRef(config, apiBase, owner, repo, queryId);
    return { queryText: text, versionTag: sha };
  }

  async writeQuery(
    config: GitWorkspaceConfig,
    queryId: string,
    queryText: string,
    options?: WriteQueryOptions,
  ): Promise<void> {
    const { owner, repo, host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const filePath = joinPath(config.rootPath, queryId);

    let currentSha: string | undefined;
    try {
      const res = await this.readFileAtRef(config, apiBase, owner, repo, queryId);
      currentSha = res.sha;
    } catch (e) {
      const err = e as any;
      if (err?.code !== "NOT_FOUND") throw e;
    }

    if (options?.expectedVersionTag && currentSha && options.expectedVersionTag !== currentSha) {
      throw new WorkspaceBackendError(
        "CONFLICT",
        "The file changed remotely since it was last opened. Please reload the managed query and try saving again.",
      );
    }

    const message = (options?.message || `Update ${queryId}`).trim();
    const body: any = {
      message,
      content: base64EncodeUtf8(queryText),
    };
    if (config.branch?.trim()) body.branch = config.branch.trim();
    if (currentSha) body.sha = currentSha;

    const { status } = await this.request(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(filePath)}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      },
    );

    this.ensureOk(status, "Failed to save query to Gitea workspace.");
  }

  async listVersions(config: GitWorkspaceConfig, queryId: string): Promise<VersionInfo[]> {
    const { owner, repo, host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const filePath = joinPath(config.rootPath, queryId);

    const qs = new URLSearchParams();
    if (config.branch?.trim()) qs.set("sha", config.branch.trim());
    qs.set("path", filePath);
    qs.set("limit", "30");

    const { status, json } = await this.request<GiteaCommit[]>(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${qs.toString()}`,
    );

    this.ensureOk(status, "Failed to list query versions.");

    const commits = Array.isArray(json) ? json : [];
    return commits
      .map((c) => {
        const createdAt = c.created || c.commit?.committer?.date || c.commit?.author?.date || new Date().toISOString();
        const author = c.author?.login || c.commit?.author?.name;
        const message = c.commit?.message || "";
        return { id: c.sha, createdAt, author, message } satisfies VersionInfo;
      })
      .filter((v) => !!v.id);
  }

  async readVersion(config: GitWorkspaceConfig, queryId: string, versionId: string): Promise<ReadResult> {
    const { owner, repo, host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const { text } = await this.readFileAtRef(config, apiBase, owner, repo, queryId, versionId);
    return { queryText: text, versionTag: versionId };
  }

  async deleteQuery(config: GitWorkspaceConfig, queryId: string): Promise<void> {
    const { owner, repo, host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const filePath = joinPath(config.rootPath, queryId);

    let currentSha: string | undefined;
    try {
      const res = await this.readFileAtRef(config, apiBase, owner, repo, queryId);
      currentSha = res.sha;
    } catch (e) {
      const err = e as any;
      if (err?.code === "NOT_FOUND") return;
      throw e;
    }

    if (!currentSha) return;

    const body: any = {
      message: `Delete ${queryId}`,
      sha: currentSha,
    };
    if (config.branch?.trim()) body.branch = config.branch.trim();

    const { status } = await this.request(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(filePath)}`,
      {
        method: "DELETE",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      },
    );

    if (status === 404) return;
    this.ensureOk(status, "Failed to delete query.");
  }
}
