import { Prefixes } from "./types";
import * as N3 from "n3";

/**
 * Shorten an IRI using available prefixes
 */
export function shortenIri(iri: string, prefixes: Prefixes): string {
  for (const prefix in prefixes) {
    const namespace = prefixes[prefix];
    if (iri.startsWith(namespace)) {
      return iri.replace(namespace, `${prefix}:`);
    }
  }

  // If no prefix match, try to extract a readable part
  const lastSlash = iri.lastIndexOf("/");
  const lastHash = iri.lastIndexOf("#");
  const separator = Math.max(lastSlash, lastHash);

  if (separator > 0 && separator < iri.length - 1) {
    return iri.substring(separator + 1);
  }

  return iri;
}

/**
 * Check if a term is a literal
 */
export function isLiteral(term: N3.Term): boolean {
  return term.termType === "Literal";
}

/**
 * Check if a term is a URI
 */
export function isUri(term: N3.Term): boolean {
  return term.termType === "NamedNode";
}

/**
 * Check if a term is a blank node
 */
export function isBlankNode(term: N3.Term): boolean {
  return term.termType === "BlankNode";
}

/**
 * Get a readable label for a term
 */
export function getTermLabel(term: N3.Term, prefixes: Prefixes): string {
  if (isLiteral(term)) {
    // For literals, return the value (possibly truncated)
    const value = term.value;
    return value.length > 50 ? value.substring(0, 47) + "..." : value;
  } else if (isUri(term)) {
    return shortenIri(term.value, prefixes);
  } else if (isBlankNode(term)) {
    return term.value; // e.g., "_:b0"
  }
  return term.value;
}

/**
 * Generate a color palette
 */
export function generateColorPalette(count: number): string[] {
  // Using a predefined set of visually distinct colors
  const baseColors = [
    "#1f77b4", // Blue
    "#ff7f0e", // Orange
    "#2ca02c", // Green
    "#d62728", // Red
    "#9467bd", // Purple
    "#8c564b", // Brown
    "#e377c2", // Pink
    "#7f7f7f", // Gray
    "#bcbd22", // Olive
    "#17becf", // Cyan
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // If we need more colors, repeat with variations
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
}

/**
 * Extract namespace from an IRI
 */
export function getNamespace(iri: string): string {
  const lastSlash = iri.lastIndexOf("/");
  const lastHash = iri.lastIndexOf("#");
  const separator = Math.max(lastSlash, lastHash);

  if (separator > 0) {
    return iri.substring(0, separator + 1);
  }

  return iri;
}

/**
 * Validate if a string is a valid IRI
 */
export function isValidIri(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}
