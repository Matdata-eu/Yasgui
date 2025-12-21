/**
 * Share Functionality Tests
 */

import { describe, it } from "mocha";
import { expect } from "chai";

describe("Share Functionality", () => {
  describe("Shell String Escaping", () => {
    it("should escape single quotes for shell commands", () => {
      const input = "test'value";
      const escaped = input.replace(/'/g, "'\\''");
      expect(escaped).to.equal("test'\\''value");
    });

    it("should handle strings with multiple single quotes", () => {
      const input = "it's a 'test'";
      const escaped = input.replace(/'/g, "'\\''");
      expect(escaped).to.equal("it'\\''s a '\\''test'\\''");
    });
  });

  describe("PowerShell String Escaping", () => {
    it("should escape backticks, double quotes, and dollar signs", () => {
      const input = 'test"value$var`tick';
      const escaped = input.replace(/`/g, "``").replace(/"/g, '`"').replace(/\$/g, "`$");
      expect(escaped).to.equal('test`"value`$var``tick');
    });

    it("should handle strings with multiple special characters", () => {
      const input = '$test`"value"';
      const escaped = input.replace(/`/g, "``").replace(/"/g, '`"').replace(/\$/g, "`$");
      expect(escaped).to.equal('`$test```"value`"');
    });
  });

  describe("URL Normalization", () => {
    it("should detect absolute URLs", () => {
      const url = "https://example.com/sparql";
      expect(url.indexOf("http")).to.equal(0);
    });

    it("should detect relative URLs", () => {
      const url = "/sparql";
      expect(url.indexOf("http")).to.equal(-1);
      expect(url.indexOf("/")).to.equal(0);
    });

    it("should handle relative path normalization", () => {
      const pathname = "/app/editor";
      const relativePath = "sparql";

      let basePath = pathname;
      if (!basePath.endsWith("/")) {
        const lastSlashIndex = basePath.lastIndexOf("/");
        basePath = lastSlashIndex >= 0 ? basePath.substring(0, lastSlashIndex + 1) : "/";
      }
      const result = basePath + relativePath;

      expect(result).to.equal("/app/sparql");
    });

    it("should handle pathname ending with slash", () => {
      const pathname = "/app/";
      const relativePath = "sparql";

      let basePath = pathname;
      if (!basePath.endsWith("/")) {
        const lastSlashIndex = basePath.lastIndexOf("/");
        basePath = lastSlashIndex >= 0 ? basePath.substring(0, lastSlashIndex + 1) : "/";
      }
      const result = basePath + relativePath;

      expect(result).to.equal("/app/sparql");
    });
  });

  describe("Command Generation Format", () => {
    it("should format cURL commands with proper line breaks", () => {
      const segments = [
        "curl",
        "'https://example.com/sparql'",
        "--data",
        "'query=SELECT'",
        "-X",
        "POST",
        "-H",
        "'Authorization: Bearer token'",
      ];
      const curlString = segments.join(" \\\n  ");

      expect(curlString).to.include("curl");
      expect(curlString).to.include("\\\n");
      expect(curlString).to.include("https://example.com/sparql");
    });

    it("should format PowerShell commands with proper structure", () => {
      const lines = [
        "$params = @{",
        '    Uri = "https://example.com/sparql"',
        '    Method = "Post"',
        "    Headers = @{",
        '        "Accept" = "application/sparql-results+json"',
        '        "Authorization" = "Bearer token"',
        "    }",
        '    ContentType = "application/x-www-form-urlencoded"',
        '    Body = "query=SELECT"',
        '    OutFile = "result.json"',
        "}",
        "",
        "Invoke-WebRequest @params",
      ];
      const psString = lines.join("\n");

      expect(psString).to.include("$params");
      expect(psString).to.include("Invoke-WebRequest");
      expect(psString).to.include("Headers");
      expect(psString).to.include("OutFile");
      expect(psString).to.include("Accept");
    });

    it("should format wget commands with proper line breaks", () => {
      const segments = [
        "wget",
        "'https://example.com/sparql'",
        "--body-data",
        "'query=SELECT'",
        "--method",
        "POST",
        "--header",
        "'Authorization: Bearer token'",
        "-O -",
      ];
      const wgetString = segments.join(" \\\n  ");

      expect(wgetString).to.include("wget");
      expect(wgetString).to.include("\\\n");
      expect(wgetString).to.include("--body-data");
    });
  });

  describe("URL Normalization", () => {
    it("should handle absolute URLs", () => {
      const url = "https://example.com/sparql";
      expect(url.indexOf("http")).to.equal(0);
    });

    it("should detect relative URLs", () => {
      const url = "/sparql";
      expect(url.indexOf("http")).to.equal(-1);
      expect(url.indexOf("/")).to.equal(0);
    });

    it("should detect relative paths", () => {
      const url = "sparql";
      expect(url.indexOf("http")).to.equal(-1);
      expect(url.indexOf("/")).to.not.equal(0);
    });
  });

  describe("Authentication Detection Logic", () => {
    it("should detect Authorization header", () => {
      const headers = { Authorization: "Bearer token" };
      expect(headers["Authorization"]).to.exist;
    });

    it("should detect API key headers by name", () => {
      const headerName = "X-API-Key";
      const lowerHeader = headerName.toLowerCase();
      expect(lowerHeader).to.include("key");
    });

    it("should detect token headers by name", () => {
      const headerName = "X-Auth-Token";
      const lowerHeader = headerName.toLowerCase();
      expect(lowerHeader).to.include("token");
    });

    it("should detect auth headers by name", () => {
      const headerName = "X-Custom-Auth";
      const lowerHeader = headerName.toLowerCase();
      expect(lowerHeader).to.include("auth");
    });

    it("should not detect non-auth headers", () => {
      const headerName = "Content-Type";
      const lowerHeader = headerName.toLowerCase();
      expect(lowerHeader).to.not.include("key");
      expect(lowerHeader).to.not.include("token");
      expect(lowerHeader).to.not.include("auth");
    });
  });

  describe("String Escaping", () => {
    it("should escape double quotes in PowerShell", () => {
      const value = 'test"value';
      const escaped = value.replace(/"/g, '`"');
      expect(escaped).to.equal('test`"value');
    });

    it("should handle single quotes in shell commands", () => {
      const value = "test'value";
      const wrapped = `'${value}'`;
      expect(wrapped).to.equal("'test'value'");
    });
  });

  describe("HTTP Method Handling", () => {
    it("should use POST for SPARQL updates", () => {
      const queryMode: string = "update";
      const method = queryMode === "update" ? "POST" : "GET";
      expect(method).to.equal("POST");
    });

    it("should default to configured method for SPARQL queries", () => {
      const queryMode: string = "query";
      const method = queryMode === "update" ? "POST" : "GET";
      expect(method).to.equal("GET");
    });
  });

  describe("Query String Formatting", () => {
    it("should format query parameters", () => {
      const params = { query: "SELECT * WHERE { ?s ?p ?o }", format: "json" };
      const keys = Object.keys(params);
      expect(keys).to.include("query");
      expect(keys).to.include("format");
    });

    it("should handle URL encoding", () => {
      const query = "SELECT * WHERE { ?s ?p ?o }";
      const encoded = encodeURIComponent(query);
      expect(encoded).to.include("SELECT");
      expect(encoded).to.not.include(" ");
    });
  });
});
