import * as chai from "chai";
import { describe, it } from "mocha";

import InMemoryWorkspaceBackend from "../../packages/yasgui/src/queryManagement/backends/InMemoryWorkspaceBackend.js";
import { countManagedQueries } from "../../packages/yasgui/src/queryManagement/countManagedQueries.js";

const expect = chai.expect;

describe("Query management - workspace query count", () => {
  it("counts managed queries across nested folders", async () => {
    const backend = new InMemoryWorkspaceBackend();

    await backend.writeQuery("root.sparql", "SELECT * WHERE { ?s ?p ?o }", { message: "init" });
    await backend.writeQuery("folderA/q1.sparql", "SELECT 1 WHERE {}", { message: "init" });
    await backend.writeQuery("folderA/sub/q2.sparql", "SELECT 2 WHERE {}", { message: "init" });

    const count = await countManagedQueries(backend);
    expect(count).to.equal(3);
  });
});
