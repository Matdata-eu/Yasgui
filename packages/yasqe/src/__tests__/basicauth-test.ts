/**
 * Basic Authentication Tests
 */

import { describe, it } from "mocha";
import { expect } from "chai";

describe("Basic Authentication", () => {
  describe("Base64 Encoding", () => {
    it("should encode credentials correctly", () => {
      const username = "testuser";
      const password = "testpass";
      const credentials = `${username}:${password}`;
      const encoded = btoa(credentials);
      const expected = "dGVzdHVzZXI6dGVzdHBhc3M=";

      expect(encoded).to.equal(expected);
    });

    it("should handle special characters", () => {
      const username = "user@example.com";
      const password = "p@ss:word!";
      const credentials = `${username}:${password}`;
      const encoded = btoa(credentials);

      // Verify it can be decoded back
      const decoded = atob(encoded);
      expect(decoded).to.equal(credentials);
    });
  });

  describe("Authorization Header Format", () => {
    it("should create proper Basic auth header", () => {
      const username = "admin";
      const password = "secret";
      const credentials = `${username}:${password}`;
      const encoded = btoa(credentials);
      const header = `Basic ${encoded}`;

      expect(header).to.equal("Basic YWRtaW46c2VjcmV0");
      expect(header).to.match(/^Basic [A-Za-z0-9+/=]+$/);
    });
  });

  describe("Empty Credentials", () => {
    it("should handle empty username", () => {
      const username = "";
      const password = "password";
      const credentials = `${username}:${password}`;
      const encoded = btoa(credentials);

      expect(encoded).to.be.a("string");
      expect(encoded.length).to.be.greaterThan(0);
    });

    it("should handle empty password", () => {
      const username = "user";
      const password = "";
      const credentials = `${username}:${password}`;
      const encoded = btoa(credentials);

      expect(encoded).to.be.a("string");
      expect(encoded.length).to.be.greaterThan(0);
    });
  });
});
