import type { BackendType, ReadResult } from "./types";
import type { WorkspaceBackend } from "./backends/WorkspaceBackend";

export function getEndpointToAutoSwitch(backendType: BackendType, readResult: ReadResult): string | undefined {
  if (backendType === "git") return undefined;
  return readResult.associatedEndpoint;
}

type NewTabLike = {
  setQuery(queryText: string): void;
  setEndpoint(endpoint: string): void;
  setName(name: string): void;
};

export async function openManagedQuery(options: {
  backend: WorkspaceBackend;
  queryId: string;
  queryLabel?: string;
  createNewTab: () => NewTabLike;
}): Promise<void> {
  const read = await options.backend.readQuery(options.queryId);

  const newTab = options.createNewTab();

  if (options.queryLabel) newTab.setName(options.queryLabel);

  const endpoint = getEndpointToAutoSwitch(options.backend.type, read);
  if (endpoint) newTab.setEndpoint(endpoint);

  newTab.setQuery(read.queryText);
}
