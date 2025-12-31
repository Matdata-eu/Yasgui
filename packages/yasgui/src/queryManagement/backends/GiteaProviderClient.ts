import type { GitWorkspaceConfig, FolderEntry, ReadResult, VersionInfo, WriteQueryOptions } from "../types";
import { BaseGitProviderClient } from "./BaseGitProviderClient";
import { WorkspaceBackendError } from "./errors";
import { parseGitRemote } from "./gitRemote";

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

export class GiteaProviderClient extends BaseGitProviderClient {
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
      // Avoid stale results after create/delete/rename.
      cache: "no-store",
      headers: {
        ...headers,
        ...(init?.headers as any),
      },
    });

    const status = res.status;
    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const text = await res.text();
      if (text.trim()) {
        try {
          const json = JSON.parse(text) as T;
          return { status, json };
        } catch {
          // Invalid JSON, return status only
          return { status };
        }
      }
      return { status };
    }

    const text = await res.text();
    return { status, text };
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
    const fullPath = this.joinPath(config.rootPath, relPath);

    const pathPart = fullPath ? `/${this.encodePath(fullPath)}` : "";
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
        const id = relPath ? this.joinPath(relPath, item.name) : item.name;
        entries.push({ kind: "folder", id, label: item.name, parentId: relPath || undefined });
        continue;
      }

      if (item.type === "file") {
        if (!/\.sparql$/i.test(item.name)) continue;
        const id = relPath ? this.joinPath(relPath, item.name) : item.name;
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
    const filePath = this.joinPath(config.rootPath, queryId);
    const refQ = ref
      ? `?ref=${encodeURIComponent(ref)}`
      : config.branch?.trim()
        ? `?ref=${encodeURIComponent(config.branch.trim())}`
        : "";

    const { status, json } = await this.request<GiteaContentItem>(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${this.encodePath(filePath)}${refQ}`,
    );

    this.ensureOk(status, "Failed to read query.");

    const content = json?.content || "";
    const text = json?.encoding === "base64" ? this.base64DecodeUtf8(content) : content;
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

    const filePath = this.joinPath(config.rootPath, queryId);

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

    const message = this.getCommitMessage(queryId, options, !currentSha);
    const body: any = {
      message,
      content: this.base64EncodeUtf8(queryText),
    };
    if (config.branch?.trim()) body.branch = config.branch.trim();
    if (currentSha) body.sha = currentSha;

    const { status } = await this.request(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${this.encodePath(filePath)}`,
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

    const filePath = this.joinPath(config.rootPath, queryId);

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

    const { text, sha } = await this.readFileAtRef(config, apiBase, owner, repo, queryId, versionId);
    return { queryText: text, versionTag: sha };
  }

  async deleteQuery(config: GitWorkspaceConfig, queryId: string): Promise<void> {
    const { owner, repo, host } = parseOwnerRepo(config.remoteUrl);
    const apiBase = inferApiBase(config, host);

    const filePath = this.joinPath(config.rootPath, queryId);

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
      message: this.getDeleteMessage(queryId),
      sha: currentSha,
    };
    if (config.branch?.trim()) body.branch = config.branch.trim();

    const { status } = await this.request(
      apiBase,
      config,
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${this.encodePath(filePath)}`,
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
