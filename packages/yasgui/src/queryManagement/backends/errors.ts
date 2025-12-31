export type WorkspaceBackendErrorCode =
  | "AUTH_FAILED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "NETWORK_ERROR"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "UNKNOWN";

export class WorkspaceBackendError extends Error {
  public readonly code: WorkspaceBackendErrorCode;

  constructor(code: WorkspaceBackendErrorCode, message?: string) {
    super(message || code);
    this.name = "WorkspaceBackendError";
    this.code = code;
  }
}

export function isWorkspaceBackendError(error: unknown): error is WorkspaceBackendError {
  return typeof error === "object" && error !== null && (error as any).name === "WorkspaceBackendError";
}

export function asWorkspaceBackendError(error: unknown): WorkspaceBackendError {
  if (isWorkspaceBackendError(error)) return error;
  if (error instanceof Error) return new WorkspaceBackendError("UNKNOWN", error.message);
  return new WorkspaceBackendError("UNKNOWN", String(error));
}
