/**
 * GraphRenderer - D3.js-based force-directed graph visualization
 */

import { GraphData, GraphNode, GraphLink, PhysicsParams, NodeGroup } from "./types";
import { isValidIri } from "./utils";
import { getIconForPredicate, getIconDefinition } from "./iconMappings";
import { drawFontAwesomeIconAsSvg } from "@matdata/yasgui-utils";

export class GraphRenderer {
  private container: HTMLElement;
  private svg: any; // D3 selection
  private g: any; // Main group for zoom/pan
  private simulation: any; // D3 force simulation
  private nodes: GraphNode[];
  private links: GraphLink[];
  private nodeElements: any;
  private linkElements: any;
  private linkIconsGroup: any;
  private tooltip: HTMLDivElement;
  private width: number;
  private height: number;
  private isDarkTheme: boolean;
  private nodeGroups: Map<string, NodeGroup>;
  private iconMappings?: Record<string, string>;
  private showPredicateLabels: boolean = false;
  private useCompactTooltips: boolean = false;

  constructor(
    container: HTMLElement,
    data: GraphData,
    physicsParams: PhysicsParams,
    nodeGroups: Map<string, NodeGroup>,
    iconMappings?: Record<string, string>,
    showPredicateLabels: boolean = false,
    useCompactTooltips: boolean = false,
  ) {
    this.container = container;
    this.nodes = data.nodes;
    this.links = data.links;
    this.nodeGroups = nodeGroups;
    this.iconMappings = iconMappings;
    this.showPredicateLabels = showPredicateLabels;
    this.useCompactTooltips = useCompactTooltips;
    this.tooltip = this.createTooltip();

    // Detect theme
    this.isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";

    // Get dimensions - use offsetWidth/Height if getBoundingClientRect gives 0
    const rect = container.getBoundingClientRect();
    this.width = rect.width || container.offsetWidth || 800;
    this.height = rect.height || container.offsetHeight || 600;

    console.log(`Enhanced Graph: Container dimensions: ${this.width}x${this.height}`);
    console.log(`Enhanced Graph: Rendering ${this.nodes.length} nodes and ${this.links.length} links`);

    // Initialize D3 visualization
    this.initializeSVG();
    this.setupSimulation(physicsParams);
    this.render();
  }

  /**
   * Create SVG container
   */
  private initializeSVG(): void {
    const d3 = (window as any).d3;

    if (!d3) {
      console.error("Enhanced Graph: D3.js is not loaded!");
      return;
    }

    // Create SVG element
    this.svg = d3
      .select(this.container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Define arrowhead markers
    this.svg
      .append("defs")
      .append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 20)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", this.isDarkTheme ? "#999" : "#999");

    // Create main group for zoom/pan
    this.g = this.svg.append("g");

    // Setup zoom behavior
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", (event: any) => {
        this.g.attr("transform", event.transform);
      });

    this.svg.call(zoom);
  }

  /**
   * Setup D3 force simulation
   */
  private setupSimulation(physicsParams: PhysicsParams): void {
    const d3 = (window as any).d3;

    this.simulation = d3
      .forceSimulation(this.nodes)
      .force(
        "link",
        d3
          .forceLink(this.links)
          .id((d: GraphNode) => d.id)
          .distance(physicsParams.linkDistance),
      )
      .force("charge", d3.forceManyBody().strength(physicsParams.chargeStrength))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2))
      .force("collision", d3.forceCollide().radius(20))
      .on("tick", () => this.ticked());
  }

  /**
   * Render nodes and links
   */
  private render(): void {
    const d3 = (window as any).d3;

    // Render links
    this.linkElements = this.g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(this.links)
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("stroke", this.isDarkTheme ? "#666" : "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1.5)
      .attr("marker-end", "url(#arrowhead)");

    // Add link hover effect
    this.linkElements
      .on("mouseenter", (event: any, d: GraphLink) => {
        d3.select(event.currentTarget).attr("stroke-opacity", 1).attr("stroke-width", 2.5);
        const displayValue = this.useCompactTooltips ? d.predicateLabel : d.predicate;
        this.showTooltip(event, `<strong>Predicate:</strong> ${displayValue}`);
      })
      .on("mouseleave", (event: any) => {
        d3.select(event.currentTarget).attr("stroke-opacity", 0.6).attr("stroke-width", 1.5);
        this.hideTooltip();
      });

    // Render nodes
    this.nodeElements = this.g
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(this.nodes)
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", (d: GraphNode) => this.getNodeRadius(d))
      .attr("fill", (d: GraphNode) => this.getNodeColor(d))
      .attr("stroke", this.isDarkTheme ? "#333" : "#fff")
      .attr("stroke-width", 2)
      .call(this.dragBehavior());

    // Add node interactions
    this.nodeElements
      .on("mouseenter", (event: any, d: GraphNode) => {
        d3.select(event.currentTarget).attr("stroke-width", 3);
        const displayValue = this.useCompactTooltips ? d.label : d.fullIri;
        const tooltipContent = `
          <div class="tooltip-label">${displayValue}</div>
          ${d.type ? `<div style="font-size: 10px; margin-top: 4px;">Type: ${d.type}</div>` : ""}
          ${d.degree ? `<div style="font-size: 10px;">Connections: ${d.degree}</div>` : ""}
        `;
        this.showTooltip(event, tooltipContent);
      })
      .on("mouseleave", (event: any, d: GraphNode) => {
        d3.select(event.currentTarget).attr("stroke-width", d.fx !== undefined ? 3 : 2);
        this.hideTooltip();
      })
      .on("click", (event: any, d: GraphNode) => {
        // Make IRIs clickable
        if (d.type === "uri" && isValidIri(d.fullIri)) {
          window.open(d.fullIri, "_blank", "noopener,noreferrer");
        }
      })
      .on("dblclick", (event: any, d: GraphNode) => {
        // Double-click to release fixed position
        event.stopPropagation();
        this.releaseNode(d);
      });

    // Add node labels (only for nodes with degree > threshold to reduce clutter)
    const labelThreshold = this.nodes.length > 50 ? 3 : 0;
    const labels = this.g
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(this.nodes.filter((d: GraphNode) => (d.degree || 0) > labelThreshold))
      .enter()
      .append("text")
      .attr("class", "node-label")
      .attr("text-anchor", "middle")
      .attr("dy", -15)
      .attr("font-size", "11px")
      .attr("fill", this.isDarkTheme ? "#e0e0e0" : "#333")
      .attr("pointer-events", "none")
      .text((d: GraphNode) => (d.label.length > 20 ? d.label.substring(0, 18) + "..." : d.label));

    // Add predicate icons on links
    this.renderPredicateIcons();
  }

  /**
   * Render predicate icons or labels on link midpoints
   */
  private renderPredicateIcons(): void {
    const d3 = (window as any).d3;

    // Create a group for link icons/labels
    this.linkIconsGroup = this.g.append("g").attr("class", "link-icons");

    // Create icon/label groups as D3 data-bound elements
    const iconGroups = this.linkIconsGroup
      .selectAll(".predicate-icon")
      .data(this.links)
      .enter()
      .append("g")
      .attr("class", "predicate-icon");

    if (this.showPredicateLabels) {
      // Render text labels (CURIEs)
      this.renderPredicateLabels(iconGroups);
    } else {
      // Render FontAwesome icons
      this.renderPredicateIconsOnly(iconGroups);
    }

    // Add hover and click interactions to icon groups
    iconGroups
      .on("mouseenter", (event: any, d: GraphLink) => {
        const displayValue = this.useCompactTooltips ? d.predicateLabel : d.predicate;
        this.showTooltip(event, `<strong>Predicate:</strong> ${displayValue}`);
      })
      .on("mouseleave", () => {
        this.hideTooltip();
      })
      .on("click", (event: any, d: GraphLink) => {
        if (isValidIri(d.predicate)) {
          window.open(d.predicate, "_blank", "noopener,noreferrer");
        }
      });

    // Set initial positions (will be updated by ticked())
    this.updateIconPositions();
  }

  /**
   * Render icon-only display
   */
  private renderPredicateIconsOnly(iconGroups: any): void {
    // Add circle backgrounds
    iconGroups
      .append("circle")
      .attr("r", 10)
      .attr("fill", this.isDarkTheme ? "#2d2d2d" : "white")
      .attr("stroke", this.isDarkTheme ? "#555" : "#ccc")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer");

    // For each link, create an icon
    iconGroups.each((link: GraphLink, index: number, nodes: any[]) => {
      const d3 = (window as any).d3;
      const iconGroup = d3.select(nodes[index]);
      const iconName = getIconForPredicate(link.predicate, this.iconMappings);
      const iconDef = getIconDefinition(iconName);

      if (iconDef) {
        // Use SVG path for the icon
        const svgString = drawFontAwesomeIconAsSvg(iconDef);
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, "image/svg+xml");
        const pathElement = svgDoc.querySelector("path");

        if (pathElement) {
          const pathData = pathElement.getAttribute("d");
          const viewBox = svgDoc.querySelector("svg")?.getAttribute("viewBox")?.split(" ") || ["0", "0", "512", "512"];
          const vbWidth = parseFloat(viewBox[2]);
          const vbHeight = parseFloat(viewBox[3]);

          // Center the icon and scale it to fit in ~16px circle
          const scale = 16 / Math.max(vbWidth, vbHeight);
          const translateX = -(vbWidth * scale) / 2;
          const translateY = -(vbHeight * scale) / 2;

          iconGroup
            .append("path")
            .attr("d", pathData)
            .attr("transform", `translate(${translateX}, ${translateY}) scale(${scale})`)
            .attr("fill", this.isDarkTheme ? "#aaa" : "#666")
            .style("pointer-events", "none");
        }
      }
    });
  }

  /**
   * Render label-only display (CURIEs)
   */
  private renderPredicateLabels(iconGroups: any): void {
    // Add rounded rectangle backgrounds
    iconGroups
      .append("rect")
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("fill", this.isDarkTheme ? "#2d2d2d" : "white")
      .attr("stroke", this.isDarkTheme ? "#555" : "#ccc")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer");

    // Add text labels
    iconGroups
      .append("text")
      .attr("class", "predicate-label")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", "10px")
      .attr("font-family", "Inter, -apple-system, sans-serif")
      .attr("fill", this.isDarkTheme ? "#e0e0e0" : "#333")
      .style("pointer-events", "none")
      .text((d: GraphLink) => d.predicateLabel)
      .each(function (d: GraphLink) {
        const d3 = (window as any).d3;
        // Adjust rectangle to fit text
        const bbox = (this as SVGTextElement).getBBox();
        d3.select((this as SVGTextElement).parentNode)
          .select("rect")
          .attr("x", bbox.x - 4)
          .attr("y", bbox.y - 2)
          .attr("width", bbox.width + 8)
          .attr("height", bbox.height + 4);
      });
  }

  /**
   * Switch between icons and labels
   */
  public setPredicateDisplay(showLabels: boolean): void {
    if (this.showPredicateLabels === showLabels) return; // No change

    this.showPredicateLabels = showLabels;

    // Remove existing icons/labels group
    if (this.linkIconsGroup) {
      this.linkIconsGroup.remove();
    }

    // Re-render with new display mode
    this.renderPredicateIcons();
  }

  /**
   * Set tooltip format (compact CURIEs vs full IRIs)
   */
  public setTooltipFormat(useCuries: boolean): void {
    this.useCompactTooltips = useCuries;
    // Tooltips will update automatically on next hover
  }

  /**
   * Update icon positions to link midpoints
   */
  private updateIconPositions(): void {
    if (!this.linkIconsGroup) return;

    this.linkIconsGroup.selectAll(".predicate-icon").attr("transform", (d: any) => {
      // After D3 force simulation processes links, source and target are node objects with x, y
      if (d.source && d.target && d.source.x !== undefined && d.target.x !== undefined) {
        const midX = (d.source.x + d.target.x) / 2;
        const midY = (d.source.y + d.target.y) / 2;
        return `translate(${midX},${midY})`;
      }
      return "translate(0,0)";
    });
  }

  /**
   * Drag behavior with sticky nodes
   */
  private dragBehavior(): any {
    const d3 = (window as any).d3;

    return d3
      .drag()
      .on("start", (event: any, d: GraphNode) => {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event: any, d: GraphNode) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event: any, d: GraphNode) => {
        if (!event.active) this.simulation.alphaTarget(0);
        // Node remains fixed (sticky behavior)
        // Update stroke to indicate fixed state
        d3.select(event.sourceEvent.target).attr("stroke", "#ff6b6b").attr("stroke-width", 3);
      });
  }

  /**
   * Release a fixed node
   */
  private releaseNode(node: GraphNode): void {
    const d3 = (window as any).d3;
    node.fx = null;
    node.fy = null;
    this.simulation.alpha(0.3).restart();

    // Reset stroke color
    this.nodeElements
      .filter((d: GraphNode) => d.id === node.id)
      .attr("stroke", this.isDarkTheme ? "#333" : "#fff")
      .attr("stroke-width", 2);
  }

  /**
   * Update positions on each tick
   */
  private ticked(): void {
    const d3 = (window as any).d3;

    // Update link positions
    this.linkElements
      .attr("x1", (d: any) => d.source.x)
      .attr("y1", (d: any) => d.source.y)
      .attr("x2", (d: any) => d.target.x)
      .attr("y2", (d: any) => d.target.y);

    // Update node positions
    this.nodeElements.attr("cx", (d: GraphNode) => d.x).attr("cy", (d: GraphNode) => d.y);

    // Update label positions
    this.g
      .selectAll(".node-label")
      .attr("x", (d: GraphNode) => d.x)
      .attr("y", (d: GraphNode) => d.y);

    // Update icon positions (at link midpoints)
    this.updateIconPositions();
  }

  /**
   * Get node radius based on degree
   */
  private getNodeRadius(node: GraphNode): number {
    if (node.type === "literal") return 6;

    const degree = node.degree || 0;
    const minRadius = 8;
    const maxRadius = 20;

    // Scale radius based on degree
    const radius = minRadius + Math.min(degree * 1.5, maxRadius - minRadius);
    return radius;
  }

  /**
   * Get node color based on group
   */
  private getNodeColor(node: GraphNode): string {
    const group = this.nodeGroups.get(node.group);
    if (group) {
      return group.color;
    }

    // Fallback colors
    if (node.type === "literal") return this.isDarkTheme ? "#7f7f7f" : "#999";
    if (node.type === "bnode") return this.isDarkTheme ? "#9467bd" : "#b19cd9";
    return this.isDarkTheme ? "#1f77b4" : "#4292c6";
  }

  /**
   * Create tooltip element
   */
  private createTooltip(): HTMLDivElement {
    const tooltip = document.createElement("div");
    tooltip.className = "graph-tooltip";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);
    return tooltip;
  }

  /**
   * Show tooltip
   */
  private showTooltip(event: any, content: string): void {
    this.tooltip.innerHTML = content;
    this.tooltip.style.display = "block";
    this.tooltip.style.left = event.pageX + 10 + "px";
    this.tooltip.style.top = event.pageY + 10 + "px";
  }

  /**
   * Hide tooltip
   */
  private hideTooltip(): void {
    this.tooltip.style.display = "none";
  }

  /**
   * Update physics parameters in real-time
   */
  public updatePhysics(params: Partial<PhysicsParams>): void {
    const d3 = (window as any).d3;

    if (params.chargeStrength !== undefined) {
      this.simulation.force("charge", d3.forceManyBody().strength(params.chargeStrength));
    }

    if (params.linkDistance !== undefined) {
      this.simulation.force(
        "link",
        d3
          .forceLink(this.links)
          .id((d: GraphNode) => d.id)
          .distance(params.linkDistance),
      );
    }

    // Restart simulation with new parameters
    this.simulation.alpha(0.3).restart();
  }

  /**
   * Apply theme changes
   */
  public applyTheme(isDark: boolean): void {
    const d3 = (window as any).d3;
    this.isDarkTheme = isDark;

    // Update colors
    this.nodeElements.attr("fill", (d: GraphNode) => this.getNodeColor(d)).attr("stroke", isDark ? "#333" : "#fff");

    this.linkElements.attr("stroke", isDark ? "#666" : "#999");

    this.g.selectAll(".node-label").attr("fill", isDark ? "#e0e0e0" : "#333");

    // Update arrowhead
    this.svg.select("#arrowhead path").attr("fill", "#999");
  }

  /**
   * Get SVG element (for download in Phase 5)
   */
  public getSvgElement(): SVGElement {
    return this.svg.node();
  }

  /**
   * Apply filters to show/hide node groups
   */
  public applyFilters(hiddenGroups: Set<string>): void {
    const d3 = (window as any).d3;

    // Filter nodes
    this.nodeElements
      .style("opacity", (d: GraphNode) => (hiddenGroups.has(d.group) ? 0 : 1))
      .style("pointer-events", (d: GraphNode) => (hiddenGroups.has(d.group) ? "none" : "all"));

    // Filter node labels
    this.g.selectAll(".node-label").style("opacity", (d: GraphNode) => (hiddenGroups.has(d.group) ? 0 : 1));

    // Filter links (hide if either source or target is hidden)
    this.linkElements
      .style("opacity", (d: any) => {
        const sourceHidden = hiddenGroups.has(d.source.group);
        const targetHidden = hiddenGroups.has(d.target.group);
        return sourceHidden || targetHidden ? 0 : 0.6;
      })
      .style("pointer-events", (d: any) => {
        const sourceHidden = hiddenGroups.has(d.source.group);
        const targetHidden = hiddenGroups.has(d.target.group);
        return sourceHidden || targetHidden ? "none" : "all";
      });

    // Filter link icons
    if (this.linkIconsGroup) {
      this.linkIconsGroup
        .selectAll(".predicate-icon")
        .style("opacity", (d: any) => {
          const sourceHidden = hiddenGroups.has(d.source.group);
          const targetHidden = hiddenGroups.has(d.target.group);
          return sourceHidden || targetHidden ? 0 : 1;
        })
        .style("pointer-events", (d: any) => {
          const sourceHidden = hiddenGroups.has(d.source.group);
          const targetHidden = hiddenGroups.has(d.target.group);
          return sourceHidden || targetHidden ? "none" : "all";
        });
    }
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.simulation) {
      this.simulation.stop();
    }
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    if (this.svg) {
      this.svg.remove();
    }
  }
}
