import { EventEmitter } from "events";
import { addClass, removeClass, getAsValue } from "@matdata/yasgui-utils";
import { TabListEl } from "./TabElements";
import TabSettingsModal from "./TabSettingsModal";
import { default as Yasqe, RequestConfig, PlainRequestConfig, PartialConfig as YasqeConfig } from "@matdata/yasqe";
import { default as Yasr, Parser, Config as YasrConfig, PersistentConfig as YasrPersistentConfig } from "@matdata/yasr";
import { mapValues, eq, mergeWith, words, deburr, invert } from "lodash-es";
import * as shareLink from "./linkUtils";
import EndpointSelect from "./endpointSelect";
import "./tab.scss";
import { getRandomId, default as Yasgui, YasguiRequestConfig } from "./";

// Layout orientation toggle icons
const HORIZONTAL_LAYOUT_ICON = `<svg viewBox="0 0 24 24" class="svgImg">
  <rect x="2" y="4" width="9" height="16" stroke="currentColor" stroke-width="2" fill="none"/>
  <rect x="13" y="4" width="9" height="16" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>`;

const VERTICAL_LAYOUT_ICON = `<svg viewBox="0 0 24 24" class="svgImg">
  <rect x="2" y="2" width="20" height="8" stroke="currentColor" stroke-width="2" fill="none"/>
  <rect x="2" y="12" width="20" height="10" stroke="currentColor" stroke-width="2" fill="none"/>
</svg>`;

export interface PersistedJsonYasr extends YasrPersistentConfig {
  responseSummary: Parser.ResponseSummary;
}

export interface PersistedJson {
  name: string;
  id: string;
  yasqe: {
    value: string;
    editorHeight?: string;
  };
  yasr: {
    settings: YasrPersistentConfig;
    response: Parser.ResponseSummary | undefined;
  };
  requestConfig: YasguiRequestConfig;
  orientation?: "vertical" | "horizontal";
}

export interface Tab {
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  on(event: "change", listener: (tab: Tab, config: PersistedJson) => void): this;
  emit(event: "change", tab: Tab, config: PersistedJson): boolean;
  on(event: "query", listener: (tab: Tab) => void): this;
  emit(event: "query", tab: Tab): boolean;
  on(event: "queryBefore", listener: (tab: Tab) => void): this;
  emit(event: "queryBefore", tab: Tab): boolean;
  on(event: "queryAbort", listener: (tab: Tab) => void): this;
  emit(event: "queryAbort", tab: Tab): boolean;
  on(event: "queryResponse", listener: (tab: Tab) => void): this;
  emit(event: "queryResponse", tab: Tab): boolean;
  on(event: "close", listener: (tab: Tab) => void): this;
  emit(event: "close", tab: Tab): boolean;
  on(event: "endpointChange", listener: (tab: Tab, endpoint: string) => void): this;
  emit(event: "endpointChange", tab: Tab, endpoint: string): boolean;
  on(event: "autocompletionShown", listener: (tab: Tab, widget: any) => void): this;
  emit(event: "autocompletionShown", tab: Tab, widget: any): boolean;
  on(event: "autocompletionClose", listener: (tab: Tab) => void): this;
  emit(event: "autocompletionClose", tab: Tab): boolean;
}

export class Tab extends EventEmitter {
  private persistentJson: PersistedJson;
  public yasgui: Yasgui;
  private yasqe: Yasqe | undefined;
  private yasr: Yasr | undefined;
  private rootEl: HTMLDivElement | undefined;
  private controlBarEl: HTMLDivElement | undefined;
  private yasqeWrapperEl: HTMLDivElement | undefined;
  private yasrWrapperEl: HTMLDivElement | undefined;
  private endpointSelect: EndpointSelect | undefined;
  private endpointButtonsContainer: HTMLDivElement | undefined;
  private settingsModal?: TabSettingsModal;
  private currentOrientation: "vertical" | "horizontal";
  private orientationToggleButton?: HTMLButtonElement;

  constructor(yasgui: Yasgui, conf: PersistedJson) {
    super();
    if (!conf || conf.id === undefined) throw new Error("Expected a valid configuration to initialize tab with");
    this.yasgui = yasgui;
    this.persistentJson = conf;
    this.currentOrientation = this.yasgui.config.orientation || "vertical";
  }

  public name() {
    return this.persistentJson.name;
  }

  public getPersistedJson() {
    return this.persistentJson;
  }

  public getId() {
    return this.persistentJson.id;
  }

  private draw() {
    if (this.rootEl) return; //aready drawn
    this.rootEl = document.createElement("div");
    this.rootEl.className = "tabPanel";
    this.rootEl.id = this.persistentJson.id;
    this.rootEl.setAttribute("role", "tabpanel");
    this.rootEl.setAttribute("aria-labelledby", "tab-" + this.persistentJson.id);

    // Apply orientation class
    addClass(this.rootEl, `orientation-${this.currentOrientation}`);

    // We group controlbar and Yasqe, so that users can easily .appendChild() to the .editorwrapper div
    // to add a div that goes alongside the controlbar and editor, while YASR still goes full width
    // Useful for adding an infos div that goes alongside the editor without needing to rebuild the whole Yasgui class
    const editorWrapper = document.createElement("div");
    editorWrapper.className = "editorwrapper";
    const controlbarAndYasqeDiv = document.createElement("div");
    //controlbar
    this.controlBarEl = document.createElement("div");
    this.controlBarEl.className = "controlbar";
    controlbarAndYasqeDiv.appendChild(this.controlBarEl);

    //yasqe
    this.yasqeWrapperEl = document.createElement("div");
    controlbarAndYasqeDiv.appendChild(this.yasqeWrapperEl);
    editorWrapper.appendChild(controlbarAndYasqeDiv);

    //yasr
    this.yasrWrapperEl = document.createElement("div");
    this.yasrWrapperEl.className = "yasrWrapperEl";

    this.initTabSettingsMenu();
    this.rootEl.appendChild(editorWrapper);
    this.rootEl.appendChild(this.yasrWrapperEl);
    this.initControlbar();
    this.initYasqe();
    this.initYasr();
    this.yasgui._setPanel(this.persistentJson.id, this.rootEl);
  }

  public hide() {
    removeClass(this.rootEl, "active");
    this.detachKeyboardListeners();
  }

  public show() {
    this.draw();
    addClass(this.rootEl, "active");
    this.yasgui.tabElements.selectTab(this.persistentJson.id);
    if (this.yasqe) {
      this.yasqe.refresh();
      if (this.yasgui.config.autofocus) this.yasqe.focus();
    }
    if (this.yasr) {
      this.yasr.refresh();
    }
    //refresh, as other tabs might have changed the endpoint history
    this.setEndpoint(this.getEndpoint(), this.yasgui.persistentConfig.getEndpointHistory());
    this.attachKeyboardListeners();
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // F11 - Toggle Yasqe fullscreen
    if (event.key === "F11") {
      event.preventDefault();
      if (this.yasqe) {
        this.yasqe.toggleFullscreen();
        // If Yasr is fullscreen, exit it
        if (this.yasr?.getIsFullscreen()) {
          this.yasr.toggleFullscreen();
        }
      }
    }
    // F10 - Toggle Yasr fullscreen
    else if (event.key === "F10") {
      event.preventDefault();
      if (this.yasr) {
        this.yasr.toggleFullscreen();
        // If Yasqe is fullscreen, exit it
        if (this.yasqe?.getIsFullscreen()) {
          this.yasqe.toggleFullscreen();
        }
      }
    }
    // F9 - Switch between fullscreen modes
    else if (event.key === "F9") {
      event.preventDefault();
      const yasqeFullscreen = this.yasqe?.getIsFullscreen();
      const yasrFullscreen = this.yasr?.getIsFullscreen();

      if (yasqeFullscreen) {
        // Switch from Yasqe to Yasr fullscreen
        this.yasqe?.toggleFullscreen();
        this.yasr?.toggleFullscreen();
      } else if (yasrFullscreen) {
        // Switch from Yasr to Yasqe fullscreen
        this.yasr?.toggleFullscreen();
        this.yasqe?.toggleFullscreen();
      } else {
        // If neither is fullscreen, make Yasqe fullscreen
        this.yasqe?.toggleFullscreen();
      }
    }
  };

  private attachKeyboardListeners() {
    if (!this.rootEl) return;
    document.addEventListener("keydown", this.handleKeyDown);
  }

  private detachKeyboardListeners() {
    document.removeEventListener("keydown", this.handleKeyDown);
  }

  public select() {
    this.yasgui.selectTabId(this.persistentJson.id);
  }

  public close() {
    this.detachKeyboardListeners();
    if (this.yasqe) this.yasqe.abortQuery();
    if (this.yasgui.getTab() === this) {
      //it's the active tab
      //first select other tab
      const tabs = this.yasgui.persistentConfig.getTabs();
      const i = tabs.indexOf(this.persistentJson.id);
      if (i > -1) {
        this.yasgui.selectTabId(tabs[i === tabs.length - 1 ? i - 1 : i + 1]);
      }
    }
    this.yasgui._removePanel(this.rootEl);
    this.yasgui.persistentConfig.deleteTab(this.persistentJson.id);
    this.yasgui.emit("tabClose", this.yasgui, this);
    this.emit("close", this);
    this.yasgui.tabElements.get(this.persistentJson.id).delete();
    delete this.yasgui._tabs[this.persistentJson.id];
  }

  public getQuery() {
    if (!this.yasqe) {
      throw new Error("Cannot get value from uninitialized editor");
    }
    return this.yasqe?.getValue();
  }

  public setQuery(query: string) {
    if (!this.yasqe) {
      throw new Error("Cannot set value for uninitialized editor");
    }
    this.yasqe.setValue(query);
    this.persistentJson.yasqe.value = query;
    this.emit("change", this, this.persistentJson);
    return this;
  }

  public getRequestConfig() {
    return this.persistentJson.requestConfig;
  }

  private initControlbar() {
    this.initOrientationToggle();
    this.initEndpointSelectField();
    this.initEndpointButtons();
    if (this.yasgui.config.endpointInfo && this.controlBarEl) {
      this.controlBarEl.appendChild(this.yasgui.config.endpointInfo());
    }
  }

  private initOrientationToggle() {
    if (!this.controlBarEl) return;

    this.orientationToggleButton = document.createElement("button");
    this.orientationToggleButton.className = "tabContextButton orientationToggle";
    this.orientationToggleButton.setAttribute("aria-label", "Toggle layout orientation");
    this.orientationToggleButton.title = "Toggle layout orientation";

    this.updateOrientationToggleIcon();

    this.orientationToggleButton.addEventListener("click", () => {
      this.toggleOrientation();
    });

    this.controlBarEl.appendChild(this.orientationToggleButton);
  }

  public updateOrientationToggleIcon() {
    if (!this.orientationToggleButton) return;

    // Show the icon for the layout we'll switch TO (not the current layout)
    this.orientationToggleButton.innerHTML =
      this.currentOrientation === "vertical" ? HORIZONTAL_LAYOUT_ICON : VERTICAL_LAYOUT_ICON;
    this.orientationToggleButton.title =
      this.currentOrientation === "vertical" ? "Switch to horizontal layout" : "Switch to vertical layout";
  }

  public toggleOrientation() {
    if (!this.rootEl) return;

    // Toggle orientation
    const newOrientation = this.currentOrientation === "vertical" ? "horizontal" : "vertical";

    // Update global config
    this.yasgui.config.orientation = newOrientation;

    // Apply to all tabs
    for (const tabId in this.yasgui._tabs) {
      const tab = this.yasgui._tabs[tabId];
      if (tab && tab.rootEl) {
        // Remove old orientation class
        removeClass(tab.rootEl, `orientation-${tab.currentOrientation}`);

        // Update tab's orientation
        tab.currentOrientation = newOrientation;

        // Add new orientation class
        addClass(tab.rootEl, `orientation-${newOrientation}`);

        // Update button icon if it exists
        if (tab.orientationToggleButton) {
          tab.updateOrientationToggleIcon();
        }

        // Refresh components to adjust to new layout
        if (tab.yasqe) {
          tab.yasqe.refresh();
        }
        if (tab.yasr) {
          tab.yasr.refresh();
        }
      }
    }
  }

  public getYasqe() {
    return this.yasqe;
  }

  public getYasr() {
    return this.yasr;
  }

  private initTabSettingsMenu() {
    if (!this.controlBarEl) throw new Error("Need to initialize wrapper elements before drawing tab settings");
    this.settingsModal = new TabSettingsModal(this, this.controlBarEl);
  }

  private initEndpointSelectField() {
    if (!this.controlBarEl) throw new Error("Need to initialize wrapper elements before drawing endpoint field");
    this.endpointSelect = new EndpointSelect(
      this.getEndpoint(),
      this.controlBarEl,
      this.yasgui.config.endpointCatalogueOptions,
      this.yasgui.persistentConfig.getEndpointHistory(),
    );
    this.endpointSelect.on("select", (endpoint, endpointHistory) => {
      this.setEndpoint(endpoint, endpointHistory);
    });
    this.endpointSelect.on("remove", (endpoint, endpointHistory) => {
      this.setEndpoint(endpoint, endpointHistory);
    });
  }

  private initEndpointButtons() {
    if (!this.controlBarEl) throw new Error("Need to initialize wrapper elements before drawing endpoint buttons");

    // Create container if it doesn't exist
    if (!this.endpointButtonsContainer) {
      this.endpointButtonsContainer = document.createElement("div");
      addClass(this.endpointButtonsContainer, "endpointButtonsContainer");
      this.controlBarEl.appendChild(this.endpointButtonsContainer);
    }

    this.refreshEndpointButtons();
  }

  public refreshEndpointButtons() {
    if (!this.endpointButtonsContainer) return;

    // Clear existing buttons
    this.endpointButtonsContainer.innerHTML = "";

    // Get config buttons (for backwards compatibility)
    const configButtons = this.yasgui.config.endpointButtons || [];

    // Get endpoint configs where showAsButton is true
    const endpointConfigs = this.yasgui.persistentConfig.getEndpointConfigs();
    const endpointButtons = endpointConfigs
      .filter((config) => config.showAsButton && config.label)
      .map((config) => ({ endpoint: config.endpoint, label: config.label! }));

    // Also include legacy custom buttons for backwards compatibility
    const customButtons = this.yasgui.persistentConfig.getCustomEndpointButtons();

    const allButtons = [...configButtons, ...endpointButtons, ...customButtons];

    if (allButtons.length === 0) {
      // Hide container if no buttons
      this.endpointButtonsContainer.style.display = "none";
      return;
    }

    // Show container
    this.endpointButtonsContainer.style.display = "flex";

    allButtons.forEach((buttonConfig) => {
      const button = document.createElement("button");
      addClass(button, "endpointButton");
      button.textContent = buttonConfig.label;
      button.title = `Set endpoint to ${buttonConfig.endpoint}`;
      button.setAttribute("aria-label", `Set endpoint to ${buttonConfig.endpoint}`);

      button.addEventListener("click", () => {
        this.setEndpoint(buttonConfig.endpoint);
      });

      this.endpointButtonsContainer!.appendChild(button);
    });
  }

  private checkEndpointForCors(endpoint: string) {
    if (this.yasgui.config.corsProxy && !(endpoint in Yasgui.corsEnabled)) {
      const askUrl = new URL(endpoint);
      askUrl.searchParams.append("query", "ASK {?x ?y ?z}");
      fetch(askUrl.toString())
        .then(() => {
          Yasgui.corsEnabled[endpoint] = true;
        })
        .catch((e) => {
          // CORS error throws `TypeError: NetworkError when attempting to fetch resource.`
          Yasgui.corsEnabled[endpoint] = e instanceof TypeError ? false : true;
        });
    }
  }
  public setEndpoint(endpoint: string, endpointHistory?: string[]) {
    if (endpoint) endpoint = endpoint.trim();
    if (endpointHistory && !eq(endpointHistory, this.yasgui.persistentConfig.getEndpointHistory())) {
      this.yasgui.emit("endpointHistoryChange", this.yasgui, endpointHistory);
    }
    this.checkEndpointForCors(endpoint); //little cost in checking this as we're caching the check results

    if (this.persistentJson.requestConfig.endpoint !== endpoint) {
      this.persistentJson.requestConfig.endpoint = endpoint;
      this.emit("change", this, this.persistentJson);
      this.emit("endpointChange", this, endpoint);

      // Auto-track this endpoint in endpoint configs (if not already present)
      if (endpoint && !this.yasgui.persistentConfig.getEndpointConfig(endpoint)) {
        this.yasgui.persistentConfig.addOrUpdateEndpoint(endpoint, {});
      }
    }
    if (this.endpointSelect instanceof EndpointSelect) {
      this.endpointSelect.setEndpoint(endpoint, endpointHistory);
    }
    return this;
  }

  public getEndpoint(): string {
    return getAsValue(this.persistentJson.requestConfig.endpoint, this.yasgui);
  }

  /**
   * Updates the position of the Tab's contextmenu
   * Useful for when being scrolled
   */
  public updateContextMenu(): void {
    this.getTabListEl().redrawContextMenu();
  }

  public getShareableLink(baseURL?: string): string {
    return shareLink.createShareLink(baseURL || window.location.href, this);
  }

  public getShareObject() {
    return shareLink.createShareConfig(this);
  }

  private getTabListEl(): TabListEl {
    return this.yasgui.tabElements.get(this.persistentJson.id);
  }

  public setName(newName: string) {
    this.getTabListEl().rename(newName);
    this.persistentJson.name = newName;
    this.emit("change", this, this.persistentJson);
    return this;
  }

  public hasResults() {
    return !!this.yasr?.results;
  }

  public getName() {
    return this.persistentJson.name;
  }

  public query(): Promise<any> {
    if (!this.yasqe) return Promise.reject(new Error("No yasqe editor initialized"));
    return this.yasqe.query();
  }

  public setRequestConfig(requestConfig: Partial<YasguiRequestConfig>) {
    this.persistentJson.requestConfig = {
      ...this.persistentJson.requestConfig,
      ...requestConfig,
    };

    this.emit("change", this, this.persistentJson);
  }

  /**
   * Get authentication configuration for the current endpoint
   * This retrieves auth from the endpoint-based storage
   */
  private getAuthForCurrentEndpoint() {
    const endpoint = this.getEndpoint();
    if (!endpoint) return undefined;

    const endpointConfig = this.yasgui.persistentConfig.getEndpointConfig(endpoint);
    if (!endpointConfig || !endpointConfig.authentication) return undefined;

    // Convert endpoint auth to requestConfig format
    const auth = endpointConfig.authentication;
    if (auth.type === "basic") {
      return {
        type: "basic" as const,
        config: {
          username: auth.username,
          password: auth.password,
        },
      };
    } else if (auth.type === "bearer") {
      return {
        type: "bearer" as const,
        config: {
          token: auth.token,
        },
      };
    } else if (auth.type === "apiKey") {
      return {
        type: "apiKey" as const,
        config: {
          headerName: auth.headerName,
          apiKey: auth.apiKey,
        },
      };
    }

    return undefined;
  }

  /**
   * The Yasgui configuration object may contain a custom request config
   * This request config object can contain getter functions, or plain json
   * The plain json data is stored in persisted config, and editable via the
   * tab pane.
   * The getter functions are not. This function is about fetching this part of the
   * request configuration, so we can merge this with the configuration from the
   * persistent config and tab pane.
   *
   * Considering some values will never be persisted (things that should always be a function),
   * we provide that as part of a whitelist called `keepDynamic`
   */
  private getStaticRequestConfig() {
    const config: Partial<PlainRequestConfig> = {};
    let key: keyof YasguiRequestConfig;
    for (key in this.yasgui.config.requestConfig) {
      //This config option should never be static or persisted anyway
      if (key === "adjustQueryBeforeRequest") continue;
      const val = this.yasgui.config.requestConfig[key];
      if (typeof val === "function") {
        (config[key] as any) = val(this.yasgui);
      }
    }
    return config;
  }

  private initYasqe() {
    // Set theme based on current yasgui theme
    const currentTheme = this.yasgui.getTheme();
    const cmTheme = currentTheme === "dark" ? "material-palenight" : "default";

    const yasqeConf: Partial<YasqeConfig> = {
      ...this.yasgui.config.yasqe,
      theme: cmTheme,
      value: this.persistentJson.yasqe.value,
      editorHeight: this.persistentJson.yasqe.editorHeight ? this.persistentJson.yasqe.editorHeight : undefined,
      persistenceId: null, //yasgui handles persistent storing
      consumeShareLink: null, //not handled by this tab, but by parent yasgui instance
      createShareableLink: () => this.getShareableLink(),
      requestConfig: () => {
        const processedReqConfig: YasguiRequestConfig = {
          //setting defaults
          //@ts-ignore
          acceptHeaderGraph: "text/turtle",
          //@ts-ignore
          acceptHeaderSelect: "application/sparql-results+json",
          ...mergeWith(
            {},
            this.persistentJson.requestConfig,
            this.getStaticRequestConfig(),
            function customizer(objValue, srcValue) {
              if (Array.isArray(objValue) || Array.isArray(srcValue)) {
                return [...(objValue || []), ...(srcValue || [])];
              }
            },
          ),
          //Passing this manually. Dont want to use our own persistentJson, as that's flattened exclude functions
          //The adjustQueryBeforeRequest is meant to be a function though, so let's copy that as is
          adjustQueryBeforeRequest: this.yasgui.config.requestConfig.adjustQueryBeforeRequest,
        };

        // Inject authentication from endpoint-based storage
        // Only inject endpoint-based auth if the corresponding auth type is not already set
        const endpointAuth = this.getAuthForCurrentEndpoint();
        if (endpointAuth) {
          if (endpointAuth.type === "basic" && typeof processedReqConfig.basicAuth === "undefined") {
            processedReqConfig.basicAuth = endpointAuth.config;
          } else if (endpointAuth.type === "bearer" && typeof processedReqConfig.bearerAuth === "undefined") {
            processedReqConfig.bearerAuth = endpointAuth.config;
          } else if (endpointAuth.type === "apiKey" && typeof processedReqConfig.apiKeyAuth === "undefined") {
            processedReqConfig.apiKeyAuth = endpointAuth.config;
          }
        }

        if (this.yasgui.config.corsProxy && !Yasgui.corsEnabled[this.getEndpoint()]) {
          return {
            ...processedReqConfig,
            args: [
              ...(Array.isArray(processedReqConfig.args) ? processedReqConfig.args : []),
              { name: "endpoint", value: this.getEndpoint() },
              { name: "method", value: this.persistentJson.requestConfig.method },
            ],
            method: "POST",
            endpoint: this.yasgui.config.corsProxy,
          } as PlainRequestConfig;
        }
        return processedReqConfig as PlainRequestConfig;
      },
    };
    if (!yasqeConf.hintConfig) {
      yasqeConf.hintConfig = {};
    }
    if (!yasqeConf.hintConfig.container) {
      yasqeConf.hintConfig.container = this.yasgui.rootEl;
    }
    if (!this.yasqeWrapperEl) {
      throw new Error("Expected a wrapper element before instantiating yasqe");
    }
    this.yasqe = new Yasqe(this.yasqeWrapperEl, yasqeConf);

    this.yasqe.on("blur", this.handleYasqeBlur);
    this.yasqe.on("query", this.handleYasqeQuery);
    this.yasqe.on("queryBefore", this.handleYasqeQueryBefore);
    this.yasqe.on("queryAbort", this.handleYasqeQueryAbort);
    this.yasqe.on("resize", this.handleYasqeResize);

    this.yasqe.on("autocompletionShown", this.handleAutocompletionShown);
    this.yasqe.on("autocompletionClose", this.handleAutocompletionClose);

    this.yasqe.on("queryResponse", this.handleQueryResponse);

    // Add Ctrl+Click handler for URIs
    this.attachYasqeMouseHandler();
  }

  private destroyYasqe() {
    // As Yasqe extends of CM instead of eventEmitter, it doesn't expose the removeAllListeners function, so we should unregister all events manually
    this.yasqe?.off("blur", this.handleYasqeBlur);
    this.yasqe?.off("query", this.handleYasqeQuery);
    this.yasqe?.off("queryAbort", this.handleYasqeQueryAbort);
    this.yasqe?.off("resize", this.handleYasqeResize);
    this.yasqe?.off("autocompletionShown", this.handleAutocompletionShown);
    this.yasqe?.off("autocompletionClose", this.handleAutocompletionClose);
    this.yasqe?.off("queryBefore", this.handleYasqeQueryBefore);
    this.yasqe?.off("queryResponse", this.handleQueryResponse);
    this.detachYasqeMouseHandler();
    this.yasqe?.destroy();
    this.yasqe = undefined;
  }

  handleYasqeBlur = (yasqe: Yasqe) => {
    this.persistentJson.yasqe.value = yasqe.getValue();
    // Capture prefixes from query if auto-capture is enabled
    this.settingsModal?.capturePrefixesFromQuery();
    this.emit("change", this, this.persistentJson);
  };

  handleYasqeQuery = (yasqe: Yasqe) => {
    //the blur event might not have fired (e.g. when pressing ctrl-enter). So, we'd like to persist the query as well if needed
    if (yasqe.getValue() !== this.persistentJson.yasqe.value) {
      this.persistentJson.yasqe.value = yasqe.getValue();
      this.emit("change", this, this.persistentJson);
    }
    this.emit("query", this);
  };

  handleYasqeQueryAbort = () => {
    this.emit("queryAbort", this);
    // Hide loading indicator in Yasr
    if (this.yasr) {
      this.yasr.hideLoading();
    }
  };

  handleYasqeQueryBefore = () => {
    this.emit("queryBefore", this);
    // Show loading indicator in Yasr
    if (this.yasr) {
      this.yasr.showLoading();
    }
  };

  handleYasqeResize = (_yasqe: Yasqe, newSize: string) => {
    this.persistentJson.yasqe.editorHeight = newSize;
    this.emit("change", this, this.persistentJson);
  };

  handleAutocompletionShown = (_yasqe: Yasqe, widget: string) => {
    this.emit("autocompletionShown", this, widget);
  };

  handleAutocompletionClose = (_yasqe: Yasqe) => {
    this.emit("autocompletionClose", this);
  };

  handleQueryResponse = (_yasqe: Yasqe, response: any, duration: number) => {
    this.emit("queryResponse", this);
    if (!this.yasr) throw new Error("Resultset visualizer not initialized. Cannot draw results");
    this.yasr.setResponse(response, duration);
    if (!this.yasr.results) return;
    if (!this.yasr.results.hasError()) {
      this.persistentJson.yasr.response = this.yasr.results.getAsStoreObject(
        this.yasgui.config.yasr.maxPersistentResponseSize,
      );
    } else {
      // Don't persist if there is an error and remove the previous result
      this.persistentJson.yasr.response = undefined;
    }
    this.emit("change", this, this.persistentJson);
  };

  private handleYasqeMouseDown = (event: MouseEvent) => {
    // Only handle Ctrl+Click
    if (!event.ctrlKey || !this.yasqe) return;

    const target = event.target as HTMLElement;
    // Check if click is within CodeMirror editor
    if (!target.closest(".CodeMirror")) return;

    // Get position from mouse coordinates
    const pos = this.yasqe.coordsChar({ left: event.clientX, top: event.clientY });
    const token = this.yasqe.getTokenAt(pos);

    // Check if token is a URI (not a variable)
    // URIs typically have token.type of 'string-2' or might be in angle brackets
    const tokenString = token.string.trim();

    // Skip if it's a variable (starts with ? or $)
    if (tokenString.startsWith("?") || tokenString.startsWith("$")) return;

    // Check if it's a URI - either in angle brackets or a prefixed name
    const isFullUri = tokenString.startsWith("<") && tokenString.endsWith(">");
    const isPrefixedName = /^[\w-]+:[\w-]+/.test(tokenString);

    if (!isFullUri && !isPrefixedName) return;

    event.preventDefault();
    event.stopPropagation();

    // Extract the URI
    let uri = tokenString;
    if (isFullUri) {
      // Remove angle brackets
      uri = tokenString.slice(1, -1);
    } else if (isPrefixedName) {
      // Expand prefixed name to full URI
      const prefixes = this.yasqe.getPrefixesFromQuery();
      const [prefix, localName] = tokenString.split(":");
      const prefixUri = prefixes[prefix];
      if (prefixUri) {
        uri = prefixUri + localName;
      }
    }

    // Construct the query
    const constructQuery = `CONSTRUCT {   
  ?s_left ?p_left ?target .
  ?target ?p_right ?o_right .
}
WHERE {
  BIND(<${uri}> as ?target)
  {
    ?s_left ?p_left ?target .
  }
  UNION
  {
    ?target ?p_right ?o_right .
  }  
} LIMIT 1000`;

    // Execute query in background without changing editor content
    this.executeBackgroundQuery(constructQuery);
  };

  private async executeBackgroundQuery(query: string) {
    if (!this.yasqe || !this.yasr) return;

    try {
      // Show loading indicator
      this.yasr.showLoading();
      this.emit("queryBefore", this);

      // Get the request configuration
      const requestConfig = this.yasqe.config.requestConfig;
      const config = typeof requestConfig === "function" ? requestConfig(this.yasqe) : requestConfig;

      if (!config.endpoint) {
        throw new Error("No endpoint configured");
      }

      const endpoint = typeof config.endpoint === "function" ? config.endpoint(this.yasqe) : config.endpoint;
      const method = typeof config.method === "function" ? config.method(this.yasqe) : config.method || "POST";
      const headers = typeof config.headers === "function" ? config.headers(this.yasqe) : config.headers || {};

      // Prepare request
      const searchParams = new URLSearchParams();
      searchParams.append("query", query);

      // Add any additional args
      if (config.args && Array.isArray(config.args)) {
        config.args.forEach((arg: any) => {
          if (arg.name && arg.value) {
            searchParams.append(arg.name, arg.value);
          }
        });
      }

      const fetchOptions: RequestInit = {
        method: method,
        headers: {
          Accept: "text/turtle",
          ...headers,
        },
      };

      let url = endpoint;
      if (method === "POST") {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          "Content-Type": "application/x-www-form-urlencoded",
        };
        fetchOptions.body = searchParams.toString();
      } else {
        const urlObj = new URL(endpoint);
        searchParams.forEach((value, key) => {
          urlObj.searchParams.append(key, value);
        });
        url = urlObj.toString();
      }

      const startTime = Date.now();
      const response = await fetch(url, fetchOptions);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      const result = await response.text();

      // Create a query response object similar to what Yasqe produces
      // This includes headers so the Parser can detect the content type
      const queryResponse = {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        type: response.type,
        content: result,
      };

      // Set the response in Yasr
      this.yasr.setResponse(queryResponse, duration);

      // Auto-select the Graph plugin if it's available
      // The selectPlugin method will call draw() which will determine if it can handle the results
      if (this.yasr.plugins["Graph"]) {
        this.yasr.selectPlugin("Graph");
      }

      this.yasr.hideLoading();
      this.emit("queryResponse", this);
    } catch (error) {
      console.error("Background query failed:", error);
      if (this.yasr) {
        this.yasr.hideLoading();
        // Set error response
        this.yasr.setResponse(
          {
            error: error instanceof Error ? error.message : "Unknown error",
          },
          0,
        );
      }
    }
  }

  private attachYasqeMouseHandler() {
    if (!this.yasqe) return;
    const wrapper = this.yasqe.getWrapperElement();
    if (wrapper) {
      wrapper.addEventListener("mousedown", this.handleYasqeMouseDown);
    }
  }

  private detachYasqeMouseHandler() {
    if (!this.yasqe) return;
    const wrapper = this.yasqe.getWrapperElement();
    if (wrapper) {
      wrapper.removeEventListener("mousedown", this.handleYasqeMouseDown);
    }
  }

  private initYasr() {
    if (!this.yasrWrapperEl) throw new Error("Wrapper for yasr does not exist");

    const yasrConf: Partial<YasrConfig> = {
      persistenceId: null, //yasgui handles persistent storing
      prefixes: (yasr) => {
        // Prefixes defined in YASR's config
        const prefixesFromYasrConf =
          typeof this.yasgui.config.yasr.prefixes === "function"
            ? this.yasgui.config.yasr.prefixes(yasr)
            : this.yasgui.config.yasr.prefixes;
        const prefixesFromYasqe = this.yasqe?.getPrefixesFromQuery();
        // Invert twice to make sure both keys and values are unique
        // YASQE's prefixes should take president
        return invert(invert({ ...prefixesFromYasrConf, ...prefixesFromYasqe }));
      },
      defaultPlugin: this.persistentJson.yasr.settings.selectedPlugin,
      getPlainQueryLinkToEndpoint: () => {
        if (this.yasqe) {
          return shareLink.appendArgsToUrl(
            this.getEndpoint(),
            Yasqe.Sparql.getUrlArguments(this.yasqe, this.persistentJson.requestConfig as RequestConfig<any>),
          );
        }
      },
      plugins: mapValues(this.persistentJson.yasr.settings.pluginsConfig, (conf) => ({
        dynamicConfig: conf,
      })),
      errorRenderers: [
        // Use custom error renderer
        getCorsErrorRenderer(this),
        // Add default renderers to the end, to give our custom ones priority.
        ...(Yasr.defaults.errorRenderers || []),
      ],
    };
    // Allow getDownloadFilName to be overwritten by the global config
    if (yasrConf.getDownloadFileName === undefined) {
      yasrConf.getDownloadFileName = () => words(deburr(this.getName())).join("-");
    }

    this.yasr = new Yasr(this.yasrWrapperEl, yasrConf, this.persistentJson.yasr.response);

    //populate our own persistent config
    this.persistentJson.yasr.settings = this.yasr.getPersistentConfig();
    this.yasr.on("change", () => {
      if (this.yasr) {
        this.persistentJson.yasr.settings = this.yasr.getPersistentConfig();
      }

      this.emit("change", this, this.persistentJson);
    });
  }

  destroy() {
    this.removeAllListeners();
    this.settingsModal?.destroy();
    this.endpointSelect?.destroy();
    this.endpointSelect = undefined;
    this.yasr?.destroy();
    this.yasr = undefined;
    this.destroyYasqe();
  }

  public static getDefaults(yasgui?: Yasgui): PersistedJson {
    return {
      yasqe: {
        value: yasgui ? yasgui.config.yasqe.value : Yasgui.defaults.yasqe.value,
      },
      yasr: {
        response: undefined,
        settings: {
          selectedPlugin: yasgui ? yasgui.config.yasr.defaultPlugin : "table",
          pluginsConfig: {},
        },
      },
      requestConfig: yasgui ? yasgui.config.requestConfig : { ...Yasgui.defaults.requestConfig },
      id: getRandomId(),
      name: yasgui ? yasgui.createTabName() : Yasgui.defaults.tabName,
    };
  }
}

export default Tab;

// Return a URL that is safe to display
const safeEndpoint = (endpoint: string): string => {
  const url = new URL(endpoint);
  return encodeURI(url.href);
};

function getCorsErrorRenderer(tab: Tab) {
  return async (error: Parser.ErrorSummary): Promise<HTMLElement | undefined> => {
    if (!error.status) {
      // Only show this custom error if
      const shouldReferToHttp =
        new URL(tab.getEndpoint()).protocol === "http:" && window.location.protocol === "https:";
      if (shouldReferToHttp) {
        const errorEl = document.createElement("div");
        const errorSpan = document.createElement("p");
        errorSpan.innerHTML = `You are trying to query an HTTP endpoint (<a href="${safeEndpoint(
          tab.getEndpoint(),
        )}" target="_blank" rel="noopener noreferrer">${safeEndpoint(
          tab.getEndpoint(),
        )}</a>) from an HTTP<strong>S</strong> website (<a href="${safeEndpoint(window.location.href)}">${safeEndpoint(
          window.location.href,
        )}</a>).<br>This is not allowed in modern browsers, see <a target="_blank" rel="noopener noreferrer" href="https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy">https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy</a>.`;
        if (tab.yasgui.config.nonSslDomain) {
          const errorLink = document.createElement("p");
          errorLink.innerHTML = `As a workaround, you can use the HTTP version of Yasgui instead: <a href="${tab.getShareableLink(
            tab.yasgui.config.nonSslDomain,
          )}" target="_blank">${tab.yasgui.config.nonSslDomain}</a>`;
          errorSpan.appendChild(errorLink);
        }
        errorEl.appendChild(errorSpan);
        return errorEl;
      }
    }
  };
}
