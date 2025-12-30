import * as chai from "chai";
import { describe, it } from "mocha";

import InMemoryWorkspaceBackend from "../../packages/yasgui/src/queryManagement/backends/InMemoryWorkspaceBackend.js";

const expect = chai.expect;

describe("Query management - backend contract", () => {
  it("lists folders and queries for root", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await backend.writeQuery("root.sparql", "SELECT * WHERE { ?s ?p ?o }", { message: "init" });
    await backend.writeQuery("folderA/q1.sparql", "SELECT 1 WHERE {}", { message: "init" });
    await backend.writeQuery("folderA/sub/q2.sparql", "SELECT 2 WHERE {}", { message: "init" });

    const rootEntries = await backend.listFolder();

    expect(rootEntries.some((e) => e.kind === "folder" && e.id === "folderA")).to.equal(true);
    expect(rootEntries.some((e) => e.kind === "query" && e.id === "root.sparql")).to.equal(true);
  });

  it("reads latest query text and version tag", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await backend.writeQuery("a/q.sparql", "SELECT 1 WHERE {}", { message: "v1" });
    await backend.writeQuery("a/q.sparql", "SELECT 2 WHERE {}", { message: "v2" });

    const read = await backend.readQuery("a/q.sparql");
    expect(read.queryText).to.equal("SELECT 2 WHERE {}");
    expect(read.versionTag).to.equal("v2");
  });

  it("lists versions newest-first and can read historical versions", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await backend.writeQuery("a/q.sparql", "SELECT 1 WHERE {}", { message: "v1" });
    await backend.writeQuery("a/q.sparql", "SELECT 2 WHERE {}", { message: "v2" });

    const versions = await backend.listVersions("a/q.sparql");
    expect(versions.map((v) => v.id)).to.deep.equal(["v2", "v1"]);

    const v1 = await backend.readVersion("a/q.sparql", "v1");
    expect(v1.queryText).to.equal("SELECT 1 WHERE {}");
  });
});
