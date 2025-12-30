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

function base64EncodeUtf8(value: string): string {
  if (typeof (globalThis as any).btoa === "function") {
    // btoa is latin1-only; encode to bytes first.
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    return (globalThis as any).btoa(binary);
  }

  const buf = (globalThis as any).Buffer;
  if (buf && typeof buf.from === "function") return buf.from(value, "utf8").toString("base64");
  throw new Error("Base64 encoding not available in this environment");
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

type GithubContentItem =
  | {
      type: "file";
      name: string;
      path: string;
    }
  | {
      type: "dir";
      name: string;
      path: string;
    };

type GithubContentResponse =
  | {
      type: "file";
      name: string;
      path: string;
      sha: string;
      content: string;
      encoding: "base64";
    }
  | GithubContentItem[];

type GithubCommit = {
  sha: string;
  commit: {
    committer?: { date?: string };
    author?: { date?: string };
    message?: string;
  };
  author?: { login?: string };
};

function isGitHubRemote(remoteUrl: string): boolean {
  try {
    const { host } = parseGitRemote(remoteUrl);
    return host === "github.com" || host.includes("github");
  } catch {
    return false;
  }
}

function inferApiBase(config: GitWorkspaceConfig, host: string): string {
  const configured = (config as any).apiBaseUrl as string | undefined;
  if (configured?.trim()) return configured.trim().replace(/\/+$/g, "");
  if (host === "github.com") return "https://api.github.com";
  // GitHub Enterprise default
  return `https://${host}/api/v3`;
}

function parseOwnerRepo(remoteUrl: string): { owner: string; repo: string; host: string } {
  const { host, repoPath } = parseGitRemote(remoteUrl);
  const parts = repoPath.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid git remote URL");
  const owner = parts[0];
  const repo = parts[1];
  if (!owner || !repo) throw new Error("Invalid git remote URL");
  return { owner, repo, host };
}

export class GithubProviderClient implements GitProviderClient {
  public static canHandle(config: GitWorkspaceConfig): boolean {
    const provider = (config as any).provider as string | undefined;
    if (provider && provider !== "auto") return provider === "github";
    return isGitHubRemote(config.remoteUrl);
  }

  private async request<T>(
    config: GitWorkspaceConfig,
    path: string,
    init?: RequestInit,
  ): Promise<{ status: number; json?: T }> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };

    const token = config.auth.token?.trim();
    if (token) headers.Authorization = `Bearer ${token}`;

    const { host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

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

  private async ensureOk(status: number, message: string): Promise<void> {
    if (status >= 200 && status < 300) return;
    if (status === 401) throw new WorkspaceBackendError("AUTH_FAILED", message);
    if (status === 403) throw new WorkspaceBackendError("FORBIDDEN", message);
    if (status === 404) throw new WorkspaceBackendError("NOT_FOUND", message);
    if (status === 409) throw new WorkspaceBackendError("CONFLICT", message);
    if (status === 429) throw new WorkspaceBackendError("RATE_LIMITED", message);
    throw new WorkspaceBackendError("UNKNOWN", message);
  }

  async validateAccess(config: GitWorkspaceConfig): Promise<void> {
    const { owner, repo } = parseOwnerRepo(config.remoteUrl);
    const { status } = await this.request(config, `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    await this.ensureOk(status, "Could not access repository with the provided token.");
  }

  async listFolder(config: GitWorkspaceConfig, folderId?: string): Promise<FolderEntry[]> {
    const { owner, repo } = parseOwnerRepo(config.remoteUrl);
    const relPath = folderId?.trim() || "";
    const fullPath = joinPath(config.rootPath, relPath);

    const pathPart = fullPath ? `/${encodePath(fullPath)}` : "";
    const ref = config.branch?.trim() ? `?ref=${encodeURIComponent(config.branch.trim())}` : "";

    const { status, json } = await this.request<GithubContentResponse>(
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${pathPart}${ref}`,
    );

    if (status === 404) return [];
    await this.ensureOk(status, "Failed to list folder contents.");

    if (!Array.isArray(json)) return [];

    const entries: FolderEntry[] = [];
    for (const item of json) {
      if (item.type === "dir") {
        const id = config.rootPath ? item.path.slice(joinPath(config.rootPath).length).replace(/^\//, "") : item.path;
        entries.push({ kind: "folder", id, label: item.name, parentId: relPath || undefined });
        continue;
      }

      if (item.type === "file") {
        if (!/\.sparql$/i.test(item.name)) continue;
        const id = config.rootPath ? item.path.slice(joinPath(config.rootPath).length).replace(/^\//, "") : item.path;
        const label = item.name.replace(/\.sparql$/i, "");
        entries.push({ kind: "query", id, label, parentId: relPath || undefined });
      }
    }

    // Keep stable sort: folders first then queries.
    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });

    return entries;
  }

  private async readFileAtRef(
    config: GitWorkspaceConfig,
    queryId: string,
    ref?: string,
  ): Promise<{ text: string; sha: string }> {
    const { owner, repo } = parseOwnerRepo(config.remoteUrl);
    const filePath = joinPath(config.rootPath, queryId);

    const refQ = ref
      ? `?ref=${encodeURIComponent(ref)}`
      : config.branch?.trim()
        ? `?ref=${encodeURIComponent(config.branch.trim())}`
        : "";
    const pathPart = `/${encodePath(filePath)}`;

    const { status, json } = await this.request<GithubContentResponse>(
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${pathPart}${refQ}`,
    );

    await this.ensureOk(status, "Failed to read query.");

    if (!json || Array.isArray(json) || (json as any).type !== "file") {
      throw new WorkspaceBackendError("NOT_FOUND", "Query not found");
    }

    const file = json as Extract<GithubContentResponse, { type: "file" }>;
    const text = base64DecodeUtf8(file.content || "");
    return { text, sha: file.sha };
  }

  async readQuery(config: GitWorkspaceConfig, queryId: string): Promise<ReadResult> {
    const { text, sha } = await this.readFileAtRef(config, queryId);
    return { queryText: text, versionTag: sha };
  }

  async writeQuery(
    config: GitWorkspaceConfig,
    queryId: string,
    queryText: string,
    options?: WriteQueryOptions,
  ): Promise<void> {
    const { owner, repo } = parseOwnerRepo(config.remoteUrl);
    const filePath = joinPath(config.rootPath, queryId);

    // Determine current file sha (if any) so we can update.
    let currentSha: string | undefined;
    try {
      const res = await this.readFileAtRef(config, queryId);
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

    const pathPart = `/${encodePath(filePath)}`;
    const { status } = await this.request(
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${pathPart}`,
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );

    await this.ensureOk(status, "Failed to save query to git workspace.");
  }

  async listVersions(config: GitWorkspaceConfig, queryId: string): Promise<VersionInfo[]> {
    const { owner, repo } = parseOwnerRepo(config.remoteUrl);
    const filePath = joinPath(config.rootPath, queryId);

    const qs = new URLSearchParams();
    if (config.branch?.trim()) qs.set("sha", config.branch.trim());
    qs.set("path", filePath);
    qs.set("per_page", "30");

    const { status, json } = await this.request<GithubCommit[]>(
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${qs.toString()}`,
    );

    await this.ensureOk(status, "Failed to list query versions.");

    const commits = Array.isArray(json) ? json : [];
    return commits
      .map((c) => {
        const createdAt = c.commit?.committer?.date || c.commit?.author?.date || new Date().toISOString();
        const message = c.commit?.message || "";
        const author = c.author?.login;
        return { id: c.sha, createdAt, author, message } satisfies VersionInfo;
      })
      .filter((v) => !!v.id);
  }

  async readVersion(config: GitWorkspaceConfig, queryId: string, versionId: string): Promise<ReadResult> {
    const { text } = await this.readFileAtRef(config, queryId, versionId);
    return { queryText: text, versionTag: versionId };
  }

  async deleteQuery(config: GitWorkspaceConfig, queryId: string): Promise<void> {
    const { owner, repo } = parseOwnerRepo(config.remoteUrl);
    const filePath = joinPath(config.rootPath, queryId);

    let sha: string | undefined;
    try {
      const res = await this.readFileAtRef(config, queryId);
      sha = res.sha;
    } catch (e) {
      const err = e as any;
      if (err?.code === "NOT_FOUND") return;
      throw e;
    }

    if (!sha) return;

    const body: any = {
      message: `Delete ${queryId}`,
      sha,
    };
    if (config.branch?.trim()) body.branch = config.branch.trim();

    const pathPart = `/${encodePath(filePath)}`;
    const { status } = await this.request(
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${pathPart}`,
      {
        method: "DELETE",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      },
    );

    if (status === 404) return;
    await this.ensureOk(status, "Failed to delete query.");
  }
}
