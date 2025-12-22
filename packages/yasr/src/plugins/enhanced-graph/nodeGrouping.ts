/**
 * Node Grouping Logic
 * Analyzes RDF data to intelligently group nodes by type, namespace, or role
 */

import * as N3 from "n3";
import { GraphNode, NodeGroup, GroupingStrategy, Prefixes } from "./types";
import { getNamespace, shortenIri, generateColorPalette } from "./utils";

/**
 * Main function to group nodes based on strategy
 */
export function groupNodes(
  nodes: GraphNode[],
  quads: N3.Quad[],
  prefixes: Prefixes,
  strategy: GroupingStrategy = "type",
): Map<string, NodeGroup> {
  switch (strategy) {
    case "type":
      return groupByType(nodes, quads, prefixes);
    case "namespace":
      return groupByNamespace(nodes, prefixes);
    case "role":
      return groupByRole(nodes, quads);
    default:
      return groupByType(nodes, quads, prefixes);
  }
}

/**
 * Group nodes by their rdf:type
 */
function groupByType(nodes: GraphNode[], quads: N3.Quad[], prefixes: Prefixes): Map<string, NodeGroup> {
  const groups = new Map<string, NodeGroup>();
  const nodeTypes = new Map<string, string>(); // nodeId -> type

  // Find all rdf:type statements
  const rdfType = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

  quads.forEach((quad) => {
    if (quad.predicate.value === rdfType) {
      const subjectId = quad.subject.value;
      const typeId = quad.object.value;
      nodeTypes.set(subjectId, typeId);
    }
  });

  // Count nodes by type
  const typeCounts = new Map<string, number>();
  nodeTypes.forEach((type) => {
    typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
  });

  // Create groups for types
  const colors = generateColorPalette(typeCounts.size + 2); // +2 for literals and untyped
  let colorIndex = 0;

  typeCounts.forEach((count, typeId) => {
    const groupLabel = shortenIri(typeId, prefixes);
    groups.set(typeId, {
      id: typeId,
      label: groupLabel,
      color: colors[colorIndex++],
      count: count,
    });
  });

  // Assign groups to nodes
  nodes.forEach((node) => {
    if (node.type === "literal") {
      node.group = "literal";
      if (!groups.has("literal")) {
        groups.set("literal", {
          id: "literal",
          label: "Literals",
          color: colors[colorIndex] || "#7f7f7f",
          count: 0,
        });
      }
      groups.get("literal")!.count++;
    } else if (nodeTypes.has(node.id)) {
      node.group = nodeTypes.get(node.id)!;
    } else {
      // Fallback: try namespace-based grouping
      const namespace = getNamespace(node.id);
      if (namespace) {
        node.group = namespace;
        if (!groups.has(namespace)) {
          const namespaceLabel = shortenIri(namespace, prefixes) || "Other";
          groups.set(namespace, {
            id: namespace,
            label: namespaceLabel,
            color: colors[(colorIndex + 1) % colors.length],
            count: 0,
          });
          colorIndex++;
        }
        groups.get(namespace)!.count++;
      } else {
        node.group = "untyped";
        if (!groups.has("untyped")) {
          groups.set("untyped", {
            id: "untyped",
            label: "Untyped",
            color: colors[colors.length - 1] || "#bcbd22",
            count: 0,
          });
        }
        groups.get("untyped")!.count++;
      }
    }
  });

  return groups;
}

/**
 * Group nodes by their namespace
 */
function groupByNamespace(nodes: GraphNode[], prefixes: Prefixes): Map<string, NodeGroup> {
  const groups = new Map<string, NodeGroup>();
  const namespaceCounts = new Map<string, number>();

  // Count nodes by namespace
  nodes.forEach((node) => {
    if (node.type === "literal") {
      namespaceCounts.set("literal", (namespaceCounts.get("literal") || 0) + 1);
    } else {
      const namespace = getNamespace(node.id);
      if (namespace) {
        namespaceCounts.set(namespace, (namespaceCounts.get(namespace) || 0) + 1);
      } else {
        namespaceCounts.set("other", (namespaceCounts.get("other") || 0) + 1);
      }
    }
  });

  // Generate colors
  const colors = generateColorPalette(namespaceCounts.size);
  let colorIndex = 0;

  // Create groups
  namespaceCounts.forEach((count, namespace) => {
    const label = namespace === "literal" ? "Literals" : shortenIri(namespace, prefixes) || namespace;
    groups.set(namespace, {
      id: namespace,
      label: label,
      color: colors[colorIndex++],
      count: count,
    });
  });

  // Assign groups to nodes
  nodes.forEach((node) => {
    if (node.type === "literal") {
      node.group = "literal";
    } else {
      const namespace = getNamespace(node.id);
      node.group = namespace || "other";
    }
  });

  return groups;
}

/**
 * Group nodes by their role (subject-only, object-only, or both)
 */
function groupByRole(nodes: GraphNode[], quads: N3.Quad[]): Map<string, NodeGroup> {
  const groups = new Map<string, NodeGroup>();
  const subjects = new Set<string>();
  const objects = new Set<string>();

  // Identify subjects and objects
  quads.forEach((quad) => {
    subjects.add(quad.subject.value);
    objects.add(quad.object.value);
  });

  // Count nodes by role
  let subjectOnlyCount = 0;
  let objectOnlyCount = 0;
  let bothCount = 0;
  let literalCount = 0;

  nodes.forEach((node) => {
    if (node.type === "literal") {
      node.group = "literal";
      literalCount++;
    } else if (subjects.has(node.id) && objects.has(node.id)) {
      node.group = "both";
      bothCount++;
    } else if (subjects.has(node.id)) {
      node.group = "subject-only";
      subjectOnlyCount++;
    } else {
      node.group = "object-only";
      objectOnlyCount++;
    }
  });

  // Create groups with distinct colors
  groups.set("both", {
    id: "both",
    label: "Subject & Object",
    color: "#1f77b4", // Blue
    count: bothCount,
  });

  groups.set("subject-only", {
    id: "subject-only",
    label: "Subject Only",
    color: "#2ca02c", // Green
    count: subjectOnlyCount,
  });

  groups.set("object-only", {
    id: "object-only",
    label: "Object Only",
    color: "#ff7f0e", // Orange
    count: objectOnlyCount,
  });

  if (literalCount > 0) {
    groups.set("literal", {
      id: "literal",
      label: "Literals",
      color: "#7f7f7f", // Gray
      count: literalCount,
    });
  }

  return groups;
}

/**
 * Apply node colors based on groups
 */
export function applyNodeColors(nodes: GraphNode[], groups: Map<string, NodeGroup>): void {
  nodes.forEach((node) => {
    const group = groups.get(node.group);
    if (group) {
      // Color will be read from group in GraphRenderer
      // This function is for future extensibility
    }
  });
}
