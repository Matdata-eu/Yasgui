import * as chai from "chai";
import { describe, it } from "mocha";

import { getEndpointToAutoSwitch } from "../../packages/yasgui/src/queryManagement/openManagedQuery.js";

const expect = chai.expect;

describe("Query management - endpoint auto-switch", () => {
  it("switches endpoint only when association exists (FR-020)", () => {
    const endpoint = getEndpointToAutoSwitch("sparql", {
      queryText: "SELECT 1 WHERE {}",
      associatedEndpoint: "http://ex",
    });
    expect(endpoint).to.equal("http://ex");
  });

  it("does not switch endpoint for git backends (FR-022)", () => {
    const endpoint = getEndpointToAutoSwitch("git", {
      queryText: "SELECT 1 WHERE {}",
      associatedEndpoint: "http://ex",
    });
    expect(endpoint).to.equal(undefined);
  });

  it("does not switch endpoint when missing association", () => {
    const endpoint = getEndpointToAutoSwitch("sparql", { queryText: "SELECT 1 WHERE {}" });
    expect(endpoint).to.equal(undefined);
  });
});
