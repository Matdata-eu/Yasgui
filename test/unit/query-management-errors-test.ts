import * as chai from "chai";
import { describe, it } from "mocha";

import {
  WorkspaceBackendError,
  asWorkspaceBackendError,
  isWorkspaceBackendError,
} from "../../packages/yasgui/src/queryManagement/backends/errors.js";

const expect = chai.expect;

describe("Query management - backend errors", () => {
  it("detects WorkspaceBackendError instances", () => {
    const err = new WorkspaceBackendError("CONFLICT", "Version mismatch");
    expect(isWorkspaceBackendError(err)).to.equal(true);
    expect(err.code).to.equal("CONFLICT");
  });

  it("wraps unknown errors into WorkspaceBackendError", () => {
    const wrapped = asWorkspaceBackendError("boom");
    expect(isWorkspaceBackendError(wrapped)).to.equal(true);
    expect(wrapped.code).to.equal("UNKNOWN");
    expect(wrapped.message).to.equal("boom");
  });
});
