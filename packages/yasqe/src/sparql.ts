import { default as Yasqe, Config, RequestConfig } from "./";
import { merge, isFunction } from "lodash-es";
import * as queryString from "query-string";
export type YasqeAjaxConfig = Config["requestConfig"];
export interface PopulatedAjaxConfig {
  url: string;
  reqMethod: "POST" | "GET";
  headers: { [key: string]: string };
  accept: string;
  args: RequestArgs;
  withCredentials: boolean;
}
function getRequestConfigSettings(yasqe: Yasqe, conf?: Partial<Config["requestConfig"]>): RequestConfig<Yasqe> {
  if (isFunction(conf)) {
    return conf(yasqe) as RequestConfig<Yasqe>;
  }
  return (conf ?? {}) as RequestConfig<Yasqe>;
}

/**
 * Create a Basic Authentication header value
 */
function createBasicAuthHeader(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  const encoded = base64EncodeUnicode(credentials);
  return `Basic ${encoded}`;
}

/**
 * Base64-encode a Unicode string using UTF-8 encoding.
 * This avoids errors with btoa() and supports all Unicode characters.
 */
export function base64EncodeUnicode(str: string): string {
  if (typeof window !== "undefined" && typeof window.TextEncoder !== "undefined") {
    const utf8Bytes = new window.TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary);
  } else if (typeof TextEncoder !== "undefined") {
    // For environments where TextEncoder is global (e.g., Node.js)
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    return btoa(binary);
  } else {
    // Fallback: try btoa directly, but warn about possible errors
    try {
      return btoa(str);
    } catch (e) {
      throw new Error(
        "Basic authentication credentials contain unsupported Unicode characters. Please use a modern browser or restrict credentials to Latin1 characters.",
      );
    }
  }
}
// type callback = AjaxConfig.callbacks['complete'];
export function getAjaxConfig(
  yasqe: Yasqe,
  _config: Partial<Config["requestConfig"]> = {},
): PopulatedAjaxConfig | undefined {
  const config: RequestConfig<Yasqe> = merge(
    {},
    getRequestConfigSettings(yasqe, yasqe.config.requestConfig),
    getRequestConfigSettings(yasqe, _config),
  );
  if (!config.endpoint || config.endpoint.length == 0) return; // nothing to query!

  var queryMode = yasqe.getQueryMode();
  /**
   * initialize ajax config
   */
  const endpoint = isFunction(config.endpoint) ? config.endpoint(yasqe) : config.endpoint;
  var reqMethod: "GET" | "POST" =
    queryMode == "update" ? "POST" : isFunction(config.method) ? config.method(yasqe) : config.method;
  const headers = isFunction(config.headers) ? config.headers(yasqe) : config.headers;
  // console.log({headers})
  let withCredentials = isFunction(config.withCredentials) ? config.withCredentials(yasqe) : config.withCredentials;

  // Add Authentication headers if configured
  const finalHeaders = { ...headers };
  let hasAuthConfigured = false;

  try {
    // Check for OAuth 2.0 authentication (highest priority for access tokens)
    const oauth2Auth = isFunction(config.oauth2Auth) ? config.oauth2Auth(yasqe) : config.oauth2Auth;
    // Prefer ID token over access token for authentication:
    // - OAuth2 Proxy and similar gateways expect ID tokens (issued by OIDC providers like Azure AD)
    // - ID tokens contain identity/authentication info and match the expected issuer
    // - Access tokens are for API authorization and may have different issuers
    // - Azure AD issues both: id_token (from sts.windows.net or login.microsoftonline.com) for auth,
    //   and access_token for API access
    const oauth2Token = oauth2Auth?.idToken || oauth2Auth?.accessToken;
    const trimmedOAuth2Token = oauth2Token ? oauth2Token.trim() : "";
    if (oauth2Auth && trimmedOAuth2Token.length > 0) {
      hasAuthConfigured = true;
      if (finalHeaders["Authorization"] !== undefined) {
        console.warn(
          "Authorization header already exists in request headers; skipping OAuth 2.0 Auth header to avoid overwrite.",
        );
      } else {
        finalHeaders["Authorization"] = `Bearer ${trimmedOAuth2Token}`;
      }
    }

    // Check for Bearer Token authentication
    const bearerAuth = isFunction(config.bearerAuth) ? config.bearerAuth(yasqe) : config.bearerAuth;
    const trimmedBearerToken = bearerAuth && bearerAuth.token ? bearerAuth.token.trim() : "";
    if (bearerAuth && trimmedBearerToken.length > 0) {
      hasAuthConfigured = true;
      if (finalHeaders["Authorization"] !== undefined) {
        console.warn(
          "Authorization header already exists in request headers; skipping Bearer Auth header to avoid overwrite.",
        );
      } else {
        finalHeaders["Authorization"] = `Bearer ${trimmedBearerToken}`;
      }
    }

    // Check for API Key authentication
    const apiKeyAuth = isFunction(config.apiKeyAuth) ? config.apiKeyAuth(yasqe) : config.apiKeyAuth;
    const trimmedHeaderName = apiKeyAuth && apiKeyAuth.headerName ? apiKeyAuth.headerName.trim() : "";
    const trimmedApiKey = apiKeyAuth && apiKeyAuth.apiKey ? apiKeyAuth.apiKey.trim() : "";
    if (apiKeyAuth && trimmedHeaderName.length > 0 && trimmedApiKey.length > 0) {
      hasAuthConfigured = true;
      if (finalHeaders[trimmedHeaderName] !== undefined) {
        console.warn(
          `Header "${trimmedHeaderName}" already exists in request headers; skipping API Key header to avoid overwrite.`,
        );
      } else {
        finalHeaders[trimmedHeaderName] = trimmedApiKey;
      }
    }

    // Check for Basic Authentication (lowest priority)
    const basicAuth = isFunction(config.basicAuth) ? config.basicAuth(yasqe) : config.basicAuth;
    if (basicAuth && basicAuth.username && basicAuth.password) {
      hasAuthConfigured = true;
      if (finalHeaders["Authorization"] !== undefined) {
        console.warn(
          "Authorization header already exists in request headers; skipping Basic Auth header to avoid overwrite.",
        );
      } else {
        finalHeaders["Authorization"] = createBasicAuthHeader(basicAuth.username, basicAuth.password);
      }
    }
  } catch (error) {
    console.warn("Failed to configure authentication:", error);
    // Continue without authentication if there's an error
  }

  // If authentication is configured and withCredentials wasn't explicitly set, enable it
  // This ensures credentials are sent with cross-origin requests when auth is needed
  if (hasAuthConfigured) {
    withCredentials = true;
  }

  return {
    reqMethod,
    url: endpoint,
    args: getUrlArguments(yasqe, config),
    headers: finalHeaders,
    accept: getAcceptHeader(yasqe, config),
    withCredentials: withCredentials ?? false,
  };
  /**
   * merge additional request headers
   */
}

export interface ExecuteQueryOptions {
  customQuery?: string;
  customAccept?: string;
}

export async function executeQuery(
  yasqe: Yasqe,
  config?: YasqeAjaxConfig,
  options?: ExecuteQueryOptions,
): Promise<any> {
  const queryStart = Date.now();
  try {
    yasqe.emit("queryBefore", yasqe, config);
    const populatedConfig = getAjaxConfig(yasqe, config);
    if (!populatedConfig) {
      return; // Nothing to query
    }
    const abortController = new AbortController();

    // Use custom accept header if provided, otherwise use the default
    const acceptHeader = options?.customAccept || populatedConfig.accept;

    const fetchOptions: RequestInit = {
      method: populatedConfig.reqMethod,
      headers: {
        Accept: acceptHeader,
        ...(populatedConfig.headers || {}),
      },
      credentials: populatedConfig.withCredentials ? "include" : "same-origin",
      signal: abortController.signal,
      mode: "cors",
    };
    if (fetchOptions?.headers && populatedConfig.reqMethod === "POST") {
      (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
    }
    const searchParams = new URLSearchParams();

    // Helper function to append args to search params
    const appendArgsToParams = (args: RequestArgs, excludeKeys: string[] = []) => {
      for (const key in args) {
        if (!excludeKeys.includes(key)) {
          const value = args[key];
          if (Array.isArray(value)) {
            value.forEach((v) => searchParams.append(key, v));
          } else {
            searchParams.append(key, value);
          }
        }
      }
    };

    // Helper function to determine the query parameter name
    // SPARQL queries use 'query' parameter, updates use 'update' parameter
    const getQueryParameterName = (args: RequestArgs): string => {
      if (args.query !== undefined) {
        return "query";
      } else if (args.update !== undefined) {
        return "update";
      }
      // Default to 'query' for standard SPARQL SELECT/CONSTRUCT/DESCRIBE/ASK queries
      return "query";
    };

    // Use custom query if provided, otherwise use the args from config
    if (options?.customQuery) {
      const queryArg = getQueryParameterName(populatedConfig.args);
      searchParams.append(queryArg, options.customQuery);

      // Add other args except the query/update parameter
      appendArgsToParams(populatedConfig.args, ["query", "update"]);
    } else {
      // Add all args from config
      appendArgsToParams(populatedConfig.args);
    }

    if (populatedConfig.reqMethod === "POST") {
      fetchOptions.body = searchParams.toString();
    } else {
      const url = new URL(populatedConfig.url);
      searchParams.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
      populatedConfig.url = url.toString();
    }
    const request = new Request(populatedConfig.url, fetchOptions);
    yasqe.emit("query", request, abortController);
    const response = await fetch(request);

    // Await the response content and merge with the `Response` object
    const queryResponse = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      type: response.type,
      content: await response.text(),
    };

    if (!response.ok) {
      // For HTTP errors (4xx, 5xx), create an error but include full response details
      const error: any = new Error(queryResponse.content || response.statusText);
      error.status = response.status;
      error.statusText = response.statusText;
      error.response = queryResponse;
      throw error;
    }

    yasqe.emit("queryResponse", queryResponse, Date.now() - queryStart);
    yasqe.emit("queryResults", queryResponse.content, Date.now() - queryStart);
    return queryResponse;
  } catch (e) {
    if (e instanceof Error && e.message === "Aborted") {
      // The query was aborted. We should not do or draw anything
    } else {
      // Check if this is a network/CORS error from fetch (not an error we threw with status info)
      if (e instanceof Error && !("status" in e)) {
        // Enhance the error with additional context for common fetch failures
        const enhancedError: any = e;
        if (e.message.includes("Failed to fetch") || e.message.includes("NetworkError")) {
          enhancedError.message = `${e.message}. The server may have returned an error response (check browser dev tools), but CORS headers are preventing JavaScript from accessing it. Ensure the endpoint returns proper CORS headers even for error responses (Access-Control-Allow-Origin, etc.).`;
        }
        yasqe.emit("queryResponse", enhancedError, Date.now() - queryStart);
      } else {
        yasqe.emit("queryResponse", e, Date.now() - queryStart);
      }
    }
    yasqe.emit("error", e);
    throw e;
  }
}

export type RequestArgs = { [argName: string]: string | string[] };
export function getUrlArguments(yasqe: Yasqe, _config: Config["requestConfig"]): RequestArgs {
  var queryMode = yasqe.getQueryMode();

  var data: RequestArgs = {};
  const config: RequestConfig<Yasqe> = getRequestConfigSettings(yasqe, _config);
  var queryArg = isFunction(config.queryArgument) ? config.queryArgument(yasqe) : config.queryArgument;
  if (!queryArg) queryArg = yasqe.getQueryMode();
  data[queryArg] = config.adjustQueryBeforeRequest ? config.adjustQueryBeforeRequest(yasqe) : yasqe.getValue();
  /**
   * add named graphs to ajax config
   */
  const namedGraphs = isFunction(config.namedGraphs) ? config.namedGraphs(yasqe) : config.namedGraphs;
  if (namedGraphs && namedGraphs.length > 0) {
    let argName = queryMode === "query" ? "named-graph-uri" : "using-named-graph-uri ";
    data[argName] = namedGraphs;
  }
  /**
   * add default graphs to ajax config
   */
  const defaultGraphs = isFunction(config.defaultGraphs) ? config.defaultGraphs(yasqe) : config.defaultGraphs;
  if (defaultGraphs && defaultGraphs.length > 0) {
    let argName = queryMode == "query" ? "default-graph-uri" : "using-graph-uri ";
    data[argName] = defaultGraphs;
  }

  /**
   * add additional request args
   */
  const args = isFunction(config.args) ? config.args(yasqe) : config.args;
  if (args && args.length > 0)
    merge(
      data,
      args.reduce((argsObject: { [key: string]: string[] }, arg) => {
        argsObject[arg.name] ? argsObject[arg.name].push(arg.value) : (argsObject[arg.name] = [arg.value]);
        return argsObject;
      }, {}),
    );

  return data;
}
export function getAcceptHeader(yasqe: Yasqe, _config: Config["requestConfig"]) {
  const config: RequestConfig<Yasqe> = getRequestConfigSettings(yasqe, _config);
  var acceptHeader = null;
  if (yasqe.getQueryMode() == "update") {
    acceptHeader = isFunction(config.acceptHeaderUpdate) ? config.acceptHeaderUpdate(yasqe) : config.acceptHeaderUpdate;
  } else {
    var qType = yasqe.getQueryType();
    if (qType == "DESCRIBE" || qType == "CONSTRUCT") {
      acceptHeader = isFunction(config.acceptHeaderGraph) ? config.acceptHeaderGraph(yasqe) : config.acceptHeaderGraph;
    } else {
      acceptHeader = isFunction(config.acceptHeaderSelect)
        ? config.acceptHeaderSelect(yasqe)
        : config.acceptHeaderSelect;
    }
  }
  return acceptHeader;
}
/**
 * Helper to normalize URL for command-line tools
 */
function normalizeUrl(url: string): string {
  if (url.indexOf("http") !== 0) {
    // Relative or absolute URL - add domain, schema, etc
    let fullUrl = `${window.location.protocol}//${window.location.host}`;
    if (url.indexOf("/") === 0) {
      // Absolute path
      fullUrl += url;
    } else {
      // Relative path
      fullUrl += window.location.pathname + url;
    }
    return fullUrl;
  }
  return url;
}

/**
 * Check if ajax config contains authentication credentials
 */
export function hasAuthenticationCredentials(ajaxConfig: PopulatedAjaxConfig): boolean {
  if (!ajaxConfig) return false;

  // Check for Authorization header (Bearer, Basic, OAuth2)
  if (ajaxConfig.headers && ajaxConfig.headers["Authorization"]) {
    return true;
  }

  // Check for API Key headers - use more specific patterns to avoid false positives
  if (ajaxConfig.headers) {
    for (const headerName in ajaxConfig.headers) {
      const lowerHeader = headerName.toLowerCase();
      // Match common authentication header patterns
      if (
        lowerHeader === "authorization" ||
        lowerHeader.startsWith("x-api-key") ||
        lowerHeader.startsWith("x-auth-") ||
        lowerHeader === "apikey" ||
        lowerHeader === "api-key" ||
        (lowerHeader.includes("token") && (lowerHeader.startsWith("x-") || lowerHeader.includes("auth")))
      ) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Generate cURL command string
 */
export function getAsCurlString(yasqe: Yasqe, _config?: Config["requestConfig"]) {
  let ajaxConfig = getAjaxConfig(yasqe, getRequestConfigSettings(yasqe, _config));
  if (!ajaxConfig) return "";

  let url = normalizeUrl(ajaxConfig.url);
  const segments: string[] = ["curl"];

  if (ajaxConfig.reqMethod === "GET") {
    url += `?${queryString.stringify(ajaxConfig.args)}`;
    segments.push(`'${url}'`);
  } else if (ajaxConfig.reqMethod === "POST") {
    segments.push(`'${url}'`);
    const data = queryString.stringify(ajaxConfig.args);
    segments.push("--data", `'${data}'`);
  } else {
    console.warn("Unexpected request-method", ajaxConfig.reqMethod);
    segments.push(`'${url}'`);
  }

  segments.push("-X", ajaxConfig.reqMethod);

  for (const header in ajaxConfig.headers) {
    segments.push("-H", `'${header}: ${ajaxConfig.headers[header]}'`);
  }

  return segments.join(" \\\n  ");
}

/**
 * Generate PowerShell command string
 */
export function getAsPowerShellString(yasqe: Yasqe, _config?: Config["requestConfig"]): string {
  let ajaxConfig = getAjaxConfig(yasqe, getRequestConfigSettings(yasqe, _config));
  if (!ajaxConfig) return "";

  let url = normalizeUrl(ajaxConfig.url);
  const lines: string[] = [];

  // Build headers object
  const headersLines: string[] = [];
  for (const header in ajaxConfig.headers) {
    headersLines.push(`    "${header}" = "${ajaxConfig.headers[header].replace(/"/g, '`"')}"`);
  }

  if (ajaxConfig.reqMethod === "GET") {
    url += `?${queryString.stringify(ajaxConfig.args)}`;
    lines.push("$params = @{");
    lines.push(`    Uri = "${url}"`);
    lines.push(`    Method = "Get"`);
    if (headersLines.length > 0) {
      lines.push("    Headers = @{");
      lines.push(headersLines.join("\n"));
      lines.push("    }");
    }
    lines.push("}");
  } else if (ajaxConfig.reqMethod === "POST") {
    const body = queryString.stringify(ajaxConfig.args);
    lines.push("$params = @{");
    lines.push(`    Uri = "${url}"`);
    lines.push(`    Method = "Post"`);
    if (headersLines.length > 0) {
      lines.push("    Headers = @{");
      lines.push(headersLines.join("\n"));
      lines.push("    }");
    }
    lines.push(`    ContentType = "application/x-www-form-urlencoded"`);
    lines.push(`    Body = "${body.replace(/"/g, '`"')}"`);
    lines.push("}");
  } else {
    // Handle other methods (PUT, DELETE, etc.)
    console.warn("Unexpected request-method for PowerShell", ajaxConfig.reqMethod);
    const body = queryString.stringify(ajaxConfig.args);
    lines.push("$params = @{");
    lines.push(`    Uri = "${url}"`);
    lines.push(`    Method = "${ajaxConfig.reqMethod}"`);
    if (headersLines.length > 0) {
      lines.push("    Headers = @{");
      lines.push(headersLines.join("\n"));
      lines.push("    }");
    }
    if (body) {
      lines.push(`    ContentType = "application/x-www-form-urlencoded"`);
      lines.push(`    Body = "${body.replace(/"/g, '`"')}"`);
    }
    lines.push("}");
  }

  lines.push("");
  lines.push("Invoke-WebRequest @params");

  return lines.join("\n");
}

/**
 * Generate wget command string
 */
export function getAsWgetString(yasqe: Yasqe, _config?: Config["requestConfig"]): string {
  let ajaxConfig = getAjaxConfig(yasqe, getRequestConfigSettings(yasqe, _config));
  if (!ajaxConfig) return "";

  let url = normalizeUrl(ajaxConfig.url);
  const segments: string[] = ["wget"];

  if (ajaxConfig.reqMethod === "GET") {
    url += `?${queryString.stringify(ajaxConfig.args)}`;
    segments.push(`'${url}'`);
  } else if (ajaxConfig.reqMethod === "POST") {
    segments.push(`'${url}'`);
    const data = queryString.stringify(ajaxConfig.args);
    segments.push("--post-data", `'${data}'`);
  } else {
    // Handle other methods
    console.warn("Unexpected request-method for wget", ajaxConfig.reqMethod);
    segments.push(`'${url}'`);
    const data = queryString.stringify(ajaxConfig.args);
    if (data) {
      segments.push("--body-data", `'${data}'`);
    }
  }

  segments.push("--method", ajaxConfig.reqMethod);

  for (const header in ajaxConfig.headers) {
    segments.push("--header", `'${header}: ${ajaxConfig.headers[header]}'`);
  }

  segments.push("-O -");

  return segments.join(" \\\n  ");
}
