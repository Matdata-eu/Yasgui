import type Yasgui from "../index";
import { addClass, removeClass } from "@matdata/yasgui-utils";
import type { WorkspaceConfig, FolderEntry } from "./types";
import { filterFolderEntriesByName } from "./browserFilter";
import { getWorkspaceBackend } from "./backends/getWorkspaceBackend";
import { asWorkspaceBackendError } from "./backends/errors";
import { getEndpointToAutoSwitch } from "./openManagedQuery";
import { hashQueryText } from "./textHash";
import type { BackendType, VersionRef, ManagedTabMetadata } from "./types";
import { normalizeQueryFilename } from "./normalizeQueryFilename";

import "./QueryBrowser.scss";

export default class QueryBrowser {
  private yasgui: Yasgui;
  private rootEl: HTMLDivElement;
  private drawerEl: HTMLDivElement;
  private headerEl: HTMLDivElement;
  private bodyEl: HTMLDivElement;
  private footerEl: HTMLDivElement;
  private tooltipEl: HTMLDivElement;

  private workspaceSelectEl: HTMLSelectElement;
  private searchEl: HTMLInputElement;
  private backButtonEl: HTMLButtonElement;
  private listEl: HTMLDivElement;
  private statusEl: HTMLDivElement;

  private isOpen = false;
  private openerEl?: HTMLElement;

  private selectedWorkspaceId?: string;
  private currentFolderId: string | undefined;

  private treeWorkspaceId?: string;
  private expandedFolderIds = new Set<string>();
  private folderEntriesById = new Map<string, FolderEntry[]>();
  private folderLoadingById = new Set<string>();
  private folderErrorById = new Map<string, string>();

  private debouncedSearchHandle?: number;

  private refreshRunId = 0;

  private queryPreviewById = new Map<string, string>();
  private queryPreviewLoadingById = new Set<string>();
  private lastRenderedSignature: string | undefined;

  private lastPointerPos: { x: number; y: number } | undefined;

  private entrySignature(entry: FolderEntry): string {
    const parent = entry.parentId || "";
    // Include label + parent so renames/moves force a re-render.
    return `${entry.kind}:${entry.id}:${entry.label}:${parent}`;
  }

  private invalidateRenderCache() {
    this.lastRenderedSignature = undefined;
  }

  public invalidateAndRefresh(workspaceId?: string) {
    // Clear caches so new/renamed queries show up immediately.
    if (!workspaceId || this.treeWorkspaceId === workspaceId) {
      this.folderEntriesById.clear();
      this.folderLoadingById.clear();
      this.folderErrorById.clear();
      this.queryPreviewById.clear();
      this.queryPreviewLoadingById.clear();
      this.invalidateRenderCache();
      if (this.isOpen) void this.refresh();
    }
  }

  constructor(yasgui: Yasgui) {
    this.yasgui = yasgui;

    this.rootEl = document.createElement("div");
    addClass(this.rootEl, "yasgui-query-browser");

    this.tooltipEl = document.createElement("div");
    addClass(this.tooltipEl, "yasgui-query-browser__tooltip");
    this.tooltipEl.setAttribute("role", "tooltip");
    this.tooltipEl.setAttribute("aria-hidden", "true");

    this.drawerEl = document.createElement("div");
    addClass(this.drawerEl, "yasgui-query-browser__drawer");

    this.headerEl = document.createElement("div");
    addClass(this.headerEl, "yasgui-query-browser__header");

    this.bodyEl = document.createElement("div");
    addClass(this.bodyEl, "yasgui-query-browser__body");

    this.bodyEl.addEventListener("mousemove", (e) => {
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
      if (this.tooltipEl.classList.contains("open")) this.positionTooltip();
    });

    this.footerEl = document.createElement("div");
    addClass(this.footerEl, "yasgui-query-browser__footer");

    this.statusEl = document.createElement("div");
    addClass(this.statusEl, "yasgui-query-browser__status");

    this.workspaceSelectEl = document.createElement("select");
    this.workspaceSelectEl.setAttribute("aria-label", "Select workspace");
    this.workspaceSelectEl.addEventListener("change", () => {
      this.selectedWorkspaceId = this.workspaceSelectEl.value || undefined;
      this.currentFolderId = undefined;
      this.resetTreeState();
      this.searchEl.value = "";
      void this.refresh();
    });

    this.searchEl = document.createElement("input");
    this.searchEl.type = "search";
    this.searchEl.placeholder = "Search queries";
    this.searchEl.setAttribute("aria-label", "Search managed queries by name");
    this.searchEl.addEventListener("input", () => {
      if (this.debouncedSearchHandle) window.clearTimeout(this.debouncedSearchHandle);
      this.debouncedSearchHandle = window.setTimeout(() => {
        void this.refresh();
      }, 250);
    });

    this.backButtonEl = document.createElement("button");
    this.backButtonEl.type = "button";
    this.backButtonEl.textContent = "Back";
    addClass(this.backButtonEl, "yasgui-query-browser__back");
    this.backButtonEl.setAttribute("aria-label", "Go to parent folder");
    this.backButtonEl.addEventListener("click", () => {
      if (!this.currentFolderId) return;
      const parts = this.currentFolderId.split("/").filter(Boolean);
      parts.pop();
      this.currentFolderId = parts.join("/") || undefined;
      void this.refresh();
    });

    const titleEl = document.createElement("div");
    addClass(titleEl, "yasgui-query-browser__title");
    titleEl.textContent = "Query Browser";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "Close";
    addClass(closeButton, "yasgui-query-browser__close");
    closeButton.setAttribute("aria-label", "Close query browser");
    closeButton.addEventListener("click", () => this.close());

    const headerControls = document.createElement("div");
    addClass(headerControls, "yasgui-query-browser__header-controls");
    headerControls.appendChild(this.workspaceSelectEl);
    headerControls.appendChild(this.searchEl);

    const headerTop = document.createElement("div");
    addClass(headerTop, "yasgui-query-browser__header-top");
    headerTop.appendChild(titleEl);
    headerTop.appendChild(closeButton);

    this.headerEl.appendChild(headerTop);
    this.headerEl.appendChild(headerControls);

    this.listEl = document.createElement("div");
    addClass(this.listEl, "yasgui-query-browser__list");

    this.bodyEl.appendChild(this.backButtonEl);
    this.bodyEl.appendChild(this.statusEl);
    this.bodyEl.appendChild(this.listEl);

    this.footerEl.textContent = "";

    this.drawerEl.appendChild(this.headerEl);
    this.drawerEl.appendChild(this.bodyEl);
    this.drawerEl.appendChild(this.footerEl);

    this.rootEl.appendChild(this.drawerEl);
    this.rootEl.appendChild(this.tooltipEl);

    this.rootEl.addEventListener("click", (e) => {
      if (e.target === this.rootEl) this.close();
    });

    document.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    });

    this.close();
  }

  public getElement(): HTMLDivElement {
    return this.rootEl;
  }

  public open(openerEl?: HTMLElement) {
    this.openerEl = openerEl;
    this.isOpen = true;
    this.rootEl.style.display = "flex";
    addClass(this.rootEl, "open");
    this.rootEl.setAttribute("aria-hidden", "false");
    this.drawerEl.setAttribute("role", "dialog");
    this.drawerEl.setAttribute("aria-modal", "true");

    void this.refresh().then(() => {
      this.workspaceSelectEl.focus();
    });
  }

  public close() {
    this.isOpen = false;
    removeClass(this.rootEl, "open");
    this.rootEl.setAttribute("aria-hidden", "true");
    this.rootEl.style.display = "none";

    if (this.openerEl) {
      this.openerEl.focus();
      this.openerEl = undefined;
    }
  }

  public toggle(openerEl?: HTMLElement) {
    if (this.isOpen) this.close();
    else this.open(openerEl);
  }

  private getWorkspaces(): WorkspaceConfig[] {
    return this.yasgui.persistentConfig.getWorkspaces();
  }

  private ensureWorkspaceSelection() {
    const workspaces = this.getWorkspaces();
    if (workspaces.length === 0) {
      this.selectedWorkspaceId = undefined;
      return;
    }

    if (!this.selectedWorkspaceId) {
      const persistedActive = this.yasgui.persistentConfig.getActiveWorkspaceId();
      this.selectedWorkspaceId = persistedActive || workspaces[0].id;
    }

    const exists = workspaces.some((w) => w.id === this.selectedWorkspaceId);
    if (!exists) this.selectedWorkspaceId = workspaces[0].id;

    this.yasgui.persistentConfig.setActiveWorkspaceId(this.selectedWorkspaceId);
  }

  private renderWorkspaceSelect() {
    const workspaces = this.getWorkspaces();
    this.workspaceSelectEl.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = workspaces.length ? "Select workspace" : "No workspaces";
    this.workspaceSelectEl.appendChild(placeholder);

    for (const w of workspaces) {
      const opt = document.createElement("option");
      opt.value = w.id;
      opt.textContent = w.label;
      this.workspaceSelectEl.appendChild(opt);
    }

    this.workspaceSelectEl.value = this.selectedWorkspaceId || "";
  }

  private setStatus(text: string) {
    this.statusEl.textContent = text;
  }

  private resetTreeState() {
    this.treeWorkspaceId = undefined;
    this.expandedFolderIds.clear();
    this.folderEntriesById.clear();
    this.folderLoadingById.clear();
    this.folderErrorById.clear();
    this.invalidateRenderCache();
  }

  private folderKey(folderId: string | undefined): string {
    return folderId || "";
  }

  private async ensureFolderLoaded(backend: ReturnType<typeof getWorkspaceBackend>, folderId: string | undefined) {
    const key = this.folderKey(folderId);
    if (this.folderEntriesById.has(key) || this.folderLoadingById.has(key)) return;

    this.folderLoadingById.add(key);
    this.folderErrorById.delete(key);

    try {
      const entries = await backend.listFolder(folderId);
      this.folderEntriesById.set(key, entries);
    } catch (e) {
      const err = asWorkspaceBackendError(e);
      this.folderErrorById.set(key, err.message || "Failed to load folder");
      this.folderEntriesById.set(key, []);
    } finally {
      this.folderLoadingById.delete(key);
    }
  }

  private formatStatusError(err: Error, workspaceType: WorkspaceConfig["type"]) {
    const message = err.message || "Unknown error";

    if (message.includes("No GitProviderClient configured")) {
      return "Git workspaces require a supported provider. Supported: GitHub, GitLab, Bitbucket Cloud (bitbucket.org), and Gitea. For self-hosted/enterprise instances, configure a git workspace 'provider' and/or 'apiBaseUrl'.";
    }

    if (message.toLowerCase().includes("not implemented")) {
      return "This workspace backend is not supported yet.";
    }

    return message;
  }

  private clearList() {
    this.listEl.innerHTML = "";
  }

  private formatQueryPreview(queryText: string, description?: string): string {
    const normalized = queryText.replace(/\r\n?/g, "\n").trim();
    const lines = normalized.split("\n").map((l) => l.trimEnd());
    const maxLines = 12;
    const selected = lines.slice(0, maxLines);
    let out = selected.join("\n");

    const maxChars = 800;
    if (out.length > maxChars) out = out.slice(0, maxChars - 1).trimEnd() + "…";
    if (lines.length > maxLines && !out.endsWith("…")) out = out + "\n…";

    const trimmedDesc = description?.replace(/\r\n?/g, "\n").trim();
    if (!trimmedDesc) return out;
    return `${trimmedDesc}\n\n${out}`;
  }

  private async ensureQueryPreview(
    backend: ReturnType<typeof getWorkspaceBackend>,
    queryId: string,
  ): Promise<string | undefined> {
    const cached = this.queryPreviewById.get(queryId);
    if (cached) return cached;
    if (this.queryPreviewLoadingById.has(queryId)) return undefined;

    this.queryPreviewLoadingById.add(queryId);
    try {
      const res = await backend.readQuery(queryId);
      const preview = this.formatQueryPreview(res.queryText, res.description);
      this.queryPreviewById.set(queryId, preview);
      return preview;
    } catch {
      return undefined;
    } finally {
      this.queryPreviewLoadingById.delete(queryId);
    }
  }

  private getManagedQueryIdFromMetadata(meta: ManagedTabMetadata): string | undefined {
    if (meta.backendType === "git") return (meta.queryRef as any)?.path as string | undefined;
    return (meta.queryRef as any)?.managedQueryIri as string | undefined;
  }

  private findOpenManagedTabId(workspaceId: string, backendType: BackendType, queryId: string): string | undefined {
    for (const tab of Object.values(this.yasgui._tabs)) {
      const meta = tab.getManagedQueryMetadata();
      if (!meta) continue;
      if (meta.workspaceId !== workspaceId) continue;
      if (meta.backendType !== backendType) continue;
      const openQueryId = this.getManagedQueryIdFromMetadata(meta);
      if (openQueryId === queryId) return tab.getId();
    }
    return undefined;
  }

  private showTooltip(text: string) {
    this.tooltipEl.textContent = text;
    this.tooltipEl.setAttribute("aria-hidden", "false");
    addClass(this.tooltipEl, "open");
    this.positionTooltip();
  }

  private hideTooltip() {
    this.tooltipEl.textContent = "";
    this.tooltipEl.setAttribute("aria-hidden", "true");
    removeClass(this.tooltipEl, "open");
  }

  private positionTooltip() {
    const pos = this.lastPointerPos;
    if (!pos) return;

    // Start with a simple cursor offset.
    let left = pos.x + 12;
    let top = pos.y + 12;

    // Clamp to viewport.
    const rect = this.tooltipEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + rect.width > vw - 8) left = Math.max(8, vw - rect.width - 8);
    if (top + rect.height > vh - 8) top = Math.max(8, vh - rect.height - 8);

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  private attachQueryHoverPreview(row: HTMLElement, backend: ReturnType<typeof getWorkspaceBackend>, queryId: string) {
    const onEnter = () => {
      const cached = this.queryPreviewById.get(queryId);
      if (cached) {
        this.showTooltip(cached);
        return;
      }

      this.showTooltip("Loading preview…");
      void this.ensureQueryPreview(backend, queryId).then((preview) => {
        if (!this.tooltipEl.classList.contains("open")) return;
        if (preview) this.showTooltip(preview);
      });
    };

    const onLeave = () => {
      this.hideTooltip();
    };

    row.addEventListener("mouseenter", onEnter);
    row.addEventListener("mouseleave", onLeave);
    row.addEventListener("focusin", onEnter);
    row.addEventListener("focusout", onLeave);
  }

  private getBackendForSelectedWorkspace(): ReturnType<typeof getWorkspaceBackend> | undefined {
    const workspace = this.getWorkspaces().find((w) => w.id === this.selectedWorkspaceId);
    if (!workspace) return undefined;
    return getWorkspaceBackend(workspace, { persistentConfig: this.yasgui.persistentConfig });
  }

  private versionRefFromVersionTag(backendType: BackendType, versionTag: string | undefined): VersionRef | undefined {
    if (!versionTag) return undefined;
    if (backendType === "git") return { commitSha: versionTag };
    return { managedQueryVersionIri: versionTag };
  }

  private async openManagedQueryInNewTab(
    backend: ReturnType<typeof getWorkspaceBackend>,
    backendType: BackendType,
    queryId: string,
    queryLabel?: string,
  ) {
    const workspaceId = this.selectedWorkspaceId!;
    const alreadyOpenTabId = this.findOpenManagedTabId(workspaceId, backendType, queryId);
    if (alreadyOpenTabId) {
      this.yasgui.selectTabId(alreadyOpenTabId);
      return;
    }

    const read = await backend.readQuery(queryId);

    const tab = this.yasgui.addTab(true);
    if (queryLabel) tab.setName(queryLabel);

    const endpoint = getEndpointToAutoSwitch(backendType, read);
    if (endpoint) tab.setEndpoint(endpoint);

    tab.setQuery(read.queryText);

    const managedMetadata: ManagedTabMetadata = {
      workspaceId,
      backendType,
      queryRef: backendType === "git" ? { path: queryId } : { managedQueryIri: queryId },
      lastSavedVersionRef: this.versionRefFromVersionTag(backendType, read.versionTag),
      lastSavedTextHash: hashQueryText(read.queryText),
    };
    tab.setManagedQueryMetadata(managedMetadata);
  }

  private addQueryRowActions(row: HTMLElement, backend: ReturnType<typeof getWorkspaceBackend>, entry: FolderEntry) {
    const actions = document.createElement("span");
    addClass(actions, "yasgui-query-browser__actions");

    if (entry.kind === "folder") {
      if (backend.renameFolder) {
        const renameBtn = document.createElement("button");
        renameBtn.type = "button";
        addClass(renameBtn, "yasgui-query-browser__action");
        renameBtn.textContent = "Rename";
        renameBtn.setAttribute("aria-label", `Rename folder ${entry.label}`);
        renameBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const next = window.prompt("Rename folder", entry.label);
          if (!next) return;
          const trimmed = next.trim();
          if (!trimmed || trimmed === entry.label) return;

          try {
            await backend.renameFolder!(entry.id, trimmed);
            this.folderEntriesById.clear();
            this.invalidateRenderCache();
            await this.refresh();
          } catch (err) {
            window.alert(asWorkspaceBackendError(err).message);
          }
        });
        actions.appendChild(renameBtn);
      }

      if (backend.deleteFolder) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        addClass(deleteBtn, "yasgui-query-browser__action");
        addClass(deleteBtn, "yasgui-query-browser__action--danger");
        deleteBtn.textContent = "Delete";
        deleteBtn.setAttribute("aria-label", `Delete folder ${entry.label}`);
        deleteBtn.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();

          const ok = window.confirm(`Delete folder '${entry.label}' and everything inside it? This cannot be undone.`);
          if (!ok) return;

          try {
            await backend.deleteFolder!(entry.id);
            this.folderEntriesById.clear();
            this.invalidateRenderCache();
            await this.refresh();
          } catch (err) {
            window.alert(asWorkspaceBackendError(err).message);
          }
        });
        actions.appendChild(deleteBtn);
      }

      if (actions.childElementCount > 0) row.appendChild(actions);
      return;
    }

    if (entry.kind !== "query") return;

    if (backend.renameQuery) {
      const renameBtn = document.createElement("button");
      renameBtn.type = "button";
      addClass(renameBtn, "yasgui-query-browser__action");
      renameBtn.textContent = "Rename";
      renameBtn.setAttribute("aria-label", `Rename ${entry.label}`);
      renameBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const next = window.prompt("Rename query", entry.label);
        if (!next) return;
        const trimmed = next.trim();
        if (!trimmed || trimmed === entry.label) return;

        // For git workspaces we can deterministically compute the new path, so we can
        // also update any already-open managed tabs that reference this query.
        const gitRenameInfo = (() => {
          if (backend.type !== "git") return undefined;
          const parts = entry.id.split("/").filter(Boolean);
          parts.pop();
          const folderPrefix = parts.join("/");
          const safe = trimmed.replace(/[\\/]/g, "-");
          const newFilename = normalizeQueryFilename(safe);
          const newPath = folderPrefix ? `${folderPrefix}/${newFilename}` : newFilename;
          return { oldPath: entry.id, newPath };
        })();

        // Show loading state
        const originalText = renameBtn.textContent;
        renameBtn.disabled = true;
        renameBtn.textContent = "Renaming…";
        addClass(renameBtn, "loading");

        try {
          await backend.renameQuery!(entry.id, trimmed);

          if (gitRenameInfo && gitRenameInfo.newPath && gitRenameInfo.oldPath) {
            for (const tab of Object.values(this.yasgui._tabs)) {
              const meta = (tab as any).getManagedQueryMetadata?.() as ManagedTabMetadata | undefined;
              if (!meta) continue;
              if (meta.backendType !== "git") continue;
              if (meta.workspaceId !== this.selectedWorkspaceId) continue;
              const currentPath = (meta.queryRef as any)?.path as string | undefined;
              if (currentPath !== gitRenameInfo.oldPath) continue;

              try {
                const read = await backend.readQuery(gitRenameInfo.newPath);
                const lastSavedTextHash = hashQueryText(read.queryText);
                const lastSavedVersionRef = this.versionRefFromVersionTag("git", read.versionTag);

                (tab as any).setManagedQueryMetadata?.({
                  ...meta,
                  queryRef: { ...(meta.queryRef as any), path: gitRenameInfo.newPath },
                  lastSavedTextHash,
                  lastSavedVersionRef,
                });
                (tab as any).setName?.(trimmed);
              } catch {
                // Best-effort: if refreshing metadata fails, the Query Browser still reflects the rename.
              }
            }
          }

          this.queryPreviewById.delete(entry.id);
          this.folderEntriesById.clear();
          this.invalidateRenderCache();
          await this.refresh();
        } catch (err) {
          // Restore button state on error
          renameBtn.disabled = false;
          renameBtn.textContent = originalText || "Rename";
          removeClass(renameBtn, "loading");
          window.alert(asWorkspaceBackendError(err).message);
        }
      });
      actions.appendChild(renameBtn);
    }

    if (backend.deleteQuery) {
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      addClass(deleteBtn, "yasgui-query-browser__action");
      addClass(deleteBtn, "yasgui-query-browser__action--danger");
      deleteBtn.textContent = "Delete";
      deleteBtn.setAttribute("aria-label", `Delete ${entry.label}`);
      deleteBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = window.confirm(`Delete '${entry.label}'? This cannot be undone.`);
        if (!ok) return;

        // Show loading state
        const originalText = deleteBtn.textContent;
        deleteBtn.disabled = true;
        deleteBtn.textContent = "Deleting…";
        addClass(deleteBtn, "loading");

        try {
          await backend.deleteQuery!(entry.id);
          this.queryPreviewById.delete(entry.id);
          this.folderEntriesById.clear();
          this.invalidateRenderCache();
          await this.refresh();
        } catch (err) {
          // Restore button state on error
          deleteBtn.disabled = false;
          deleteBtn.textContent = originalText || "Delete";
          removeClass(deleteBtn, "loading");
          window.alert(asWorkspaceBackendError(err).message);
        }
      });
      actions.appendChild(deleteBtn);
    }

    if (actions.childElementCount > 0) {
      row.appendChild(actions);
    }
  }

  private renderFlatEntries(backend: ReturnType<typeof getWorkspaceBackend>, entries: FolderEntry[]) {
    this.clearList();

    const makeIndentStyle = (depth: number) => `padding-left: ${depth * 16}px;`;

    for (const entry of entries) {
      const row = document.createElement("div");
      addClass(row, "yasgui-query-browser__tree-row");
      addClass(
        row,
        entry.kind === "folder" ? "yasgui-query-browser__tree-row--folder" : "yasgui-query-browser__tree-row--query",
      );
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.setAttribute(
        "aria-label",
        entry.kind === "folder" ? `Open folder ${entry.label}` : `Open query ${entry.label}`,
      );
      row.setAttribute("style", makeIndentStyle(0));

      if (entry.kind === "folder") {
        const isExpanded = this.expandedFolderIds.has(entry.id);

        const caret = document.createElement("span");
        addClass(caret, "yasgui-query-browser__tree-caret");
        caret.textContent = isExpanded ? "▾" : "▸";
        caret.setAttribute("aria-hidden", "true");

        const folderIcon = document.createElement("span");
        addClass(folderIcon, "yasgui-query-browser__tree-icon");
        folderIcon.textContent = "📁";

        const label = document.createElement("span");
        addClass(label, "yasgui-query-browser__tree-label");
        label.textContent = entry.label;

        row.appendChild(caret);
        row.appendChild(folderIcon);
        row.appendChild(label);

        this.addQueryRowActions(row, backend, entry);
      } else {
        const caretPlaceholder = document.createElement("span");
        addClass(caretPlaceholder, "yasgui-query-browser__tree-caret");
        caretPlaceholder.textContent = "▸";
        caretPlaceholder.setAttribute("aria-hidden", "true");
        addClass(caretPlaceholder, "yasgui-query-browser__tree-caret--placeholder");

        const icon = document.createElement("span");
        addClass(icon, "yasgui-query-browser__tree-icon");
        icon.textContent = "🕸️";

        const label = document.createElement("span");
        addClass(label, "yasgui-query-browser__tree-label");
        label.textContent = entry.label;

        row.appendChild(caretPlaceholder);
        row.appendChild(icon);
        row.appendChild(label);

        this.attachQueryHoverPreview(row, backend, entry.id);
        this.addQueryRowActions(row, backend, entry);
      }

      const activate = async () => {
        if (entry.kind === "folder") {
          // Switch from search results back to the normal tree view.
          this.searchEl.value = "";

          if (this.expandedFolderIds.has(entry.id)) {
            this.expandedFolderIds.delete(entry.id);
          } else {
            this.expandedFolderIds.add(entry.id);
            await this.ensureFolderLoaded(backend, entry.id);
          }
          await this.refresh();
          return;
        }

        await this.openManagedQueryInNewTab(backend, backend.type, entry.id, entry.label);

        this.close();
      };

      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          void activate();
        }
      });

      row.addEventListener("click", async () => {
        await activate();
      });

      this.listEl.appendChild(row);
    }
  }

  private renderTree(backend: ReturnType<typeof getWorkspaceBackend>) {
    this.clearList();

    const makeIndentStyle = (depth: number) => `padding-left: ${depth * 16}px;`;

    const renderFolderChildren = (folderId: string | undefined, depth: number) => {
      const key = this.folderKey(folderId);
      const entries = this.folderEntriesById.get(key) || [];

      const folders = entries
        .filter((e) => e.kind === "folder")
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
      const queries = entries
        .filter((e) => e.kind === "query")
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));

      for (const entry of [...folders, ...queries]) {
        if (entry.kind === "folder") {
          const isExpanded = this.expandedFolderIds.has(entry.id);

          const row = document.createElement("div");
          addClass(row, "yasgui-query-browser__tree-row");
          addClass(row, "yasgui-query-browser__tree-row--folder");
          row.setAttribute("aria-label", `${isExpanded ? "Collapse" : "Expand"} folder ${entry.label}`);
          row.setAttribute("style", makeIndentStyle(depth));
          row.setAttribute("role", "button");
          row.setAttribute("tabindex", "0");

          const caret = document.createElement("span");
          addClass(caret, "yasgui-query-browser__tree-caret");
          caret.textContent = isExpanded ? "▾" : "▸";
          caret.setAttribute("aria-hidden", "true");

          const folderIcon = document.createElement("span");
          addClass(folderIcon, "yasgui-query-browser__tree-icon");
          folderIcon.textContent = "📁";

          const label = document.createElement("span");
          addClass(label, "yasgui-query-browser__tree-label");
          label.textContent = entry.label;

          row.appendChild(caret);
          row.appendChild(folderIcon);
          row.appendChild(label);

          this.addQueryRowActions(row, backend, entry);

          const activate = async () => {
            if (this.expandedFolderIds.has(entry.id)) {
              this.expandedFolderIds.delete(entry.id);
              await this.refresh();
              return;
            }

            this.expandedFolderIds.add(entry.id);
            await this.ensureFolderLoaded(backend, entry.id);
            await this.refresh();
          };

          row.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void activate();
            }
          });

          row.addEventListener("click", async () => {
            await activate();
          });

          this.listEl.appendChild(row);

          if (isExpanded) {
            const childKey = this.folderKey(entry.id);
            if (this.folderLoadingById.has(childKey)) {
              const loading = document.createElement("div");
              addClass(loading, "yasgui-query-browser__tree-meta");
              loading.setAttribute("style", makeIndentStyle(depth + 1));
              loading.textContent = "Loading…";
              this.listEl.appendChild(loading);
            }

            const err = this.folderErrorById.get(childKey);
            if (err) {
              const error = document.createElement("div");
              addClass(error, "yasgui-query-browser__tree-meta");
              addClass(error, "yasgui-query-browser__tree-meta--error");
              error.setAttribute("style", makeIndentStyle(depth + 1));
              error.textContent = err;
              this.listEl.appendChild(error);
            }

            renderFolderChildren(entry.id, depth + 1);
          }
        } else {
          const row = document.createElement("div");
          addClass(row, "yasgui-query-browser__tree-row");
          addClass(row, "yasgui-query-browser__tree-row--query");
          row.setAttribute("aria-label", `Open query ${entry.label}`);
          row.setAttribute("style", makeIndentStyle(depth));
          row.setAttribute("role", "button");
          row.setAttribute("tabindex", "0");

          const caretPlaceholder = document.createElement("span");
          addClass(caretPlaceholder, "yasgui-query-browser__tree-caret");
          caretPlaceholder.textContent = "▸";
          caretPlaceholder.setAttribute("aria-hidden", "true");
          addClass(caretPlaceholder, "yasgui-query-browser__tree-caret--placeholder");

          const icon = document.createElement("span");
          addClass(icon, "yasgui-query-browser__tree-icon");
          icon.textContent = "🕸️";

          const label = document.createElement("span");
          addClass(label, "yasgui-query-browser__tree-label");
          label.textContent = entry.label;

          row.appendChild(caretPlaceholder);
          row.appendChild(icon);
          row.appendChild(label);

          this.attachQueryHoverPreview(row, backend, entry.id);
          this.addQueryRowActions(row, backend, entry);

          const activate = async () => {
            await this.openManagedQueryInNewTab(backend, backend.type, entry.id, entry.label);

            this.close();
          };

          row.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void activate();
            }
          });

          row.addEventListener("click", async () => {
            await activate();
          });

          this.listEl.appendChild(row);
        }
      }
    };

    renderFolderChildren(undefined, 0);
  }

  public async refresh() {
    const runId = ++this.refreshRunId;
    this.ensureWorkspaceSelection();
    this.renderWorkspaceSelect();

    const workspaces = this.getWorkspaces();
    if (!this.selectedWorkspaceId || workspaces.length === 0) {
      this.backButtonEl.disabled = true;
      this.setStatus("No workspaces configured. Add one in settings.");
      this.clearList();
      return;
    }

    const workspace = workspaces.find((w) => w.id === this.selectedWorkspaceId);
    if (!workspace) return;

    const backend = getWorkspaceBackend(workspace, { persistentConfig: this.yasgui.persistentConfig });
    const searchQuery = this.searchEl.value;

    // Tree view replaces folder navigation; keep the Back button disabled.
    this.backButtonEl.disabled = true;

    if (this.treeWorkspaceId !== workspace.id) {
      this.resetTreeState();
      this.treeWorkspaceId = workspace.id;
    }

    try {
      this.setStatus("Loading…");
      const trimmed = searchQuery.trim();

      if (trimmed) {
        let entries: FolderEntry[];
        if (backend.searchByName) {
          entries = await backend.searchByName(trimmed);
        } else {
          const root = await backend.listFolder(undefined);
          entries = filterFolderEntriesByName(root, trimmed);
        }

        if (runId !== this.refreshRunId) return;

        const signature = entries.map((e) => this.entrySignature(e)).join("|");
        this.setStatus(entries.length ? "" : "No results");
        if (signature !== this.lastRenderedSignature) {
          this.lastRenderedSignature = signature;
          this.renderFlatEntries(backend, entries);
        }
        return;
      }

      await this.ensureFolderLoaded(backend, undefined);

      if (runId !== this.refreshRunId) return;

      const rootKey = this.folderKey(undefined);
      const rootEntries = this.folderEntriesById.get(rootKey) || [];

      const expandedIds = Array.from(this.expandedFolderIds).sort();
      const relevantFolderKeys = [rootKey, ...expandedIds.map((id) => this.folderKey(id))].sort();
      const foldersPart = relevantFolderKeys
        .map((key) => {
          const entries = this.folderEntriesById.get(key) || [];
          const entryPart = entries
            .map((e) => this.entrySignature(e))
            .sort()
            .join("|");
          const loading = this.folderLoadingById.has(key) ? "1" : "0";
          const err = this.folderErrorById.get(key) || "";
          return `${key}:${loading}:${err}:${entryPart}`;
        })
        .join(";");

      const signature = [
        `rootCount:${rootEntries.length}`,
        `expanded:${expandedIds.join(",")}`,
        `folders:${foldersPart}`,
      ].join(";");

      this.setStatus(rootEntries.length ? "" : "No queries");
      if (signature !== this.lastRenderedSignature) {
        this.lastRenderedSignature = signature;
        this.renderTree(backend);
      }
    } catch (e) {
      if (runId !== this.refreshRunId) return;
      const err = asWorkspaceBackendError(e);
      this.setStatus(this.formatStatusError(err, workspace.type));
      this.clearList();
    }
  }
}
