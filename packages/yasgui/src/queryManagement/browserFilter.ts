import type { FolderEntry } from "./types";

export function filterFolderEntriesByName(entries: FolderEntry[], query: string): FolderEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  return entries.filter((e) => e.label.toLowerCase().includes(q));
}
