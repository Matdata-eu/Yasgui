import * as chai from "chai";
import { describe, it } from "mocha";

import InMemoryWorkspaceBackend from "../../packages/yasgui/src/queryManagement/backends/InMemoryWorkspaceBackend.js";
import { saveManagedQuery } from "../../packages/yasgui/src/queryManagement/saveManagedQuery.js";

const expect = chai.expect;

describe("Query management - save versioning", () => {
  it("does not create a new version when saving unchanged text (FR-019)", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await saveManagedQuery({
      backend,
      backendType: "git",
      workspaceId: "w1",
      folderPath: "",
      filename: "q.sparql",
      queryText: "SELECT 1 WHERE {}",
      message: "v1",
    });

    await saveManagedQuery({
      backend,
      backendType: "git",
      workspaceId: "w1",
      folderPath: "",
      filename: "q.sparql",
      queryText: "SELECT 1 WHERE {}",
      message: "v2",
    });

    const versions = await backend.listVersions("q.sparql");
    expect(versions.map((v) => v.id)).to.deep.equal(["v1"]);
  });
});
