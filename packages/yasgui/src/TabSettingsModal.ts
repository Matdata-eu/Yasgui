import { addClass, removeClass } from "@matdata/yasgui-utils";
import "./TabSettingsModal.scss";
import Tab from "./Tab";

// Theme toggle icons
const MOON_ICON = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
</svg>`;

const SUN_ICON = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
</svg>`;

const SETTINGS_ICON = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-7.43 2.52c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
</svg>`;

const AcceptOptionsMap: { key: string; value: string }[] = [
  { key: "JSON", value: "application/sparql-results+json" },
  { key: "XML", value: "application/sparql-results+xml" },
  { key: "CSV", value: "text/csv" },
  { key: "TSV", value: "text/tab-separated-values" },
];
const AcceptHeaderGraphMap: { key: string; value: string }[] = [
  { key: "Turtle", value: "text/turtle,*/*;q=0.9" },
  { key: "JSON", value: "application/rdf+json,*/*;q=0.9" },
  { key: "RDF/XML", value: "application/rdf+xml,*/*;q=0.9" },
  { key: "TriG", value: "application/trig,*/*;q=0.9" },
  { key: "N-Triples", value: "application/n-triples,*/*;q=0.9" },
  { key: "N-Quads", value: "application/n-quads,*/*;q=0.9" },
  { key: "CSV", value: "text/csv,*/*;q=0.9" },
  { key: "TSV", value: "text/tab-separated-values,*/*;q=0.9" },
];

export default class TabSettingsModal {
  private tab: Tab;
  private modalOverlay!: HTMLElement;
  private modalContent!: HTMLElement;
  private settingsButton!: HTMLButtonElement;
  private themeToggleButton!: HTMLButtonElement;
  private prefixButton!: HTMLButtonElement;
  private prefixTextarea!: HTMLTextAreaElement;
  private autoCaptureCheckbox!: HTMLInputElement;

  constructor(tab: Tab, controlBarEl: HTMLElement) {
    this.tab = tab;
    this.init(controlBarEl);
  }

  private init(controlBarEl: HTMLElement) {
    // Settings button
    this.settingsButton = document.createElement("button");
    addClass(this.settingsButton, "tabContextButton");
    this.settingsButton.setAttribute("aria-label", "Settings");
    this.settingsButton.title = "Settings";
    this.settingsButton.innerHTML = SETTINGS_ICON;
    this.settingsButton.onclick = () => this.open();
    controlBarEl.appendChild(this.settingsButton);

    // Theme toggle button (if enabled)
    if (this.tab.yasgui.config.showThemeToggle) {
      this.themeToggleButton = document.createElement("button");
      addClass(this.themeToggleButton, "themeToggle");
      this.themeToggleButton.setAttribute("aria-label", "Toggle between light and dark theme");
      this.themeToggleButton.title = "Toggle theme";
      this.themeToggleButton.innerHTML = this.getThemeToggleIcon();
      this.themeToggleButton.addEventListener("click", () => {
        this.tab.yasgui.toggleTheme();
        this.themeToggleButton.innerHTML = this.getThemeToggleIcon();
      });
      controlBarEl.appendChild(this.themeToggleButton);
    }

    // Prefix button
    this.prefixButton = document.createElement("button");
    this.prefixButton.setAttribute("aria-label", "Insert Prefixes");
    this.prefixButton.title = "Insert saved prefixes into query";
    this.prefixButton.textContent = "PREFIX";
    addClass(this.prefixButton, "tabPrefixButton");
    controlBarEl.appendChild(this.prefixButton);
    this.prefixButton.onclick = () => this.insertPrefixesIntoQuery();

    this.createModal();
  }

  private createModal() {
    // Modal overlay
    this.modalOverlay = document.createElement("div");
    addClass(this.modalOverlay, "tabSettingsModalOverlay");
    this.modalOverlay.onclick = () => this.close();

    // Modal content
    this.modalContent = document.createElement("div");
    addClass(this.modalContent, "tabSettingsModal");
    this.modalContent.onclick = (e) => e.stopPropagation();

    // Header
    const header = document.createElement("div");
    addClass(header, "modalHeader");
    const title = document.createElement("h2");
    title.textContent = "Settings";
    header.appendChild(title);

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×";
    addClass(closeBtn, "closeButton");
    closeBtn.onclick = () => this.close();
    header.appendChild(closeBtn);

    this.modalContent.appendChild(header);

    // Body with tabs
    const body = document.createElement("div");
    addClass(body, "modalBody");

    const tabsContainer = document.createElement("div");
    addClass(tabsContainer, "modalTabs");

    const requestTab = document.createElement("button");
    requestTab.textContent = "Request";
    addClass(requestTab, "modalTabButton", "active");
    requestTab.onclick = () => this.switchTab("request");

    const prefixTab = document.createElement("button");
    prefixTab.textContent = "Prefixes";
    addClass(prefixTab, "modalTabButton");
    prefixTab.onclick = () => this.switchTab("prefix");

    tabsContainer.appendChild(requestTab);
    tabsContainer.appendChild(prefixTab);
    body.appendChild(tabsContainer);

    // Tab content containers
    const requestContent = document.createElement("div");
    addClass(requestContent, "modalTabContent", "active");
    requestContent.id = "request-content";
    this.drawRequestSettings(requestContent);

    const prefixContent = document.createElement("div");
    addClass(prefixContent, "modalTabContent");
    prefixContent.id = "prefix-content";
    this.drawPrefixSettings(prefixContent);

    body.appendChild(requestContent);
    body.appendChild(prefixContent);

    this.modalContent.appendChild(body);

    // Footer
    const footer = document.createElement("div");
    addClass(footer, "modalFooter");

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    addClass(saveBtn, "primaryButton");
    saveBtn.onclick = () => this.save();

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    addClass(cancelBtn, "secondaryButton");
    cancelBtn.onclick = () => this.close();

    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);

    this.modalContent.appendChild(footer);

    this.modalOverlay.appendChild(this.modalContent);
    document.body.appendChild(this.modalOverlay);
  }

  private switchTab(tabName: string) {
    const buttons = this.modalContent.querySelectorAll(".modalTabButton");
    const contents = this.modalContent.querySelectorAll(".modalTabContent");

    buttons.forEach((btn, index) => {
      if ((tabName === "request" && index === 0) || (tabName === "prefix" && index === 1)) {
        addClass(btn as HTMLElement, "active");
      } else {
        removeClass(btn as HTMLElement, "active");
      }
    });

    contents.forEach((content) => {
      if (content.id === `${tabName}-content`) {
        addClass(content as HTMLElement, "active");
      } else {
        removeClass(content as HTMLElement, "active");
      }
    });
  }

  private drawPrefixSettings(container: HTMLElement) {
    const section = document.createElement("div");
    addClass(section, "settingsSection");

    const label = document.createElement("label");
    label.textContent = "Saved Prefixes";
    addClass(label, "settingsLabel");

    const help = document.createElement("div");
    help.textContent = "Enter PREFIX declarations (one per line). These will be available for insertion into queries.";
    addClass(help, "settingsHelp");

    this.prefixTextarea = document.createElement("textarea");
    addClass(this.prefixTextarea, "prefixTextarea");
    this.prefixTextarea.placeholder =
      "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>";
    this.prefixTextarea.rows = 10;

    const checkboxContainer = document.createElement("div");
    addClass(checkboxContainer, "checkboxContainer");

    this.autoCaptureCheckbox = document.createElement("input");
    this.autoCaptureCheckbox.type = "checkbox";
    this.autoCaptureCheckbox.id = "autoCapturePrefixes";

    const checkboxLabel = document.createElement("label");
    checkboxLabel.htmlFor = "autoCapturePrefixes";
    checkboxLabel.textContent = "Automatically capture new prefixes from query editor";

    checkboxContainer.appendChild(this.autoCaptureCheckbox);
    checkboxContainer.appendChild(checkboxLabel);

    section.appendChild(label);
    section.appendChild(help);
    section.appendChild(this.prefixTextarea);
    section.appendChild(checkboxContainer);

    container.appendChild(section);
  }

  private drawRequestSettings(container: HTMLElement) {
    // This is a simplified version - you can expand based on TabPanel.ts
    const reqConfig = this.tab.getRequestConfig();

    // SPARQL Version section
    const yasqe = this.tab.getYasqe();
    const versionSection = this.createSection("SPARQL Version");
    const versionHelp = document.createElement("div");
    addClass(versionHelp, "settingsHelp");
    versionHelp.textContent =
      "Note: SPARQL 1.2 is based on a working draft and may change. Some features may not be supported by all endpoints.";
    const versionSelect = this.createSelect(["1.1", "1.2"], yasqe?.config.sparqlVersion || "1.1");
    versionSelect.setAttribute("data-config", "sparqlVersion");
    versionSection.appendChild(versionHelp);
    versionSection.appendChild(versionSelect);
    container.appendChild(versionSection);

    // Request Method section
    const methodSection = this.createSection("Request Method");
    const methodSelect = this.createSelect(
      ["GET", "POST"],
      typeof reqConfig.method === "function" ? "POST" : reqConfig.method,
    );
    methodSelect.setAttribute("data-config", "method");
    methodSection.appendChild(methodSelect);
    container.appendChild(methodSection);

    // Accept Header sections
    const acceptSection = this.createSection("Accept Header (SELECT/ASK)");
    const acceptSelect = this.createOptionsSelect(AcceptOptionsMap, <string>reqConfig.acceptHeaderSelect);
    acceptSelect.setAttribute("data-config", "acceptHeaderSelect");
    acceptSection.appendChild(acceptSelect);
    container.appendChild(acceptSection);

    const acceptGraphSection = this.createSection("Accept Header (CONSTRUCT/DESCRIBE)");
    const acceptGraphSelect = this.createOptionsSelect(AcceptHeaderGraphMap, <string>reqConfig.acceptHeaderGraph);
    acceptGraphSelect.setAttribute("data-config", "acceptHeaderGraph");
    acceptGraphSection.appendChild(acceptGraphSelect);
    container.appendChild(acceptGraphSection);
  }

  private createSection(title: string): HTMLElement {
    const section = document.createElement("div");
    addClass(section, "settingsSection");
    const label = document.createElement("div");
    addClass(label, "settingsLabel");
    label.textContent = title;
    section.appendChild(label);
    return section;
  }

  private createSelect(options: string[], selected?: string): HTMLSelectElement {
    const select = document.createElement("select");
    addClass(select, "settingsSelect");
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt;
      if (opt === selected) option.selected = true;
      select.appendChild(option);
    });
    return select;
  }

  private createOptionsSelect(options: { key: string; value: string }[], selected?: string): HTMLSelectElement {
    const select = document.createElement("select");
    addClass(select, "settingsSelect");
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.key;
      if (opt.value === selected) option.selected = true;
      select.appendChild(option);
    });
    return select;
  }

  public open() {
    this.loadSettings();
    addClass(this.modalOverlay, "open");
  }

  public close() {
    removeClass(this.modalOverlay, "open");
  }

  private loadSettings() {
    // Load prefix settings
    let prefixes = this.tab.yasgui.persistentConfig.getPrefixes();
    const autoCapture = this.tab.yasgui.persistentConfig.getAutoCaptureEnabled();

    // Set default prefixes if none exist
    if (!prefixes || prefixes.trim().length === 0) {
      prefixes = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>`;
      this.tab.yasgui.persistentConfig.setPrefixes(prefixes);
    }

    this.prefixTextarea.value = prefixes;
    this.autoCaptureCheckbox.checked = autoCapture;
  }

  private save() {
    // Save prefix settings
    const prefixText = this.prefixTextarea.value;
    const autoCapture = this.autoCaptureCheckbox.checked;

    // Parse and deduplicate prefixes
    const deduplicated = this.deduplicatePrefixes(prefixText);
    this.tab.yasgui.persistentConfig.setPrefixes(deduplicated);
    this.tab.yasgui.persistentConfig.setAutoCaptureEnabled(autoCapture);

    // Save request settings
    const requestContent = this.modalContent.querySelector("#request-content");
    if (requestContent) {
      const selects = requestContent.querySelectorAll("select[data-config]");
      const updates: any = {};
      selects.forEach((select) => {
        const config = (select as HTMLSelectElement).getAttribute("data-config");
        if (config) {
          if (config === "sparqlVersion") {
            // Handle SPARQL version change
            const version = (select as HTMLSelectElement).value as "1.1" | "1.2";
            const yasqe = this.tab.getYasqe();
            if (yasqe) {
              yasqe.setSparqlVersion(version);
            }
          } else {
            updates[config] = (select as HTMLSelectElement).value;
          }
        }
      });
      this.tab.setRequestConfig(updates);
    }

    this.close();
  }

  private deduplicatePrefixes(prefixText: string): string {
    const lines = prefixText.split("\n");
    const seen = new Map<string, string>();
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract prefix label from line
      const match = trimmed.match(/^\s*PREFIX\s+(\w+):\s*<(.+)>\s*$/i);
      if (match) {
        const label = match[1].toLowerCase();
        if (!seen.has(label)) {
          seen.set(label, trimmed);
          result.push(trimmed);
        }
      } else {
        // Keep non-prefix lines as-is
        result.push(trimmed);
      }
    }

    return result.join("\n");
  }

  private insertPrefixesIntoQuery() {
    const yasqe = this.tab.getYasqe();
    if (!yasqe) return;

    const savedPrefixes = this.tab.yasgui.persistentConfig.getPrefixes();
    if (!savedPrefixes.trim()) return;

    // Get current query and find where PREFIX declarations end
    const currentQuery = yasqe.getValue();
    const lines = currentQuery.split("\n");

    let firstNonPrefixLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      // Skip empty lines and PREFIX lines
      if (trimmed.length > 0 && !trimmed.toUpperCase().startsWith("PREFIX")) {
        firstNonPrefixLine = i;
        break;
      }
    }

    // If we didn't find a non-PREFIX line, all lines are PREFIX or empty
    if (firstNonPrefixLine === 0 && lines.length > 0) {
      // Check if there's any content at all
      const hasContent = lines.some((line) => line.trim().length > 0);
      if (
        !hasContent ||
        lines.every((line) => line.trim().length === 0 || line.trim().toUpperCase().startsWith("PREFIX"))
      ) {
        firstNonPrefixLine = lines.length;
      }
    }

    // Keep the rest of the query (non-PREFIX lines)
    const restOfQuery = lines.slice(firstNonPrefixLine).join("\n").trim();

    // Build new query with saved prefixes + rest of query
    const newQuery = savedPrefixes + (restOfQuery ? "\n\n" + restOfQuery : "");
    yasqe.setValue(newQuery);
    yasqe.focus();
  }

  public capturePrefixesFromQuery() {
    const autoCapture = this.tab.yasgui.persistentConfig.getAutoCaptureEnabled();
    if (!autoCapture) return;

    const yasqe = this.tab.getYasqe();
    if (!yasqe) return;

    const queryPrefixes = yasqe.getPrefixesFromQuery();
    if (!queryPrefixes || Object.keys(queryPrefixes).length === 0) return;

    // Convert query prefixes to text format
    const newPrefixLines: string[] = [];
    for (const [label, uri] of Object.entries(queryPrefixes)) {
      newPrefixLines.push(`PREFIX ${label}: <${uri}>`);
    }

    // Merge with existing prefixes
    const existingPrefixes = this.tab.yasgui.persistentConfig.getPrefixes();
    const combined = existingPrefixes + "\n" + newPrefixLines.join("\n");
    const deduplicated = this.deduplicatePrefixes(combined);

    this.tab.yasgui.persistentConfig.setPrefixes(deduplicated);
  }

  private getThemeToggleIcon(): string {
    const currentTheme = this.tab.yasgui.getTheme();
    // In dark mode, show moon icon (clicking will switch to light)
    // In light mode, show sun icon (clicking will switch to dark)
    return currentTheme === "dark" ? MOON_ICON : SUN_ICON;
  }

  public destroy() {
    if (this.modalOverlay && this.modalOverlay.parentNode) {
      this.modalOverlay.parentNode.removeChild(this.modalOverlay);
    }
  }
}
