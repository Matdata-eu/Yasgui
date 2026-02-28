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

  it("moves a query to a different folder and preserves content", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await backend.writeQuery("folderA/q.sparql", "SELECT 1 WHERE {}", { message: "v1" });
    await backend.writeQuery("folderA/q.sparql", "SELECT 2 WHERE {}", { message: "v2" });

    const newId = await backend.moveQuery!("folderA/q.sparql", "folderB");
    expect(newId).to.equal("folderB/q.sparql");

    const read = await backend.readQuery("folderB/q.sparql");
    expect(read.queryText).to.equal("SELECT 2 WHERE {}");

    // Original path no longer exists.
    const rootEntries = await backend.listFolder();
    expect(rootEntries.some((e) => e.id === "folderA")).to.equal(false);
    expect(rootEntries.some((e) => e.id === "folderB")).to.equal(true);

    // Version history should be preserved at the new location.
    const versions = await backend.listVersions("folderB/q.sparql");
    expect(versions.map((v) => v.id)).to.deep.equal(["v2", "v1"]);
    const v1 = await backend.readVersion("folderB/q.sparql", "v1");
    expect(v1.queryText).to.equal("SELECT 1 WHERE {}");
  });

  it("moves a query to root (empty folder)", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await backend.writeQuery("folderA/q.sparql", "SELECT 1 WHERE {}", { message: "v1" });

    const newId = await backend.moveQuery!("folderA/q.sparql", "");
    expect(newId).to.equal("q.sparql");

    const read = await backend.readQuery("q.sparql");
    expect(read.queryText).to.equal("SELECT 1 WHERE {}");

    const rootEntries = await backend.listFolder();
    expect(rootEntries.some((e) => e.kind === "query" && e.id === "q.sparql")).to.equal(true);
  });

  it("moveQuery is a no-op when target folder is the same", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await backend.writeQuery("folderA/q.sparql", "SELECT 1 WHERE {}", { message: "v1" });

    const newId = await backend.moveQuery!("folderA/q.sparql", "folderA");
    expect(newId).to.equal("folderA/q.sparql");

    const read = await backend.readQuery("folderA/q.sparql");
    expect(read.queryText).to.equal("SELECT 1 WHERE {}");
  });
});
