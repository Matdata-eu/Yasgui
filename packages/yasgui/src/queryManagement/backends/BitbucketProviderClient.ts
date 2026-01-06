import type { GitWorkspaceConfig, FolderEntry, ReadResult, VersionInfo, WriteQueryOptions } from "../types";
import { BaseGitProviderClient } from "./BaseGitProviderClient";
import { WorkspaceBackendError } from "./errors";
import { parseGitRemote } from "./gitRemote";

type BitbucketMetaEntry = {
  type: "commit_directory" | "commit_file";
  path: string;
};

type BitbucketMetaResponse = {
  values?: BitbucketMetaEntry[];
  next?: string;
};

type BitbucketCommit = {
  hash: string;
  date?: string;
  message?: string;
  author?: {
    user?: { display_name?: string };
    raw?: string;
  };
};

type BitbucketCommitsResponse = {
  values?: BitbucketCommit[];
};

type BitbucketRepoResponse = {
  mainbranch?: { name?: string };
};

function inferApiBase(config: GitWorkspaceConfig): string {
  const configured = (config as any).apiBaseUrl as string | undefined;
  if (configured?.trim()) return configured.trim().replace(/\/+$/g, "");
  return "https://api.bitbucket.org/2.0";
}

function parseWorkspaceRepo(remoteUrl: string): { host: string; workspace: string; repo: string } {
  const { host, repoPath } = parseGitRemote(remoteUrl);
  const parts = repoPath.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Invalid Bitbucket remote URL");
  const workspace = parts[0];
  const repo = parts[1];
  return { host, workspace, repo };
}

export class BitbucketProviderClient extends BaseGitProviderClient {
  public static canHandle(config: GitWorkspaceConfig): boolean {
    const provider = (config as any).provider as string | undefined;
    if (provider && provider !== "auto") return provider === "bitbucket";

    try {
      const { host } = parseGitRemote(config.remoteUrl);
      return host === "bitbucket.org";
    } catch {
      return false;
    }
  }

  private async requestJson<T>(
    apiBase: string,
    config: GitWorkspaceConfig,
    path: string,
    init?: RequestInit,
  ): Promise<{ status: number; json?: T }> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // Bitbucket Cloud uses basic auth: username + app password.
    const username = config.auth.username?.trim();
    const token = config.auth.token?.trim();
    if (username && token) headers.Authorization = `Basic ${this.base64Encode(`${username}:${token}`)}`;

    const url = path.startsWith("http") ? path : `${apiBase}${path}`;
    const res = await fetch(url, {
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
    }

    return { status };
  }

  private async requestText(
    apiBase: string,
    config: GitWorkspaceConfig,
    url: string,
    init?: RequestInit,
  ): Promise<{ status: number; text: string }> {
    const headers: Record<string, string> = {
      Accept: "text/plain",
    };

    const username = config.auth.username?.trim();
    const token = config.auth.token?.trim();
    if (username && token) headers.Authorization = `Basic ${this.base64Encode(`${username}:${token}`)}`;

    const res = await fetch(url.startsWith("http") ? url : `${apiBase}${url}`, {
      ...init,
      // Avoid stale results after create/delete/rename.
      cache: "no-store",
      headers: {
        ...headers,
        ...(init?.headers as any),
      },
    });

    return { status: res.status, text: await res.text() };
  }

  async validateAccess(config: GitWorkspaceConfig): Promise<void> {
    const { host, workspace, repo } = parseWorkspaceRepo(config.remoteUrl);
    if (host !== "bitbucket.org") {
      throw new WorkspaceBackendError(
        "UNKNOWN",
        "This Bitbucket provider currently supports Bitbucket Cloud (bitbucket.org) only.",
      );
    }

    const apiBase = inferApiBase(config);
    const username = config.auth.username?.trim();
    if (!username) {
      throw new WorkspaceBackendError(
        "UNKNOWN",
        "Bitbucket Cloud requires a username (workspace/user) in addition to an app password token.",
      );
    }

    const { status } = await this.requestJson(
      apiBase,
      config,
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}`,
    );
    this.ensureOk(status, "Could not access Bitbucket repository with the provided credentials.");
  }

  private async resolveBranch(
    apiBase: string,
    config: GitWorkspaceConfig,
    workspace: string,
    repo: string,
  ): Promise<string> {
    const configured = config.branch?.trim();
    if (configured) return configured;

    const { status, json } = await this.requestJson<BitbucketRepoResponse>(
      apiBase,
      config,
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}`,
    );
    this.ensureOk(status, "Failed to resolve repository default branch.");

    const inferred = json?.mainbranch?.name?.trim();
    if (inferred) return inferred;

    // Fallback: common default.
    return "main";
  }

  async listFolder(config: GitWorkspaceConfig, folderId?: string): Promise<FolderEntry[]> {
    const { host, workspace, repo } = parseWorkspaceRepo(config.remoteUrl);
    if (host !== "bitbucket.org") return [];

    const apiBase = inferApiBase(config);

    const relPath = folderId?.trim() || "";
    const fullPath = this.joinPath(config.rootPath, relPath);
    const ref = await this.resolveBranch(apiBase, config, workspace, repo);

    // Use the /src endpoint in meta mode to list directory.
    const basePath =
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(ref)}` +
      (fullPath ? `/${this.encodePath(fullPath)}` : "");

    const entries: FolderEntry[] = [];
    let nextUrl: string | undefined = `${apiBase}${basePath}?format=meta&pagelen=100`;

    for (let guard = 0; guard < 50 && nextUrl; guard++) {
      const response: { status: number; json?: BitbucketMetaResponse } = await this.requestJson<BitbucketMetaResponse>(
        apiBase,
        config,
        nextUrl,
      );
      const status = response.status;
      const json: BitbucketMetaResponse | undefined = response.json;
      if (status === 404) return [];
      this.ensureOk(status, "Failed to list folder contents.");

      const values = json?.values || [];
      for (const v of values) {
        const name = v.path.split("/").filter(Boolean).pop() || v.path;
        if (v.type === "commit_directory") {
          const id = relPath ? this.joinPath(relPath, name) : name;
          entries.push({ kind: "folder", id, label: name, parentId: relPath || undefined });
        }

        if (v.type === "commit_file") {
          if (!/\.(rq|sparql)$/i.test(name)) continue;
          const id = relPath ? this.joinPath(relPath, name) : name;
          const label = name.replace(/\.(rq|sparql)$/i, "");
          entries.push({ kind: "query", id, label, parentId: relPath || undefined });
        }
      }

      nextUrl = json?.next;
    }

    entries.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
      return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
    });

    return entries;
  }

  private async getLatestCommitHash(
    apiBase: string,
    config: GitWorkspaceConfig,
    workspace: string,
    repo: string,
    filePath: string,
  ): Promise<string | undefined> {
    const ref = await this.resolveBranch(apiBase, config, workspace, repo);
    const qs = new URLSearchParams();
    qs.set("path", filePath);
    qs.set("pagelen", "1");

    const { status, json } = await this.requestJson<BitbucketCommitsResponse>(
      apiBase,
      config,
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}?${qs.toString()}`,
    );

    if (status === 404) return undefined;
    this.ensureOk(status, "Failed to read query metadata.");

    const commits = json?.values || [];
    return commits[0]?.hash;
  }

  async readQuery(config: GitWorkspaceConfig, queryId: string): Promise<ReadResult> {
    const { host, workspace, repo } = parseWorkspaceRepo(config.remoteUrl);
    if (host !== "bitbucket.org") throw new WorkspaceBackendError("NOT_FOUND", "Unsupported Bitbucket host");

    const apiBase = inferApiBase(config);
    const filePath = this.joinPath(config.rootPath, queryId);
    const ref = await this.resolveBranch(apiBase, config, workspace, repo);

    const { status, text } = await this.requestText(
      apiBase,
      config,
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(ref)}/${this.encodePath(filePath)}`,
    );

    this.ensureOk(status, "Failed to read query.");

    const versionTag = await this.getLatestCommitHash(apiBase, config, workspace, repo, filePath);
    return { queryText: text, versionTag };
  }

  async writeQuery(
    config: GitWorkspaceConfig,
    queryId: string,
    queryText: string,
    options?: WriteQueryOptions,
  ): Promise<void> {
    const { host, workspace, repo } = parseWorkspaceRepo(config.remoteUrl);
    if (host !== "bitbucket.org") throw new WorkspaceBackendError("UNKNOWN", "Unsupported Bitbucket host");

    const apiBase = inferApiBase(config);

    const filePath = this.joinPath(config.rootPath, queryId);
    const current = await this.getLatestCommitHash(apiBase, config, workspace, repo, filePath);

    if (options?.expectedVersionTag && current && options.expectedVersionTag !== current) {
      throw new WorkspaceBackendError(
        "CONFLICT",
        "The file changed remotely since it was last opened. Please reload the managed query and try saving again.",
      );
    }

    const message = this.getCommitMessage(queryId, options, !current);

    const form = new FormData();
    form.append("message", message);
    const ref = await this.resolveBranch(apiBase, config, workspace, repo);
    if (ref) form.append("branch", ref);

    // Bitbucket expects file content in a multipart field named by its path.
    form.append(filePath, new Blob([queryText], { type: "text/plain" }));

    const { status } = await this.requestJson(
      apiBase,
      config,
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src`,
      {
        method: "POST",
        body: form as any,
      },
    );

    this.ensureOk(status, "Failed to save query to Bitbucket workspace.");
  }

  async listVersions(config: GitWorkspaceConfig, queryId: string): Promise<VersionInfo[]> {
    const { host, workspace, repo } = parseWorkspaceRepo(config.remoteUrl);
    if (host !== "bitbucket.org") return [];

    const apiBase = inferApiBase(config);

    const filePath = this.joinPath(config.rootPath, queryId);
    const ref = await this.resolveBranch(apiBase, config, workspace, repo);

    const qs = new URLSearchParams();
    qs.set("path", filePath);
    qs.set("pagelen", "30");

    const { status, json } = await this.requestJson<BitbucketCommitsResponse>(
      apiBase,
      config,
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(ref)}?${qs.toString()}`,
    );

    this.ensureOk(status, "Failed to list query versions.");

    const commits = json?.values || [];
    return commits
      .map((c) => {
        const createdAt = c.date || new Date().toISOString();
        const author = c.author?.user?.display_name || c.author?.raw;
        return { id: c.hash, createdAt, author, message: c.message } satisfies VersionInfo;
      })
      .filter((v) => !!v.id);
  }

  async readVersion(config: GitWorkspaceConfig, queryId: string, versionId: string): Promise<ReadResult> {
    const { host, workspace, repo } = parseWorkspaceRepo(config.remoteUrl);
    if (host !== "bitbucket.org") throw new WorkspaceBackendError("NOT_FOUND", "Unsupported Bitbucket host");

    const apiBase = inferApiBase(config);

    const filePath = this.joinPath(config.rootPath, queryId);

    const { status, text } = await this.requestText(
      apiBase,
      config,
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src/${encodeURIComponent(versionId)}/${this.encodePath(filePath)}`,
    );

    this.ensureOk(status, "Failed to read query version.");

    return { queryText: text, versionTag: versionId };
  }

  async deleteQuery(config: GitWorkspaceConfig, queryId: string): Promise<void> {
    const { host, workspace, repo } = parseWorkspaceRepo(config.remoteUrl);
    if (host !== "bitbucket.org") throw new WorkspaceBackendError("UNKNOWN", "Unsupported Bitbucket host");

    const apiBase = inferApiBase(config);

    const filePath = this.joinPath(config.rootPath, queryId);
    const ref = await this.resolveBranch(apiBase, config, workspace, repo);

    const form = new FormData();
    form.append("message", this.getDeleteMessage(queryId));
    if (ref) form.append("branch", ref);
    // Bitbucket deletes files by sending one or more `files` fields.
    form.append("files", filePath);

    const { status } = await this.requestJson(
      apiBase,
      config,
      `/repositories/${encodeURIComponent(workspace)}/${encodeURIComponent(repo)}/src`,
      { method: "POST", body: form as any },
    );

    // If the file doesn't exist, Bitbucket may return 404.
    if (status === 404) return;
    this.ensureOk(status, "Failed to delete query from Bitbucket workspace.");
  }
}
