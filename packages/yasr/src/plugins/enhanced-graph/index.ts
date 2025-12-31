/**
 * Enhanced Graph Visualization Plugin for Yasgui
 * Provides interactive D3.js-based force-directed graph visualization for RDF data
 */

import { Plugin, DownloadInfo } from "../";
import Yasr from "../../";
import "./index.scss";
import { PluginConfig, GraphData, GraphNode, GraphLink, Prefixes, PhysicsParams, NodeGroup } from "./types";
import { shortenIri, getTermLabel, isUri, isLiteral } from "./utils";
import { drawSvgStringAsElement, drawFontAwesomeIconAsSvg } from "@matdata/yasgui-utils";
import * as faProjectDiagram from "@fortawesome/free-solid-svg-icons/faProjectDiagram";
import * as N3 from "n3";
import { DeepReadonly } from "ts-essentials";
import { GraphRenderer } from "./GraphRenderer";
import { groupNodes } from "./nodeGrouping";
import { ControlPanel } from "./ControlPanel";
import { injectAllMetadata, removeMetadata } from "./metadataGenerator";

export default class EnhancedGraph implements Plugin<PluginConfig> {
  private yasr: Yasr;
  public label = "Enhanced Graph";
  public priority = 11; // Higher than default Graph plugin
  public helpReference = "https://docs.triply.cc/yasgui/#enhanced-graph";
  private config: DeepReadonly<PluginConfig>;
  private graphData: GraphData | null = null;
  private graphRenderer: GraphRenderer | null = null;
  private nodeGroups: Map<string, NodeGroup> | null = null;
  private quads: N3.Quad[] | null = null;
  private controlPanel: ControlPanel | null = null;
  private themeObserver: MutationObserver | null = null;

  constructor(yasr: Yasr) {
    this.yasr = yasr;
    this.config = EnhancedGraph.defaults;

    // Merge with any user-provided dynamic config
    if (yasr.config.plugins["enhanced-graph"] && yasr.config.plugins["enhanced-graph"].dynamicConfig) {
      this.config = {
        ...this.config,
        ...yasr.config.plugins["enhanced-graph"].dynamicConfig,
      };
    }
  }

  /**
   * Check if this plugin can handle the current results
   */
  canHandleResults(): boolean {
    if (!this.yasr.results) return false;

    // Check if we have RDF statements (CONSTRUCT/DESCRIBE queries)
    const statements = this.yasr.results.getStatements();
    if (!statements || statements.length === 0) return false;

    // Count unique nodes
    const nodeIds = new Set<string>();
    statements.forEach((quad) => {
      nodeIds.add(quad.subject.value);
      nodeIds.add(quad.object.value);
    });

    const nodeCount = nodeIds.size;

    // Warn if graph is large
    if (nodeCount > (this.config.maxNodes || 500)) {
      console.warn(
        `Enhanced Graph: Graph has ${nodeCount} nodes, which exceeds the recommended limit of ${
          this.config.maxNodes || 500
        }. Performance may be affected.`,
      );
    }

    return true;
  }

  /**
   * Get the icon for the plugin selector
   */
  getIcon(): Element {
    return drawSvgStringAsElement(drawFontAwesomeIconAsSvg(faProjectDiagram));
  }

  /**
   * Initialize the plugin (load D3.js from CDN)
   */
  async initialize(): Promise<void> {
    // Check if D3.js is already loaded
    if (!(window as any).d3) {
      console.log("Enhanced Graph: Loading D3.js from CDN...");

      // Load D3.js v7 from CDN
      await this.loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js");

      if (!(window as any).d3) {
        throw new Error("Failed to load D3.js library");
      }

      console.log("Enhanced Graph: D3.js loaded successfully");
    }
  }

  /**
   * Helper to load external scripts
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  /**
   * Main drawing function
   */
  async draw(persistentConfig?: Partial<PluginConfig>): Promise<void> {
    // Merge configs
    const config: DeepReadonly<PluginConfig> = {
      ...this.config,
      ...persistentConfig,
    };

    // Get RDF statements
    this.quads = this.yasr.results?.getStatements() || null;
    if (!this.quads || this.quads.length === 0) {
      this.yasr.resultsEl.innerHTML = "<div class='no-data'>No RDF data to visualize</div>";
      return;
    }

    // Get prefixes for URI shortening
    const prefixes = this.yasr.getPrefixes() || {};

    // Transform quads to graph data
    this.graphData = this.quadsToGraph(this.quads, prefixes);

    // Group nodes based on strategy
    this.nodeGroups = groupNodes(this.graphData.nodes, this.quads, prefixes, config.nodeGrouping.strategy);

    // Clear the results element
    this.yasr.resultsEl.innerHTML = "";

    // Add class to results element for styling
    this.yasr.resultsEl.classList.add("enhanced-graph");

    // Create container
    const container = document.createElement("div");
    container.className = "enhanced-graph-container";

    // Set container to full height - critical for SVG rendering
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.position = "relative";
    container.style.minHeight = "600px"; // Ensure minimum height

    this.yasr.resultsEl.appendChild(container);

    // Wait for next frame to ensure container has dimensions
    requestAnimationFrame(() => {
      // Create graph renderer
      const physicsParams: PhysicsParams = {
        chargeStrength: config.physics.chargeStrength,
        linkDistance: config.physics.linkDistance,
      };

      // Load saved predicate display preference
      const savedShowLabels = ControlPanel.loadPredicateDisplayPreference();

      // Load saved tooltip preference
      const savedCompactTooltips = ControlPanel.loadTooltipPreference();

      console.log("Enhanced Graph: Creating GraphRenderer...");

      try {
        this.graphRenderer = new GraphRenderer(
          container,
          this.graphData!,
          physicsParams,
          this.nodeGroups!,
          config.iconMappings,
          config.showPredicateLabels !== undefined ? config.showPredicateLabels : savedShowLabels,
          savedCompactTooltips,
        );

        // Create control panel after successful graph creation
        const savedPosition = ControlPanel.loadPosition();
        const savedVisibility = ControlPanel.loadVisibility();

        this.controlPanel = new ControlPanel(container, {
          onPhysicsChange: (params) => {
            if (this.graphRenderer) {
              this.graphRenderer.updatePhysics(params);
            }
          },
          onFilterChange: (hiddenGroups) => {
            if (this.graphRenderer) {
              this.graphRenderer.applyFilters(hiddenGroups);
            }
          },
          onPredicateDisplayChange: (showLabels) => {
            if (this.graphRenderer) {
              this.graphRenderer.setPredicateDisplay(showLabels);
            }
          },
          onTooltipCurieChange: (useCuries) => {
            if (this.graphRenderer) {
              this.graphRenderer.setTooltipFormat(useCuries);
            }
          },
          initialPhysics: physicsParams,
          nodeGroups: this.nodeGroups!,
          showPredicateLabels: config.showPredicateLabels !== undefined ? config.showPredicateLabels : savedShowLabels,
          useCompactTooltips: savedCompactTooltips,
          defaultOpen: config.controlPanel?.defaultOpen || savedVisibility,
          initialPosition: config.controlPanel?.position || savedPosition,
        });

        console.log("Enhanced Graph: Initialization complete!");
      } catch (error) {
        console.error("Enhanced Graph: Error creating renderer:", error);
        container.innerHTML = `<div style="padding: 20px; color: red;">Error rendering graph: ${error}</div>`;
      }
    });

    // Inject metadata if enabled
    if (config.enableMetadata !== false) {
      injectAllMetadata(this.graphData);
    }

    // Add footer if enabled
    if (config.showFooter !== false) {
      const footer = this.createFooter();
      container.appendChild(footer);
    }

    // Setup theme observer for runtime theme switching
    this.setupThemeObserver();
  }

  /**
   * Setup MutationObserver to watch for theme changes
   */
  private setupThemeObserver(): void {
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          const isDark = document.documentElement.getAttribute("data-theme") === "dark";
          if (this.graphRenderer) {
            this.graphRenderer.applyTheme(isDark);
          }
        }
      });
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
  }

  /**
   * Transform N3 quads into graph data structure
   */
  private quadsToGraph(quads: N3.Quad[], prefixes: Prefixes): GraphData {
    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];
    const nodeDegree = new Map<string, number>();

    // Process each quad
    quads.forEach((quad) => {
      const subjectId = quad.subject.value;
      const objectId = quad.object.value;
      const predicateIri = quad.predicate.value;

      // Add subject node
      if (!nodesMap.has(subjectId)) {
        nodesMap.set(subjectId, {
          id: subjectId,
          label: getTermLabel(quad.subject, prefixes),
          fullIri: subjectId,
          group: "default", // Will be set in Phase 3
          type: isUri(quad.subject) ? "uri" : isLiteral(quad.subject) ? "literal" : "bnode",
        });
      }

      // Add object node
      if (!nodesMap.has(objectId)) {
        nodesMap.set(objectId, {
          id: objectId,
          label: getTermLabel(quad.object, prefixes),
          fullIri: objectId,
          group: "default", // Will be set in Phase 3
          type: isUri(quad.object) ? "uri" : isLiteral(quad.object) ? "literal" : "bnode",
        });
      }

      // Update degree counts
      nodeDegree.set(subjectId, (nodeDegree.get(subjectId) || 0) + 1);
      nodeDegree.set(objectId, (nodeDegree.get(objectId) || 0) + 1);

      // Add link
      links.push({
        source: subjectId,
        target: objectId,
        predicate: predicateIri,
        predicateLabel: shortenIri(predicateIri, prefixes),
      });
    });

    // Set degree on nodes
    const nodes = Array.from(nodesMap.values());
    nodes.forEach((node) => {
      node.degree = nodeDegree.get(node.id) || 0;
    });

    return { nodes, links };
  }

  /**
   * Create footer element
   */
  private createFooter(): HTMLElement {
    const footer = document.createElement("div");
    footer.className = "graph-footer";
    footer.innerHTML = `
      Generated using <a href="https://opal.openlinksw.com" target="_blank" rel="noopener">OPAL</a>
      and deployed using <a href="https://virtuoso.openlinksw.com" target="_blank" rel="noopener">Virtuoso</a>
    `;
    return footer;
  }

  /**
   * Cleanup when plugin is deselected
   */
  destroy(): void {
    // Remove injected metadata
    removeMetadata();

    // Disconnect theme observer
    if (this.themeObserver) {
      this.themeObserver.disconnect();
      this.themeObserver = null;
    }

    if (this.graphRenderer) {
      this.graphRenderer.destroy();
      this.graphRenderer = null;
    }
    if (this.controlPanel) {
      this.controlPanel.destroy();
      this.controlPanel = null;
    }
    this.graphData = null;
    this.nodeGroups = null;
    this.quads = null;
  }

  /**
   * Download current graph as SVG
   */
  download(filename?: string): DownloadInfo | undefined {
    if (!this.graphData || !this.graphRenderer) return undefined;

    return {
      getData: () => {
        const svgElement = this.graphRenderer!.getSvgElement();
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgElement);

        // Add XML declaration and namespace
        svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

        // Add title and description for accessibility
        const titleAndDesc = `
  <title>RDF Graph Visualization</title>
  <desc>Interactive force-directed graph with ${this.graphData!.nodes.length} nodes and ${
    this.graphData!.links.length
  } edges. Generated by Yasgui Enhanced Graph Plugin.</desc>
`;
        svgString = svgString.replace("<svg", `<svg${titleAndDesc}<svg`).replace("<svg<svg", "<svg");

        return svgString;
      },
      filename: `${filename || "enhanced-graph"}.svg`,
      contentType: "image/svg+xml",
      title: "Download graph as SVG",
    };
  }

  /**
   * Default configuration
   */
  public static defaults: PluginConfig = {
    physics: {
      chargeStrength: -100,
      linkDistance: 80,
      collisionRadius: 15,
    },
    nodeGrouping: {
      strategy: "type",
      colorScheme: [],
    },
    iconSize: 16,
    maxNodes: 500,
    enableMetadata: true,
    showFooter: true,
    controlPanel: {
      defaultOpen: false,
    },
  };
}
