/**
 * ControlPanel - Draggable control panel for graph settings
 */

import { PhysicsParams, NodeGroup } from "./types";
import { addClass, removeClass } from "@matdata/yasgui-utils";

export interface ControlPanelConfig {
  onPhysicsChange: (params: Partial<PhysicsParams>) => void;
  onFilterChange: (hiddenGroups: Set<string>) => void;
  onPredicateDisplayChange: (showLabels: boolean) => void;
  onTooltipCurieChange: (useCuries: boolean) => void;
  initialPhysics: PhysicsParams;
  nodeGroups: Map<string, NodeGroup>;
  showPredicateLabels: boolean;
  useCompactTooltips: boolean;
  defaultOpen?: boolean;
  initialPosition?: { x: number; y: number };
}

export class ControlPanel {
  private container: HTMLDivElement;
  private panel: HTMLDivElement;
  private toggleButton: HTMLDivElement;
  private isVisible: boolean;
  private position: { x: number; y: number };
  private isDragging: boolean = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private config: ControlPanelConfig;
  private hiddenGroups: Set<string> = new Set();
  private currentPhysics: PhysicsParams;
  private showPredicateLabels: boolean;
  private useCompactTooltips: boolean;

  constructor(parentContainer: HTMLElement, config: ControlPanelConfig) {
    this.config = config;
    this.currentPhysics = { ...config.initialPhysics };
    this.showPredicateLabels = config.showPredicateLabels;
    this.useCompactTooltips = config.useCompactTooltips;
    this.isVisible = config.defaultOpen || false;

    // Default position: relative to container, not window
    this.position = config.initialPosition || { x: 60, y: 60 };

    // Create container for all UI elements
    this.container = document.createElement("div");
    this.container.className = "enhanced-graph-controls";
    parentContainer.appendChild(this.container);

    // Create toggle button
    this.toggleButton = this.createToggleButton();
    this.container.appendChild(this.toggleButton);

    // Create control panel
    this.panel = this.createPanel();
    this.container.appendChild(this.panel);

    // Setup dragging behavior
    this.attachDragBehavior();

    // Update visibility
    this.updateVisibility();
  }

  /**
   * Create the gear icon toggle button
   */
  private createToggleButton(): HTMLDivElement {
    const button = document.createElement("div");
    button.className = "control-toggle";
    button.title = "Toggle graph settings";
    button.setAttribute("role", "button");
    button.setAttribute("aria-label", "Toggle graph settings");

    // Add gear icon (⚙)
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>
      </svg>
    `;

    button.addEventListener("click", () => this.toggle());

    return button;
  }

  /**
   * Create the main control panel
   */
  private createPanel(): HTMLDivElement {
    const panel = document.createElement("div");
    panel.className = "control-panel";

    // Header (draggable)
    const header = document.createElement("div");
    header.className = "panel-header";
    header.innerHTML = `
      <h4>Graph Controls</h4>
      <button class="close-btn" aria-label="Close panel">×</button>
    `;
    panel.appendChild(header);

    // Close button functionality
    header.querySelector(".close-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.hide();
    });

    // Content container
    const content = document.createElement("div");
    content.className = "panel-content";

    // Display options section
    const displaySection = this.createDisplaySection();
    content.appendChild(displaySection);

    // Physics section
    const physicsSection = this.createPhysicsSection();
    content.appendChild(physicsSection);

    // Filters section
    const filtersSection = this.createFiltersSection();
    content.appendChild(filtersSection);

    // Legend section
    const legendSection = this.createLegendSection();
    content.appendChild(legendSection);

    panel.appendChild(content);

    return panel;
  }

  /**
   * Create display options section
   */
  private createDisplaySection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "panel-section";

    const title = document.createElement("h5");
    title.textContent = "Display Options";
    section.appendChild(title);

    // Predicate display toggle
    const toggleContainer = document.createElement("div");
    toggleContainer.className = "display-toggle";
    toggleContainer.style.display = "flex";
    toggleContainer.style.alignItems = "center";
    toggleContainer.style.justifyContent = "space-between";
    toggleContainer.style.marginBottom = "12px";

    const label = document.createElement("label");
    label.textContent = "Predicate Display";
    label.style.fontSize = "12px";
    label.style.color = "#666";

    const toggleSwitch = document.createElement("div");
    toggleSwitch.className = "toggle-switch";
    toggleSwitch.style.display = "flex";
    toggleSwitch.style.gap = "8px";
    toggleSwitch.style.alignItems = "center";

    // Icons button
    const iconsBtn = document.createElement("button");
    iconsBtn.className = "toggle-btn" + (this.showPredicateLabels ? "" : " active");
    iconsBtn.textContent = "Icons";
    iconsBtn.style.fontSize = "11px";
    iconsBtn.style.padding = "4px 12px";
    iconsBtn.style.border = "1px solid #ccc";
    iconsBtn.style.background = this.showPredicateLabels ? "#f0f0f0" : "#337ab7";
    iconsBtn.style.color = this.showPredicateLabels ? "#666" : "white";
    iconsBtn.style.borderRadius = "3px";
    iconsBtn.style.cursor = "pointer";
    iconsBtn.addEventListener("click", () => {
      if (!this.showPredicateLabels) return; // Already showing icons
      this.showPredicateLabels = false;
      this.updateToggleButtons(iconsBtn, labelsBtn);
      this.config.onPredicateDisplayChange(false);
      this.savePredicateDisplayPreference();
    });

    // Labels button
    const labelsBtn = document.createElement("button");
    labelsBtn.className = "toggle-btn" + (this.showPredicateLabels ? " active" : "");
    labelsBtn.textContent = "Labels";
    labelsBtn.style.fontSize = "11px";
    labelsBtn.style.padding = "4px 12px";
    labelsBtn.style.border = "1px solid #ccc";
    labelsBtn.style.background = this.showPredicateLabels ? "#337ab7" : "#f0f0f0";
    labelsBtn.style.color = this.showPredicateLabels ? "white" : "#666";
    labelsBtn.style.borderRadius = "3px";
    labelsBtn.style.cursor = "pointer";
    labelsBtn.addEventListener("click", () => {
      if (this.showPredicateLabels) return; // Already showing labels
      this.showPredicateLabels = true;
      this.updateToggleButtons(iconsBtn, labelsBtn);
      this.config.onPredicateDisplayChange(true);
      this.savePredicateDisplayPreference();
    });

    toggleSwitch.appendChild(iconsBtn);
    toggleSwitch.appendChild(labelsBtn);

    toggleContainer.appendChild(label);
    toggleContainer.appendChild(toggleSwitch);
    section.appendChild(toggleContainer);

    // Tooltip format toggle
    const tooltipContainer = document.createElement("div");
    tooltipContainer.className = "display-toggle";
    tooltipContainer.style.display = "flex";
    tooltipContainer.style.alignItems = "center";
    tooltipContainer.style.justifyContent = "space-between";
    tooltipContainer.style.marginTop = "12px";

    const tooltipLabel = document.createElement("label");
    tooltipLabel.textContent = "Tooltip IRIs";
    tooltipLabel.style.fontSize = "12px";
    tooltipLabel.style.color = "#666";

    const tooltipToggle = document.createElement("div");
    tooltipToggle.className = "toggle-switch";
    tooltipToggle.style.display = "flex";
    tooltipToggle.style.gap = "8px";
    tooltipToggle.style.alignItems = "center";

    // Full IRIs button
    const fullBtn = document.createElement("button");
    fullBtn.className = "toggle-btn" + (this.useCompactTooltips ? "" : " active");
    fullBtn.textContent = "Full";
    fullBtn.style.fontSize = "11px";
    fullBtn.style.padding = "4px 12px";
    fullBtn.style.border = "1px solid #ccc";
    fullBtn.style.background = this.useCompactTooltips ? "#f0f0f0" : "#337ab7";
    fullBtn.style.color = this.useCompactTooltips ? "#666" : "white";
    fullBtn.style.borderRadius = "3px";
    fullBtn.style.cursor = "pointer";
    fullBtn.addEventListener("click", () => {
      if (!this.useCompactTooltips) return; // Already showing full
      this.useCompactTooltips = false;
      this.updateTooltipToggleButtons(fullBtn, curieBtn);
      this.config.onTooltipCurieChange(false);
      this.saveTooltipPreference();
    });

    // CURIEs button
    const curieBtn = document.createElement("button");
    curieBtn.className = "toggle-btn" + (this.useCompactTooltips ? " active" : "");
    curieBtn.textContent = "CURIE";
    curieBtn.style.fontSize = "11px";
    curieBtn.style.padding = "4px 12px";
    curieBtn.style.border = "1px solid #ccc";
    curieBtn.style.background = this.useCompactTooltips ? "#337ab7" : "#f0f0f0";
    curieBtn.style.color = this.useCompactTooltips ? "white" : "#666";
    curieBtn.style.borderRadius = "3px";
    curieBtn.style.cursor = "pointer";
    curieBtn.addEventListener("click", () => {
      if (this.useCompactTooltips) return; // Already showing CURIEs
      this.useCompactTooltips = true;
      this.updateTooltipToggleButtons(fullBtn, curieBtn);
      this.config.onTooltipCurieChange(true);
      this.saveTooltipPreference();
    });

    tooltipToggle.appendChild(fullBtn);
    tooltipToggle.appendChild(curieBtn);

    tooltipContainer.appendChild(tooltipLabel);
    tooltipContainer.appendChild(tooltipToggle);
    section.appendChild(tooltipContainer);

    return section;
  }

  /**
   * Update tooltip toggle button styles
   */
  private updateTooltipToggleButtons(fullBtn: HTMLButtonElement, curieBtn: HTMLButtonElement): void {
    if (this.useCompactTooltips) {
      fullBtn.style.background = "#f0f0f0";
      fullBtn.style.color = "#666";
      curieBtn.style.background = "#337ab7";
      curieBtn.style.color = "white";
    } else {
      fullBtn.style.background = "#337ab7";
      fullBtn.style.color = "white";
      curieBtn.style.background = "#f0f0f0";
      curieBtn.style.color = "#666";
    }
  }

  /**
   * Save tooltip preference
   */
  private saveTooltipPreference(): void {
    try {
      localStorage.setItem("yasgui-enhanced-graph-compact-tooltips", JSON.stringify(this.useCompactTooltips));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Load tooltip preference
   */
  public static loadTooltipPreference(): boolean {
    try {
      const saved = localStorage.getItem("yasgui-enhanced-graph-compact-tooltips");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore storage errors
    }
    return false; // Default to full IRIs
  }

  /**
   * Update toggle button styles
   */
  private updateToggleButtons(iconsBtn: HTMLButtonElement, labelsBtn: HTMLButtonElement): void {
    if (this.showPredicateLabels) {
      iconsBtn.style.background = "#f0f0f0";
      iconsBtn.style.color = "#666";
      labelsBtn.style.background = "#337ab7";
      labelsBtn.style.color = "white";
    } else {
      iconsBtn.style.background = "#337ab7";
      iconsBtn.style.color = "white";
      labelsBtn.style.background = "#f0f0f0";
      labelsBtn.style.color = "#666";
    }
  }

  /**
   * Save predicate display preference
   */
  private savePredicateDisplayPreference(): void {
    try {
      localStorage.setItem("yasgui-enhanced-graph-show-labels", JSON.stringify(this.showPredicateLabels));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Load predicate display preference
   */
  public static loadPredicateDisplayPreference(): boolean {
    try {
      const saved = localStorage.getItem("yasgui-enhanced-graph-show-labels");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore storage errors
    }
    return false; // Default to icons
  }

  /**
   * Create physics controls section
   */
  private createPhysicsSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "panel-section";

    const title = document.createElement("h5");
    title.textContent = "Physics";
    section.appendChild(title);

    // Charge Strength slider
    const chargeControl = this.createSlider(
      "Charge Strength",
      "chargeStrength",
      this.currentPhysics.chargeStrength,
      -150,
      -30,
      5,
      (value) => {
        this.currentPhysics.chargeStrength = value;
        this.config.onPhysicsChange({ chargeStrength: value });
      },
    );
    section.appendChild(chargeControl);

    // Link Distance slider
    const distanceControl = this.createSlider(
      "Link Distance",
      "linkDistance",
      this.currentPhysics.linkDistance,
      30,
      200,
      10,
      (value) => {
        this.currentPhysics.linkDistance = value;
        this.config.onPhysicsChange({ linkDistance: value });
      },
    );
    section.appendChild(distanceControl);

    return section;
  }

  /**
   * Create a slider control
   */
  private createSlider(
    label: string,
    id: string,
    initialValue: number,
    min: number,
    max: number,
    step: number,
    onChange: (value: number) => void,
  ): HTMLElement {
    const control = document.createElement("div");
    control.className = "slider-control";

    const labelEl = document.createElement("label");
    labelEl.innerHTML = `
      <span>${label}</span>
      <span class="value" id="${id}-value">${initialValue}</span>
    `;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.id = id;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = initialValue.toString();

    // Debounce the onChange to avoid too many updates
    let timeout: number | null = null;
    slider.addEventListener("input", (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      document.getElementById(`${id}-value`)!.textContent = value.toString();

      // Debounce updates for smooth performance
      if (timeout) clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        onChange(value);
      }, 50);
    });

    control.appendChild(labelEl);
    control.appendChild(slider);

    return control;
  }

  /**
   * Create filters section
   */
  private createFiltersSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "panel-section";

    const title = document.createElement("h5");
    title.textContent = "Filter by Type";
    section.appendChild(title);

    // Create checkbox list
    const checkboxList = document.createElement("div");
    checkboxList.className = "checkbox-list";

    // Add "Select All" / "Deselect All" shortcuts
    const selectAllBtn = document.createElement("button");
    selectAllBtn.className = "yasr_btn filter-action-btn";
    selectAllBtn.textContent = "Select All";
    selectAllBtn.style.fontSize = "11px";
    selectAllBtn.style.padding = "4px 8px";
    selectAllBtn.style.marginBottom = "8px";
    selectAllBtn.addEventListener("click", () => {
      this.hiddenGroups.clear();
      this.updateFilterCheckboxes();
      this.config.onFilterChange(this.hiddenGroups);
    });

    const deselectAllBtn = document.createElement("button");
    deselectAllBtn.className = "yasr_btn filter-action-btn";
    deselectAllBtn.textContent = "Deselect All";
    deselectAllBtn.style.fontSize = "11px";
    deselectAllBtn.style.padding = "4px 8px";
    deselectAllBtn.style.marginBottom = "8px";
    deselectAllBtn.style.marginLeft = "8px";
    deselectAllBtn.addEventListener("click", () => {
      this.config.nodeGroups.forEach((_, groupId) => {
        this.hiddenGroups.add(groupId);
      });
      this.updateFilterCheckboxes();
      this.config.onFilterChange(this.hiddenGroups);
    });

    const buttonContainer = document.createElement("div");
    buttonContainer.appendChild(selectAllBtn);
    buttonContainer.appendChild(deselectAllBtn);
    section.appendChild(buttonContainer);

    // Sort groups by count (descending)
    const sortedGroups = Array.from(this.config.nodeGroups.entries()).sort((a, b) => b[1].count - a[1].count);

    sortedGroups.forEach(([groupId, group]) => {
      const label = document.createElement("label");
      label.style.display = "flex";
      label.style.alignItems = "center";
      label.style.cursor = "pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !this.hiddenGroups.has(groupId);
      checkbox.dataset.groupId = groupId;
      checkbox.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.dataset.groupId!;
        if (target.checked) {
          this.hiddenGroups.delete(id);
        } else {
          this.hiddenGroups.add(id);
        }
        this.config.onFilterChange(this.hiddenGroups);
      });

      const colorIndicator = document.createElement("span");
      colorIndicator.className = "color-indicator";
      colorIndicator.style.backgroundColor = group.color;

      const text = document.createTextNode(` ${group.label} (${group.count})`);

      label.appendChild(checkbox);
      label.appendChild(colorIndicator);
      label.appendChild(text);
      checkboxList.appendChild(label);
    });

    section.appendChild(checkboxList);

    return section;
  }

  /**
   * Update filter checkboxes state
   */
  private updateFilterCheckboxes(): void {
    const checkboxes = this.panel.querySelectorAll('.checkbox-list input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      const cb = checkbox as HTMLInputElement;
      const groupId = cb.dataset.groupId!;
      cb.checked = !this.hiddenGroups.has(groupId);
    });
  }

  /**
   * Create legend section
   */
  private createLegendSection(): HTMLElement {
    const section = document.createElement("div");
    section.className = "panel-section";

    const title = document.createElement("h5");
    title.textContent = "Legend";
    section.appendChild(title);

    const legendList = document.createElement("div");
    legendList.className = "legend-list";

    // Sort groups by count (descending)
    const sortedGroups = Array.from(this.config.nodeGroups.entries()).sort((a, b) => b[1].count - a[1].count);

    sortedGroups.forEach(([_, group]) => {
      const item = document.createElement("div");
      item.className = "legend-item";

      const colorIndicator = document.createElement("span");
      colorIndicator.className = "color-indicator";
      colorIndicator.style.backgroundColor = group.color;

      const label = document.createTextNode(`${group.label} (${group.count})`);

      item.appendChild(colorIndicator);
      item.appendChild(label);
      legendList.appendChild(item);
    });

    section.appendChild(legendList);

    return section;
  }

  /**
   * Attach dragging behavior to panel header
   */
  private attachDragBehavior(): void {
    const header = this.panel.querySelector(".panel-header") as HTMLElement;

    header.addEventListener("mousedown", (e: MouseEvent) => {
      // Don't start drag if clicking close button
      if ((e.target as HTMLElement).classList.contains("close-btn")) return;

      this.isDragging = true;
      this.dragOffset = {
        x: e.clientX - this.position.x,
        y: e.clientY - this.position.y,
      };

      header.style.cursor = "grabbing";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e: MouseEvent) => {
      if (!this.isDragging) return;

      // Calculate new position
      let newX = e.clientX - this.dragOffset.x;
      let newY = e.clientY - this.dragOffset.y;

      // Constrain to viewport
      const panelRect = this.panel.getBoundingClientRect();
      const maxX = window.innerWidth - panelRect.width;
      const maxY = window.innerHeight - panelRect.height;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      this.position = { x: newX, y: newY };
      this.updatePanelPosition();
    });

    document.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        header.style.cursor = "move";
        this.savePosition();
      }
    });

    // Set initial cursor
    header.style.cursor = "move";
  }

  /**
   * Update panel position
   */
  private updatePanelPosition(): void {
    this.panel.style.left = `${this.position.x}px`;
    this.panel.style.top = `${this.position.y}px`;
  }

  /**
   * Update visibility
   */
  private updateVisibility(): void {
    if (this.isVisible) {
      removeClass(this.panel, "hidden");
      this.updatePanelPosition();
    } else {
      addClass(this.panel, "hidden");
    }
  }

  /**
   * Toggle panel visibility
   */
  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.updateVisibility();
    this.saveState();
  }

  /**
   * Show panel
   */
  public show(): void {
    this.isVisible = true;
    this.updateVisibility();
    this.saveState();
  }

  /**
   * Hide panel
   */
  public hide(): void {
    this.isVisible = false;
    this.updateVisibility();
    this.saveState();
  }

  /**
   * Save position to localStorage
   */
  private savePosition(): void {
    try {
      localStorage.setItem("yasgui-enhanced-graph-panel-position", JSON.stringify(this.position));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem("yasgui-enhanced-graph-panel-visible", JSON.stringify(this.isVisible));
    } catch (e) {
      // Ignore storage errors
    }
  }

  /**
   * Load position from localStorage
   */
  public static loadPosition(): { x: number; y: number } | undefined {
    try {
      const saved = localStorage.getItem("yasgui-enhanced-graph-panel-position");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore storage errors
    }
    return undefined;
  }

  /**
   * Load visibility state from localStorage
   */
  public static loadVisibility(): boolean {
    try {
      const saved = localStorage.getItem("yasgui-enhanced-graph-panel-visible");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      // Ignore storage errors
    }
    return false;
  }

  /**
   * Update node groups (when data changes)
   */
  public updateGroups(nodeGroups: Map<string, NodeGroup>): void {
    // Re-render filters and legend sections
    const content = this.panel.querySelector(".panel-content");
    if (!content) return;

    // Find and replace the filters and legend sections
    const oldFilters = content.querySelector(".panel-section:nth-child(2)");
    const oldLegend = content.querySelector(".panel-section:nth-child(3)");

    // Update config
    this.config.nodeGroups = nodeGroups;

    // Re-create sections
    const newFilters = this.createFiltersSection();
    const newLegend = this.createLegendSection();

    if (oldFilters) oldFilters.replaceWith(newFilters);
    if (oldLegend) oldLegend.replaceWith(newLegend);
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
