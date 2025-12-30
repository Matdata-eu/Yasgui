export type ParsedGitRemote = {
  host: string;
  /** Repository path without leading slash, without trailing .git */
  repoPath: string;
};

function stripDotGit(path: string): string {
  return path.replace(/\.git$/i, "");
}

function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, "");
}

function stripTrailingSlash(path: string): string {
  return path.replace(/\/+$/, "");
}

function parseHttpLike(remoteUrl: string): ParsedGitRemote {
  const url = new URL(remoteUrl);
  const host = url.hostname.toLowerCase();
  const repoPath = stripDotGit(stripTrailingSlash(stripLeadingSlash(url.pathname)));
  if (!repoPath) throw new Error("Invalid git remote URL (missing path)");
  return { host, repoPath };
}

function parseScpLike(remoteUrl: string): ParsedGitRemote {
  // e.g. git@github.com:owner/repo.git
  const m = /^([^@]+)@([^:]+):(.+)$/.exec(remoteUrl);
  if (!m || !m[2] || !m[3]) throw new Error("Invalid SCP-like git remote URL");
  const host = String(m[2]).toLowerCase();
  const repoPath = stripDotGit(stripTrailingSlash(stripLeadingSlash(String(m[3]))));
  if (!repoPath) throw new Error("Invalid git remote URL (missing path)");
  return { host, repoPath };
}

export function parseGitRemote(remoteUrl: string): ParsedGitRemote {
  const trimmed = remoteUrl.trim();
  if (!trimmed) throw new Error("Remote URL is empty");

  // Handle common git remote formats.
  if (/^(https?|ssh):\/\//i.test(trimmed)) {
    // For ssh:// URLs, URL parsing works and pathname carries the repo path.
    return parseHttpLike(trimmed);
  }

  // SCP-like syntax: git@host:org/repo.git
  if (/^[^@]+@[^:]+:.+/.test(trimmed)) {
    return parseScpLike(trimmed);
  }

  // Fallback: attempt URL parse (may throw)
  return parseHttpLike(trimmed);
}
