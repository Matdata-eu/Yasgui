import * as chai from "chai";
import { describe, it } from "mocha";

import InMemoryWorkspaceBackend from "../../packages/yasgui/src/queryManagement/backends/InMemoryWorkspaceBackend.js";
import { saveManagedQuery } from "../../packages/yasgui/src/queryManagement/saveManagedQuery.js";

const expect = chai.expect;

describe("Query management - save overwrite", () => {
  it("overwrites when saving to the same path (FR-021)", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await saveManagedQuery({
      backend,
      backendType: "git",
      workspaceId: "w1",
      folderPath: "folder",
      filename: "q",
      queryText: "SELECT 1 WHERE {}",
      message: "v1",
    });

    await saveManagedQuery({
      backend,
      backendType: "git",
      workspaceId: "w1",
      folderPath: "folder",
      filename: "q",
      queryText: "SELECT 2 WHERE {}",
      message: "v2",
    });

    const entries = await backend.listFolder("folder");
    expect(entries.filter((e) => e.kind === "query").map((e) => e.id)).to.deep.equal(["folder/q.rq"]);

    const read = await backend.readQuery("folder/q.rq");
    expect(read.queryText).to.equal("SELECT 2 WHERE {}");
  });
});
