/**
 * Converts a relative or absolute URL to a fully qualified URL with protocol and host.
 * Uses the current page's protocol and host for relative URLs.
 *
 * @param url - The URL to resolve (can be relative like "/sparql", or absolute like "http://example.com/sparql")
 * @returns The fully qualified URL with protocol and host
 *
 * @example
 * // On page https://example.com/yasgui/
 * resolveEndpointUrl("/sparql") // returns "https://example.com/sparql"
 * resolveEndpointUrl("sparql") // returns "https://example.com/yasgui/sparql"
 * resolveEndpointUrl("http://other.com/sparql") // returns "http://other.com/sparql"
 */
export function resolveEndpointUrl(url: string): string {
  if (!url) return url;

  // If URL already has a protocol (http: or https:), return as-is
  if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
    return url;
  }

  // Build the base URL using current page's protocol and host
  let fullUrl = `${window.location.protocol}//${window.location.host}`;

  if (url.indexOf("/") === 0) {
    // Absolute path (starts with /)
    fullUrl += url;
  } else {
    // Relative path - join with current page's directory
    let basePath = window.location.pathname;
    // If pathname does not end with "/", treat it as a file and use its directory
    if (!basePath.endsWith("/")) {
      const lastSlashIndex = basePath.lastIndexOf("/");
      basePath = lastSlashIndex >= 0 ? basePath.substring(0, lastSlashIndex + 1) : "/";
    }
    fullUrl += basePath + url;
  }

  return fullUrl;
}
