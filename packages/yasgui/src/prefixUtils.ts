export function deduplicatePrefixes(prefixText: string): string {
  const lines = prefixText.split("\n");
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Allow an empty prefix label so the default prefix form `PREFIX : <...>` is
    // deduplicated together with named prefixes, while keeping the original
    // word-character restriction for named labels.
    const match = trimmed.match(/^\s*PREFIX\s+(\w*):\s*<([^>]+)>\s*$/i);
    if (match) {
      const label = match[1].toLowerCase();
      if (!seen.has(label)) {
        seen.add(label);
        result.push(trimmed);
      }
    } else {
      result.push(trimmed);
    }
  }

  return result.join("\n");
}
