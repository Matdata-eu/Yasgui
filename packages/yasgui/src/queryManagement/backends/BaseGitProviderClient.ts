import type { GitWorkspaceConfig, WriteQueryOptions } from "../types";
import type { GitProviderClient } from "./GitWorkspaceBackend";
import { WorkspaceBackendError } from "./errors";

/**
 * Base class for Git provider clients that provides common functionality
 * such as helper methods, error handling, and consistent commit message generation.
 */
export abstract class BaseGitProviderClient implements GitProviderClient {
  /**
   * Join path parts into a single path string, filtering out empty parts
   * and normalizing slashes.
   */
  protected joinPath(...parts: Array<string | undefined>): string {
    const cleaned = parts
      .filter((p): p is string => !!p)
      .map((p) => p.replace(/^\/+|\/+$/g, ""))
      .filter((p) => p.length > 0);
    return cleaned.join("/");
  }

  /**
   * Encode a path for use in URLs, encoding each segment separately.
   */
  protected encodePath(path: string): string {
    return path
      .split("/")
      .filter((p) => p.length > 0)
      .map((p) => encodeURIComponent(p))
      .join("/");
  }

  /**
   * Base64 encode a UTF-8 string.
   */
  protected base64EncodeUtf8(value: string): string {
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

  /**
   * Base64 decode a UTF-8 string.
   */
  protected base64DecodeUtf8(value: string): string {
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

  /**
   * Basic auth encoding for username:password.
   */
  protected base64Encode(value: string): string {
    if (typeof (globalThis as any).btoa === "function") return (globalThis as any).btoa(value);
    const buf = (globalThis as any).Buffer;
    if (buf && typeof buf.from === "function") return buf.from(value, "utf8").toString("base64");
    throw new Error("Base64 encoding not available in this environment");
  }

  /**
   * Ensure HTTP status is OK (2xx), throw appropriate error otherwise.
   */
  protected ensureOk(status: number, message: string): void {
    if (status >= 200 && status < 300) return;
    if (status === 401) throw new WorkspaceBackendError("AUTH_FAILED", message);
    if (status === 403) throw new WorkspaceBackendError("FORBIDDEN", message);
    if (status === 404) throw new WorkspaceBackendError("NOT_FOUND", message);
    if (status === 409) throw new WorkspaceBackendError("CONFLICT", message);
    if (status === 429) throw new WorkspaceBackendError("RATE_LIMITED", message);
    throw new WorkspaceBackendError("UNKNOWN", message);
  }

  /**
   * Generate consistent commit message for write operations.
   * Uses "Add" for new files and "Update" for existing files.
   */
  protected getCommitMessage(queryId: string, options: WriteQueryOptions | undefined, isNew: boolean): string {
    if (options?.message?.trim()) return options.message.trim();
    return isNew ? `Add ${queryId}` : `Update ${queryId}`;
  }

  /**
   * Generate consistent commit message for delete operations.
   */
  protected getDeleteMessage(queryId: string): string {
    return `Delete ${queryId}`;
  }

  // Abstract methods that must be implemented by concrete providers
  abstract validateAccess(config: GitWorkspaceConfig): Promise<void>;
  abstract listFolder(config: GitWorkspaceConfig, folderId?: string): Promise<import("../types").FolderEntry[]>;
  abstract readQuery(config: GitWorkspaceConfig, queryId: string): Promise<import("../types").ReadResult>;
  abstract writeQuery(
    config: GitWorkspaceConfig,
    queryId: string,
    queryText: string,
    options?: WriteQueryOptions,
  ): Promise<void>;
  abstract listVersions(config: GitWorkspaceConfig, queryId: string): Promise<import("../types").VersionInfo[]>;
  abstract readVersion(
    config: GitWorkspaceConfig,
    queryId: string,
    versionId: string,
  ): Promise<import("../types").ReadResult>;
  abstract deleteQuery(config: GitWorkspaceConfig, queryId: string): Promise<void>;
}
