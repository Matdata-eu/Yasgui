import "./scss/yasqe.scss";
import "./scss/buttons.scss";
import { findFirstPrefixLine } from "./prefixFold";
import { getPrefixesFromQuery, addPrefixes, removePrefixes, Prefixes } from "./prefixUtils";
import { getPreviousNonWsToken, getNextNonWsToken, getCompleteToken } from "./tokenUtils";
import * as sparql11Mode from "../grammar/tokenizer";
import { Storage as YStorage } from "@matdata/yasgui-utils";
import * as queryString from "query-string";
import tooltip from "./tooltip";
import { drawSvgStringAsElement, addClass, removeClass } from "@matdata/yasgui-utils";
import * as Sparql from "./sparql";
import * as imgs from "./imgs";
import * as Autocompleter from "./autocompleters";
import { merge, mergeWith, escape } from "lodash-es";

import getDefaults from "./defaults";
import CodeMirror from "./CodeMirror";
import { YasqeAjaxConfig } from "./sparql";
import { spfmt } from "sparql-formatter";

export interface Yasqe {
  on(eventName: "query", handler: (instance: Yasqe, req: Request, abortController?: AbortController) => void): void;
  off(eventName: "query", handler: (instance: Yasqe, req: Request, abortController?: AbortController) => void): void;
  on(eventName: "queryAbort", handler: (instance: Yasqe, req: Request) => void): void;
  off(eventName: "queryAbort", handler: (instance: Yasqe, req: Request) => void): void;
  on(eventName: "queryResponse", handler: (instance: Yasqe, response: any, duration: number) => void): void;
  off(eventName: "queryResponse", handler: (instance: Yasqe, response: any, duration: number) => void): void;
  showHint: (conf: HintConfig) => void;
  on(eventName: "error", handler: (instance: Yasqe) => void): void;
  off(eventName: "error", handler: (instance: Yasqe) => void): void;
  on(eventName: "blur", handler: (instance: Yasqe) => void): void;
  off(eventName: "blur", handler: (instance: Yasqe) => void): void;
  on(eventName: "queryBefore", handler: (instance: Yasqe, config: YasqeAjaxConfig) => void): void;
  off(eventName: "queryBefore", handler: (instance: Yasqe, config: YasqeAjaxConfig) => void): void;
  on(eventName: "queryResults", handler: (instance: Yasqe, results: any, duration: number) => void): void;
  off(eventName: "queryResults", handler: (instance: Yasqe, results: any, duration: number) => void): void;
  on(eventName: "autocompletionShown", handler: (instance: Yasqe, widget: any) => void): void;
  off(eventName: "autocompletionShown", handler: (instance: Yasqe, widget: any) => void): void;
  on(eventName: "autocompletionClose", handler: (instance: Yasqe) => void): void;
  off(eventName: "autocompletionClose", handler: (instance: Yasqe) => void): void;
  on(eventName: "resize", handler: (instance: Yasqe, newSize: string) => void): void;
  off(eventName: "resize", handler: (instance: Yasqe, newSize: string) => void): void;
  on(eventName: string, handler: () => void): void;
}

export class Yasqe extends CodeMirror {
  private static storageNamespace = "triply";
  public autocompleters: { [name: string]: Autocompleter.Completer | undefined } = {};
  private prevQueryValid = false;
  public queryValid = true;
  public lastQueryDuration: number | undefined;
  private req: Request | undefined;
  private abortController: AbortController | undefined;
  private queryStatus: "valid" | "error" | undefined;
  private queryBtn: HTMLButtonElement | undefined;
  private fullscreenBtn: HTMLButtonElement | undefined;
  private isFullscreen: boolean = false;
  private resizeWrapper?: HTMLDivElement;
  private snippetsBar?: HTMLDivElement;
  private snippetsClickHandler?: (e: MouseEvent) => void;
  private snippetsResizeHandler?: () => void;
  public rootEl: HTMLDivElement;
  public storage: YStorage;
  public config: Config;
  public persistentConfig: PersistentConfig | undefined;
  constructor(parent: HTMLElement, conf: PartialConfig = {}) {
    super();
    if (!parent) throw new Error("No parent passed as argument. Dont know where to draw YASQE");
    this.rootEl = document.createElement("div");
    this.rootEl.className = "yasqe";
    parent.appendChild(this.rootEl);
    // Use mergeWith to replace arrays instead of merging them by index
    // This ensures that snippets: [] properly overrides default snippets
    this.config = mergeWith({}, Yasqe.defaults, conf, (objValue: any, srcValue: any) => {
      if (Array.isArray(srcValue)) {
        return srcValue;
      }
    });
    //inherit codemirror props
    const cm = (CodeMirror as any)(this.rootEl, this.config);
    //Assign our functions to the cm object. This is needed, as some functions (like the ctrl-enter callback)
    //get the original cm as argument, and not yasqe
    for (const key of Object.getOwnPropertyNames(Yasqe.prototype)) {
      cm[key] = (<any>Yasqe.prototype)[key].bind(this);
    }
    //Also assign the codemirror functions to our object, so we can easily use those
    Object.assign(this, CodeMirror.prototype, cm);

    //Do some post processing
    this.storage = new YStorage(Yasqe.storageNamespace);
    this.drawButtons();
    this.drawSnippetsBar();
    const storageId = this.getStorageId();
    // this.getWrapperElement
    if (storageId) {
      const persConf = this.storage.get<any>(storageId);
      if (persConf && typeof persConf === "string") {
        this.persistentConfig = { query: persConf, editorHeight: this.config.editorHeight };
      } else {
        this.persistentConfig = persConf;
      }
      if (!this.persistentConfig)
        this.persistentConfig = { query: this.getValue(), editorHeight: this.config.editorHeight };

      // Ensure autoformatOnQuery is true by default
      if (this.persistentConfig && typeof this.persistentConfig.autoformatOnQuery === "undefined") {
        this.persistentConfig.autoformatOnQuery = true;
      }

      if (this.persistentConfig && this.persistentConfig.query) this.setValue(this.persistentConfig.query);
    } else {
      // If no storage, ensure persistentConfig exists and autoformatOnQuery is true
      if (!this.persistentConfig) {
        this.persistentConfig = {
          query: this.getValue(),
          editorHeight: this.config.editorHeight,
          autoformatOnQuery: true,
        };
      } else if (typeof this.persistentConfig.autoformatOnQuery === "undefined") {
        this.persistentConfig.autoformatOnQuery = true;
      }
    }
    this.config.autocompleters.forEach((c) => this.enableCompleter(c).then(() => {}, console.warn));
    if (this.config.consumeShareLink) {
      this.config.consumeShareLink(this);
      //and: add a hash listener!
      window.addEventListener("hashchange", this.handleHashChange);
    }
    this.checkSyntax();
    this.checkConstructVariables();
    // Size codemirror to the
    if (this.persistentConfig && this.persistentConfig.editorHeight) {
      this.getWrapperElement().style.height = this.persistentConfig.editorHeight;
    } else if (this.config.editorHeight) {
      this.getWrapperElement().style.height = this.config.editorHeight;
    }

    if (this.config.resizeable) this.drawResizer();
    if (this.config.collapsePrefixesOnLoad) this.collapsePrefixes(true);
    this.registerEventListeners();
  }
  private handleHashChange = () => {
    this.config.consumeShareLink?.(this);
  };
  private handleChange() {
    this.checkSyntax();
    this.checkConstructVariables();
    this.updateQueryButton();
  }
  private handleBlur() {
    this.saveQuery();
  }
  private handleChanges() {
    // e.g. handle blur
    this.checkSyntax();
    this.checkConstructVariables();
    this.updateQueryButton();
  }
  private handleCursorActivity() {
    this.autocomplete(true);

    // Check if cursor is on a URI and show DESCRIBE hint
    const cursor = this.getDoc().getCursor();
    const token = this.getTokenAt(cursor);

    if (token && token.type === "variable-3") {
      // Token type "variable-3" represents URIs (IRI_REF)
      this.showNotification("uri-describe-hint", "Hold CTRL - left mouse click on URI to DESCRIBE");
    } else {
      this.hideNotification("uri-describe-hint");
    }
  }
  private handleQuery(_yasqe: Yasqe, req: Request, abortController?: AbortController) {
    this.req = req;
    this.abortController = abortController;
    this.updateQueryButton();
  }
  private handleQueryResponse(_yasqe: Yasqe, _response: any, duration: number) {
    this.lastQueryDuration = duration;
    this.req = undefined;
    this.updateQueryButton();
  }
  private handleQueryAbort(_yasqe: Yasqe, _req: Request) {
    this.req = undefined;
    this.updateQueryButton();
  }

  private registerEventListeners() {
    /**
     * Register listeners
     */
    this.on("change", this.handleChange);
    this.on("blur", this.handleBlur);
    this.on("changes", this.handleChanges);
    this.on("cursorActivity", this.handleCursorActivity);

    this.on("query", this.handleQuery);
    this.on("queryResponse", this.handleQueryResponse);
    this.on("queryAbort", this.handleQueryAbort);
  }

  private unregisterEventListeners() {
    this.off("change" as any, this.handleChange);
    this.off("blur", this.handleBlur);
    this.off("changes" as any, this.handleChanges);
    this.off("cursorActivity" as any, this.handleCursorActivity);

    this.off("query", this.handleQuery);
    this.off("queryResponse", this.handleQueryResponse);
    this.off("queryAbort", this.handleQueryAbort);
  }
  /**
   * Generic IDE functions
   */
  public emit(event: string, ...data: any[]) {
    CodeMirror.signal(this, event, this, ...data);
  }

  public getStorageId(getter?: Config["persistenceId"]): string | undefined {
    const persistenceId = getter || this.config.persistenceId;
    if (!persistenceId) return undefined;
    if (typeof persistenceId === "string") return persistenceId;
    return persistenceId(this);
  }
  private drawButtons() {
    const buttons = document.createElement("div");
    buttons.className = "yasqe_buttons";
    this.getWrapperElement().appendChild(buttons);

    if (this.config.pluginButtons) {
      const pluginButtons = this.config.pluginButtons();
      if (!pluginButtons) return;
      if (Array.isArray(pluginButtons)) {
        for (const button of pluginButtons) {
          buttons.append(button);
        }
      } else {
        buttons.appendChild(pluginButtons);
      }
    }

    /**
     * draw share link button
     */
    if (this.config.createShareableLink) {
      var svgShare = drawSvgStringAsElement(imgs.share);
      const shareLinkWrapper = document.createElement("button");
      shareLinkWrapper.className = "yasqe_share";
      shareLinkWrapper.title = "Share query";
      shareLinkWrapper.setAttribute("aria-label", "Share query");
      shareLinkWrapper.appendChild(svgShare);
      buttons.appendChild(shareLinkWrapper);
      shareLinkWrapper.addEventListener("click", (event: MouseEvent) => showSharePopup(event));
      shareLinkWrapper.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.code === "Enter") {
          showSharePopup(event);
        }
      });

      const showSharePopup = (event: MouseEvent | KeyboardEvent) => {
        event.stopPropagation();
        let popup: HTMLDivElement | undefined = document.createElement("div");
        popup.className = "yasqe_sharePopup";
        buttons.appendChild(popup);
        document.body.addEventListener(
          "click",
          (event) => {
            if (popup && event.target !== popup && !popup.contains(<any>event.target)) {
              popup.remove();
              popup = undefined;
            }
          },
          true,
        );
        var input = document.createElement("input");
        input.type = "text";
        input.value = this.config.createShareableLink(this);

        input.onfocus = function () {
          input.select();
        };
        // Work around Chrome's little problem
        input.onmouseup = function () {
          // $this.unbind("mouseup");
          return false;
        };
        popup.innerHTML = "";

        var inputWrapper = document.createElement("div");
        inputWrapper.className = "inputWrapper";

        inputWrapper.appendChild(input);

        popup.appendChild(inputWrapper);

        // We need to track which buttons are drawn here since the two implementations don't play nice together
        const popupInputButtons: HTMLButtonElement[] = [];
        const createShortLink = this.config.createShortLink;
        if (createShortLink) {
          popup.className = popup.className += " enableShort";
          const shortBtn = document.createElement("button");
          popupInputButtons.push(shortBtn);
          shortBtn.innerHTML = "Shorten";
          shortBtn.className = "yasqe_btn yasqe_btn-sm shorten";
          popup.appendChild(shortBtn);
          shortBtn.onclick = () => {
            popupInputButtons.forEach((button) => (button.disabled = true));
            createShortLink(this, input.value).then(
              (value) => {
                input.value = value;
                input.focus();
              },
              (err) => {
                const errSpan = document.createElement("span");
                errSpan.className = "shortlinkErr";
                // Throwing a string or an object should work
                let textContent = "An error has occurred";
                if (typeof err === "string" && err.length !== 0) {
                  textContent = err;
                } else if (err.message && err.message.length !== 0) {
                  textContent = err.message;
                }
                errSpan.textContent = textContent;
                input.replaceWith(errSpan);
              },
            );
          };
        }

        const curlBtn = document.createElement("button");
        popupInputButtons.push(curlBtn);
        curlBtn.innerText = "cURL";
        curlBtn.className = "yasqe_btn yasqe_btn-sm curl";
        popup.appendChild(curlBtn);
        curlBtn.onclick = () => {
          popupInputButtons.forEach((button) => (button.disabled = true));
          input.value = this.getAsCurlString();
          input.focus();
          popup?.appendChild(curlBtn);
        };

        const svgPos = svgShare.getBoundingClientRect();
        popup.style.top = svgShare.offsetTop + svgPos.height + "px";
        popup.style.left = svgShare.offsetLeft + svgShare.clientWidth - popup.clientWidth + "px";
        input.focus();
      };
    }
    /**
     * Draw query btn
     */
    if (this.config.showQueryButton) {
      this.queryBtn = document.createElement("button");
      addClass(this.queryBtn, "yasqe_queryButton");

      /**
       * Add busy/valid/error btns
       */
      const queryEl = drawSvgStringAsElement(imgs.query);
      addClass(queryEl, "queryIcon");
      this.queryBtn.appendChild(queryEl);

      const warningIcon = drawSvgStringAsElement(imgs.warning);
      addClass(warningIcon, "warningIcon");
      this.queryBtn.appendChild(warningIcon);

      this.queryBtn.onclick = () => {
        if (this.config.queryingDisabled) return; // Don't do anything
        if (this.req) {
          this.abortQuery();
        } else {
          this.query().catch(() => {}); //catch this to avoid unhandled rejection
        }
      };
      this.queryBtn.title = "Run query";
      this.queryBtn.setAttribute("aria-label", "Run query");

      buttons.appendChild(this.queryBtn);
      this.updateQueryButton();
    }

    /**
     * Draw format btn
     */
    if (this.config.showFormatButton) {
      const formatBtn = document.createElement("button");
      addClass(formatBtn, "yasqe_formatButton");
      const formatIcon = drawSvgStringAsElement(imgs.format);
      addClass(formatIcon, "formatIcon");
      formatBtn.appendChild(formatIcon);
      formatBtn.onclick = () => {
        this.format();
      };
      formatBtn.title = "Format query (Shift+Ctrl+F)";
      formatBtn.setAttribute("aria-label", "Format query");
      buttons.appendChild(formatBtn);
    }

    /**
     * Draw fullscreen btn
     */
    this.fullscreenBtn = document.createElement("button");
    addClass(this.fullscreenBtn, "yasqe_fullscreenButton");
    const fullscreenIcon = drawSvgStringAsElement(imgs.fullscreen);
    addClass(fullscreenIcon, "fullscreenIcon");
    this.fullscreenBtn.appendChild(fullscreenIcon);
    const fullscreenExitIcon = drawSvgStringAsElement(imgs.fullscreenExit);
    addClass(fullscreenExitIcon, "fullscreenExitIcon");
    this.fullscreenBtn.appendChild(fullscreenExitIcon);
    this.fullscreenBtn.onclick = () => {
      this.toggleFullscreen();
    };
    this.fullscreenBtn.title = "Toggle fullscreen (F11)";
    this.fullscreenBtn.setAttribute("aria-label", "Toggle fullscreen");
    buttons.appendChild(this.fullscreenBtn);
  }
  public toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    if (this.isFullscreen) {
      addClass(this.rootEl, "fullscreen");
      this.fullscreenBtn?.setAttribute("title", "Exit fullscreen (F11)");
    } else {
      removeClass(this.rootEl, "fullscreen");
      this.fullscreenBtn?.setAttribute("title", "Toggle fullscreen (F11)");
    }
    this.refresh();
  }
  public getIsFullscreen() {
    return this.isFullscreen;
  }

  private insertSnippet(code: string) {
    const doc = this.getDoc();
    const cursor = doc.getCursor();
    doc.replaceRange(code, cursor);
    // Move cursor to end of inserted code
    const lines = code.split("\n");
    const lastLine = lines[lines.length - 1];
    doc.setCursor({
      line: cursor.line + lines.length - 1,
      ch: lines.length === 1 ? cursor.ch + lastLine.length : lastLine.length,
    });
    this.focus();
  }

  private drawSnippetsBar() {
    // Check if snippets bar should be shown (now using global config only)
    const shouldShow = this.config.showSnippetsBar && this.config.snippets.length > 0;

    if (!shouldShow) {
      // Remove existing bar if present
      if (this.snippetsBar) {
        this.snippetsBar.remove();
        this.snippetsBar = undefined;
      }
      return;
    }

    // Create snippets bar if it doesn't exist
    if (!this.snippetsBar) {
      this.snippetsBar = document.createElement("div");
      addClass(this.snippetsBar, "yasqe_snippetsBar");
      // Insert before the CodeMirror wrapper element
      const cmWrapper = this.getWrapperElement();
      cmWrapper.parentElement?.insertBefore(this.snippetsBar, cmWrapper);
    }

    // Clear existing content
    this.snippetsBar.innerHTML = "";

    const snippets = this.config.snippets;

    // Create a container for visible items
    const visibleContainer = document.createElement("div");
    addClass(visibleContainer, "yasqe_snippetsVisible");

    // Create all buttons/dropdowns
    const allItems: HTMLElement[] = [];

    // Group snippets by group property for all snippets (not just >10)
    const grouped: { [group: string]: Snippet[] } = {};
    const ungrouped: Snippet[] = [];

    snippets.forEach((snippet) => {
      if (snippet.group) {
        if (!grouped[snippet.group]) grouped[snippet.group] = [];
        grouped[snippet.group].push(snippet);
      } else {
        ungrouped.push(snippet);
      }
    });

    // Create dropdown for each group
    Object.keys(grouped).forEach((groupName) => {
      const dropdown = document.createElement("div");
      addClass(dropdown, "yasqe_snippetDropdown");

      const dropdownBtn = document.createElement("button");
      addClass(dropdownBtn, "yasqe_snippetDropdownButton");
      dropdownBtn.textContent = groupName + " ";
      const chevron = drawSvgStringAsElement(imgs.chevronDown);
      addClass(chevron, "chevronIcon");
      dropdownBtn.appendChild(chevron);
      dropdownBtn.setAttribute("aria-label", `${groupName} snippets`);
      dropdownBtn.setAttribute("aria-expanded", "false");

      const dropdownContent = document.createElement("div");
      addClass(dropdownContent, "yasqe_snippetDropdownContent");
      dropdownContent.setAttribute("role", "menu");

      grouped[groupName].forEach((snippet) => {
        const item = document.createElement("button");
        addClass(item, "yasqe_snippetDropdownItem");
        item.textContent = snippet.label;
        item.title = snippet.code;
        item.setAttribute("role", "menuitem");
        item.onclick = () => {
          this.insertSnippet(snippet.code);
          dropdownContent.style.display = "none";
          dropdownBtn.setAttribute("aria-expanded", "false");
        };
        dropdownContent.appendChild(item);
      });

      dropdownBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdownContent.style.display === "block";
        // Close all other dropdowns
        const allDropdowns = this.snippetsBar!.querySelectorAll(".yasqe_snippetDropdownContent");
        allDropdowns.forEach((dd) => {
          (dd as HTMLElement).style.display = "none";
        });
        const allButtons = this.snippetsBar!.querySelectorAll(".yasqe_snippetDropdownButton");
        allButtons.forEach((btn) => btn.setAttribute("aria-expanded", "false"));

        // Toggle this dropdown
        if (!isOpen) {
          dropdownContent.style.display = "block";
          dropdownBtn.setAttribute("aria-expanded", "true");
        }
      };

      dropdown.appendChild(dropdownBtn);
      dropdown.appendChild(dropdownContent);
      allItems.push(dropdown);
    });

    // Add ungrouped snippets as individual buttons
    ungrouped.forEach((snippet) => {
      const btn = document.createElement("button");
      addClass(btn, "yasqe_snippetButton");
      btn.textContent = snippet.label;
      btn.title = snippet.code;
      btn.setAttribute("aria-label", `Insert ${snippet.label} snippet`);
      btn.onclick = () => this.insertSnippet(snippet.code);
      allItems.push(btn);
    });

    // Add all items to visible container initially
    allItems.forEach((item) => visibleContainer.appendChild(item));
    this.snippetsBar.appendChild(visibleContainer);

    // Create "Show More" dropdown (initially hidden)
    const showMoreDropdown = document.createElement("div");
    addClass(showMoreDropdown, "yasqe_snippetDropdown", "yasqe_showMore");
    showMoreDropdown.style.display = "none";

    const showMoreBtn = document.createElement("button");
    addClass(showMoreBtn, "yasqe_snippetDropdownButton", "yasqe_showMoreButton");
    showMoreBtn.textContent = "More ";
    const chevron = drawSvgStringAsElement(imgs.chevronDown);
    addClass(chevron, "chevronIcon");
    showMoreBtn.appendChild(chevron);
    showMoreBtn.setAttribute("aria-label", "Show more snippets");
    showMoreBtn.setAttribute("aria-expanded", "false");

    const showMoreContent = document.createElement("div");
    addClass(showMoreContent, "yasqe_snippetDropdownContent", "yasqe_showMoreContent");
    showMoreContent.setAttribute("role", "menu");

    showMoreBtn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = showMoreContent.style.display === "block";
      // Close all other dropdowns
      const allDropdowns = this.snippetsBar!.querySelectorAll(".yasqe_snippetDropdownContent");
      allDropdowns.forEach((dd) => {
        if (dd !== showMoreContent) {
          (dd as HTMLElement).style.display = "none";
        }
      });
      const allButtons = this.snippetsBar!.querySelectorAll(".yasqe_snippetDropdownButton");
      allButtons.forEach((btn) => {
        if (btn !== showMoreBtn) {
          btn.setAttribute("aria-expanded", "false");
        }
      });

      // Toggle this dropdown
      if (!isOpen) {
        showMoreContent.style.display = "block";
        showMoreBtn.setAttribute("aria-expanded", "true");
      } else {
        showMoreContent.style.display = "none";
        showMoreBtn.setAttribute("aria-expanded", "false");
      }
    };

    showMoreDropdown.appendChild(showMoreBtn);
    showMoreDropdown.appendChild(showMoreContent);
    this.snippetsBar.appendChild(showMoreDropdown);

    // Create function to handle overflow detection
    const handleOverflow = () => {
      if (!this.snippetsBar) return;

      const containerWidth = this.snippetsBar.offsetWidth;
      const showMoreWidth = 80; // Approximate width for "Show More" button
      let availableWidth = containerWidth - showMoreWidth - 20; // 20px for padding/margin
      let currentWidth = 0;
      const overflowItems: { element: HTMLElement; snippet?: Snippet; groupName?: string }[] = [];

      // Check each item to see if it fits
      allItems.forEach((item, index) => {
        const itemWidth = item.offsetWidth + 5; // 5px gap

        if (currentWidth + itemWidth > availableWidth && index > 0) {
          // This item overflows, hide it and add to show more
          item.style.display = "none";

          // Find the corresponding snippet or group
          if (item.classList.contains("yasqe_snippetDropdown")) {
            // It's a group dropdown
            const groupBtn = item.querySelector(".yasqe_snippetDropdownButton");
            const groupName = groupBtn?.textContent?.trim().replace(" ", "") || "Group";
            overflowItems.push({ element: item, groupName });
          } else {
            // It's an individual button
            const snippet = ungrouped.find((s) => s.label === item.textContent);
            overflowItems.push({ element: item, snippet });
          }
        } else {
          currentWidth += itemWidth;
        }
      });

      // If there are overflow items, show the "Show More" button
      if (overflowItems.length > 0) {
        showMoreDropdown.style.display = "inline-block";

        // Populate show more content with proper grouping
        overflowItems.forEach(({ element, snippet, groupName }) => {
          if (groupName) {
            // It's a group - add a group header and its items
            const groupHeader = document.createElement("div");
            addClass(groupHeader, "yasqe_snippetGroupHeader");
            groupHeader.textContent = groupName;
            showMoreContent.appendChild(groupHeader);

            const groupItems = element.querySelectorAll(".yasqe_snippetDropdownItem");
            groupItems.forEach((item) => {
              const clonedItem = item.cloneNode(true) as HTMLElement;
              clonedItem.onclick = (item as HTMLElement).onclick;
              showMoreContent.appendChild(clonedItem);
            });
          } else if (snippet) {
            // It's an individual snippet
            const item = document.createElement("button");
            addClass(item, "yasqe_snippetDropdownItem");
            item.textContent = snippet.label;
            item.title = snippet.code;
            item.setAttribute("role", "menuitem");
            item.onclick = () => {
              this.insertSnippet(snippet.code);
              showMoreContent.style.display = "none";
              showMoreBtn.setAttribute("aria-expanded", "false");
            };
            showMoreContent.appendChild(item);
          }
        });
      }
    };

    // Run overflow detection on next frame
    requestAnimationFrame(handleOverflow);

    // Set up resize handler for overflow detection
    // Remove any existing handler first
    if (this.snippetsResizeHandler) {
      window.removeEventListener("resize", this.snippetsResizeHandler);
    }

    // Create and store the resize handler
    this.snippetsResizeHandler = () => {
      if (!this.snippetsBar) return;

      // Reset all items to visible first
      allItems.forEach((item) => (item.style.display = ""));
      showMoreDropdown.style.display = "none";
      showMoreContent.innerHTML = "";

      // Re-run overflow detection
      requestAnimationFrame(handleOverflow);
    };

    // Add the resize handler
    window.addEventListener("resize", this.snippetsResizeHandler);

    // Set up click handler for closing dropdowns when clicking outside
    // Remove any existing handler first
    if (this.snippetsClickHandler) {
      document.removeEventListener("click", this.snippetsClickHandler);
    }

    // Create and store the handler
    this.snippetsClickHandler = (e: MouseEvent) => {
      if (this.snippetsBar && !this.snippetsBar.contains(e.target as Node)) {
        const allDropdowns = this.snippetsBar.querySelectorAll(".yasqe_snippetDropdownContent");
        allDropdowns.forEach((dd) => {
          (dd as HTMLElement).style.display = "none";
        });
        const allButtons = this.snippetsBar.querySelectorAll(".yasqe_snippetDropdownButton");
        allButtons.forEach((btn) => btn.setAttribute("aria-expanded", "false"));
      }
    };

    // Add the handler
    document.addEventListener("click", this.snippetsClickHandler);
  }

  private drawResizer() {
    if (this.resizeWrapper) return;
    this.resizeWrapper = document.createElement("div");
    addClass(this.resizeWrapper, "resizeWrapper");
    const chip = document.createElement("div");
    addClass(chip, "resizeChip");
    this.resizeWrapper.appendChild(chip);
    this.resizeWrapper.addEventListener("mousedown", this.initDrag, false);
    this.resizeWrapper.addEventListener("dblclick", this.expandEditor);
    this.rootEl.appendChild(this.resizeWrapper);
  }
  private initDrag() {
    document.documentElement.addEventListener("mousemove", this.doDrag, false);
    document.documentElement.addEventListener("mouseup", this.stopDrag, false);
  }
  private calculateDragOffset(event: MouseEvent, rootEl: HTMLElement) {
    let parentOffset = 0;
    // offsetParent is, at the time of writing, a working draft. see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetParent
    if (rootEl.offsetParent) parentOffset = (rootEl.offsetParent as HTMLElement).offsetTop;
    let scrollOffset = 0;
    let parentElement = rootEl.parentElement;
    while (parentElement) {
      scrollOffset += parentElement.scrollTop;
      parentElement = parentElement.parentElement;
    }
    return event.clientY - parentOffset - this.rootEl.offsetTop + scrollOffset;
  }
  private doDrag(event: MouseEvent) {
    this.getWrapperElement().style.height = this.calculateDragOffset(event, this.rootEl) + "px";
  }
  private stopDrag() {
    document.documentElement.removeEventListener("mousemove", this.doDrag, false);
    document.documentElement.removeEventListener("mouseup", this.stopDrag, false);
    this.emit("resize", this.getWrapperElement().style.height);
    if (this.getStorageId() && this.persistentConfig) {
      // If there is no storage id there is no persistency wanted
      this.persistentConfig.editorHeight = this.getWrapperElement().style.height;
      this.saveQuery();
    }
    // Refresh the editor to make sure the 'hidden' lines are rendered
    this.refresh();
  }
  public duplicateLine() {
    const cur = this.getDoc().getCursor();
    if (cur) {
      const line = this.getDoc().getLine(cur.line);
      this.getDoc().replaceRange(line + "\n" + line, { ch: 0, line: cur.line }, { ch: line.length, line: cur.line });
    }
  }
  private updateQueryButton(status?: "valid" | "error") {
    if (!this.queryBtn) return;

    /**
     * Set query status (valid vs invalid)
     */
    if (this.config.queryingDisabled) {
      addClass(this.queryBtn, "query_disabled");
      this.queryBtn.title = this.config.queryingDisabled;
    } else {
      removeClass(this.queryBtn, "query_disabled");
      this.queryBtn.title = "Run query";
      this.queryBtn.setAttribute("aria-label", "Run query");
    }
    if (!status) {
      status = this.queryValid ? "valid" : "error";
    }
    if (status != this.queryStatus) {
      //reset query status classnames
      removeClass(this.queryBtn, "query_" + this.queryStatus);
      addClass(this.queryBtn, "query_" + status);
      this.queryStatus = status;
    }

    /**
     * Set/remove spinner if needed
     */
    if (this.req && this.queryBtn.className.indexOf("busy") < 0) {
      this.queryBtn.className = this.queryBtn.className += " busy";
    }
    if (!this.req && this.queryBtn.className.indexOf("busy") >= 0) {
      this.queryBtn.className = this.queryBtn.className.replace("busy", "");
    }
  }
  public handleLocalStorageQuotaFull(_e: any) {
    console.warn("Localstorage quota exceeded. Clearing all queries");
    Yasqe.clearStorage();
  }

  public saveQuery() {
    const storageId = this.getStorageId();
    if (!storageId || !this.persistentConfig) return;
    this.persistentConfig.query = this.getValue();
    this.storage.set(storageId, this.persistentConfig, this.config.persistencyExpire, this.handleLocalStorageQuotaFull);
  }

  /**
   * Get SPARQL query props
   */
  public getQueryType() {
    return this.getOption("queryType");
  }
  public getQueryMode(): "update" | "query" {
    switch (this.getQueryType()) {
      case "INSERT":
      case "DELETE":
      case "LOAD":
      case "CLEAR":
      case "CREATE":
      case "DROP":
      case "COPY":
      case "MOVE":
      case "ADD":
        return "update";
      default:
        return "query";
    }
  }
  public getVariablesFromQuery() {
    //Use precise here. We want to be sure we use the most up to date state. If we're
    //not, we might get outdated info from the current query (creating loops such
    //as https://github.com/TriplyDB/YASGUI/issues/84)
    //on caveat: this function won't work when query is invalid (i.e. when typing)
    const token: Token = this.getTokenAt(
      { line: this.getDoc().lastLine(), ch: this.getDoc().getLine(this.getDoc().lastLine()).length },
      true,
    );
    const vars: string[] = [];
    for (var v in token.state.variables) {
      vars.push(v);
    }
    return vars.sort();
  }

  /**
   * Sparql-related tasks
   */
  private autoformatSelection(start: number, end: number): string {
    var text = this.getValue();
    text = text.substring(start, end);
    return Yasqe.autoformatString(text);
  }
  public static autoformatString(text: string): string {
    var breakAfterArray = [
      ["keyword", "ws", "string-2", "ws", "variable-3"], // i.e. prefix declaration
      ["keyword", "ws", "variable-3"], // i.e. base
    ];

    var breakBeforeCharacters = ["}"];

    var getBreakType = function (stringVal: string) {
      //first check the characters to break after
      if (stringVal === "{") return 1;
      if (stringVal === ".") return 1;
      if (stringVal === ";") {
        //it shouldnt be part of a group concat though.
        //To check this case, we need to check the previous char type in the stacktrace
        if (stackTrace.length > 2 && stackTrace[stackTrace.length - 2] === "punc") return 0;
        return 1;
      }

      //Now check which arrays to break after
      for (var i = 0; i < breakAfterArray.length; i++) {
        if (stackTrace.valueOf().toString() === breakAfterArray[i].valueOf().toString()) {
          return 1;
        }
      }
      for (var i = 0; i < breakBeforeCharacters.length; i++) {
        // don't want to issue 'breakbefore' AND 'breakafter', so check
        // current line
        if (currentLine.trim() !== "" && stringVal == breakBeforeCharacters[i]) {
          return -1;
        }
      }
      return 0;
    };
    var formattedQuery = "";
    var currentLine = "";
    var stackTrace: string[] = [];
    (<any>Yasqe).runMode(text, "sparql11", function (stringVal: string, type: string) {
      stackTrace.push(type);
      var breakType = getBreakType(stringVal);
      if (breakType != 0) {
        if (breakType == 1) {
          formattedQuery += stringVal + "\n";
          currentLine = "";
        } else {
          // (-1)
          formattedQuery += "\n" + stringVal;
          currentLine = stringVal;
        }
        stackTrace = [];
      } else {
        currentLine += stringVal;
        formattedQuery += stringVal;
      }
      if (stackTrace.length == 1 && stackTrace[0] == "sp-ws") stackTrace = [];
    });
    return formattedQuery.replace(/\n\s*\n/g, "\n").trim();
  }

  public commentLines() {
    var startLine = this.getDoc().getCursor("start").line;
    var endLine = this.getDoc().getCursor("end").line;
    var min = Math.min(startLine, endLine);
    var max = Math.max(startLine, endLine);

    // if all lines start with # (after whitespace), remove the comment. Otherwise add comment
    var linesAreCommented = true;
    for (var i = min; i <= max; i++) {
      var line = this.getDoc().getLine(i);
      var trimmedLine = line.trimStart();
      if (line.length > 0 && (trimmedLine.length === 0 || trimmedLine.substring(0, 1) !== "#")) {
        linesAreCommented = false;
        break;
      }
    }
    for (var i = min; i <= max; i++) {
      var line = this.getDoc().getLine(i);
      var trimmedLine = line.trimStart();
      var leadingWhitespace = line.length - trimmedLine.length;

      if (linesAreCommented && trimmedLine.length > 0) {
        // lines are commented, so remove the # character (and following space if present)
        var commentIndex = line.indexOf("#");
        if (commentIndex >= 0) {
          var removeLength = 1;
          // Also remove the space after # if present (e.g., "  # code" -> "  code")
          if (commentIndex + 1 < line.length && line.charAt(commentIndex + 1) === " ") {
            removeLength = 2;
          }
          this.getDoc().replaceRange(
            "",
            {
              line: i,
              ch: commentIndex,
            },
            {
              line: i,
              ch: commentIndex + removeLength,
            },
          );
        }
      } else if (!linesAreCommented && line.length > 0) {
        // Not all lines are commented, so add comments
        // Insert "# " after the leading whitespace
        this.getDoc().replaceRange("# ", {
          line: i,
          ch: leadingWhitespace,
        });
      }
    }
  }

  public autoformat() {
    if (!this.getDoc().somethingSelected()) this.execCommand("selectAll");
    const from = this.getDoc().getCursor("start");

    var to: Position = {
      line: this.getDoc().getCursor("end").line,
      ch: this.getDoc().getSelection().length,
    };
    var absStart = this.getDoc().indexFromPos(from);
    var absEnd = this.getDoc().indexFromPos(to);
    // Insert additional line breaks where necessary according to the
    // mode's syntax

    const res = this.autoformatSelection(absStart, absEnd);

    // Replace and auto-indent the range
    this.operation(() => {
      this.getDoc().replaceRange(res, from, to);
      var startLine = this.getDoc().posFromIndex(absStart).line;
      var endLine = this.getDoc().posFromIndex(absStart + res.length).line;
      for (var i = startLine; i <= endLine; i++) {
        this.indentLine(i, "smart");
      }
    });
  }

  public formatQuery() {
    try {
      const currentQuery = this.getValue();
      const formatted = spfmt.format(currentQuery);
      this.setValue(formatted);
      // Collapse prefixes after formatting
      this.collapsePrefixes(true);
    } catch (error) {
      console.warn(
        "Failed to format SPARQL query using sparql-formatter. This may be due to syntax errors in the query. Falling back to legacy formatter.",
        error,
      );
      // If formatting fails, fall back to the built-in autoformat
      this.autoformat();
    }
  }

  public format() {
    const formatterType = this.persistentConfig?.formatterType || "sparql-formatter";
    if (formatterType === "legacy") {
      this.autoformat();
    } else {
      this.formatQuery();
    }
  }
  //values in the form of {?var: 'value'}, or [{?var: 'value'}]
  public getQueryWithValues(values: string | { [varName: string]: string } | Array<{ [varName: string]: string }>) {
    if (!values) return this.getValue();
    var injectString: string;
    if (typeof values === "string") {
      injectString = values;
    } else {
      //start building inject string
      if (!(values instanceof Array)) values = [values];
      var variables = values.reduce(function (vars, valueObj) {
        for (var v in valueObj) {
          vars[v] = v;
        }
        return vars;
      }, {});
      var varArray: string[] = [];
      for (var v in variables) {
        varArray.push(v);
      }

      if (!varArray.length) return this.getValue();
      //ok, we've got enough info to start building the string now
      injectString = "VALUES (" + varArray.join(" ") + ") {\n";
      values.forEach(function (valueObj) {
        injectString += "( ";
        varArray.forEach(function (variable) {
          injectString += valueObj[variable] || "UNDEF";
        });
        injectString += " )\n";
      });
      injectString += "}\n";
    }
    if (!injectString) return this.getValue();

    var newQuery = "";
    var injected = false;
    var gotSelect = false;
    (<any>Yasqe).runMode(
      this.getValue(),
      "sparql11",
      function (stringVal: string, className: string, _row: number, _col: number, _state: TokenizerState) {
        if (className === "keyword" && stringVal.toLowerCase() === "select") gotSelect = true;
        newQuery += stringVal;
        if (gotSelect && !injected && className === "punc" && stringVal === "{") {
          injected = true;
          //start injecting
          newQuery += "\n" + injectString;
        }
      },
    );
    return newQuery;
  }

  public getValueWithoutComments() {
    var cleanedQuery = "";
    (<any>Yasqe).runMode(this.getValue(), "sparql11", function (stringVal: string, className: string) {
      if (className != "comment") {
        cleanedQuery += stringVal;
      }
    });
    return cleanedQuery;
  }

  public setCheckSyntaxErrors(isEnabled: boolean) {
    this.config.syntaxErrorCheck = isEnabled;
    this.checkSyntax();
    this.checkConstructVariables();
  }
  public checkSyntax() {
    this.queryValid = true;

    this.clearGutter("gutterErrorBar");

    var state: TokenizerState;
    for (var l = 0; l < this.getDoc().lineCount(); ++l) {
      var precise = false;
      if (!this.prevQueryValid) {
        // we don't want cached information in this case, otherwise the
        // previous error sign might still show up,
        // even though the syntax error might be gone already
        precise = true;
      }

      var token: Token = this.getTokenAt(
        {
          line: l,
          ch: this.getDoc().getLine(l).length,
        },
        precise,
      );
      var state = token.state;
      this.setOption("queryType", state.queryType);
      if (state.OK == false) {
        if (!this.config.syntaxErrorCheck) {
          //the library we use already marks everything as being an error. Overwrite this class attribute.
          const els = this.getWrapperElement().querySelectorAll(".sp-error");
          for (let i = 0; i < els.length; i++) {
            var el: any = els[i];
            if (el.style) el.style.color = "black";
          }
          //we don't want the gutter error, so return
          return;
        }
        const warningEl = drawSvgStringAsElement(imgs.warning);
        if (state.errorMsg) {
          tooltip(this, warningEl, escape(token.state.errorMsg));
        } else if (state.possibleCurrent && state.possibleCurrent.length > 0) {
          var expectedEncoded: string[] = [];
          state.possibleCurrent.forEach(function (expected) {
            expectedEncoded.push("<strong style='text-decoration:underline'>" + escape(expected) + "</strong>");
          });
          tooltip(this, warningEl, "This line is invalid. Expected: " + expectedEncoded.join(", "));
        }
        // warningEl.style.marginTop = "2px";
        // warningEl.style.marginLeft = "2px";
        warningEl.className = "parseErrorIcon";
        this.setGutterMarker(l, "gutterErrorBar", warningEl);

        this.queryValid = false;
        break;
      }
    }
  }

  public setCheckConstructVariables(isEnabled: boolean) {
    this.config.checkConstructVariables = isEnabled;
    if (!isEnabled) {
      // Clear any existing warnings when disabled
      this.clearGutter("gutterConstructWarning");
    } else {
      this.checkConstructVariables();
    }
  }

  public checkConstructVariables() {
    // Clear any existing warnings first
    this.clearGutter("gutterConstructWarning");

    // Only check if enabled, query is valid, and it's a CONSTRUCT query
    if (!this.config.checkConstructVariables || !this.queryValid || this.getQueryType() !== "CONSTRUCT") {
      return;
    }

    // Get the final state after parsing the entire query
    const lastLine = this.getDoc().lastLine();
    const token: Token = this.getTokenAt({ line: lastLine, ch: this.getDoc().getLine(lastLine).length }, true);

    const state = token.state as TokenizerState;

    // Check for undefined variables in CONSTRUCT template
    const undefinedVars: string[] = [];
    for (const varName in state.constructVariables) {
      if (!state.whereVariables[varName]) {
        undefinedVars.push(varName);
      }
    }

    if (undefinedVars.length === 0) {
      return;
    }

    // Find lines where undefined variables are used in CONSTRUCT template
    // Note: This iterates through all lines but filters by inConstructTemplate flag
    // For large queries, this could be optimized by tracking line ranges during tokenization
    for (let l = 0; l < this.getDoc().lineCount(); ++l) {
      const lineToken: Token = this.getTokenAt({ line: l, ch: this.getDoc().getLine(l).length }, true);
      const lineState = lineToken.state as TokenizerState;

      // Only mark variables in the CONSTRUCT template
      if (lineState.queryType === "CONSTRUCT" && lineState.inConstructTemplate) {
        const line = this.getDoc().getLine(l);
        // Check if this line contains any undefined variable (use word boundary to avoid partial matches)
        for (const undefinedVar of undefinedVars) {
          // Escape special regex characters in variable name
          // Use negative lookbehind/lookahead to ensure we match the full variable name
          // Variables can be followed by whitespace, punctuation, or end of line
          const escapedVar = undefinedVar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const varRegex = new RegExp(`${escapedVar}(?![a-zA-Z0-9_])`);
          if (varRegex.test(line)) {
            const warningEl = drawSvgStringAsElement(imgs.warning);
            warningEl.className = "constructVariableWarning";
            tooltip(
              this,
              warningEl,
              escape(`Variable ${undefinedVar} is used in CONSTRUCT but not defined in WHERE clause`),
            );
            this.setGutterMarker(l, "gutterConstructWarning", warningEl);
            break; // Only one marker per line
          }
        }
      }
    }
  }

  /**
   * Token management
   */

  public getCompleteToken(token?: Token, cur?: Position): Token {
    return getCompleteToken(this, token, cur);
  }
  public getPreviousNonWsToken(line: number, token: Token): Token {
    return getPreviousNonWsToken(this, line, token);
  }
  public getNextNonWsToken(lineNumber: number, charNumber?: number): Token | undefined {
    return getNextNonWsToken(this, lineNumber, charNumber);
  }
  /**
   * Notification management
   */
  private notificationEls: { [key: string]: HTMLDivElement } = {};

  /**
   * Shows notification
   * @param key reference to the notification
   * @param message the message to display
   */
  public showNotification(key: string, message: string) {
    if (!this.notificationEls[key]) {
      // We create one wrapper for each notification, since there is no interactivity with the container (yet) we don't need to keep a reference
      const notificationContainer = document.createElement("div");
      addClass(notificationContainer, "notificationContainer");
      this.getWrapperElement().appendChild(notificationContainer);

      // Create the actual notification element
      this.notificationEls[key] = document.createElement("div");
      addClass(this.notificationEls[key], "notification", "notif_" + key);
      notificationContainer.appendChild(this.notificationEls[key]);
    }
    // Hide others
    for (const notificationId in this.notificationEls) {
      if (notificationId !== key) this.hideNotification(notificationId);
    }
    const el = this.notificationEls[key];
    addClass(el, "active");
    el.innerText = message;
  }
  /**
   * Hides notification
   * @param key the identifier of the notification to hide
   */
  public hideNotification(key: string) {
    if (this.notificationEls[key]) {
      removeClass(this.notificationEls[key], "active");
    }
  }

  /**
   * Snippets management
   */
  public setSnippetsBarVisible(visible: boolean) {
    // Update config and redraw
    this.config.showSnippetsBar = visible;
    this.drawSnippetsBar();
  }

  public getSnippetsBarVisible(): boolean {
    return this.config.showSnippetsBar && this.config.snippets.length > 0;
  }

  public refreshSnippetsBar() {
    this.drawSnippetsBar();
  }

  /**
   * Autocompleter management
   */
  public enableCompleter(name: string): Promise<void> {
    if (!Yasqe.Autocompleters[name])
      return Promise.reject(new Error("Autocompleter " + name + " is not a registered autocompleter"));
    if (this.config.autocompleters.indexOf(name) < 0) this.config.autocompleters.push(name);
    const autocompleter = (this.autocompleters[name] = new Autocompleter.Completer(this, Yasqe.Autocompleters[name]));
    return autocompleter.initialize();
  }
  public disableCompleter(name: string) {
    this.config.autocompleters = this.config.autocompleters.filter((a) => a !== name);
    this.autocompleters[name] = undefined;
  }
  public autocomplete(fromAutoShow = false) {
    if (this.getDoc().somethingSelected()) return;

    for (let i in this.config.autocompleters) {
      const autocompleter = this.autocompleters[this.config.autocompleters[i]];
      if (!autocompleter || !autocompleter.autocomplete(fromAutoShow)) continue;
    }
  }

  /**
   * Prefix management
   */
  public collapsePrefixes(collapse = true) {
    const firstPrefixLine = findFirstPrefixLine(this);
    if (firstPrefixLine === undefined) return; //nothing to collapse
    this.foldCode(firstPrefixLine, (<any>CodeMirror).fold.prefix, collapse ? "fold" : "unfold");
  }

  public getPrefixesFromQuery(): Prefixes {
    return getPrefixesFromQuery(this);
  }
  public addPrefixes(prefixes: string | Prefixes): void {
    return addPrefixes(this, prefixes);
  }
  public removePrefixes(prefixes: Prefixes): void {
    return removePrefixes(this, prefixes);
  }
  public updateWidget() {
    if (
      (this as any).cursorCoords &&
      (this as any).state.completionActive &&
      (this as any).state.completionActive.widget
    ) {
      const newTop: string = (this as any).cursorCoords(null).bottom;
      (this as any).state.completionActive.widget.hints.style.top = newTop + "px";
    }
  }

  /**
   * Querying
   */
  public query(config?: Sparql.YasqeAjaxConfig) {
    if (this.config.queryingDisabled) return Promise.reject("Querying is disabled.");
    // Auto-format query before execution if enabled in persistent config
    if (this.persistentConfig?.autoformatOnQuery) {
      this.format();
    }
    // Abort previous request
    this.abortQuery();
    return Sparql.executeQuery(this, config);
  }
  public getUrlParams() {
    //first try hash
    let urlParams: queryString.ParsedQuery = {};
    if (window.location.hash.length > 1) {
      //firefox does some decoding if we're using window.location.hash (e.g. the + sign in contentType settings)
      //Don't want this. So simply get the hash string ourselves
      urlParams = queryString.parse(location.hash);
    }
    if ((!urlParams || !("query" in urlParams)) && window.location.search.length > 1) {
      //ok, then just try regular url params
      urlParams = queryString.parse(window.location.search);
    }
    return urlParams;
  }
  public configToQueryParams(): queryString.ParsedQuery {
    //extend existing link, so first fetch current arguments
    var urlParams: any = {};
    if (window.location.hash.length > 1) urlParams = queryString.parse(window.location.hash);
    urlParams["query"] = this.getValue();
    return urlParams;
  }
  public queryParamsToConfig(params: queryString.ParsedQuery) {
    if (params && params.query && typeof params.query === "string") {
      this.setValue(params.query);
    }
  }

  public getAsCurlString(config?: Sparql.YasqeAjaxConfig): string {
    return Sparql.getAsCurlString(this, config);
  }

  public abortQuery() {
    if (this.req) {
      if (this.abortController) {
        this.abortController.abort();
      }
      this.emit("queryAbort", this, this.req);
    }
  }

  public expandEditor() {
    this.setSize(null, "100%");
  }

  public destroy() {
    // Abort running query
    this.abortQuery();
    this.unregisterEventListeners();
    this.resizeWrapper?.removeEventListener("mousedown", this.initDrag, false);
    this.resizeWrapper?.removeEventListener("dblclick", this.expandEditor);
    if (this.snippetsClickHandler) {
      document.removeEventListener("click", this.snippetsClickHandler);
      this.snippetsClickHandler = undefined;
    }
    for (const autocompleter in this.autocompleters) {
      this.disableCompleter(autocompleter);
    }
    window.removeEventListener("hashchange", this.handleHashChange);
    this.rootEl.remove();
  }

  /**
   * Statics
   */
  static Sparql = Sparql;
  static runMode = (<any>CodeMirror).runMode;
  static clearStorage() {
    const storage = new YStorage(Yasqe.storageNamespace);
    storage.removeNamespace();
  }

  static Autocompleters: { [name: string]: Autocompleter.CompleterConfig } = {};
  static registerAutocompleter(value: Autocompleter.CompleterConfig, enable = true) {
    const name = value.name;
    Yasqe.Autocompleters[name] = value;
    if (enable && Yasqe.defaults.autocompleters.indexOf(name) < 0) Yasqe.defaults.autocompleters.push(name);
  }
  static defaults = getDefaults();
  static forkAutocompleter(
    fromCompleter: string,
    newCompleter: { name: string } & Partial<Autocompleter.CompleterConfig>,
    enable = true,
  ) {
    if (!Yasqe.Autocompleters[fromCompleter]) throw new Error("Autocompleter " + fromCompleter + " does not exist");
    if (!newCompleter?.name) {
      throw new Error("Expected a name for newly registered autocompleter");
    }
    const name = newCompleter.name;
    Yasqe.Autocompleters[name] = { ...Yasqe.Autocompleters[fromCompleter], ...newCompleter };

    if (enable && Yasqe.defaults.autocompleters.indexOf(name) < 0) Yasqe.defaults.autocompleters.push(name);
  }
}
(<any>Object).assign(CodeMirror.prototype, Yasqe.prototype);

export type TokenizerState = sparql11Mode.State;
export type Position = CodeMirror.Position;
export type Token = CodeMirror.Token;

export interface HintList {
  list: Hint[];
  from: Position;
  to: Position;
}
export interface Hint {
  text: string;
  displayText?: string;
  className?: string;
  render?: (el: HTMLElement, self: Hint, data: any) => void;
  from?: Position;
  to?: Position;
}

export type HintFn = { async?: boolean } & (() => Promise<HintList> | HintList);
export interface HintConfig {
  completeOnSingleClick?: boolean;
  container?: HTMLElement;
  closeCharacters?: RegExp;
  completeSingle?: boolean;
  // A hinting function, as specified above. It is possible to set the async property on a hinting function to true, in which case it will be called with arguments (cm, callback, ?options), and the completion interface will only be popped up when the hinting function calls the callback, passing it the object holding the completions. The hinting function can also return a promise, and the completion interface will only be popped when the promise resolves. By default, hinting only works when there is no selection. You can give a hinting function a supportsSelection property with a truthy value to indicate that it supports selections.
  hint: HintFn;

  // Whether the pop-up should be horizontally aligned with the start of the word (true, default), or with the cursor (false).
  alignWithWord?: boolean;
  // When enabled (which is the default), the pop-up will close when the editor is unfocused.
  closeOnUnfocus?: boolean;
  // Allows you to provide a custom key map of keys to be active when the pop-up is active. The handlers will be called with an extra argument, a handle to the completion menu, which has moveFocus(n), setFocus(n), pick(), and close() methods (see the source for details), that can be used to change the focused element, pick the current element or close the menu. Additionally menuSize() can give you access to the size of the current dropdown menu, length give you the number of available completions, and data give you full access to the completion returned by the hinting function.
  customKeys?: any;

  // Like customKeys above, but the bindings will be added to the set of default bindings, instead of replacing them.
  extraKeys?: {
    [key: string]: (
      yasqe: Yasqe,
      event: {
        close: () => void;
        data: {
          from: Position;
          to: Position;
          list: Hint[];
        };
        length: number;
        menuSize: () => void;
        moveFocus: (movement: number) => void;
        pick: () => void;
        setFocus: (index: number) => void;
      },
    ) => void;
  };
}
export interface BasicAuthConfig {
  username: string;
  password: string;
}
export interface BearerAuthConfig {
  token: string;
}
export interface ApiKeyAuthConfig {
  headerName: string;
  apiKey: string;
}
export interface OAuth2AuthConfig {
  accessToken: string;
  idToken?: string; // ID token for authentication (Azure AD, OIDC)
}
export type AuthConfig = BasicAuthConfig | BearerAuthConfig | ApiKeyAuthConfig | OAuth2AuthConfig;
export interface RequestConfig<Y> {
  queryArgument: string | ((yasqe: Y) => string) | undefined;
  endpoint: string | ((yasqe: Y) => string);
  method: "POST" | "GET" | ((yasqe: Y) => "POST" | "GET");
  acceptHeaderGraph: string | ((yasqe: Y) => string);
  acceptHeaderSelect: string | ((yasqe: Y) => string);
  acceptHeaderUpdate: string | ((yasqe: Y) => string);
  namedGraphs: string[] | ((yasqe: Y) => string[]);
  defaultGraphs: string[] | ((yasqe: Y) => []);
  args: Array<{ name: string; value: string }> | ((yasqe: Y) => Array<{ name: string; value: string }>);
  headers: { [key: string]: string } | ((yasqe: Y) => { [key: string]: string });
  withCredentials: boolean | ((yasqe: Y) => boolean);
  adjustQueryBeforeRequest: ((yasqe: Y) => string) | false;
  basicAuth: BasicAuthConfig | ((yasqe: Y) => BasicAuthConfig | undefined) | undefined;
  bearerAuth: BearerAuthConfig | ((yasqe: Y) => BearerAuthConfig | undefined) | undefined;
  apiKeyAuth: ApiKeyAuthConfig | ((yasqe: Y) => ApiKeyAuthConfig | undefined) | undefined;
  oauth2Auth: OAuth2AuthConfig | ((yasqe: Y) => OAuth2AuthConfig | undefined) | undefined;
}
export type PlainRequestConfig = {
  [K in keyof RequestConfig<any>]: Exclude<RequestConfig<any>[K], Function>;
};
export type PartialConfig = {
  [P in keyof Config]?: Config[P] extends object ? Partial<Config[P]> : Config[P];
};

export interface Snippet {
  label: string;
  code: string;
  group?: string;
}
export interface Config extends Partial<CodeMirror.EditorConfiguration> {
  mode: string;
  collapsePrefixesOnLoad: boolean;
  syntaxErrorCheck: boolean;
  /**
   * Show a button with which users can create a link to this query. Set this value to null to disable this functionality.
   * By default, this feature is enabled, and the only the query value is appended to the link.
   * ps. This function should return an object which is parseable by jQuery.param (http://api.jquery.com/jQuery.param/)
   */
  createShareableLink: (yasqe: Yasqe) => string;
  createShortLink: ((yasqe: Yasqe, longLink: string) => Promise<string>) | undefined;
  consumeShareLink: ((yasqe: Yasqe) => void) | undefined | null;
  /**
   * Change persistency settings for the YASQE query value. Setting the values
   * to null, will disable persistancy: nothing is stored between browser
   * sessions Setting the values to a string (or a function which returns a
   * string), will store the query in localstorage using the specified string.
   * By default, the ID is dynamically generated using the closest dom ID, to avoid collissions when using multiple YASQE items on one
   * page
   */
  persistenceId: ((yasqe: Yasqe) => string) | string | undefined | null;
  persistencyExpire: number; //seconds
  showQueryButton: boolean;
  requestConfig: RequestConfig<Yasqe> | ((yasqe: Yasqe) => RequestConfig<Yasqe>);
  pluginButtons: (() => HTMLElement[] | HTMLElement) | undefined;
  //Addon specific addon ts defs, or missing props from codemirror conf
  highlightSelectionMatches: { showToken?: RegExp; annotateScrollbar?: boolean };
  tabMode: string;
  foldGutter: any; //This should be of type boolean, or an object. However, setting it to any to avoid
  //ts complaining about incorrectly extending, as the cm def only defined it has having a boolean type.
  matchBrackets: boolean;
  autocompleters: string[];
  hintConfig: Partial<HintConfig>;
  resizeable: boolean;
  editorHeight: string;
  queryingDisabled: string | undefined; // The string will be the message displayed when hovered
  prefixCcApi: string; // the suggested default prefixes URL API getter
  showFormatButton: boolean; // Show a button to format the query
  checkConstructVariables: boolean; // Check for undefined variables in CONSTRUCT queries
  snippets: Snippet[]; // Code snippets to show in the snippets bar
  showSnippetsBar: boolean; // Show the snippets bar
}
export interface PersistentConfig {
  query: string;
  editorHeight: string;
  formatterType?: "sparql-formatter" | "legacy"; // Which formatter to use
  autoformatOnQuery?: boolean; // Auto-format query on execution
}
// export var _Yasqe = _Yasqe;

//add missing static functions, added by e.g. addons
// declare function runMode(text:string, mode:any, out:any):void

//Need to assign our prototype to codemirror's, as some of the callbacks (e.g. the keymap opts)
//give us a cm doc, instead of a yasqe + cm doc
Autocompleter.completers.forEach((c) => {
  Yasqe.registerAutocompleter(c);
});

export default Yasqe;
