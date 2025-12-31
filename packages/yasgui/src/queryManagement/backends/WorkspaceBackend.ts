import type { BackendType, FolderEntry, ReadResult, VersionInfo, WriteQueryOptions } from "../types";

export interface WorkspaceBackend {
  readonly type: BackendType;

  validateAccess(): Promise<void>;

  listFolder(folderId?: string): Promise<FolderEntry[]>;

  searchByName?(query: string): Promise<FolderEntry[]>;

  readQuery(queryId: string): Promise<ReadResult>;

  writeQuery(queryId: string, queryText: string, options?: WriteQueryOptions): Promise<void>;

  listVersions(queryId: string): Promise<VersionInfo[]>;

  readVersion(queryId: string, versionId: string): Promise<ReadResult>;

  /**
   * Optional: Rename a query (typically renaming its label, not its ID).
   * Implementations may not support this (e.g., some Git provider clients).
   */
  renameQuery?(queryId: string, newLabel: string): Promise<void>;

  /**
   * Optional: Delete a query and its version history.
   * Implementations may not support this (e.g., some Git provider clients).
   */
  deleteQuery?(queryId: string): Promise<void>;

  /**
   * Optional: Rename a folder (typically renaming its label, not its ID).
   */
  renameFolder?(folderId: string, newLabel: string): Promise<void>;

  /**
   * Optional: Delete a folder and everything inside it (recursive).
   */
  deleteFolder?(folderId: string): Promise<void>;
}
