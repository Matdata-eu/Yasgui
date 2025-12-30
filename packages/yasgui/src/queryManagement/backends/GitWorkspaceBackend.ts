import type { GitWorkspaceConfig, FolderEntry, ReadResult, VersionInfo, WriteQueryOptions } from "../types";
import type { WorkspaceBackend } from "./WorkspaceBackend";
import { WorkspaceBackendError } from "./errors";

export interface GitProviderClient {
  validateAccess(config: GitWorkspaceConfig): Promise<void>;
  listFolder(config: GitWorkspaceConfig, folderId?: string): Promise<FolderEntry[]>;
  readQuery(config: GitWorkspaceConfig, queryId: string): Promise<ReadResult>;
  writeQuery(
    config: GitWorkspaceConfig,
    queryId: string,
    queryText: string,
    options?: WriteQueryOptions,
  ): Promise<void>;
  listVersions(config: GitWorkspaceConfig, queryId: string): Promise<VersionInfo[]>;
  readVersion(config: GitWorkspaceConfig, queryId: string, versionId: string): Promise<ReadResult>;

  deleteQuery(config: GitWorkspaceConfig, queryId: string): Promise<void>;
}

export default class GitWorkspaceBackend implements WorkspaceBackend {
  public readonly type = "git" as const;

  constructor(
    private config: GitWorkspaceConfig,
    private client?: GitProviderClient,
  ) {}

  private missingClientError(): WorkspaceBackendError {
    return new WorkspaceBackendError(
      "UNKNOWN",
      `No GitProviderClient configured for remote '${this.config.remoteUrl}'. Supported providers: GitHub, GitLab, Bitbucket Cloud (bitbucket.org), and Gitea. For self-hosted/enterprise instances, set git workspace 'provider' and/or 'apiBaseUrl'.`,
    );
  }

  async validateAccess(): Promise<void> {
    if (!this.client) throw this.missingClientError();
    return this.client.validateAccess(this.config);
  }

  async listFolder(_folderId?: string): Promise<FolderEntry[]> {
    if (!this.client) throw this.missingClientError();
    return this.client.listFolder(this.config, _folderId);
  }

  async readQuery(_queryId: string): Promise<ReadResult> {
    if (!this.client) throw this.missingClientError();
    return this.client.readQuery(this.config, _queryId);
  }

  async writeQuery(_queryId: string, _queryText: string, _options?: WriteQueryOptions): Promise<void> {
    if (!this.client) throw this.missingClientError();
    return this.client.writeQuery(this.config, _queryId, _queryText, _options);
  }

  async listVersions(_queryId: string): Promise<VersionInfo[]> {
    if (!this.client) throw this.missingClientError();
    return this.client.listVersions(this.config, _queryId);
  }

  async readVersion(_queryId: string, _versionId: string): Promise<ReadResult> {
    if (!this.client) throw this.missingClientError();
    return this.client.readVersion(this.config, _queryId, _versionId);
  }

  async deleteQuery(_queryId: string): Promise<void> {
    if (!this.client) throw this.missingClientError();
    return this.client.deleteQuery(this.config, _queryId);
  }
}
