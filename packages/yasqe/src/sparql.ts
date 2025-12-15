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
function base64EncodeUnicode(str: string): string {
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
  const withCredentials = isFunction(config.withCredentials) ? config.withCredentials(yasqe) : config.withCredentials;

  // Add Authentication headers if configured
  const finalHeaders = { ...headers };
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

  return {
    reqMethod,
    url: endpoint,
    args: getUrlArguments(yasqe, config),
    headers: finalHeaders,
    accept: getAcceptHeader(yasqe, config),
    withCredentials,
  };
  /**
   * merge additional request headers
   */
}

export async function executeQuery(yasqe: Yasqe, config?: YasqeAjaxConfig): Promise<any> {
  const queryStart = Date.now();
  try {
    yasqe.emit("queryBefore", yasqe, config);
    const populatedConfig = getAjaxConfig(yasqe, config);
    if (!populatedConfig) {
      return; // Nothing to query
    }
    const abortController = new AbortController();

    const fetchOptions: RequestInit = {
      method: populatedConfig.reqMethod,
      headers: {
        Accept: populatedConfig.accept,
        ...(populatedConfig.headers || {}),
      },
      credentials: "include",
      signal: abortController.signal,
    };
    if (fetchOptions?.headers && populatedConfig.reqMethod === "POST") {
      (fetchOptions.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
    }
    const searchParams = new URLSearchParams();
    for (const key in populatedConfig.args) {
      const value = populatedConfig.args[key];
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, v));
      } else {
        searchParams.append(key, value);
      }
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
    if (!response.ok) {
      throw new Error((await response.text()) || response.statusText);
    }
    // Await the response content and merge with the `Response` object
    const queryResponse = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      type: response.type,
      content: await response.text(),
    };
    yasqe.emit("queryResponse", queryResponse, Date.now() - queryStart);
    yasqe.emit("queryResults", queryResponse.content, Date.now() - queryStart);
    return queryResponse;
  } catch (e) {
    if (e instanceof Error && e.message === "Aborted") {
      // The query was aborted. We should not do or draw anything
    } else {
      yasqe.emit("queryResponse", e, Date.now() - queryStart);
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
    data[argName] = namedGraphs;
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
export function getAsCurlString(yasqe: Yasqe, _config?: Config["requestConfig"]) {
  let ajaxConfig = getAjaxConfig(yasqe, getRequestConfigSettings(yasqe, _config));
  if (!ajaxConfig) return "";
  let url = ajaxConfig.url;
  if (ajaxConfig.url.indexOf("http") !== 0) {
    //this is either a relative or absolute url, which is not supported by CURL.
    //Add domain, schema, etc etc
    url = `${window.location.protocol}//${window.location.host}`;
    if (ajaxConfig.url.indexOf("/") === 0) {
      //its an absolute path
      url += ajaxConfig.url;
    } else {
      //relative, so append current location to url first
      url += window.location.pathname + ajaxConfig.url;
    }
  }
  const segments: string[] = ["curl"];

  if (ajaxConfig.reqMethod === "GET") {
    url += `?${queryString.stringify(ajaxConfig.args)}`;
    segments.push(url);
  } else if (ajaxConfig.reqMethod === "POST") {
    segments.push(url);
    segments.push("--data", queryString.stringify(ajaxConfig.args));
  } else {
    // I don't expect to get here but let's be sure
    console.warn("Unexpected request-method", ajaxConfig.reqMethod);
    segments.push(url);
  }
  segments.push("-X", ajaxConfig.reqMethod);
  for (const header in ajaxConfig.headers) {
    segments.push(`-H  '${header}: ${ajaxConfig.headers[header]}'`);
  }
  return segments.join(" ");
}
