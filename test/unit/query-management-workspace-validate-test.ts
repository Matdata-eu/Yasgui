import * as chai from "chai";
import { describe, it } from "mocha";

import { validateWorkspaceConfig } from "../../packages/yasgui/src/queryManagement/validateWorkspaceConfig.js";

const expect = chai.expect;

describe("Query management - workspace validation", () => {
  it("requires git workspace fields", () => {
    const res = validateWorkspaceConfig({
      id: "w1",
      label: "My Git",
      type: "git",
      remoteUrl: "",
      branch: "",
      rootPath: "",
      auth: { type: "pat", token: "t" },
    });

    expect(res.valid).to.equal(false);
    expect(res.errors.some((e) => e.toLowerCase().includes("remote"))).to.equal(true);
  });

  it("requires sparql workspace fields", () => {
    const res = validateWorkspaceConfig({
      id: "w2",
      label: "My SPARQL",
      type: "sparql",
      endpoint: "",
      workspaceIri: "",
    });

    expect(res.valid).to.equal(false);
    expect(res.errors.some((e) => e.toLowerCase().includes("endpoint"))).to.equal(true);
    expect(res.errors.some((e) => e.toLowerCase().includes("iri"))).to.equal(true);
  });
});
