import { Parser } from "@matdata/yasr";
import { ValidationPattern } from "./Tab";

export interface ValidationResult {
  pattern: ValidationPattern;
  found: boolean;
  matchingTriples?: Parser.Binding[];
}

/**
 * Validates CONSTRUCT query results against expected patterns
 * @param bindings The RDF triples from the CONSTRUCT query result
 * @param patterns The expected patterns to validate against
 * @returns Array of validation results showing which patterns were found or missing
 */
export function validateConstructResults(
  bindings: Parser.Binding[] | undefined,
  patterns: ValidationPattern[]
): ValidationResult[] {
  if (!bindings || bindings.length === 0) {
    return patterns.map((pattern) => ({
      pattern,
      found: false,
      matchingTriples: [],
    }));
  }

  return patterns.map((pattern) => {
    const matchingTriples = bindings.filter((binding) => matchesPattern(binding, pattern));
    return {
      pattern,
      found: matchingTriples.length > 0,
      matchingTriples,
    };
  });
}

/**
 * Checks if a triple (binding) matches a validation pattern
 * Supports wildcards (*) and exact matching
 * @param binding A single RDF triple
 * @param pattern The pattern to match against
 * @returns true if the triple matches the pattern
 */
function matchesPattern(binding: Parser.Binding, pattern: ValidationPattern): boolean {
  // Check subject
  if (pattern.subject && pattern.subject !== "*") {
    if (!binding.subject || !valueMatches(binding.subject.value, pattern.subject)) {
      return false;
    }
  }

  // Check predicate
  if (pattern.predicate && pattern.predicate !== "*") {
    if (!binding.predicate || !valueMatches(binding.predicate.value, pattern.predicate)) {
      return false;
    }
  }

  // Check object
  if (pattern.object && pattern.object !== "*") {
    if (!binding.object || !valueMatches(binding.object.value, pattern.object)) {
      return false;
    }
  }

  return true;
}

/**
 * Checks if a value matches a pattern
 * Supports exact matching and prefix matching
 * @param value The actual value from the triple
 * @param pattern The pattern to match (can use wildcards)
 * @returns true if the value matches the pattern
 */
function valueMatches(value: string, pattern: string): boolean {
  // Exact match
  if (value === pattern) {
    return true;
  }

  // Support prefix matching with * at the end
  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return value.startsWith(prefix);
  }

  return false;
}
