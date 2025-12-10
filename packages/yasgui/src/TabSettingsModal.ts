import { addClass, removeClass } from "@matdata/yasgui-utils";
import "./TabSettingsModal.scss";
import Tab, { ValidationPattern } from "./Tab";

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

    const editorTab = document.createElement("button");
    editorTab.textContent = "Editor";
    addClass(editorTab, "modalTabButton");
    editorTab.onclick = () => this.switchTab("editor");

    const endpointsTab = document.createElement("button");
    endpointsTab.textContent = "Endpoint Buttons";
    addClass(endpointsTab, "modalTabButton");
    endpointsTab.onclick = () => this.switchTab("endpoints");

    const validationTab = document.createElement("button");
    validationTab.textContent = "Validation";
    addClass(validationTab, "modalTabButton");
    validationTab.onclick = () => this.switchTab("validation");

    tabsContainer.appendChild(requestTab);
    tabsContainer.appendChild(prefixTab);
    tabsContainer.appendChild(editorTab);
    tabsContainer.appendChild(endpointsTab);
    tabsContainer.appendChild(validationTab);
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

    const editorContent = document.createElement("div");
    addClass(editorContent, "modalTabContent");
    editorContent.id = "editor-content";
    this.drawEditorSettings(editorContent);

    const endpointsContent = document.createElement("div");
    addClass(endpointsContent, "modalTabContent");
    endpointsContent.id = "endpoints-content";
    this.drawEndpointButtonsSettings(endpointsContent);

    const validationContent = document.createElement("div");
    addClass(validationContent, "modalTabContent");
    validationContent.id = "validation-content";
    this.drawValidationSettings(validationContent);

    body.appendChild(requestContent);
    body.appendChild(prefixContent);
    body.appendChild(editorContent);
    body.appendChild(endpointsContent);
    body.appendChild(validationContent);

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
      if (
        (tabName === "request" && index === 0) ||
        (tabName === "prefix" && index === 1) ||
        (tabName === "editor" && index === 2) ||
        (tabName === "endpoints" && index === 3) ||
        (tabName === "validation" && index === 4)
      ) {
        addClass(btn as HTMLElement, "active");
      } else {
        removeClass(btn as HTMLElement, "active");
      }
    });

    contents.forEach((content) => {
      if (content.id === `${tabName}-content`) {
        addClass(content as HTMLElement, "active");
        // Reload editor settings if switching to editor tab and it hasn't been loaded yet
        if (tabName === "editor" && content.innerHTML.indexOf("not yet initialized") > -1) {
          content.innerHTML = "";
          this.drawEditorSettings(content as HTMLElement);
        }
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

  private drawEditorSettings(container: HTMLElement) {
    const yasqe = this.tab.getYasqe();
    if (!yasqe) {
      const notice = document.createElement("div");
      notice.textContent = "Query editor is not yet initialized.";
      addClass(notice, "settingsHelp");
      container.appendChild(notice);
      return;
    }

    // Formatter Type Section
    const formatterSection = document.createElement("div");
    addClass(formatterSection, "settingsSection");

    const formatterLabel = document.createElement("label");
    formatterLabel.textContent = "Query Formatter";
    addClass(formatterLabel, "settingsLabel");

    const formatterHelp = document.createElement("div");
    formatterHelp.textContent = "Choose which formatter to use when formatting SPARQL queries (Shift+Ctrl+F).";
    addClass(formatterHelp, "settingsHelp");

    const formatterSelect = document.createElement("select");
    formatterSelect.id = "formatterTypeSelect";
    addClass(formatterSelect, "settingsSelect");

    const sparqlFormatterOption = document.createElement("option");
    sparqlFormatterOption.value = "sparql-formatter";
    sparqlFormatterOption.textContent = "SPARQL Formatter (external library)";
    formatterSelect.appendChild(sparqlFormatterOption);

    const legacyOption = document.createElement("option");
    legacyOption.value = "legacy";
    legacyOption.textContent = "Legacy Formatter (built-in)";
    formatterSelect.appendChild(legacyOption);

    const currentFormatter = yasqe.persistentConfig?.formatterType || "sparql-formatter";
    formatterSelect.value = currentFormatter;

    formatterSection.appendChild(formatterLabel);
    formatterSection.appendChild(formatterHelp);
    formatterSection.appendChild(formatterSelect);
    container.appendChild(formatterSection);

    // Auto-format on Query Section
    const autoformatSection = document.createElement("div");
    addClass(autoformatSection, "settingsSection");

    const autoformatCheckboxContainer = document.createElement("div");
    addClass(autoformatCheckboxContainer, "checkboxContainer");

    const autoformatCheckbox = document.createElement("input");
    autoformatCheckbox.type = "checkbox";
    autoformatCheckbox.id = "autoformatOnQuery";
    autoformatCheckbox.checked = yasqe.persistentConfig?.autoformatOnQuery || true;

    const autoformatLabel = document.createElement("label");
    autoformatLabel.htmlFor = "autoformatOnQuery";
    autoformatLabel.textContent = "Auto-format query before execution";

    const autoformatHelp = document.createElement("div");
    autoformatHelp.textContent = "Automatically format the query using the selected formatter before executing it.";
    addClass(autoformatHelp, "settingsHelp");
    autoformatHelp.style.marginTop = "5px";

    autoformatCheckboxContainer.appendChild(autoformatCheckbox);
    autoformatCheckboxContainer.appendChild(autoformatLabel);

    autoformatSection.appendChild(autoformatCheckboxContainer);
    autoformatSection.appendChild(autoformatHelp);
    container.appendChild(autoformatSection);
  }

  private drawRequestSettings(container: HTMLElement) {
    // This is a simplified version - you can expand based on TabPanel.ts
    const reqConfig = this.tab.getRequestConfig();

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
    // Reload editor settings in case yasqe wasn't available during init
    const editorContent = this.modalContent.querySelector("#editor-content");
    if (editorContent && editorContent.innerHTML === "") {
      this.drawEditorSettings(editorContent as HTMLElement);
    }
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

    // Save editor settings
    const yasqe = this.tab.getYasqe();
    if (yasqe && yasqe.persistentConfig) {
      const formatterSelect = document.getElementById("formatterTypeSelect") as HTMLSelectElement;
      const autoformatCheckbox = document.getElementById("autoformatOnQuery") as HTMLInputElement;

      if (formatterSelect) {
        yasqe.persistentConfig.formatterType = formatterSelect.value as "sparql-formatter" | "legacy";
      }
      if (autoformatCheckbox) {
        yasqe.persistentConfig.autoformatOnQuery = autoformatCheckbox.checked;
      }
      yasqe.saveQuery();
    }

    // Save request settings
    const requestContent = this.modalContent.querySelector("#request-content");
    if (requestContent) {
      const selects = requestContent.querySelectorAll("select[data-config]");
      const updates: any = {};
      selects.forEach((select) => {
        const config = (select as HTMLSelectElement).getAttribute("data-config");
        if (config) {
          updates[config] = (select as HTMLSelectElement).value;
        }
      });
      this.tab.setRequestConfig(updates);
    }

    // Refresh endpoint buttons to show any changes
    this.tab.refreshEndpointButtons();

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

  private drawEndpointButtonsSettings(container: HTMLElement) {
    const section = document.createElement("div");
    addClass(section, "settingsSection");

    const label = document.createElement("label");
    label.textContent = "Custom Endpoint Buttons";
    addClass(label, "settingsLabel");

    const help = document.createElement("div");
    help.textContent = "Add custom endpoint buttons that will appear next to the endpoint textbox.";
    addClass(help, "settingsHelp");

    section.appendChild(label);
    section.appendChild(help);

    // List of existing buttons
    const buttonsList = document.createElement("div");
    addClass(buttonsList, "endpointButtonsList");
    this.renderEndpointButtonsList(buttonsList);
    section.appendChild(buttonsList);

    // Form to add new button
    const addForm = document.createElement("div");
    addClass(addForm, "addEndpointButtonForm");

    const labelInput = document.createElement("input");
    labelInput.type = "text";
    labelInput.placeholder = "Button label (e.g., DBpedia)";
    addClass(labelInput, "endpointButtonLabelInput");

    const endpointInput = document.createElement("input");
    endpointInput.type = "url";
    endpointInput.placeholder = "Endpoint URL (e.g., https://dbpedia.org/sparql)";
    addClass(endpointInput, "endpointButtonEndpointInput");

    const addButton = document.createElement("button");
    addButton.textContent = "+ Add Button";
    addClass(addButton, "addEndpointButton");
    addButton.type = "button";
    addButton.onclick = () => {
      const labelValue = labelInput.value.trim();
      const endpointValue = endpointInput.value.trim();

      if (!labelValue || !endpointValue) {
        alert("Please enter both a label and an endpoint URL.");
        return;
      }

      // Add to persistent config
      const currentButtons = this.tab.yasgui.persistentConfig.getCustomEndpointButtons();
      currentButtons.push({ label: labelValue, endpoint: endpointValue });
      this.tab.yasgui.persistentConfig.setCustomEndpointButtons(currentButtons);

      // Clear inputs
      labelInput.value = "";
      endpointInput.value = "";

      // Refresh list
      this.renderEndpointButtonsList(buttonsList);
    };

    addForm.appendChild(labelInput);
    addForm.appendChild(endpointInput);
    addForm.appendChild(addButton);
    section.appendChild(addForm);

    container.appendChild(section);
  }

  private renderEndpointButtonsList(container: HTMLElement) {
    container.innerHTML = "";
    const customButtons = this.tab.yasgui.persistentConfig.getCustomEndpointButtons();

    if (customButtons.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.textContent = "No custom buttons yet. Add one below.";
      addClass(emptyMsg, "emptyMessage");
      container.appendChild(emptyMsg);
      return;
    }

    customButtons.forEach((btn, index) => {
      const item = document.createElement("div");
      addClass(item, "endpointButtonItem");

      const labelSpan = document.createElement("span");
      labelSpan.textContent = `${btn.label}`;
      addClass(labelSpan, "buttonLabel");

      const endpointSpan = document.createElement("span");
      endpointSpan.textContent = btn.endpoint;
      addClass(endpointSpan, "buttonEndpoint");

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "×";
      addClass(removeBtn, "removeButton");
      removeBtn.type = "button";
      removeBtn.onclick = () => {
        const currentButtons = this.tab.yasgui.persistentConfig.getCustomEndpointButtons();
        currentButtons.splice(index, 1);
        this.tab.yasgui.persistentConfig.setCustomEndpointButtons(currentButtons);
        this.renderEndpointButtonsList(container);
      };

      item.appendChild(labelSpan);
      item.appendChild(endpointSpan);
      item.appendChild(removeBtn);
      container.appendChild(item);
    });
  }

  private getThemeToggleIcon(): string {
    const currentTheme = this.tab.yasgui.getTheme();
    // In dark mode, show moon icon (clicking will switch to light)
    // In light mode, show sun icon (clicking will switch to dark)
    return currentTheme === "dark" ? MOON_ICON : SUN_ICON;
  }

  private drawValidationSettings(container: HTMLElement) {
    const section = document.createElement("div");
    addClass(section, "settingsSection");

    const label = document.createElement("label");
    label.textContent = "CONSTRUCT Result Validation";
    addClass(label, "settingsLabel");

    const help = document.createElement("div");
    help.textContent =
      "Define expected patterns for CONSTRUCT query results. Yasgui will check if these patterns exist in the results and show warnings for missing patterns. This is useful for validating inference rules.";
    addClass(help, "settingsHelp");

    section.appendChild(label);
    section.appendChild(help);

    // List of existing patterns
    const patternsList = document.createElement("div");
    addClass(patternsList, "validationPatternsList");
    this.renderValidationPatternsList(patternsList);
    section.appendChild(patternsList);

    // Form to add new pattern
    const addForm = document.createElement("div");
    addClass(addForm, "addValidationPatternForm");

    const formLabel = document.createElement("div");
    formLabel.textContent = "Add Expected Pattern:";
    addClass(formLabel, "formLabel");
    addForm.appendChild(formLabel);

    const inputsContainer = document.createElement("div");
    addClass(inputsContainer, "validationInputs");

    const subjectInput = document.createElement("input");
    subjectInput.type = "text";
    subjectInput.placeholder = "Subject (or * for any)";
    addClass(subjectInput, "validationPatternInput");
    inputsContainer.appendChild(subjectInput);

    const predicateInput = document.createElement("input");
    predicateInput.type = "text";
    predicateInput.placeholder = "Predicate (or * for any)";
    addClass(predicateInput, "validationPatternInput");
    inputsContainer.appendChild(predicateInput);

    const objectInput = document.createElement("input");
    objectInput.type = "text";
    objectInput.placeholder = "Object (or * for any)";
    addClass(objectInput, "validationPatternInput");
    inputsContainer.appendChild(objectInput);

    addForm.appendChild(inputsContainer);

    const descriptionInput = document.createElement("input");
    descriptionInput.type = "text";
    descriptionInput.placeholder = "Optional description";
    addClass(descriptionInput, "validationDescriptionInput");
    addForm.appendChild(descriptionInput);

    const addButton = document.createElement("button");
    addButton.textContent = "+ Add Pattern";
    addClass(addButton, "addValidationPatternButton");
    addButton.type = "button";
    addButton.onclick = () => {
      const subject = subjectInput.value.trim();
      const predicate = predicateInput.value.trim();
      const object = objectInput.value.trim();
      const description = descriptionInput.value.trim();

      if (!subject && !predicate && !object) {
        alert("Please specify at least one field (subject, predicate, or object)");
        return;
      }

      const pattern: ValidationPattern = {};
      if (subject) pattern.subject = subject;
      if (predicate) pattern.predicate = predicate;
      if (object) pattern.object = object;
      if (description) pattern.description = description;

      this.addValidationPattern(pattern);
      this.renderValidationPatternsList(patternsList);

      // Clear inputs
      subjectInput.value = "";
      predicateInput.value = "";
      objectInput.value = "";
      descriptionInput.value = "";
    };
    addForm.appendChild(addButton);

    section.appendChild(addForm);
    container.appendChild(section);
  }

  private renderValidationPatternsList(container: HTMLElement) {
    container.innerHTML = "";

    const patterns = this.tab.getValidationPatterns();
    if (!patterns || patterns.length === 0) {
      const empty = document.createElement("div");
      addClass(empty, "emptyValidationList");
      empty.textContent = "No validation patterns defined. Add patterns below to validate CONSTRUCT results.";
      container.appendChild(empty);
      return;
    }

    const list = document.createElement("ul");
    addClass(list, "validationList");

    patterns.forEach((pattern, index) => {
      const item = document.createElement("li");
      addClass(item, "validationListItem");

      const patternInfo = document.createElement("div");
      addClass(patternInfo, "patternInfo");

      const patternText = document.createElement("code");
      const s = pattern.subject || "*";
      const p = pattern.predicate || "*";
      const o = pattern.object || "*";
      patternText.textContent = `${s} ${p} ${o}`;
      patternInfo.appendChild(patternText);

      if (pattern.description) {
        const desc = document.createElement("span");
        addClass(desc, "patternDescription");
        desc.textContent = pattern.description;
        patternInfo.appendChild(desc);
      }

      item.appendChild(patternInfo);

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      addClass(deleteBtn, "deletePatternButton");
      deleteBtn.onclick = () => {
        this.removeValidationPattern(index);
        this.renderValidationPatternsList(container);
      };
      item.appendChild(deleteBtn);

      list.appendChild(item);
    });

    container.appendChild(list);
  }

  private addValidationPattern(pattern: ValidationPattern) {
    const patterns = this.tab.getValidationPatterns() || [];
    patterns.push(pattern);
    this.tab.setValidationPatterns(patterns);
  }

  private removeValidationPattern(index: number) {
    const patterns = this.tab.getValidationPatterns() || [];
    patterns.splice(index, 1);
    this.tab.setValidationPatterns(patterns);
  }

  public destroy() {
    if (this.modalOverlay && this.modalOverlay.parentNode) {
      this.modalOverlay.parentNode.removeChild(this.modalOverlay);
    }
  }
}
