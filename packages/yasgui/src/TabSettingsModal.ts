import { addClass, removeClass } from "@matdata/yasgui-utils";
import "./TabSettingsModal.scss";
import Tab from "./Tab";
import * as ConfigExportImport from "./ConfigExportImport";
import { VERSION } from "./version";

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

    // Body with sidebar navigation
    const body = document.createElement("div");
    addClass(body, "modalBody");

    // Sidebar navigation
    const sidebar = document.createElement("div");
    addClass(sidebar, "modalSidebar");

    const requestTab = document.createElement("button");
    requestTab.textContent = "Request";
    addClass(requestTab, "modalNavButton", "active");
    requestTab.onclick = () => this.switchTab("request");

    const endpointsTab = document.createElement("button");
    endpointsTab.textContent = "SPARQL Endpoints";
    addClass(endpointsTab, "modalNavButton");
    endpointsTab.onclick = () => this.switchTab("endpoints");

    const prefixTab = document.createElement("button");
    prefixTab.textContent = "Prefixes";
    addClass(prefixTab, "modalNavButton");
    prefixTab.onclick = () => this.switchTab("prefix");

    const editorTab = document.createElement("button");
    editorTab.textContent = "Editor";
    addClass(editorTab, "modalNavButton");
    editorTab.onclick = () => this.switchTab("editor");

    const importExportTab = document.createElement("button");
    importExportTab.textContent = "Import/Export";
    addClass(importExportTab, "modalNavButton");
    importExportTab.onclick = () => this.switchTab("importexport");

    const shortcutsTab = document.createElement("button");
    shortcutsTab.textContent = "Keyboard Shortcuts";
    addClass(shortcutsTab, "modalNavButton");
    shortcutsTab.onclick = () => this.switchTab("shortcuts");

    const aboutTab = document.createElement("button");
    aboutTab.textContent = "About";
    addClass(aboutTab, "modalNavButton");
    aboutTab.onclick = () => this.switchTab("about");

    sidebar.appendChild(requestTab);
    sidebar.appendChild(endpointsTab);
    sidebar.appendChild(prefixTab);
    sidebar.appendChild(editorTab);
    sidebar.appendChild(importExportTab);
    sidebar.appendChild(shortcutsTab);
    sidebar.appendChild(aboutTab);

    // Content area container
    const contentArea = document.createElement("div");
    addClass(contentArea, "modalContentArea");

    body.appendChild(sidebar);
    body.appendChild(contentArea);

    // Tab content containers
    const requestContent = document.createElement("div");
    addClass(requestContent, "modalTabContent", "active");
    requestContent.id = "request-content";
    this.drawRequestSettings(requestContent);

    const endpointsContent = document.createElement("div");
    addClass(endpointsContent, "modalTabContent");
    endpointsContent.id = "endpoints-content";
    this.drawEndpointsSettings(endpointsContent);

    const prefixContent = document.createElement("div");
    addClass(prefixContent, "modalTabContent");
    prefixContent.id = "prefix-content";
    this.drawPrefixSettings(prefixContent);

    const editorContent = document.createElement("div");
    addClass(editorContent, "modalTabContent");
    editorContent.id = "editor-content";
    this.drawEditorSettings(editorContent);

    const importExportContent = document.createElement("div");
    addClass(importExportContent, "modalTabContent");
    importExportContent.id = "importexport-content";
    this.drawImportExportSettings(importExportContent);

    const shortcutsContent = document.createElement("div");
    addClass(shortcutsContent, "modalTabContent");
    shortcutsContent.id = "shortcuts-content";
    this.drawKeyboardShortcuts(shortcutsContent);

    const aboutContent = document.createElement("div");
    addClass(aboutContent, "modalTabContent");
    aboutContent.id = "about-content";
    this.drawAboutSettings(aboutContent);

    contentArea.appendChild(requestContent);
    contentArea.appendChild(endpointsContent);
    contentArea.appendChild(prefixContent);
    contentArea.appendChild(editorContent);
    contentArea.appendChild(importExportContent);
    contentArea.appendChild(shortcutsContent);
    contentArea.appendChild(aboutContent);

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
    const buttons = this.modalContent.querySelectorAll(".modalNavButton");
    const contents = this.modalContent.querySelectorAll(".modalTabContent");

    buttons.forEach((btn, index) => {
      if (
        (tabName === "request" && index === 0) ||
        (tabName === "endpoints" && index === 1) ||
        (tabName === "prefix" && index === 2) ||
        (tabName === "editor" && index === 3) ||
        (tabName === "importexport" && index === 4) ||
        (tabName === "shortcuts" && index === 5) ||
        (tabName === "about" && index === 6)
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

    // CONSTRUCT Variable Validation Section
    const constructValidationSection = document.createElement("div");
    addClass(constructValidationSection, "settingsSection");

    const constructValidationCheckboxContainer = document.createElement("div");
    addClass(constructValidationCheckboxContainer, "checkboxContainer");

    const constructValidationCheckbox = document.createElement("input");
    constructValidationCheckbox.type = "checkbox";
    constructValidationCheckbox.id = "checkConstructVariables";
    constructValidationCheckbox.checked = yasqe.config.checkConstructVariables ?? true;

    const constructValidationLabel = document.createElement("label");
    constructValidationLabel.htmlFor = "checkConstructVariables";
    constructValidationLabel.textContent = "Validate CONSTRUCT query variables";

    const constructValidationHelp = document.createElement("div");
    constructValidationHelp.textContent =
      "Show warnings for variables used in CONSTRUCT template but not defined in WHERE clause.";
    addClass(constructValidationHelp, "settingsHelp");
    constructValidationHelp.style.marginTop = "5px";

    constructValidationCheckboxContainer.appendChild(constructValidationCheckbox);
    constructValidationCheckboxContainer.appendChild(constructValidationLabel);

    constructValidationSection.appendChild(constructValidationCheckboxContainer);
    constructValidationSection.appendChild(constructValidationHelp);
    container.appendChild(constructValidationSection);

    // Code Snippets Bar Visibility Section
    const snippetsBarSection = document.createElement("div");
    addClass(snippetsBarSection, "settingsSection");

    const snippetsBarCheckboxContainer = document.createElement("div");
    addClass(snippetsBarCheckboxContainer, "checkboxContainer");

    const snippetsBarCheckbox = document.createElement("input");
    snippetsBarCheckbox.type = "checkbox";
    snippetsBarCheckbox.id = "showSnippetsBar";
    snippetsBarCheckbox.checked = yasqe.getSnippetsBarVisible();

    const snippetsBarLabel = document.createElement("label");
    snippetsBarLabel.htmlFor = "showSnippetsBar";
    snippetsBarLabel.textContent = "Show code snippets bar";

    const snippetsBarHelp = document.createElement("div");
    snippetsBarHelp.textContent =
      "Display the code snippets bar above the editor for quick insertion of common SPARQL patterns.";
    addClass(snippetsBarHelp, "settingsHelp");
    snippetsBarHelp.style.marginTop = "5px";

    snippetsBarCheckboxContainer.appendChild(snippetsBarCheckbox);
    snippetsBarCheckboxContainer.appendChild(snippetsBarLabel);

    snippetsBarSection.appendChild(snippetsBarCheckboxContainer);
    snippetsBarSection.appendChild(snippetsBarHelp);
    container.appendChild(snippetsBarSection);
  }

  private drawEndpointsSettings(container: HTMLElement) {
    const section = document.createElement("div");
    addClass(section, "settingsSection");

    const label = document.createElement("label");
    label.textContent = "SPARQL Endpoints";
    addClass(label, "settingsLabel");

    const help = document.createElement("div");
    help.textContent =
      "Manage your SPARQL endpoints. Each endpoint can have its own authentication and be displayed as a quick-switch button.";
    addClass(help, "settingsHelp");

    section.appendChild(label);
    section.appendChild(help);

    // List of endpoints
    const endpointsList = document.createElement("div");
    addClass(endpointsList, "endpointsTable");
    this.renderEndpointsList(endpointsList);
    section.appendChild(endpointsList);

    container.appendChild(section);
  }

  private renderEndpointsList(container: HTMLElement) {
    container.innerHTML = "";
    const configs = this.tab.yasgui.persistentConfig.getEndpointConfigs();

    // Create table (even if empty, we'll show add form)
    const table = document.createElement("table");
    addClass(table, "endpointsTableElement");

    // Header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = ["Endpoint", "Label", "Button", "Authentication", "Actions"];
    headers.forEach((h) => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body
    const tbody = document.createElement("tbody");

    if (configs.length === 0) {
      // Show empty message in table
      const emptyRow = document.createElement("tr");
      const emptyCell = document.createElement("td");
      emptyCell.colSpan = 5;
      emptyCell.textContent = "No endpoints yet. Add one below or access an endpoint to have it automatically tracked.";
      addClass(emptyCell, "emptyMessage");
      emptyCell.style.textAlign = "center";
      emptyCell.style.padding = "20px";
      emptyRow.appendChild(emptyCell);
      tbody.appendChild(emptyRow);
    }

    configs.forEach((config, index) => {
      const row = document.createElement("tr");

      // Endpoint column
      const endpointCell = document.createElement("td");
      endpointCell.textContent = config.endpoint;
      endpointCell.title = config.endpoint;
      addClass(endpointCell, "endpointCell");
      row.appendChild(endpointCell);

      // Label column (editable)
      const labelCell = document.createElement("td");
      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.value = config.label || "";
      labelInput.placeholder = "Optional label";
      addClass(labelInput, "endpointLabelInput");
      labelInput.onchange = () => {
        this.tab.yasgui.persistentConfig.addOrUpdateEndpoint(config.endpoint, {
          label: labelInput.value.trim() || undefined,
        });
        this.renderEndpointsList(container);
        this.tab.refreshEndpointButtons();
      };
      labelCell.appendChild(labelInput);
      row.appendChild(labelCell);

      // Show as Button checkbox (requires label)
      const buttonCell = document.createElement("td");
      const buttonCheckbox = document.createElement("input");
      buttonCheckbox.type = "checkbox";
      buttonCheckbox.checked = !!config.showAsButton;
      buttonCheckbox.disabled = !config.label;
      buttonCheckbox.title = config.label
        ? "Show this endpoint as a quick-switch button"
        : "Add a label first to enable button";
      buttonCheckbox.onchange = () => {
        this.tab.yasgui.persistentConfig.addOrUpdateEndpoint(config.endpoint, {
          showAsButton: buttonCheckbox.checked,
        });
        this.tab.refreshEndpointButtons();
      };
      buttonCell.appendChild(buttonCheckbox);
      addClass(buttonCell, "centerCell");
      row.appendChild(buttonCell);

      // Authentication column
      const authCell = document.createElement("td");
      const authButton = document.createElement("button");
      authButton.type = "button";
      addClass(authButton, "configureAuthButton");
      if (config.authentication) {
        authButton.textContent = "✓ Configured";
        addClass(authButton, "authenticated");
      } else {
        authButton.textContent = "Configure";
      }
      authButton.onclick = () => this.showAuthenticationModal(config.endpoint);
      authCell.appendChild(authButton);
      addClass(authCell, "centerCell");
      row.appendChild(authCell);

      // Actions column
      const actionsCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Delete";
      addClass(deleteButton, "deleteEndpointButton");
      deleteButton.onclick = () => {
        if (confirm(`Delete endpoint "${config.endpoint}"?`)) {
          this.tab.yasgui.persistentConfig.deleteEndpointConfig(config.endpoint);
          this.renderEndpointsList(container);
          this.tab.refreshEndpointButtons();
        }
      };
      actionsCell.appendChild(deleteButton);
      addClass(actionsCell, "centerCell");
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);

    // Add endpoint form
    const addForm = document.createElement("div");
    addClass(addForm, "addEndpointForm");

    const addFormTitle = document.createElement("div");
    addFormTitle.textContent = "Add New Endpoint";
    addClass(addFormTitle, "addFormTitle");
    addForm.appendChild(addFormTitle);

    const formInputs = document.createElement("div");
    addClass(formInputs, "addFormInputs");

    const endpointInput = document.createElement("input");
    endpointInput.type = "url";
    endpointInput.placeholder = "Endpoint URL (e.g., https://dbpedia.org/sparql)";
    addClass(endpointInput, "addEndpointInput");
    formInputs.appendChild(endpointInput);

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.textContent = "+ Add Endpoint";
    addClass(addButton, "addEndpointButton");
    addButton.onclick = () => {
      const endpoint = endpointInput.value.trim();

      if (!endpoint) {
        alert("Please enter an endpoint URL.");
        return;
      }

      // Validate URL format
      try {
        new URL(endpoint);
      } catch (e) {
        alert("Please enter a valid URL.");
        return;
      }

      // Check if endpoint already exists
      const existing = this.tab.yasgui.persistentConfig.getEndpointConfig(endpoint);
      if (existing) {
        alert("This endpoint is already in the list.");
        return;
      }

      // Add the endpoint
      this.tab.yasgui.persistentConfig.addOrUpdateEndpoint(endpoint, {});

      // Clear input
      endpointInput.value = "";

      // Refresh list
      this.renderEndpointsList(container);
      this.tab.refreshEndpointButtons();
    };
    formInputs.appendChild(addButton);

    addForm.appendChild(formInputs);
    container.appendChild(addForm);
  }

  private showAuthenticationModal(endpoint: string) {
    const config = this.tab.yasgui.persistentConfig.getEndpointConfig(endpoint);
    const existingAuth = config?.authentication;

    // Create modal overlay
    const authModalOverlay = document.createElement("div");
    addClass(authModalOverlay, "authModalOverlay");
    authModalOverlay.onclick = () => authModalOverlay.remove();

    // Create modal content
    const authModal = document.createElement("div");
    addClass(authModal, "authModal");
    authModal.onclick = (e) => e.stopPropagation();

    // Header
    const header = document.createElement("div");
    addClass(header, "authModalHeader");
    const title = document.createElement("h3");
    title.textContent = "Configure Authentication";
    const subtitle = document.createElement("div");
    subtitle.textContent = endpoint;
    addClass(subtitle, "authModalSubtitle");
    header.appendChild(title);
    header.appendChild(subtitle);
    authModal.appendChild(header);

    // Body
    const body = document.createElement("div");
    addClass(body, "authModalBody");

    // Auth type (for now only basic, but designed for future)
    const typeSection = document.createElement("div");
    addClass(typeSection, "authModalSection");
    const typeLabel = document.createElement("label");
    typeLabel.textContent = "Authentication Type";
    const typeSelect = document.createElement("select");
    const basicOption = document.createElement("option");
    basicOption.value = "basic";
    basicOption.textContent = "HTTP Basic Authentication";
    typeSelect.appendChild(basicOption);
    // Future: Add OAuth, Bearer Token, etc.
    typeSection.appendChild(typeLabel);
    typeSection.appendChild(typeSelect);
    body.appendChild(typeSection);

    // Username
    const usernameSection = document.createElement("div");
    addClass(usernameSection, "authModalSection");
    const usernameLabel = document.createElement("label");
    usernameLabel.textContent = "Username";
    const usernameInput = document.createElement("input");
    usernameInput.type = "text";
    usernameInput.placeholder = "Enter username";
    usernameInput.value = existingAuth?.username || "";
    usernameInput.autocomplete = "username";
    usernameSection.appendChild(usernameLabel);
    usernameSection.appendChild(usernameInput);
    body.appendChild(usernameSection);

    // Password
    const passwordSection = document.createElement("div");
    addClass(passwordSection, "authModalSection");
    const passwordLabel = document.createElement("label");
    passwordLabel.textContent = "Password";
    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.placeholder = "Enter password";
    passwordInput.value = existingAuth?.password || "";
    passwordInput.autocomplete = "current-password";
    passwordSection.appendChild(passwordLabel);
    passwordSection.appendChild(passwordInput);
    body.appendChild(passwordSection);

    // Security notice
    const securityNotice = document.createElement("div");
    addClass(securityNotice, "authSecurityNotice");
    securityNotice.innerHTML = `
      <strong>⚠️ Security Notice:</strong>
      <ul>
        <li>Credentials are stored in browser localStorage</li>
        <li>Only use with HTTPS endpoints</li>
        <li>Be cautious when using on shared computers</li>
      </ul>
    `;
    body.appendChild(securityNotice);

    authModal.appendChild(body);

    // Footer
    const footer = document.createElement("div");
    addClass(footer, "authModalFooter");

    const removeButton = document.createElement("button");
    removeButton.textContent = "Remove Authentication";
    removeButton.type = "button";
    addClass(removeButton, "authRemoveButton");
    removeButton.onclick = () => {
      this.tab.yasgui.persistentConfig.addOrUpdateEndpoint(endpoint, {
        authentication: undefined,
      });
      authModalOverlay.remove();
      const endpointsList = this.modalContent.querySelector(".endpointsTable");
      if (endpointsList) this.renderEndpointsList(endpointsList as HTMLElement);
    };
    if (!existingAuth) {
      removeButton.disabled = true;
    }

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.type = "button";
    addClass(cancelButton, "authCancelButton");
    cancelButton.onclick = () => authModalOverlay.remove();

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.type = "button";
    addClass(saveButton, "authSaveButton");
    saveButton.onclick = () => {
      const username = usernameInput.value.trim();
      const password = passwordInput.value;

      if (username && password) {
        this.tab.yasgui.persistentConfig.addOrUpdateEndpoint(endpoint, {
          authentication: {
            type: "basic",
            username,
            password,
          },
        });
        authModalOverlay.remove();
        const endpointsList = this.modalContent.querySelector(".endpointsTable");
        if (endpointsList) this.renderEndpointsList(endpointsList as HTMLElement);
      } else {
        alert("Please enter both username and password.");
      }
    };

    footer.appendChild(removeButton);
    footer.appendChild(cancelButton);
    footer.appendChild(saveButton);
    authModal.appendChild(footer);

    authModalOverlay.appendChild(authModal);
    document.body.appendChild(authModalOverlay);
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
      const constructValidationCheckbox = document.getElementById("checkConstructVariables") as HTMLInputElement;

      if (formatterSelect) {
        yasqe.persistentConfig.formatterType = formatterSelect.value as "sparql-formatter" | "legacy";
      }
      if (autoformatCheckbox) {
        yasqe.persistentConfig.autoformatOnQuery = autoformatCheckbox.checked;
      }
      if (constructValidationCheckbox) {
        yasqe.setCheckConstructVariables(constructValidationCheckbox.checked);
      }
      const snippetsBarCheckbox = document.getElementById("showSnippetsBar") as HTMLInputElement;
      if (snippetsBarCheckbox) {
        yasqe.setSnippetsBarVisible(snippetsBarCheckbox.checked);
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

    // Note: Authentication is now handled per-endpoint in the Endpoints tab,
    // not per-tab anymore. No need to save it here.

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
      const hasContent = lines.some((line: string) => line.trim().length > 0);
      if (
        !hasContent ||
        lines.every((line: string) => line.trim().length === 0 || line.trim().toUpperCase().startsWith("PREFIX"))
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

  // Old endpoint buttons functionality has been merged into drawEndpointsSettings
  // Keeping this for reference if needed for backwards compatibility

  private getThemeToggleIcon(): string {
    const currentTheme = this.tab.yasgui.getTheme();
    // In dark mode, show moon icon (clicking will switch to light)
    // In light mode, show sun icon (clicking will switch to dark)
    return currentTheme === "dark" ? MOON_ICON : SUN_ICON;
  }

  private drawImportExportSettings(container: HTMLElement) {
    // Export Section
    const exportSection = document.createElement("div");
    addClass(exportSection, "settingsSection");

    const exportLabel = document.createElement("label");
    exportLabel.textContent = "Export Configuration";
    addClass(exportLabel, "settingsLabel");

    const exportHelp = document.createElement("div");
    exportHelp.textContent =
      "Export your YASGUI configuration in RDF Turtle format. This includes tabs, queries, endpoints, and preferences.";
    addClass(exportHelp, "settingsHelp");

    const exportButtonsContainer = document.createElement("div");
    addClass(exportButtonsContainer, "exportButtons");

    const copyButton = document.createElement("button");
    copyButton.textContent = "📋 Copy to Clipboard";
    copyButton.type = "button";
    addClass(copyButton, "secondaryButton");
    copyButton.onclick = async () => {
      try {
        const config = this.tab.yasgui.persistentConfig.getPersistedConfig();
        await ConfigExportImport.copyConfigToClipboard(config);
        this.showNotification("Configuration copied to clipboard!", "success");
      } catch (error) {
        this.showNotification("Failed to copy to clipboard: " + (error as Error).message, "error");
      }
    };

    const downloadButton = document.createElement("button");
    downloadButton.textContent = "💾 Download as File";
    downloadButton.type = "button";
    addClass(downloadButton, "primaryButton");
    downloadButton.onclick = () => {
      try {
        const config = this.tab.yasgui.persistentConfig.getPersistedConfig();
        ConfigExportImport.downloadConfigAsFile(config);
        this.showNotification("Configuration downloaded!", "success");
      } catch (error) {
        this.showNotification("Failed to download: " + (error as Error).message, "error");
      }
    };

    exportButtonsContainer.appendChild(copyButton);
    exportButtonsContainer.appendChild(downloadButton);

    exportSection.appendChild(exportLabel);
    exportSection.appendChild(exportHelp);
    exportSection.appendChild(exportButtonsContainer);
    container.appendChild(exportSection);

    // Import Section
    const importSection = document.createElement("div");
    addClass(importSection, "settingsSection");

    const importLabel = document.createElement("label");
    importLabel.textContent = "Import Configuration";
    addClass(importLabel, "settingsLabel");

    const importHelp = document.createElement("div");
    importHelp.textContent = "Import a previously exported configuration in RDF Turtle format.";
    addClass(importHelp, "settingsHelp");

    // Drag and drop area
    const dropZone = document.createElement("div");
    addClass(dropZone, "dropZone");
    dropZone.innerHTML = `
      <div class="dropZoneContent">
        <div class="dropZoneIcon">📁</div>
        <div class="dropZoneText">Drag & drop a .ttl file here</div>
        <div class="dropZoneOr">or</div>
      </div>
    `;

    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".ttl,.turtle,text/turtle";
    fileInput.style.display = "none";
    fileInput.id = "config-file-input";

    const browseButton = document.createElement("button");
    browseButton.textContent = "📂 Browse Files";
    browseButton.type = "button";
    addClass(browseButton, "secondaryButton");
    browseButton.onclick = () => fileInput.click();

    const pasteButton = document.createElement("button");
    pasteButton.textContent = "📋 Paste from Clipboard";
    pasteButton.type = "button";
    addClass(pasteButton, "secondaryButton");
    pasteButton.onclick = async () => {
      try {
        const content = await ConfigExportImport.readConfigFromClipboard();
        await this.importConfiguration(content);
      } catch (error) {
        this.showNotification("Failed to read from clipboard: " + (error as Error).message, "error");
      }
    };

    // File input change handler
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const content = await ConfigExportImport.readConfigFromFile(file);
          await this.importConfiguration(content);
        } catch (error) {
          this.showNotification("Failed to read file: " + (error as Error).message, "error");
        }
      }
    };

    // Drag and drop handlers
    dropZone.ondragover = (e) => {
      e.preventDefault();
      addClass(dropZone, "dragover");
    };

    dropZone.ondragleave = () => {
      removeClass(dropZone, "dragover");
    };

    dropZone.ondrop = async (e) => {
      e.preventDefault();
      removeClass(dropZone, "dragover");

      const file = e.dataTransfer?.files?.[0];
      if (file) {
        try {
          const content = await ConfigExportImport.readConfigFromFile(file);
          await this.importConfiguration(content);
        } catch (error) {
          this.showNotification("Failed to read file: " + (error as Error).message, "error");
        }
      }
    };

    const importButtonsContainer = document.createElement("div");
    addClass(importButtonsContainer, "importButtons");
    importButtonsContainer.appendChild(browseButton);
    importButtonsContainer.appendChild(pasteButton);

    dropZone.appendChild(importButtonsContainer);

    importSection.appendChild(importLabel);
    importSection.appendChild(importHelp);
    importSection.appendChild(dropZone);
    importSection.appendChild(fileInput);
    container.appendChild(importSection);
  }

  private drawKeyboardShortcuts(container: HTMLElement) {
    const shortcutsData = [
      {
        category: "Query Editor (YASQE)",
        shortcuts: [
          { keys: ["Ctrl+Enter", "Cmd+Enter"], description: "Execute query" },
          { keys: ["Ctrl+Space", "Cmd+Space"], description: "Trigger autocomplete" },
          { keys: ["Ctrl+S", "Cmd+S"], description: "Save query to local storage" },
          { keys: ["Ctrl+Shift+F", "Cmd+Shift+F"], description: "Format query" },
          { keys: ["Ctrl+/", "Cmd+/"], description: "Toggle comment on selected lines" },
          { keys: ["Ctrl+Shift+D", "Cmd+Shift+D"], description: "Duplicate current line" },
          { keys: ["Ctrl+Shift+K", "Cmd+Shift+K"], description: "Delete current line" },
          { keys: ["Esc"], description: "Remove focus from editor" },
          { keys: ["Ctrl+Click"], description: "Explore URI connections (on URI)" },
        ],
      },
      {
        category: "Fullscreen",
        shortcuts: [
          { keys: ["F11"], description: "Toggle YASQE (editor) fullscreen" },
          { keys: ["F10"], description: "Toggle YASR (results) fullscreen" },
          { keys: ["F9"], description: "Switch between YASQE and YASR fullscreen" },
          { keys: ["Esc"], description: "Exit fullscreen mode" },
        ],
      },
    ];

    shortcutsData.forEach((section) => {
      const sectionEl = document.createElement("div");
      addClass(sectionEl, "shortcutsSection");

      const categoryLabel = document.createElement("h3");
      categoryLabel.textContent = section.category;
      addClass(categoryLabel, "shortcutsCategory");
      sectionEl.appendChild(categoryLabel);

      const table = document.createElement("table");
      addClass(table, "shortcutsTable");
      table.setAttribute("role", "table");
      table.setAttribute("aria-label", `${section.category} keyboard shortcuts`);

      // Add table caption for screen readers
      const caption = document.createElement("caption");
      caption.textContent = `${section.category} keyboard shortcuts`;
      caption.style.position = "absolute";
      caption.style.left = "-10000px";
      caption.style.width = "1px";
      caption.style.height = "1px";
      caption.style.overflow = "hidden";
      table.appendChild(caption);

      // Add thead with proper headers
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      const keysHeader = document.createElement("th");
      keysHeader.textContent = "Keys";
      keysHeader.setAttribute("scope", "col");
      addClass(keysHeader, "shortcutsKeysHeader");
      headerRow.appendChild(keysHeader);

      const descHeader = document.createElement("th");
      descHeader.textContent = "Description";
      descHeader.setAttribute("scope", "col");
      addClass(descHeader, "shortcutsDescHeader");
      headerRow.appendChild(descHeader);

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Add tbody
      const tbody = document.createElement("tbody");

      section.shortcuts.forEach((shortcut) => {
        const row = document.createElement("tr");

        const keysCell = document.createElement("td");
        addClass(keysCell, "shortcutsKeys");
        shortcut.keys.forEach((key, index) => {
          if (index > 0) {
            const separator = document.createElement("span");
            separator.textContent = " / ";
            addClass(separator, "shortcutsSeparator");
            keysCell.appendChild(separator);
          }
          const kbd = document.createElement("kbd");
          kbd.textContent = key;
          keysCell.appendChild(kbd);
        });
        row.appendChild(keysCell);

        const descCell = document.createElement("td");
        addClass(descCell, "shortcutsDescription");
        descCell.textContent = shortcut.description;
        row.appendChild(descCell);

        tbody.appendChild(row);
      });

      table.appendChild(tbody);

      sectionEl.appendChild(table);
      container.appendChild(sectionEl);
    });
  }

  private async importConfiguration(turtleContent: string) {
    try {
      const parsedConfig = ConfigExportImport.parseFromTurtle(turtleContent);

      // Confirm with user before importing
      const confirmMsg = `This will replace your current configuration with ${parsedConfig.tabs?.length || 0} tab(s). Continue?`;
      if (!confirm(confirmMsg)) {
        return;
      }

      // Close the modal first
      this.close();

      // Apply theme if provided
      if (parsedConfig.theme) {
        this.tab.yasgui.themeManager.setTheme(parsedConfig.theme);
      }

      // Apply global orientation if provided
      if (parsedConfig.orientation) {
        this.tab.yasgui.config.orientation = parsedConfig.orientation;
      }

      // Close all existing tabs
      const existingTabIds = [...this.tab.yasgui.persistentConfig.getTabs()];
      for (const tabId of existingTabIds) {
        const tab = this.tab.yasgui.getTab(tabId);
        if (tab) {
          tab.close();
        }
      }

      // Update the configuration storage
      this.tab.yasgui.persistentConfig.updatePersistedConfig(parsedConfig);

      window.location.reload();
    } catch (error) {
      this.showNotification("Failed to import configuration: " + (error as Error).message, "error");
    }
  }

  private showNotification(message: string, type: "success" | "error") {
    const notification = document.createElement("div");
    addClass(notification, "importExportNotification", type);
    notification.textContent = message;

    this.modalContent.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  private drawAboutSettings(container: HTMLElement) {
    // About Section
    const aboutSection = document.createElement("div");
    addClass(aboutSection, "settingsSection", "aboutSection");

    // YASGUI Title and Version
    const titleContainer = document.createElement("div");
    addClass(titleContainer, "aboutTitle");

    const title = document.createElement("h3");
    title.textContent = "YASGUI";
    addClass(title, "aboutMainTitle");

    const versionBadge = document.createElement("span");
    versionBadge.textContent = `v${VERSION}`;
    addClass(versionBadge, "versionBadge");

    titleContainer.appendChild(title);
    titleContainer.appendChild(versionBadge);
    aboutSection.appendChild(titleContainer);

    // Subtitle
    const subtitle = document.createElement("p");
    subtitle.textContent = "Yet Another SPARQL GUI";
    addClass(subtitle, "aboutSubtitle");
    aboutSection.appendChild(subtitle);

    // Links Section
    const linksSection = document.createElement("div");
    addClass(linksSection, "aboutLinks");

    // Documentation Link
    const docsLink = this.createAboutLink(
      "📚 Documentation",
      "https://yasgui-doc.matdata.eu/docs/",
      "View the complete documentation and guides",
    );
    linksSection.appendChild(docsLink);

    // Release Notes Link
    const releasesLink = this.createAboutLink(
      "📝 Release Notes",
      "https://github.com/Matdata-eu/Yasgui/releases",
      "See what's new in the latest releases",
    );
    linksSection.appendChild(releasesLink);

    // Issues/Support Link
    const issuesLink = this.createAboutLink(
      "🐛 Report Issues & Get Support",
      "https://github.com/Matdata-eu/Yasgui/issues",
      "Report bugs, request features, or ask for help",
    );
    linksSection.appendChild(issuesLink);

    aboutSection.appendChild(linksSection);

    // Footer info
    const footerInfo = document.createElement("div");
    addClass(footerInfo, "aboutFooter");

    const paragraph1 = document.createElement("p");
    paragraph1.textContent = "YASGUI is an open-source project maintained by ";
    const matdataLink = document.createElement("a");
    matdataLink.href = "https://matdata.eu";
    matdataLink.target = "_blank";
    matdataLink.rel = "noopener noreferrer";
    matdataLink.textContent = "Matdata";
    paragraph1.appendChild(matdataLink);
    paragraph1.appendChild(document.createTextNode("."));

    const paragraph2 = document.createElement("p");
    paragraph2.textContent = "Licensed under the MIT License.";

    footerInfo.appendChild(paragraph1);
    footerInfo.appendChild(paragraph2);
    aboutSection.appendChild(footerInfo);

    container.appendChild(aboutSection);
  }

  private createAboutLink(label: string, url: string, description: string): HTMLElement {
    const linkContainer = document.createElement("div");
    addClass(linkContainer, "aboutLinkItem");

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    addClass(link, "aboutLink");

    const desc = document.createElement("p");
    desc.textContent = description;
    addClass(desc, "aboutLinkDescription");

    linkContainer.appendChild(link);
    linkContainer.appendChild(desc);

    return linkContainer;
  }

  public destroy() {
    if (this.modalOverlay && this.modalOverlay.parentNode) {
      this.modalOverlay.parentNode.removeChild(this.modalOverlay);
    }
  }
}
