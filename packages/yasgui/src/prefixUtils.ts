export function deduplicatePrefixes(prefixText: string): string {
  const lines = prefixText.split("\n");
  const seen = new Map<string, string>();
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Allow an empty prefix label so the default prefix form `PREFIX : <...>` is
    // deduplicated together with named prefixes.
    const match = trimmed.match(/^\s*PREFIX\s+([^:\s]*):\s*<(.+)>\s*$/i);
    if (match) {
      const label = match[1].toLowerCase();
      const deduplicationKey = label || ":";
      if (!seen.has(deduplicationKey)) {
        seen.set(deduplicationKey, trimmed);
        result.push(trimmed);
      }
    } else {
      result.push(trimmed);
    }
  }

  return result.join("\n");
}
