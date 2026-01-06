export function normalizeQueryFilename(rawName: string): string {
  const name = rawName.trim();
  if (!name) throw new Error("Filename is required");

  const lower = name.toLowerCase();
  // Accept both .rq and .sparql extensions for backwards compatibility
  if (lower.endsWith(".rq") || lower.endsWith(".sparql")) return name;
  // Default to .rq for new files
  return `${name}.rq`;
}
