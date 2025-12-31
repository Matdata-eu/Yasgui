import * as chai from "chai";
import { describe, it } from "mocha";

import { filterFolderEntriesByName } from "../../packages/yasgui/src/queryManagement/browserFilter.js";

const expect = chai.expect;

describe("Query management - browser filter", () => {
  it("filters by name case-insensitively", () => {
    const entries = [
      { kind: "query" as const, id: "a", label: "MyQuery" },
      { kind: "query" as const, id: "b", label: "Other" },
    ];

    const filtered = filterFolderEntriesByName(entries, "myq");
    expect(filtered.map((e) => e.id)).to.deep.equal(["a"]);
  });

  it("returns all entries when query is empty", () => {
    const entries = [
      { kind: "query" as const, id: "a", label: "MyQuery" },
      { kind: "query" as const, id: "b", label: "Other" },
    ];

    const filtered = filterFolderEntriesByName(entries, "  ");
    expect(filtered.length).to.equal(2);
  });
});
