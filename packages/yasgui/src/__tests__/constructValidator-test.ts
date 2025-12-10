import { validateConstructResults } from "../constructValidator.js";
import { ValidationPattern } from "../Tab.js";
import { Parser } from "@matdata/yasr";
import { expect } from "chai";

describe("constructValidator", () => {
  describe("validateConstructResults", () => {
    it("should return all patterns as not found when bindings are empty", () => {
      const patterns: ValidationPattern[] = [
        { subject: "http://example.org/s1", predicate: "http://example.org/p1", object: "http://example.org/o1" },
      ];

      const results = validateConstructResults(undefined, patterns);

      expect(results).to.have.length(1);
      expect(results[0].found).to.be.false;
      expect(results[0].pattern).to.deep.equal(patterns[0]);
    });

    it("should find exact matches", () => {
      const bindings: Parser.Binding[] = [
        {
          subject: { type: "uri", value: "http://example.org/subject1" },
          predicate: { type: "uri", value: "http://example.org/predicate1" },
          object: { type: "uri", value: "http://example.org/object1" },
        },
      ];

      const patterns: ValidationPattern[] = [
        {
          subject: "http://example.org/subject1",
          predicate: "http://example.org/predicate1",
          object: "http://example.org/object1",
        },
      ];

      const results = validateConstructResults(bindings, patterns);

      expect(results).to.have.length(1);
      expect(results[0].found).to.be.true;
      expect(results[0].matchingTriples).to.have.length(1);
    });

    it("should handle wildcard patterns", () => {
      const bindings: Parser.Binding[] = [
        {
          subject: { type: "uri", value: "http://example.org/subject1" },
          predicate: { type: "uri", value: "http://example.org/predicate1" },
          object: { type: "uri", value: "http://example.org/object1" },
        },
        {
          subject: { type: "uri", value: "http://example.org/subject2" },
          predicate: { type: "uri", value: "http://example.org/predicate1" },
          object: { type: "uri", value: "http://example.org/object2" },
        },
      ];

      const patterns: ValidationPattern[] = [
        {
          subject: "*",
          predicate: "http://example.org/predicate1",
          object: "*",
        },
      ];

      const results = validateConstructResults(bindings, patterns);

      expect(results).to.have.length(1);
      expect(results[0].found).to.be.true;
      expect(results[0].matchingTriples).to.have.length(2);
    });

    it("should handle prefix matching with asterisk", () => {
      const bindings: Parser.Binding[] = [
        {
          subject: { type: "uri", value: "http://example.org/subject1" },
          predicate: { type: "uri", value: "http://example.org/type" },
          object: { type: "uri", value: "http://example.org/Person" },
        },
        {
          subject: { type: "uri", value: "http://example.org/subject2" },
          predicate: { type: "uri", value: "http://example.org/type" },
          object: { type: "uri", value: "http://other.org/Thing" },
        },
      ];

      const patterns: ValidationPattern[] = [
        {
          predicate: "http://example.org/type",
          object: "http://example.org/*",
        },
      ];

      const results = validateConstructResults(bindings, patterns);

      expect(results).to.have.length(1);
      expect(results[0].found).to.be.true;
      expect(results[0].matchingTriples).to.have.length(1);
      expect(results[0].matchingTriples![0].object.value).to.equal("http://example.org/Person");
    });

    it("should not match when pattern does not exist", () => {
      const bindings: Parser.Binding[] = [
        {
          subject: { type: "uri", value: "http://example.org/subject1" },
          predicate: { type: "uri", value: "http://example.org/predicate1" },
          object: { type: "uri", value: "http://example.org/object1" },
        },
      ];

      const patterns: ValidationPattern[] = [
        {
          subject: "http://example.org/subject1",
          predicate: "http://example.org/predicate2", // different predicate
          object: "http://example.org/object1",
        },
      ];

      const results = validateConstructResults(bindings, patterns);

      expect(results).to.have.length(1);
      expect(results[0].found).to.be.false;
      expect(results[0].matchingTriples).to.have.length(0);
    });

    it("should handle multiple patterns with mixed results", () => {
      const bindings: Parser.Binding[] = [
        {
          subject: { type: "uri", value: "http://example.org/subject1" },
          predicate: { type: "uri", value: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type" },
          object: { type: "uri", value: "http://example.org/Person" },
        },
      ];

      const patterns: ValidationPattern[] = [
        {
          predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
          object: "http://example.org/Person",
          description: "Type is Person",
        },
        {
          predicate: "http://example.org/hasFriend",
          description: "Has friend relationship",
        },
      ];

      const results = validateConstructResults(bindings, patterns);

      expect(results).to.have.length(2);
      expect(results[0].found).to.be.true;
      expect(results[0].pattern.description).to.equal("Type is Person");
      expect(results[1].found).to.be.false;
      expect(results[1].pattern.description).to.equal("Has friend relationship");
    });

    it("should match partial patterns (only subject specified)", () => {
      const bindings: Parser.Binding[] = [
        {
          subject: { type: "uri", value: "http://example.org/subject1" },
          predicate: { type: "uri", value: "http://example.org/predicate1" },
          object: { type: "uri", value: "http://example.org/object1" },
        },
        {
          subject: { type: "uri", value: "http://example.org/subject1" },
          predicate: { type: "uri", value: "http://example.org/predicate2" },
          object: { type: "uri", value: "http://example.org/object2" },
        },
      ];

      const patterns: ValidationPattern[] = [
        {
          subject: "http://example.org/subject1",
        },
      ];

      const results = validateConstructResults(bindings, patterns);

      expect(results).to.have.length(1);
      expect(results[0].found).to.be.true;
      expect(results[0].matchingTriples).to.have.length(2);
    });
  });
});
