export function normalizeQueryFilename(rawName: string): string {
  const name = rawName.trim();
  if (!name) throw new Error("Filename is required");

  const lower = name.toLowerCase();
  if (lower.endsWith(".sparql")) return name;
  return `${name}.sparql`;
}
