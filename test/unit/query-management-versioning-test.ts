import * as chai from "chai";
import { describe, it } from "mocha";

import InMemoryWorkspaceBackend from "../../packages/yasgui/src/queryManagement/backends/InMemoryWorkspaceBackend.js";
import { hashQueryText } from "../../packages/yasgui/src/queryManagement/textHash.js";

const expect = chai.expect;

describe("Query management - versioning rules", () => {
  it("creates a new version only when query text changes (FR-019)", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await backend.writeQuery("q.sparql", "SELECT 1 WHERE {}\n", { message: "v1" });
    await backend.writeQuery("q.sparql", "SELECT 1 WHERE {}\r\n", { message: "should-noop" });

    const versions = await backend.listVersions("q.sparql");
    expect(versions.length).to.equal(1);
    expect(versions[0].id).to.equal("v1");
  });

  it("hashQueryText is stable across CRLF/LF and trailing whitespace", () => {
    const h1 = hashQueryText("SELECT * WHERE {}\n");
    const h2 = hashQueryText("SELECT * WHERE {}\r\n   ");
    expect(h1).to.equal(h2);
  });
});
