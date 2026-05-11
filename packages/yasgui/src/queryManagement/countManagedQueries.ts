import type { WorkspaceBackend } from "./backends/WorkspaceBackend";

export async function countManagedQueries(backend: Pick<WorkspaceBackend, "listFolder">): Promise<number> {
  const queryIds = new Set<string>();
  const visitedFolderIds = new Set<string>();
  const folderQueue: (string | undefined)[] = [undefined];

  while (folderQueue.length > 0) {
    const folderId = folderQueue.shift();
    const folderKey = folderId ?? "__root__";
    if (visitedFolderIds.has(folderKey)) continue;
    visitedFolderIds.add(folderKey);

    const entries = await backend.listFolder(folderId);
    for (const entry of entries) {
      if (entry.kind === "query") {
        queryIds.add(entry.id);
        continue;
      }

      if (!visitedFolderIds.has(entry.id)) {
        folderQueue.push(entry.id);
      }
    }
  }

  return queryIds.size;
}
