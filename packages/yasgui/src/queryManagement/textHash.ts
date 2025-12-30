export function normalizeQueryText(queryText: string): string {
  return queryText.replace(/\r\n/g, "\n").trim();
}

export function hashQueryText(queryText: string): string {
  const text = normalizeQueryText(queryText);

  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}
