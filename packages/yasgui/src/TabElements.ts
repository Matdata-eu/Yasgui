import Yasgui from "./";
import TabContextMenu from "./TabContextMenu";
import { hasClass, addClass, removeClass } from "@matdata/yasgui-utils";
import sortablejs from "sortablejs";
import "./TabElements.scss";

// Theme toggle icons
const MOON_ICON = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
</svg>`;

const SUN_ICON = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
</svg>`;
export interface TabList {}
export class TabListEl {
  private tabList: TabList;
  private tabId: string;
  private yasgui: Yasgui;
  private renameEl?: HTMLInputElement;
  private nameEl?: HTMLSpanElement;
  public tabEl?: HTMLDivElement;
  constructor(yasgui: Yasgui, tabList: TabList, tabId: string) {
    this.tabList = tabList;
    this.yasgui = yasgui;
    this.tabId = tabId;
  }
  public delete() {
    if (this.tabEl) {
      this.tabList._tabsListEl?.removeChild(this.tabEl);
      delete this.tabList._tabs[this.tabId];
    }
  }
  public startRename() {
    if (this.renameEl) {
      const tab = this.yasgui.getTab(this.tabId);
      if (tab) {
        this.renameEl.value = tab.name();
        addClass(this.tabEl, "renaming");
        this.renameEl.focus();
      }
    }
  }
  public active(active: boolean) {
    if (!this.tabEl) return;
    if (active) {
      addClass(this.tabEl, "active");
      // add aria-properties
      this.tabEl.children[0].setAttribute("aria-selected", "true");
      this.tabEl.children[0].setAttribute("tabindex", "0");
    } else {
      removeClass(this.tabEl, "active");
      // remove aria-properties
      this.tabEl.children[0].setAttribute("aria-selected", "false");
      this.tabEl.children[0].setAttribute("tabindex", "-1");
    }
  }
  public rename(name: string) {
    if (this.nameEl) {
      this.nameEl.textContent = name;
    }
  }
  public setAsQuerying(querying: boolean) {
    if (querying) {
      addClass(this.tabEl, "querying");
    } else {
      removeClass(this.tabEl, "querying");
    }
  }
  public draw(name: string) {
    this.tabEl = document.createElement("div");
    this.tabEl.setAttribute("role", "presentation");
    this.tabEl.ondblclick = () => {
      this.startRename();
    };
    addClass(this.tabEl, "tab");
    this.tabEl.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.code === "Delete") handleDeleteTab();
    });

    const handleDeleteTab = (e?: MouseEvent) => {
      e?.preventDefault();
      this.yasgui.getTab(this.tabId)?.close();
    };

    const tabLinkEl = document.createElement("a");
    tabLinkEl.setAttribute("role", "tab");
    tabLinkEl.href = "#" + this.tabId;
    tabLinkEl.id = "tab-" + this.tabId; // use the id for the tabpanel which is tabId to set the actual tab id
    tabLinkEl.setAttribute("aria-controls", this.tabId); // respective tabPanel id
    tabLinkEl.addEventListener("blur", () => {
      if (!this.tabEl) return;
      if (this.tabEl.classList.contains("active")) {
        tabLinkEl.setAttribute("tabindex", "0");
      } else {
        tabLinkEl.setAttribute("tabindex", "-1");
      }
    });
    tabLinkEl.addEventListener("focus", () => {
      if (!this.tabEl) return;
      if (this.tabEl.classList.contains("active")) {
        const allTabs = Object.keys(this.tabList._tabs);
        const currentTabIndex = allTabs.indexOf(this.tabId);
        this.tabList.tabEntryIndex = currentTabIndex;
      }
    });
    // if (this.yasgui.persistentConfig.tabIsActive(this.tabId)) {
    //   this.yasgui.store.dispatch(selectTab(this.tabId))
    // }
    tabLinkEl.addEventListener("click", (e) => {
      e.preventDefault();
      this.yasgui.selectTabId(this.tabId);
    });

    //tab name
    this.nameEl = document.createElement("span");
    this.nameEl.textContent = name;
    tabLinkEl.appendChild(this.nameEl);

    //tab close btn
    const closeBtn = document.createElement("div");
    closeBtn.innerHTML = "&#x2716;";
    closeBtn.title = "Close tab";
    closeBtn.setAttribute("tabindex", "-1");
    closeBtn.setAttribute("aria-hidden", "true");
    addClass(closeBtn, "closeTab");
    closeBtn.addEventListener("click", handleDeleteTab);
    tabLinkEl.appendChild(closeBtn);

    const renameEl = (this.renameEl = document.createElement("input"));
    renameEl.type = "text";
    renameEl.value = name;
    renameEl.onkeyup = (event) => {
      if (event.key === "Enter") {
        this.yasgui.getTab(this.tabId)?.setName(renameEl.value);
        removeClass(this.tabEl, "renaming");
      }
    };
    renameEl.onblur = () => {
      this.yasgui.getTab(this.tabId)?.setName(renameEl.value);
      removeClass(this.tabEl, "renaming");
    };
    tabLinkEl.appendChild(this.renameEl);
    tabLinkEl.oncontextmenu = (ev: MouseEvent) => {
      // Close possible old
      this.tabList.tabContextMenu?.closeConfigMenu();
      this.openTabConfigMenu(ev);
      ev.preventDefault();
      ev.stopPropagation();
    };
    this.tabEl.appendChild(tabLinkEl);

    //draw loading animation overlay
    const loaderEl = document.createElement("div");
    addClass(loaderEl, "loader");
    this.tabEl.appendChild(loaderEl);

    return this.tabEl;
  }
  private openTabConfigMenu(event: MouseEvent) {
    this.tabList.tabContextMenu?.openConfigMenu(this.tabId, this, event);
  }
  redrawContextMenu() {
    this.tabList.tabContextMenu?.redraw();
  }
}

export class TabList {
  yasgui: Yasgui;

  private _selectedTab?: string;
  private addTabEl?: HTMLDivElement;
  public _tabs: { [tabId: string]: TabListEl } = {};
  public _tabsListEl?: HTMLDivElement;
  public tabContextMenu?: TabContextMenu;
  public tabEntryIndex: number | undefined;

  constructor(yasgui: Yasgui) {
    this.yasgui = yasgui;
    this.registerListeners();
    this.tabEntryIndex = this.getActiveIndex();
  }
  get(tabId: string) {
    return this._tabs[tabId];
  }

  private registerListeners() {
    this.yasgui.on("query", (_yasgui, tab) => {
      const id = tab.getId();
      if (this._tabs[id]) {
        this._tabs[id].setAsQuerying(true);
      }
    });
    this.yasgui.on("queryResponse", (_yasgui, tab) => {
      const id = tab.getId();
      if (this._tabs[id]) {
        this._tabs[id].setAsQuerying(false);
      }
    });
    this.yasgui.on("queryAbort", (_yasgui, tab) => {
      const id = tab.getId();
      if (this._tabs[id]) {
        this._tabs[id].setAsQuerying(false);
      }
    });
  }
  private getActiveIndex() {
    if (!this._selectedTab) return;
    const allTabs = Object.keys(this._tabs);
    const currentTabIndex = allTabs.indexOf(this._selectedTab);
    return currentTabIndex;
  }
  private handleKeydownArrowKeys = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      if (!this._tabsListEl) return;
      const numOfChildren = this._tabsListEl.childElementCount;
      if (typeof this.tabEntryIndex !== "number") return;
      const tabEntryDiv = this._tabsListEl.children[this.tabEntryIndex];
      // If the current tab does not have active set its tabindex to -1
      if (!tabEntryDiv.classList.contains("active")) {
        tabEntryDiv.children[0].setAttribute("tabindex", "-1"); // cur tab removed from tab index
      }
      if (e.code === "ArrowLeft") {
        this.tabEntryIndex--;
        if (this.tabEntryIndex < 0) {
          this.tabEntryIndex = numOfChildren - 1;
        }
      }
      if (e.code === "ArrowRight") {
        this.tabEntryIndex++;
        if (this.tabEntryIndex >= numOfChildren) {
          this.tabEntryIndex = 0;
        }
      }
      const newTabEntryDiv = this._tabsListEl.children[this.tabEntryIndex];
      newTabEntryDiv.children[0].setAttribute("tabindex", "0");
      (newTabEntryDiv.children[0] as HTMLElement).focus(); // focus on the a tag inside the div for click event
    }
  };
  drawTabsList() {
    this._tabsListEl = document.createElement("div");
    addClass(this._tabsListEl, "tabsList");
    this._tabsListEl.setAttribute("role", "tablist");
    this._tabsListEl.addEventListener("keydown", this.handleKeydownArrowKeys);

    sortablejs.create(this._tabsListEl, {
      group: "tabList",
      animation: 100,
      onUpdate: (_ev: any) => {
        const tabs = this.deriveTabOrderFromEls();
        this.yasgui.emit("tabOrderChanged", this.yasgui, tabs);
        this.yasgui.persistentConfig.setTabOrder(tabs);
      },
      filter: ".addTab",
      onMove: (ev: any, _origEv: any) => {
        return hasClass(ev.related, "tab");
      },
    });

    // Add theme toggle button if enabled
    if (this.yasgui.config.showThemeToggle) {
      const themeToggleEl = document.createElement("button");
      themeToggleEl.className = "themeToggle";
      themeToggleEl.title = "Toggle theme";
      themeToggleEl.setAttribute("aria-label", "Toggle between light and dark theme");
      themeToggleEl.innerHTML = this.getThemeToggleIcon();
      themeToggleEl.addEventListener("click", () => {
        this.yasgui.toggleTheme();
        themeToggleEl.innerHTML = this.getThemeToggleIcon();
      });
      this._tabsListEl.appendChild(themeToggleEl);
    }

    this.addTabEl = document.createElement("div");
    this.addTabEl.setAttribute("role", "presentation");

    const addTabLink = document.createElement("button");
    addTabLink.className = "addTab";
    addTabLink.textContent = "+";
    addTabLink.title = "Add tab";
    addTabLink.setAttribute("aria-label", "Add a new tab");
    addTabLink.addEventListener("click", this.handleAddNewTab);
    addTabLink.addEventListener("focus", () => {
      // sets aria tabEntryIndex to active tab
      // this.tabEntryIndex = this.getActiveIndex();
      if (!this._tabsListEl) return;
      this.tabEntryIndex = this._tabsListEl.childElementCount - 1; // sets tabEntry to add tab, visually makes sense, not sure about accessibility-wise
    });
    addTabLink.addEventListener("blur", () => {
      addTabLink.setAttribute("tabindex", "0"); // maintains tabability
    });
    this.addTabEl.appendChild(addTabLink);
    this._tabsListEl.appendChild(this.addTabEl);
    this.tabContextMenu = TabContextMenu.get(
      this.yasgui,
      this.yasgui.config.contextMenuContainer ? this.yasgui.config.contextMenuContainer : this._tabsListEl,
    );
    return this._tabsListEl;
  }
  handleAddNewTab = (event: Event) => {
    event.preventDefault();
    this.yasgui.addTab(true);
  };
  // drawPanels() {
  //   this.tabPanelsEl = document.createElement("div");
  //   return this.tabsListEl;
  // }
  public addTab(tabId: string, index?: number) {
    return this.drawTab(tabId, index);
  }
  public deriveTabOrderFromEls() {
    const tabs: string[] = [];
    if (this._tabsListEl) {
      for (let i = 0; i < this._tabsListEl.children.length; i++) {
        const child = this._tabsListEl.children[i]; //this is the tab div
        const anchorTag = child.children[0]; //this one has an href
        if (anchorTag) {
          const href = (<HTMLAnchorElement>anchorTag).href;
          if (href && href.indexOf("#") >= 0) {
            tabs.push(href.substr(href.indexOf("#") + 1));
          }
        }
      }
    }
    return tabs;
  }

  public selectTab(tabId: string) {
    this._selectedTab = tabId;
    for (const id in this._tabs) {
      this._tabs[id].active(this._selectedTab === id);
    }
  }

  public drawTab(tabId: string, index?: number) {
    this._tabs[tabId] = new TabListEl(this.yasgui, this, tabId);
    const tabConf = this.yasgui.persistentConfig.getTab(tabId);
    if (index !== undefined && index < this.yasgui.persistentConfig.getTabs().length - 1) {
      this._tabsListEl?.insertBefore(
        this._tabs[tabId].draw(tabConf.name),
        this._tabs[this.yasgui.persistentConfig.getTabs()[index + 1]].tabEl || null,
      );
    } else {
      this._tabsListEl?.insertBefore(this._tabs[tabId].draw(tabConf.name), this.addTabEl || null);
    }
  }
  private getThemeToggleIcon(): string {
    const currentTheme = this.yasgui.getTheme();
    // In dark mode, show moon icon (clicking will switch to light)
    // In light mode, show sun icon (clicking will switch to dark)
    return currentTheme === "dark" ? MOON_ICON : SUN_ICON;
  }
  public destroy() {
    for (const tabId in this._tabs) {
      const tab = this._tabs[tabId];
      tab.delete();
    }
    this._tabs = {};
    this.tabContextMenu?.destroy();
    this._tabsListEl?.remove();
    this._tabsListEl = undefined;
  }
}

export default TabList;
