import * as chai from "chai";
import { describe, it } from "mocha";

import { executeQuery } from "../../packages/yasqe/src/sparql.js";

const expect = chai.expect;

describe("Yasqe background query execution", () => {
  it("does not emit query lifecycle events when run in silent mode", async () => {
    const originalFetch = globalThis.fetch;
    const emittedEvents: string[] = [];

    try {
      globalThis.fetch = async () => {
        return new Response('{"head":{"vars":[]},"results":{"bindings":[]}}', {
          status: 200,
          headers: { "Content-Type": "application/sparql-results+json" },
        });
      };

      const yasqeMock = {
        config: { requestConfig: {} },
        emit: (eventName: string) => {
          emittedEvents.push(eventName);
          return true;
        },
        getQueryMode: () => "query",
        getQueryType: () => "SELECT",
        getValue: () => "SELECT * WHERE { ?s ?p ?o } LIMIT 1",
      } as any;

      await executeQuery(
        yasqeMock,
        {
          endpoint: "https://example.org/sparql",
          method: "POST",
          queryArgument: "query",
          acceptHeaderSelect: "application/sparql-results+json",
        } as any,
        {
          customQuery: "SELECT * WHERE { ?s ?p ?o } LIMIT 1",
          silent: true,
        },
      );

      expect(emittedEvents).to.deep.equal([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps emitting queryResponse for regular executions", async () => {
    const originalFetch = globalThis.fetch;
    const emittedEvents: string[] = [];

    try {
      globalThis.fetch = async () => {
        return new Response('{"head":{"vars":[]},"results":{"bindings":[]}}', {
          status: 200,
          headers: { "Content-Type": "application/sparql-results+json" },
        });
      };

      const yasqeMock = {
        config: { requestConfig: {} },
        emit: (eventName: string) => {
          emittedEvents.push(eventName);
          return true;
        },
        getQueryMode: () => "query",
        getQueryType: () => "SELECT",
        getValue: () => "SELECT * WHERE { ?s ?p ?o } LIMIT 1",
      } as any;

      await executeQuery(yasqeMock, {
        endpoint: "https://example.org/sparql",
        method: "POST",
        queryArgument: "query",
        acceptHeaderSelect: "application/sparql-results+json",
      } as any);

      expect(emittedEvents).to.include("queryResponse");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns a plugin-compatible response shape", async () => {
    const originalFetch = globalThis.fetch;

    try {
      globalThis.fetch = async () => {
        return new Response(
          '{"results":{"bindings":[{"subject":{"value":"s"},"predicate":{"value":"p"},"object":{"value":"o"}}]}}',
          {
            status: 200,
            headers: { "Content-Type": "application/sparql-results+json" },
          },
        );
      };

      const yasqeMock = {
        config: { requestConfig: {} },
        emit: () => true,
        getQueryMode: () => "query",
        getQueryType: () => "SELECT",
        getValue: () => "SELECT * WHERE { ?s ?p ?o } LIMIT 1",
      } as any;

      const response = await executeQuery(
        yasqeMock,
        {
          endpoint: "https://example.org/sparql",
          method: "POST",
          queryArgument: "query",
          acceptHeaderSelect: "application/sparql-results+json",
        } as any,
        {
          customQuery: "SELECT * WHERE { ?s ?p ?o } LIMIT 1",
          silent: true,
        },
      );

      expect(response).to.have.property("content");
      expect(response).to.have.property("data");
      expect(response.content).to.equal(response.data);
      expect(response).to.have.property("json");
      expect(response).to.have.property("text");

      const asJson = await response.json();
      expect(asJson?.results?.bindings).to.be.an("array");
      expect((await response.text()) as string).to.be.a("string");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
