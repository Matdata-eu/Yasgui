import * as chai from "chai";
import { describe, it } from "mocha";

import GitWorkspaceBackend from "../../packages/yasgui/src/queryManagement/backends/GitWorkspaceBackend.js";
import SparqlWorkspaceBackend from "../../packages/yasgui/src/queryManagement/backends/SparqlWorkspaceBackend.js";
import type { GitWorkspaceConfig, SparqlWorkspaceConfig } from "../../packages/yasgui/src/queryManagement/types.js";

const expect = chai.expect;

function makeGitConfig(overrides: Partial<GitWorkspaceConfig> = {}): GitWorkspaceConfig {
  return {
    id: "ws-git",
    label: "Git WS",
    type: "git",
    remoteUrl: "https://github.com/owner/repo.git",
    branch: "main",
    rootPath: "",
    auth: { type: "pat", token: "tok" },
    ...overrides,
  };
}

describe("Query management - getQueryUri", () => {
  describe("GitWorkspaceBackend", () => {
    it("generates a GitHub blob URL", () => {
      const backend = new GitWorkspaceBackend(makeGitConfig());
      const uri = backend.getQueryUri("folder/query.rq");
      expect(uri).to.equal("https://github.com/owner/repo/blob/main/folder/query.rq");
    });

    it("includes rootPath in the file path", () => {
      const backend = new GitWorkspaceBackend(makeGitConfig({ rootPath: "queries" }));
      const uri = backend.getQueryUri("sub/query.rq");
      expect(uri).to.equal("https://github.com/owner/repo/blob/main/queries/sub/query.rq");
    });

    it("generates a GitHub URL for SCP-style remote", () => {
      const backend = new GitWorkspaceBackend(makeGitConfig({ remoteUrl: "git@github.com:owner/repo.git" }));
      const uri = backend.getQueryUri("query.rq");
      expect(uri).to.equal("https://github.com/owner/repo/blob/main/query.rq");
    });

    it("generates a GitLab URL for gitlab.com", () => {
      const backend = new GitWorkspaceBackend(
        makeGitConfig({ remoteUrl: "https://gitlab.com/owner/repo.git", provider: "auto" }),
      );
      const uri = backend.getQueryUri("query.rq");
      expect(uri).to.equal("https://gitlab.com/owner/repo/-/blob/main/query.rq");
    });

    it("generates a Bitbucket URL for bitbucket.org", () => {
      const backend = new GitWorkspaceBackend(
        makeGitConfig({ remoteUrl: "https://bitbucket.org/workspace/repo.git", provider: "auto" }),
      );
      const uri = backend.getQueryUri("query.rq");
      expect(uri).to.equal("https://bitbucket.org/workspace/repo/src/main/query.rq");
    });

    it("generates a Gitea-style URL for unknown hosts", () => {
      const backend = new GitWorkspaceBackend(
        makeGitConfig({ remoteUrl: "https://gitea.example.com/owner/repo.git", provider: "gitea" }),
      );
      const uri = backend.getQueryUri("query.rq");
      expect(uri).to.equal("https://gitea.example.com/owner/repo/src/branch/main/query.rq");
    });

    it("uses explicit provider=github over host detection", () => {
      const backend = new GitWorkspaceBackend(
        makeGitConfig({ remoteUrl: "https://github.example.com/owner/repo.git", provider: "github" }),
      );
      const uri = backend.getQueryUri("q.rq");
      expect(uri).to.equal("https://github.example.com/owner/repo/blob/main/q.rq");
    });

    it("uses explicit provider=gitlab over host detection", () => {
      const backend = new GitWorkspaceBackend(
        makeGitConfig({ remoteUrl: "https://git.example.com/owner/repo.git", provider: "gitlab" }),
      );
      const uri = backend.getQueryUri("q.rq");
      expect(uri).to.equal("https://git.example.com/owner/repo/-/blob/main/q.rq");
    });

    it("falls back to HEAD when branch is not set", () => {
      const backend = new GitWorkspaceBackend(makeGitConfig({ branch: "" }));
      const uri = backend.getQueryUri("query.rq");
      expect(uri).to.equal("https://github.com/owner/repo/blob/HEAD/query.rq");
    });
  });

  describe("SparqlWorkspaceBackend", () => {
    function makeSparqlBackend(): SparqlWorkspaceBackend {
      const config: SparqlWorkspaceConfig = {
        id: "ws-sparql",
        label: "SPARQL WS",
        type: "sparql",
        endpoint: "https://example.com/sparql",
        workspaceIri: "https://example.com/workspace",
      };
      return new SparqlWorkspaceBackend(config);
    }

    it("returns the managed query IRI as the URI", () => {
      const backend = makeSparqlBackend();
      const iri = "https://example.com/workspace_mq_abc123";
      expect(backend.getQueryUri!(iri)).to.equal(iri);
    });

    it("returns undefined for an empty queryId", () => {
      const backend = makeSparqlBackend();
      expect(backend.getQueryUri!("")).to.equal(undefined);
    });
  });
});
