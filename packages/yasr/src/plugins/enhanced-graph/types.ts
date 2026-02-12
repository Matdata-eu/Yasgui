import type * as N3 from "n3";

// D3.js types (loaded from CDN)
declare global {
  interface Window {
    d3: typeof import("d3");
  }
}

// Graph data structures
export interface GraphNode {
  id: string; // Full IRI or literal value
  label: string; // Shortened label (using prefixes)
  fullIri: string; // Full IRI for tooltips/links
  group: string; // Group name for coloring
  type: "uri" | "literal" | "bnode";
  degree?: number; // Number of connections (for sizing)
  fx?: number | null; // Fixed x position (for sticky behavior)
  fy?: number | null; // Fixed y position (for sticky behavior)
  x?: number; // Current x position (D3 managed)
  y?: number; // Current y position (D3 managed)
}

export interface GraphLink {
  source: string | GraphNode; // Node ID or reference
  target: string | GraphNode; // Node ID or reference
  predicate: string; // Predicate IRI
  predicateLabel: string; // Shortened predicate label
  icon?: string; // FontAwesome icon name
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Node grouping
export interface NodeGroup {
  id: string;
  label: string;
  color: string;
  count: number;
}

export type GroupingStrategy = "type" | "namespace" | "role" | "custom";

// Plugin configuration
export interface PluginConfig {
  physics: {
    chargeStrength: number; // Default: -100
    linkDistance: number; // Default: 80
    collisionRadius?: number; // Default: 15
  };
  nodeGrouping: {
    strategy: GroupingStrategy;
    customGroupFn?: (node: GraphNode, quads: N3.Quad[]) => string;
    colorScheme?: string[];
  };
  iconMappings?: Record<string, string>; // Predicate URI -> FontAwesome icon name
  showPredicateLabels?: boolean; // Show text instead of icons
  iconSize?: number; // Default: 16
  maxNodes?: number; // Default: 500 (warn above this)
  enableMetadata?: boolean; // Default: true
  showFooter?: boolean; // Default: true
  controlPanel?: {
    defaultOpen?: boolean;
    position?: { x: number; y: number };
  };
}

// Physics parameters for control panel
export interface PhysicsParams {
  chargeStrength: number;
  linkDistance: number;
}

// Prefixes map
export interface Prefixes {
  [prefix: string]: string;
}
