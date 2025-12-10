import { describe, it } from "mocha";
import { expect } from "chai";
import Yasr from "../../../index";
import Parser from "../../../parsers";

describe("Table Plugin", () => {
  describe("Markdown Generation", () => {
    it("should generate markdown table from simple results", () => {
      const container = document.createElement("div");
      const yasr = new Yasr(container);

      // Mock SPARQL results
      const mockResults = {
        head: {
          vars: ["subject", "predicate", "object"],
        },
        results: {
          bindings: [
            {
              subject: { type: "uri", value: "http://example.org/resource/1" } as Parser.BindingValue,
              predicate: { type: "uri", value: "http://example.org/name" } as Parser.BindingValue,
              object: { type: "literal", value: "Test Name" } as Parser.BindingValue,
            },
            {
              subject: { type: "uri", value: "http://example.org/resource/2" } as Parser.BindingValue,
              predicate: { type: "uri", value: "http://example.org/name" } as Parser.BindingValue,
              object: { type: "literal", value: "Another Name" } as Parser.BindingValue,
            },
          ],
        },
      };

      yasr.setResponse(
        {
          response: JSON.stringify(mockResults),
          status: 200,
          contentType: "application/sparql-results+json",
        },
        0,
      );

      const tablePlugin = yasr.plugins["table"];
      // @ts-ignore - accessing private method for testing
      const markdown = tablePlugin.getMarkdownTable();

      expect(markdown).to.be.a("string");
      expect(markdown).to.include("| subject | predicate | object |");
      expect(markdown).to.include("| --- | --- | --- |");
      expect(markdown).to.include("http://example.org/resource/1");
      expect(markdown).to.include("Test Name");
    });

    it("should escape pipe characters in markdown values", () => {
      const container = document.createElement("div");
      const yasr = new Yasr(container);

      // Mock SPARQL results with pipe character
      const mockResults = {
        head: {
          vars: ["value"],
        },
        results: {
          bindings: [
            {
              value: { type: "literal", value: "text|with|pipes" } as Parser.BindingValue,
            },
          ],
        },
      };

      yasr.setResponse(
        {
          response: JSON.stringify(mockResults),
          status: 200,
          contentType: "application/sparql-results+json",
        },
        0,
      );

      const tablePlugin = yasr.plugins["table"];
      // @ts-ignore - accessing private method for testing
      const markdown = tablePlugin.getMarkdownTable();

      expect(markdown).to.include("text\\|with\\|pipes");
    });
  });

  describe("URI Prefixing", () => {
    it("should show URI prefixes when enabled", () => {
      const container = document.createElement("div");
      const yasr = new Yasr(container, {
        prefixes: {
          ex: "http://example.org/",
        },
      });

      const mockResults = {
        head: {
          vars: ["resource"],
        },
        results: {
          bindings: [
            {
              resource: { type: "uri", value: "http://example.org/test" } as Parser.BindingValue,
            },
          ],
        },
      };

      yasr.setResponse(
        {
          response: JSON.stringify(mockResults),
          status: 200,
          contentType: "application/sparql-results+json",
        },
        0,
      );

      const tablePlugin = yasr.plugins["table"];
      // Draw with prefixes enabled (default)
      tablePlugin.draw({ showUriPrefixes: true });

      const tableHtml = container.innerHTML;
      expect(tableHtml).to.include("ex:test");
    });

    it("should show full URIs when prefixing disabled", () => {
      const container = document.createElement("div");
      const yasr = new Yasr(container, {
        prefixes: {
          ex: "http://example.org/",
        },
      });

      const mockResults = {
        head: {
          vars: ["resource"],
        },
        results: {
          bindings: [
            {
              resource: { type: "uri", value: "http://example.org/test" } as Parser.BindingValue,
            },
          ],
        },
      };

      yasr.setResponse(
        {
          response: JSON.stringify(mockResults),
          status: 200,
          contentType: "application/sparql-results+json",
        },
        0,
      );

      const tablePlugin = yasr.plugins["table"];
      // Draw with prefixes disabled
      tablePlugin.draw({ showUriPrefixes: false });

      const tableHtml = container.innerHTML;
      expect(tableHtml).to.include("http://example.org/test");
      expect(tableHtml).to.not.include("ex:test");
    });
  });

  describe("Datatype Display", () => {
    it("should show datatypes when enabled", () => {
      const container = document.createElement("div");
      const yasr = new Yasr(container);

      const mockResults = {
        head: {
          vars: ["number"],
        },
        results: {
          bindings: [
            {
              number: {
                type: "literal",
                value: "42",
                datatype: "http://www.w3.org/2001/XMLSchema#integer",
              } as Parser.BindingValue,
            },
          ],
        },
      };

      yasr.setResponse(
        {
          response: JSON.stringify(mockResults),
          status: 200,
          contentType: "application/sparql-results+json",
        },
        0,
      );

      const tablePlugin = yasr.plugins["table"];
      // Draw with datatypes enabled (default)
      tablePlugin.draw({ showDatatypes: true });

      const tableHtml = container.innerHTML;
      expect(tableHtml).to.include("^^");
      expect(tableHtml).to.include("XMLSchema#integer");
    });

    it("should hide datatypes when disabled", () => {
      const container = document.createElement("div");
      const yasr = new Yasr(container);

      const mockResults = {
        head: {
          vars: ["number"],
        },
        results: {
          bindings: [
            {
              number: {
                type: "literal",
                value: "42",
                datatype: "http://www.w3.org/2001/XMLSchema#integer",
              } as Parser.BindingValue,
            },
          ],
        },
      };

      yasr.setResponse(
        {
          response: JSON.stringify(mockResults),
          status: 200,
          contentType: "application/sparql-results+json",
        },
        0,
      );

      const tablePlugin = yasr.plugins["table"];
      // Draw with datatypes disabled
      tablePlugin.draw({ showDatatypes: false });

      const tableHtml = container.innerHTML;
      expect(tableHtml).to.not.include("^^");
      expect(tableHtml).to.not.include("XMLSchema#integer");
    });
  });
});
