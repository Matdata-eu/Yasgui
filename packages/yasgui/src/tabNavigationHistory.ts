export const moveTabIdToFront = (tabIds: string[], tabId: string): string[] => {
  const idsWithoutTab = tabIds.filter((id) => id !== tabId);
  return [tabId, ...idsWithoutTab];
};

export const removeTabId = (tabIds: string[], tabId: string): string[] => tabIds.filter((id) => id !== tabId);

export const getRecentlyUsedTabId = (
  tabIds: string[],
  activeTabId: string,
  direction: "backward" | "forward" = "backward",
): string | undefined => {
  const recentlyUsedIds = moveTabIdToFront(tabIds, activeTabId);
  const candidateTabIds = recentlyUsedIds.filter((id) => id !== activeTabId);
  if (!candidateTabIds.length) return undefined;
  return direction === "backward" ? candidateTabIds[0] : candidateTabIds[candidateTabIds.length - 1];
};
