import {
  createBoardCard,
  createBoardColumn,
  createDefaultSettings,
  createDefaultSettingsMeta,
  createDoc,
  createFolder,
  createLibraryCategory,
  createSheetTable,
  createVault,
  randomUserId,
  uid,
} from "../../app/state.js";
import { loadWorkspaceState, parseWorkspaceCandidate, writeWorkspaceSnapshot } from "../../app/storage.js";
import {
  BOARD_PRESET_LIBRARY,
  BOARD_SIZE_PRESETS,
  CANVAS_NODE_TEMPLATES,
  CANVAS_TEMPLATE_LIBRARY,
  DOCUMENT_TEMPLATE_LIBRARY,
  FILE_SMART_VIEWS,
  STORAGE_STRUCTURE_PRESETS,
  WRITING_SECTION_PRESETS,
} from "../../data/workspacePresets.js";
import { ensureMarketPage } from "../market/MarketPage.js";
import { renderSettingsPage } from "../settings/SettingsPage.js";
import { filterLegacyMockMarketProfiles } from "../../utils/marketProfiles.js";
import { collectLegacyElements } from "./LegacyViewMount.js";
import { createCanvasRuntime } from "../../features/canvas/canvasRuntime.js";

const $ = (s) => document.querySelector(s);
const TEMPLATE_MARKUP = Object.fromEntries(DOCUMENT_TEMPLATE_LIBRARY.map((entry) => [entry.id, entry]));
let fileVaultUploadInput = null;
let fileVaultUploadContext = null;

function ensureMarketUI() {
  ensureMarketPage();
  return;
  const libraryHeaderActions = document.querySelector("#libraryView .header-actions");
  if (libraryHeaderActions && !document.querySelector("#libraryMarketButton")) {
    const button = document.createElement("button");
    button.id = "libraryMarketButton";
    button.className = "secondary-button compact-action-button";
    button.type = "button";
    button.innerHTML = `<span class="button-icon">◇</span><span>Market</span>`;
    const notificationsButton = document.querySelector("#libraryNotificationsButton");
    if (notificationsButton?.parentElement) notificationsButton.parentElement.insertBefore(button, notificationsButton);
    else libraryHeaderActions.appendChild(button);
  }

  const workspaceActions = document.querySelector("#workspaceView .workspace-head-right .topbar-actions");
  if (workspaceActions && !document.querySelector("#marketButton")) {
    const button = document.createElement("button");
    button.id = "marketButton";
    button.className = "secondary-button icon-button";
    button.type = "button";
    button.title = "Developer market";
    button.textContent = "◇";
    const notificationsButton = document.querySelector("#notificationsButton");
    if (notificationsButton?.parentElement) notificationsButton.parentElement.insertBefore(button, notificationsButton);
    else workspaceActions.appendChild(button);
  }

  if (!document.querySelector("#marketView")) {
    const market = document.createElement("section");
    market.id = "marketView";
    market.className = "market-view hidden";
    market.innerHTML = `
      <header class="library-header premium-surface">
        <div class="library-brand">
          <p class="eyebrow">Developer Market</p>
          <div class="market-hero-copy">
            <h1>Find talent built for game teams</h1>
            <p>Search specialized developers, balancers, and producers without touching your vault workflow.</p>
          </div>
        </div>
        <div class="header-actions">
          <div class="library-search-wrap">
            <label class="library-search">
              <span>Search</span>
              <input id="marketSearchInput" type="search" placeholder="Search nickname, role, tags" />
            </label>
          </div>
          <div class="library-action-cluster library-action-cluster-muted">
            <button id="marketBackButton" class="secondary-button compact-action-button" type="button">Back</button>
            <button id="marketVaultsButton" class="secondary-button compact-action-button" type="button">Vaults</button>
            <button id="marketCreatePostButton" class="primary-button compact-action-button" type="button">Create Post</button>
            <button id="marketProfileButton" class="secondary-button compact-action-button" type="button">Profile</button>
            <button id="marketMessagesButton" class="secondary-button compact-action-button" type="button">Messages</button>
          </div>
        </div>
      </header>
      <section class="market-grid">
        <aside class="market-sidebar premium-surface">
          <div class="sidebar-block">
            <p class="eyebrow">Filters</p>
            <label class="profile-field">
              <span>Role</span>
              <select id="marketRoleFilter" class="modal-input">
                <option value="">All roles</option>
                <option value="Game Designer">Game Designer</option>
                <option value="Producer">Producer</option>
                <option value="Programmer">Programmer</option>
                <option value="UI Designer">UI Designer</option>
                <option value="Animator">Animator</option>
                <option value="Narrative Designer">Narrative Designer</option>
                <option value="Level Designer">Level Designer</option>
              </select>
            </label>
            <label class="profile-field">
              <span>Availability</span>
              <select id="marketAvailabilityFilter" class="modal-input">
                <option value="">Any status</option>
                <option value="Available for hire">Available for hire</option>
                <option value="Open to offers">Open to offers</option>
                <option value="Not available">Not available</option>
              </select>
            </label>
            <label class="profile-field">
              <span>Experience</span>
              <select id="marketExperienceFilter" class="modal-input">
                <option value="">Any level</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Lead">Lead</option>
              </select>
            </label>
          </div>
        </aside>
        <main class="market-main">
          <section class="library-summary premium-surface">
            <div class="summary-card premium-surface"><span class="summary-label">Developers</span><strong id="marketCount"></strong></div>
            <div class="summary-card premium-surface"><span class="summary-label">Available</span><strong id="marketAvailableCount"></strong></div>
            <div class="summary-card premium-surface"><span class="summary-label">Open To Offers</span><strong id="marketOpenCount"></strong></div>
          </section>
          <section class="section-heading">
            <div>
              <p class="eyebrow">Marketplace</p>
              <h2>Developer discovery</h2>
            </div>
          </section>
          <section id="marketCards" class="market-cards"></section>
        </main>
      </section>
    `;
    const libraryView = document.querySelector("#libraryView");
    libraryView?.insertAdjacentElement("afterend", market);
  }
}

ensureMarketUI();

function ensureFileVaultUI() {
  const libraryActions = document.querySelector("#libraryView .header-actions");
  if (libraryActions && !document.querySelector("#libraryFilesButton")) {
    const button = document.createElement("button");
    button.id = "libraryFilesButton";
    button.className = "secondary-button compact-action-button";
    button.type = "button";
    button.innerHTML = `<span class="button-icon">F</span><span>Files</span>`;
    const importButton = document.querySelector("#importWorkspaceButton");
    if (importButton?.parentElement) importButton.parentElement.insertBefore(button, importButton);
    else libraryActions.appendChild(button);
  }
  const workspaceActions = document.querySelector("#workspaceView .workspace-head-right .topbar-actions");
  if (workspaceActions && !document.querySelector("#filesButton")) {
    const button = document.createElement("button");
    button.id = "filesButton";
    button.className = "secondary-button icon-button";
    button.type = "button";
    button.title = "File vault";
    button.textContent = "F";
    const messagesButton = document.querySelector("#messagesButton");
    if (messagesButton?.parentElement) messagesButton.parentElement.insertBefore(button, messagesButton);
    else workspaceActions.appendChild(button);
  }
  if (!fileVaultUploadInput) {
    fileVaultUploadInput = document.createElement("input");
    fileVaultUploadInput.type = "file";
    fileVaultUploadInput.multiple = true;
    fileVaultUploadInput.className = "hidden";
    fileVaultUploadInput.addEventListener("change", handleFileVaultUpload);
    document.body.appendChild(fileVaultUploadInput);
  }
}

ensureFileVaultUI();

const els = collectLegacyElements($);

let diagnostics = [];
let loadedWorkspace = loadWorkspaceState();
let state = loadedWorkspace.state;
diagnostics = loadedWorkspace.diagnostics;
const runtimeUser = window.ForgeBookRuntime?.auth?.user;
if (runtimeUser) {
  state.profile.userId = runtimeUser.id;
  if (runtimeUser.email && !state.profile.email) state.profile.email = runtimeUser.email;
  if (runtimeUser.user_metadata?.name && (!state.profile.name || state.profile.name === "You")) {
    state.profile.name = runtimeUser.user_metadata.name;
  }
}
if (Array.isArray(window.ForgeBookRuntime?.data?.marketProfiles) && window.ForgeBookRuntime.data.marketProfiles.length) {
  state.marketProfiles = filterLegacyMockMarketProfiles(window.ForgeBookRuntime.data.marketProfiles).map((profile) => ({
    id: profile.id,
    userId: profile.user_id || profile.userId || profile.id,
    nickname: profile.nickname || profile.display_name || "Developer",
    displayName: profile.display_name || profile.nickname || "Developer",
    role: profile.role || "Game Designer",
    bio: profile.bio || "",
    tags: Array.isArray(profile.tags) ? profile.tags : [],
    tools: Array.isArray(profile.tools) ? profile.tools : [],
    experience: profile.experience_level || profile.experience || "Mid",
    availability: profile.availability_status || profile.availability || "Open to offers",
    rate: profile.hourly_rate ? `$${profile.hourly_rate}/hr` : profile.rate || "Contact for rate",
    portfolio: Array.isArray(profile.portfolio) ? profile.portfolio : [],
  }));
}
let vaultSearch = "";
let contextVaultId = null;
let modalAction = null;
let libraryRevealObserver = null;
let sheetResizeState = null;
let floatingImageInteraction = null;
let draggedTreeNodeId = null;
let draggedVaultId = null;
let draggedSheetTableId = null;
let draggedSheetDropMarker = null;
let draggedBoardCard = null;
let sheetAutoScrollState = null;
let vaultAutoScrollState = null;
let libraryAutoScrollState = null;
let isEditingSheetFormula = false;
let workspaceSearch = "";
let lastSavedAt = null;
let toastTimerSeed = 0;
let saveTimer = null;
let pendingSaveSnapshot = "";
let lastWrittenSnapshot = "";
const SAVE_DEBOUNCE_MS = 1200;
let libraryRenderRaf = 0;
let workspaceRenderRaf = 0;
let profileMediaTarget = null;
let marketSearch = "";
let marketRoleFilter = "";
let marketAvailabilityFilter = "";
let marketExperienceFilter = "";
let friendsTab = "friends";
let canvasNodeDrag = null;
let canvasPanState = null;
let friendsSearch = "";
let marketReturnView = "library";

const on = (selector, event, handler) => {
  const node = $(selector);
  if (node) node.addEventListener(event, handler);
};

const canvasRuntime = createCanvasRuntime({
  els,
  getState: () => state,
  getActiveDoc: () => activeDoc(),
  save: () => save(),
  uid,
  escape,
  escapeAttr,
  showToast: (message, tone) => showToast(message, tone),
  clampNumber,
  templates: CANVAS_NODE_TEMPLATES,
  templateLayouts: CANVAS_TEMPLATE_LIBRARY,
  openContextMenu,
  closeContextMenu,
  renderCanvasWorkspace: () => renderCanvasWorkspace(),
});

bindEvents();
normalize();
applyLocationState();
render();

function bindEvents() {
  window.addEventListener("beforeunload", flushSave);
  const workspaceScroller = document.querySelector(".workspace-main");
  workspaceScroller?.addEventListener("scroll", () => {
    workspaceScroller.classList.toggle("is-scrolled", workspaceScroller.scrollTop > 8);
  }, { passive: true });
  on("#creditsLogoButton", "click", openCreditsModal);
  on("#newVaultButton", "click", createVaultWithStarterNote);
  on("#newCategoryButton", "click", createLibraryCategoryPrompt);
  on("#libraryCreateVaultButton", "click", createVaultWithStarterNote);
  on("#libraryQuickSwitchButton", "click", () => openOverlay("switcher"));
  on("#importWorkspaceButton", "click", () => els.workspaceImportPicker?.click());
  on("#exportWorkspaceButton", "click", exportWorkspace);
  on("#recoverVaultsButton", "click", () => {
    loadedWorkspace = loadWorkspaceState();
    state = loadedWorkspace.state;
    diagnostics = loadedWorkspace.diagnostics;
    normalize();
    applyLocationState();
    render();
  });
  on("#backToLibraryButton", "click", () => {
    state.activeView = "library";
    save();
    writeLocationState();
    render();
  });
  on("#toggleSidebarButton", "click", () => { state.sidebarCollapsed = !state.sidebarCollapsed; save(); renderChrome(); });
  on("#closeSidebarButton", "click", () => { state.sidebarCollapsed = true; save(); renderChrome(); });
  on("#contextPanelToggleButton", "click", () => { state.contextPanelCollapsed = !state.contextPanelCollapsed; save(); renderChrome(); });
  on("#contextPanelCollapseButton", "click", () => { state.contextPanelCollapsed = true; save(); renderChrome(); });
  on("#quickCreateButton", "click", (event) => openCreateMenuAtButton(event.currentTarget, selectedVault()?.id ?? null));
  on("#headerQuickCreateButton", "click", (event) => openCreateMenuAtButton(event.currentTarget, selectedVault()?.id ?? null));
  on("#newSiblingDocButton", "click", (event) => openCreateMenuAtButton(event.currentTarget, selectedVault()?.id ?? null));
  on("#addSheetRowButton", "click", addSheetRow);
  on("#addSheetColumnButton", "click", addSheetColumn);
  on("#addSheetTableButton", "click", addSheetTable);
  on("#deleteSheetRowButton", "click", deleteSheetRow);
  on("#deleteSheetColumnButton", "click", deleteSheetColumn);
  on("#deleteSheetTableButton", "click", deleteActiveSheetTable);
  on("#addBoardColumnButton", "click", addBoardColumn);
  on("#addBoardCardButton", "click", () => addBoardCard());
  on("#addBoardChecklistButton", "click", () => addBoardCard({ checklist: [{ text: "Task", done: false }] }));
  on("#storageUploadButton", "click", () => startStorageUpload());
  on("#storageNewFolderButton", "click", () => promptCreateStorageFolder());
  on("#storageCategoryButton", "click", () => promptCreateStorageCategory());
  on("#storagePresetButton", "click", () => promptApplyStoragePreset());
  $("#storageSearchInput")?.addEventListener("input", (event) => {
    const doc = activeDoc();
    if (!doc || doc.docType !== "storage") return;
    normalizeStorageDoc(doc);
    doc.storage.search = event.target.value || "";
    save();
    renderStorageWorkspace();
  });
  $("#storageSortSelect")?.addEventListener("change", (event) => {
    const doc = activeDoc();
    if (!doc || doc.docType !== "storage") return;
    normalizeStorageDoc(doc);
    doc.storage.sort = event.target.value || "recent";
    save();
    renderStorageWorkspace();
  });
  document.querySelectorAll("[data-storage-view]").forEach((button) => {
    if (item.type !== "folder" && item.docType === "storage") {
      button.querySelector(".tree-row-icon")?.replaceChildren(document.createTextNode("ST"));
    }
    button.addEventListener("click", () => {
      const doc = activeDoc();
      if (!doc || doc.docType !== "storage") return;
      normalizeStorageDoc(doc);
      doc.storage.viewMode = button.dataset.storageView || "grid";
      save();
      renderStorageWorkspace();
    });
  });
  document.querySelectorAll("[data-storage-density]").forEach((button) => {
    button.addEventListener("click", () => {
      const doc = activeDoc();
      if (!doc || doc.docType !== "storage") return;
      normalizeStorageDoc(doc);
      doc.storage.density = button.dataset.storageDensity || "comfortable";
      save();
      renderStorageWorkspace();
    });
  });
  els.storagePanel?.addEventListener("dragover", (event) => {
    event.preventDefault();
    els.storagePanel.classList.add("is-drop-target");
  });
  els.storagePanel?.addEventListener("dragleave", (event) => {
    if (els.storagePanel?.contains(event.relatedTarget)) return;
    els.storagePanel?.classList.remove("is-drop-target");
  });
  els.storagePanel?.addEventListener("drop", (event) => {
    event.preventDefault();
    els.storagePanel?.classList.remove("is-drop-target");
    if (!event.dataTransfer?.files?.length) return;
    fileVaultUploadContext = { folderId: activeDoc()?.docType === "storage" ? activeDoc().storage.activeFolderId : null, mode: "workspace" };
    handleFileVaultUpload({ target: { files: event.dataTransfer.files, value: "" } });
  });
  document.querySelectorAll("[data-sheet-preset]").forEach((button) => {
    button.addEventListener("click", () => addSheetPreset(button.dataset.sheetPreset));
  });
  document.querySelectorAll("[data-sheet-toolbar-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.sheetToolbarAction;
      if (action === "table") addSheetTable();
      if (action === "row") addSheetRow();
      if (action === "column") addSheetColumn();
      if (action === "delete-row") deleteSheetRow();
      if (action === "delete-column") deleteSheetColumn();
      if (action === "delete-table") deleteActiveSheetTable();
    });
  });
  document.querySelectorAll("[data-board-preset]").forEach((button) => {
    button.addEventListener("click", () => applyBoardPreset(button.dataset.boardPreset));
  });
  document.querySelectorAll("[data-board-toolbar-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.boardToolbarAction;
      if (action === "column") addBoardColumn();
      if (action === "card") addBoardCard();
      if (action === "checklist") addBoardCard({ checklist: [{ text: "Task", done: false }] });
    });
  });
  document.querySelectorAll("[data-board-size]").forEach((button) => {
    button.addEventListener("click", () => {
      const doc = activeDoc();
      if (!doc || doc.docType !== "board") return;
      normalizeBoard(doc);
      doc.board.size = clampNumber(Number(button.dataset.boardSize), 1, 3);
      doc.updatedAt = Date.now();
      save();
      renderBoard();
    });
  });
  document.querySelectorAll("[data-board-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const doc = activeDoc();
      if (!doc || doc.docType !== "board") return;
      normalizeBoard(doc);
      doc.board.view = button.dataset.boardView || "kanban";
      doc.updatedAt = Date.now();
      save();
      renderBoard();
    });
  });
  $("#boardSearchInput")?.addEventListener("input", (event) => {
    const doc = activeDoc();
    if (!doc || doc.docType !== "board") return;
    normalizeBoard(doc);
    doc.board.search = event.target.value || "";
    save();
    renderBoard();
  });
  document.querySelectorAll("[data-note-template]").forEach((button) => {
    button.addEventListener("click", () => applyNoteTemplate(button.dataset.noteTemplate));
  });
  document.querySelectorAll("[data-sheet-formula]").forEach((button) => {
    button.addEventListener("click", () => insertSheetFormulaTemplate(button.dataset.sheetFormula || ""));
  });
  on("#libraryProfileButton", "click", () => openOverlay("profile"));
  on("#librarySettingsButton", "click", () => openOverlay("settings"));
  on("#libraryFriendsButton", "click", () => openOverlay("friends"));
  on("#libraryMessagesButton", "click", () => openOverlay("messages"));
  on("#libraryFilesButton", "click", () => openOverlay("file-vault"));
  on("#libraryMarketButton", "click", () => {
    marketReturnView = state.activeView;
    state.activeView = "market";
    save();
    render();
  });
  on("#libraryNotificationsButton", "click", () => openOverlay("notifications"));
  on("#profileButton", "click", () => openOverlay("profile"));
  on("#softwareSettingsButton", "click", () => openOverlay("settings"));
  on("#quickSwitchButton", "click", () => openOverlay("switcher"));
  on("#friendsButton", "click", () => openOverlay("friends"));
  on("#messagesButton", "click", () => openOverlay("messages"));
  on("#filesButton", "click", () => openOverlay("file-vault"));
  on("#marketButton", "click", () => {
    marketReturnView = state.activeView;
    state.activeView = "market";
    save();
    render();
  });
  on("#notificationsButton", "click", () => openOverlay("notifications"));
  on("#shareVaultButton", "click", () => openOverlay("share"));
  on("#vaultMenuButton", "click", () => openOverlay("share"));
  on("#marketBackButton", "click", () => {
    state.activeView = marketReturnView === "workspace" ? "workspace" : "library";
    save();
    render();
  });
  on("#marketVaultsButton", "click", () => {
    state.activeView = "library";
    save();
    render();
  });
  on("#marketCreatePostButton", "click", openMarketComposer);
  on("#marketProfileButton", "click", () => openOverlay("profile"));
  on("#marketMessagesButton", "click", () => openOverlay("messages"));
  on("#vaultBadge", "click", () => openVaultCoverPicker(selectedVault()?.id || null));
  on("#closeOverlayButton", "click", closeOverlay);
  on("#closeModalButton", "click", closeModal);
  on("#modalCancelButton", "click", closeModal);
  on("#modalConfirmButton", "click", confirmModal);
  if (els.overlayPanel) els.overlayPanel.querySelector(".overlay-backdrop")?.addEventListener("click", closeOverlay);
  if (els.modalPanel) els.modalPanel.querySelector(".modal-backdrop")?.addEventListener("click", closeModal);
  if (els.documentTitleInput) {
    els.documentTitleInput.addEventListener("input", (event) => {
      const doc = activeDoc();
      if (!doc) return;
      doc.name = event.target.value || doc.name;
      save();
      scheduleLibraryRender();
      scheduleWorkspaceRender();
    });
  }
  if (els.vaultNameInput) {
    els.vaultNameInput.addEventListener("input", (event) => {
      const vault = selectedVault();
      if (!vault) return;
      vault.name = event.target.value || vault.name;
      save();
      scheduleWorkspaceRender();
      scheduleLibraryRender();
    });
  }
  if (els.textEditor) {
    els.textEditor.addEventListener("input", () => {
      const doc = activeDoc();
      if (!doc || doc.docType !== "text") return;
      doc.content = els.textEditor.innerHTML;
      updateDocumentState("Editing");
      save();
    });
    els.textEditor.addEventListener("paste", handleTextEditorPaste);
    els.textEditor.addEventListener("dragover", handleTextEditorDragOver);
    els.textEditor.addEventListener("drop", handleTextEditorDrop);
  }
  bindFormattingTools();
  bindExtraWritingTools();
  if (els.vaultSearchInput) {
    els.vaultSearchInput.addEventListener("input", (event) => {
      vaultSearch = event.target.value.trim().toLowerCase();
      scheduleLibraryRender();
    });
  }
  if (els.workspaceSearchInput) {
    els.workspaceSearchInput.addEventListener("input", (event) => {
      workspaceSearch = event.target.value.trim().toLowerCase();
      scheduleWorkspaceRender();
    });
  }
  document.querySelectorAll("[data-writing-width]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      state.settings.writingWidth = Number(button.dataset.writingWidth) || 2;
      save();
      renderWorkspace();
    });
  });
  if (els.marketSearchInput) {
    els.marketSearchInput.addEventListener("input", (event) => {
      marketSearch = event.target.value.trim().toLowerCase();
      renderMarket();
    });
  }
  if (els.marketRoleFilter) {
    els.marketRoleFilter.addEventListener("change", (event) => {
      marketRoleFilter = event.target.value;
      renderMarket();
    });
  }
  if (els.marketAvailabilityFilter) {
    els.marketAvailabilityFilter.addEventListener("change", (event) => {
      marketAvailabilityFilter = event.target.value;
      renderMarket();
    });
  }
  if (els.marketExperienceFilter) {
    els.marketExperienceFilter.addEventListener("change", (event) => {
      marketExperienceFilter = event.target.value;
      renderMarket();
    });
  }
  if (els.workspaceImportPicker) {
    els.workspaceImportPicker.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const candidate = parseWorkspaceCandidate(text);
        if (!candidate) return;
        state = candidate;
        normalize();
        save();
        render();
        showToast("Workspace imported");
      } finally {
        event.target.value = "";
      }
    });
  }
  if (els.imagePicker) {
    els.imagePicker.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      addFloatingImage(dataUrl, file.name);
      event.target.value = "";
    });
  }
  if (els.vaultImagePicker) {
    els.vaultImagePicker.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      const vaultId = contextVaultId || selectedVault()?.id;
      if (!file || !vaultId) {
        event.target.value = "";
        return;
      }
      await setVaultCoverFromFile(vaultId, file);
      event.target.value = "";
    });
  }
  if (els.profileImagePicker) {
    els.profileImagePicker.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      const target = profileMediaTarget;
      if (!file || !target) {
        event.target.value = "";
        return;
      }
      const dataUrl = await fileToDataUrl(file);
      if (target === "avatar") state.profile.avatar = dataUrl;
      if (target === "banner") state.profile.banner = dataUrl;
      save();
      if (!els.overlayPanel?.classList.contains("hidden")) openOverlay("profile");
      showToast(target === "avatar" ? "Profile picture updated" : "Banner updated");
      profileMediaTarget = null;
      event.target.value = "";
    });
  }
  document.addEventListener("keydown", (event) => {
    const meta = event.ctrlKey || event.metaKey;
    if (event.key === "Escape") {
      closeOverlay();
      closeModal();
      closeContextMenu();
    }
    if (canvasRuntime.handleGlobalKeydown(event)) {
      return;
    }
    if (meta && event.key.toLowerCase() === "s") {
      event.preventDefault();
      save();
      updateDocumentState(savedStateLabel());
      showToast("Workspace saved");
    }
    if (meta && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openOverlay("switcher");
    }
    if (meta && event.key.toLowerCase() === "p") {
      event.preventDefault();
      openOverlay("switcher");
    }
    if (meta && event.key.toLowerCase() === "n") {
      event.preventDefault();
      if (state.activeView === "workspace" && selectedVault()) {
        createInContainer(selectedVault().id, "text");
      } else if (state.activeView === "library") {
        createVaultWithStarterNote();
      }
    }
    if (meta && event.key.toLowerCase() === "f" && state.activeView === "workspace" && els.workspaceSearchInput) {
      event.preventDefault();
      els.workspaceSearchInput.focus();
      els.workspaceSearchInput.select();
    }
    if (meta && event.key === "/" && state.activeView === "workspace") {
      event.preventDefault();
      insertQuickBlock();
    }
    if (event.key === "Enter" && !els.modalPanel?.classList.contains("hidden") && document.activeElement === els.modalInput) {
      event.preventDefault();
      confirmModal();
    }
  });
  document.addEventListener("pointermove", (event) => {
    if (canvasRuntime.handleGlobalPointerMove(event)) return;
  });
  document.addEventListener("pointerup", () => {
    canvasRuntime.handleGlobalPointerUp();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest("#contextMenu")) {
      closeContextMenu();
    }
  });
  if (els.vaultContentsTree) {
    els.vaultContentsTree.addEventListener("dragover", handleVaultRootDragOver);
    els.vaultContentsTree.addEventListener("dragleave", handleVaultRootDragLeave);
    els.vaultContentsTree.addEventListener("drop", handleVaultRootDrop);
  }
  document.addEventListener("pointermove", handleSheetResizeMove);
  document.addEventListener("pointerup", stopSheetResize);
  document.addEventListener("pointermove", handleFloatingImageInteraction);
  document.addEventListener("pointerup", stopFloatingImageInteraction);
  document.addEventListener("drop", handleGlobalSheetDragStop);
  document.addEventListener("dragend", handleGlobalSheetDragStop);
  window.addEventListener("blur", handleGlobalSheetDragStop);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") handleGlobalSheetDragStop();
  });
  document.addEventListener("dragover", handleGlobalLibraryVaultDragOver);
  document.addEventListener("drop", handleGlobalLibraryVaultDragStop);
  document.addEventListener("dragend", handleGlobalLibraryVaultDragStop);
  document.addEventListener("pointerup", handleGlobalLibraryVaultDragStop);
  window.addEventListener("blur", handleGlobalLibraryVaultDragStop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) handleGlobalLibraryVaultDragStop();
  });
}

function openCreditsModal() {
  openModal({
    eyebrow: "ForgeBook",
    title: "Credits & Contact",
    message: `Main creator: Balin\nDiscord: balinbaby\nDiscord ID: 796162367821578281\n\nFeature ideas and feedback: Kami\nNickname: kam1._.1.\nDiscord ID: 770655407588376668\n\nOfficial ForgeBook Discord:\nhttps://discord.gg/vZuqbnpdQn\n\nUse Discord to report bugs or suggest changes for ForgeBook.`,
    confirmLabel: "Close",
    onConfirm: () => true,
  });
}

function render() {
  normalize();
  renderChrome();
  renderLibrary();
  renderMarket();
  renderWorkspace();
  applyPremiumMotion();
}

function renderChrome() {
  document.body.dataset.theme = state.settings.theme;
  document.body.dataset.glowMode = state.settings.glowMode;
  document.body.dataset.density = state.settings.appearance?.layoutDensity || "comfortable";
  document.body.dataset.highContrast = state.settings.appearance?.highContrastMode ? "true" : "false";
  document.body.dataset.reducedMotion = state.settings.appearance?.reducedMotion || state.settings.accessibility?.reducedMotion ? "true" : "false";
  const root = document.documentElement;
  const accentColor = state.settings.appearance?.accentColor || "#8b5cf6";
  const accentFrom = state.settings.appearance?.accentGradientFrom || accentColor;
  const accentTo = state.settings.appearance?.accentGradientTo || "#38bdf8";
  const panelOpacity = clampNumber(Number(state.settings.appearance?.panelTransparency ?? 0.84), 0.55, 1);
  const blurStrength = clampNumber(Number(state.settings.appearance?.glassBlurStrength ?? 18), 0, 32);
  const shadowIntensity = clampNumber(Number(state.settings.appearance?.shadowIntensity ?? 0.34), 0, 1);
  const borderGlowStrength = clampNumber(Number(state.settings.appearance?.borderGlowStrength ?? 0.24), 0, 1);
  root.style.setProperty("--forge-accent", accentColor);
  root.style.setProperty("--forge-accent-from", accentFrom);
  root.style.setProperty("--forge-accent-to", accentTo);
  root.style.setProperty("--forge-panel-opacity", String(panelOpacity));
  root.style.setProperty("--forge-blur-strength", `${blurStrength}px`);
  root.style.setProperty("--forge-shadow-alpha", String(shadowIntensity));
  root.style.setProperty("--forge-panel-radius", `${Number(state.settings.appearance?.cornerRoundness ?? 18)}px`);
  root.style.setProperty("--forge-ui-scale", String(state.settings.appearance?.uiScale ?? 1));
  root.style.setProperty("--forge-font-scale", String(state.settings.appearance?.fontScale ?? 1));
  root.style.setProperty("--forge-icon-scale", String(state.settings.appearance?.iconSize ?? 1));
  root.style.setProperty("--forge-motion-scale", String(state.settings.appearance?.animationIntensity ?? 0.7));
  root.style.setProperty("--forge-focus-ring-alpha", String(state.settings.accessibility?.focusRingIntensity ?? 0.75));
  root.style.setProperty("--forge-text-scale", String(state.settings.accessibility?.textScaling ?? 1));
  root.style.setProperty("--forge-sidebar-width", `${Number(state.settings.workspace?.sidebarWidth ?? 280)}px`);
  root.style.setProperty("--forge-board-column-width", `${Number(state.settings.boards?.columnWidth ?? 380)}px`);
  root.style.setProperty("--accent", accentColor);
  root.style.setProperty("--accent-2", accentTo);
  root.style.setProperty("--accent-3", accentFrom);
  root.style.setProperty("--bg-panel", `rgba(23, 27, 36, ${panelOpacity})`);
  root.style.setProperty("--bg-panel-2", `rgba(30, 35, 46, ${Math.min(panelOpacity + 0.04, 1)})`);
  root.style.setProperty("--shadow", `0 20px 60px rgba(0, 0, 0, ${Math.max(0.12, shadowIntensity * 0.95)})`);
  root.style.setProperty(
    "--glow",
    `0 0 0 1px ${rgbaString(accentColor, 0.12 + borderGlowStrength * 0.22)}, 0 18px 40px ${rgbaString(accentColor, 0.08 + shadowIntensity * 0.24)}`,
  );
  root.style.setProperty(
    "--glow-strong",
    `0 0 0 1px ${rgbaString(accentColor, 0.18 + borderGlowStrength * 0.3)}, 0 24px 60px ${rgbaString(accentColor, 0.12 + shadowIntensity * 0.28)}, 0 0 120px ${rgbaString(accentTo, 0.04 + borderGlowStrength * 0.12)}`,
  );
  root.dataset.layoutDensity = state.settings.appearance?.layoutDensity || "comfortable";
  root.dataset.workspaceLayout = state.settings.workspace?.activeLayout || "writer";
  if (els.libraryView) els.libraryView.classList.toggle("hidden", state.activeView !== "library");
  if (els.marketView) els.marketView.classList.toggle("hidden", state.activeView !== "market");
  if (els.workspaceView) els.workspaceView.classList.toggle("hidden", state.activeView !== "workspace");
  if (els.workspaceView) els.workspaceView.classList.toggle("sidebar-collapsed", state.sidebarCollapsed);
  if (els.workspaceView) els.workspaceView.classList.toggle("context-collapsed", Boolean(state.contextPanelCollapsed));
  if (els.workspaceSidebar) els.workspaceSidebar.classList.toggle("hidden", state.sidebarCollapsed);
  if (els.contextPanelToggleButton) els.contextPanelToggleButton.classList.toggle("active", !state.contextPanelCollapsed);
  const notificationCount = (state.notifications || []).filter((entry) => !entry.read && !isMutedNotification(entry)).length;
  [els.libraryNotificationsButton, $("#notificationsButton")].forEach((button) => {
    if (!button) return;
    button.dataset.count = notificationCount ? String(Math.min(notificationCount, 9)) : "";
    button.classList.toggle("has-count", notificationCount > 0);
  });
  const title = document.querySelector(".library-header h1");
  if (title) title.textContent = state.softwareName;
}

function renderLibrary() {
  const allVaults = vaults();
  const v = vaultSearch
    ? allVaults.filter((vault) => vault.name.toLowerCase().includes(vaultSearch))
    : allVaults;
  if (els.docCount) els.docCount.textContent = String(documents().length);
  if (els.folderCount) els.folderCount.textContent = String(folders().length);
  if (els.tabCount) els.tabCount.textContent = String(state.openTabs.length);
  if (els.homeTree) {
    els.homeTree.innerHTML = "";
    libraryCategorySections(v).forEach((section) => els.homeTree.appendChild(renderLibraryTreeSection(section)));
  }
  if (els.documentCards) {
    els.documentCards.innerHTML = "";
    v.forEach((vault) => {
      const card = document.createElement("article");
      card.className = "document-card premium-surface";
      card.classList.add("is-pending-reveal");
      const cardIndex = els.documentCards.children.length;
      card.style.setProperty("--stagger-index", String(cardIndex));
      card.style.setProperty("--stagger-delay", `${cardIndex * 38}ms`);
      const kids = descendants(vault.id);
      const fileCount = kids.filter((i) => i.type === "document").length;
      const folderCount = kids.filter((i) => i.type === "folder").length;
      card.innerHTML = `
        <div class="document-card-thumb document-card-thumb-fallback">${escape((vault.name[0] || "V").toUpperCase())}</div>
        <p class="eyebrow">Vault</p>
        <h3>${escape(vault.name)}</h3>
        <p>${fileCount} files · ${folderCount} folders</p>
        <div class="document-card-actions"><button class="secondary-button" type="button">Open Vault</button></div>
      `;
      card.addEventListener("click", () => openVault(vault.id));
      card.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        openVaultContextMenu(vault.id, event.clientX, event.clientY);
      });
      card.querySelector("button")?.addEventListener("click", (e) => { e.stopPropagation(); openVault(vault.id); });
      els.documentCards.appendChild(card);
    });
    els.documentCards.innerHTML = "";
    libraryCategorySections(v).forEach((section) => els.documentCards.appendChild(renderLibraryCategorySection(section)));
    armLibraryReveal();
  }
  renderRecentDocs();
  const recover = diagnostics[0];
  const canRecover = allVaults.length === 0 && recover && recover.score > 0;
  if (els.libraryEmptyState) els.libraryEmptyState.classList.toggle("hidden", v.length > 0);
  if (els.recoverVaultsButton) els.recoverVaultsButton.classList.toggle("hidden", !canRecover);
  if (els.libraryRecoveryCopy) {
    els.libraryRecoveryCopy.classList.toggle("hidden", !canRecover);
    els.libraryRecoveryCopy.textContent = canRecover ? `Saved workspace detected: ${recover.vaults} vaults, ${recover.items} items.` : "";
  }
  if (els.libraryEmptyState && allVaults.length > 0 && v.length === 0) {
    els.libraryEmptyState.classList.remove("hidden");
    els.libraryRecoveryCopy.classList.add("hidden");
    if (els.recoverVaultsButton) els.recoverVaultsButton.classList.add("hidden");
    els.libraryEmptyState.querySelector("p").textContent = "No vaults match your search.";
  } else if (els.libraryEmptyState && allVaults.length === 0) {
    els.libraryEmptyState.querySelector("p").textContent = "No vaults found yet.";
  }
  if (els.sheetFormulaInput) {
    els.sheetFormulaInput.addEventListener("focus", () => {
      isEditingSheetFormula = true;
    });
    els.sheetFormulaInput.addEventListener("input", handleSheetFormulaInput);
    els.sheetFormulaInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      commitSheetFormulaInput();
    });
    els.sheetFormulaInput.addEventListener("blur", () => {
      commitSheetFormulaInput();
      isEditingSheetFormula = false;
    });
  }
  if (els.sheetGrid && els.sheetGrid.dataset.bound !== "true") {
    els.sheetGrid.dataset.bound = "true";
    els.sheetGrid.addEventListener("dragover", handleSheetGridDragOver);
    els.sheetGrid.addEventListener("drop", handleSheetGridDrop);
    els.sheetGrid.addEventListener("dragleave", handleSheetGridDragLeave);
  }
  document.addEventListener("drop", handleGlobalSheetDragStop);
  document.addEventListener("dragend", handleGlobalSheetDragStop);
  document.addEventListener("pointerup", handleGlobalSheetDragStop);
  window.addEventListener("blur", handleGlobalSheetDragStop);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) handleGlobalSheetDragStop();
  });
}

function renderWorkspace() {
  if (els.workspaceTree) {
    els.workspaceTree.innerHTML = "";
    vaults().forEach((vault) => els.workspaceTree.appendChild(vaultButton(vault)));
  }
  const vault = selectedVault();
  if (els.selectedVaultLabel) els.selectedVaultLabel.textContent = vault ? vault.name : "No vault selected";
  if (els.vaultBadgeThumb) {
    if (vault?.coverImage) {
      els.vaultBadgeThumb.innerHTML = `<img src="${escapeAttr(vault.coverImage)}" alt="${escapeAttr(vault.name)} cover" />`;
    } else {
      els.vaultBadgeThumb.textContent = (vault?.name?.[0] || "V").toUpperCase();
    }
  }
  if (els.vaultNameInput) {
    els.vaultNameInput.value = vault ? vault.name : "";
    els.vaultNameInput.disabled = !vault;
  }
  if (els.vaultContentsTree) {
    els.vaultContentsTree.innerHTML = "";
    if (vault) drawBranch(els.vaultContentsTree, vault.id, 0);
  }
  if (els.workspaceSearchInput) els.workspaceSearchInput.value = workspaceSearch;
  const doc = activeDoc();
  if (els.workspaceView) els.workspaceView.dataset.docType = doc?.docType || "none";
  if (els.workspaceView) els.workspaceView.dataset.writingWidth = String(Number(state.settings.writingWidth) || 2);
  document.querySelectorAll("[data-writing-width]").forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.writingWidth) === (Number(state.settings.writingWidth) || 2));
  });
  renderWorkspaceStatus(doc, vault);
  if (els.editorPanel) els.editorPanel.classList.toggle("hidden", doc?.docType !== "text");
  if (els.canvasPanel) els.canvasPanel.classList.toggle("hidden", doc?.docType !== "canvas");
  if (els.sheetPanel) els.sheetPanel.classList.toggle("hidden", doc?.docType !== "sheet");
  if (els.boardPanel) els.boardPanel.classList.toggle("hidden", doc?.docType !== "board");
  if (els.storagePanel) els.storagePanel.classList.toggle("hidden", doc?.docType !== "storage");
  if (els.graphPanel) els.graphPanel.classList.add("hidden");
  if (!doc) {
    if (els.documentTitleInput) { els.documentTitleInput.value = ""; els.documentTitleInput.disabled = true; }
    if (els.documentPath) els.documentPath.textContent = "No file selected";
    if (els.documentStateBadge) els.documentStateBadge.textContent = "Idle";
    if (els.textEditor) { els.textEditor.setAttribute("contenteditable", "false"); els.textEditor.innerHTML = '<p class="empty-state">Open a vault to start writing.</p>'; }
    if (els.editorFloatingLayer) els.editorFloatingLayer.innerHTML = "";
    renderNoteUtilities(null);
    renderContextPanel(null, vault);
    return;
  }
  if (els.documentTitleInput) { els.documentTitleInput.disabled = false; els.documentTitleInput.value = doc.name; }
  if (els.documentPath) els.documentPath.textContent = `${path(doc.parentId)} / ${doc.name}`;
  updateDocumentState(savedStateLabel());
  if (els.textEditor && doc.docType === "text") {
    normalizeFloatingImages(doc);
    els.textEditor.setAttribute("contenteditable", "true");
    els.textEditor.innerHTML = doc.content || "<p></p>";
    renderFloatingImages(doc);
  }
  renderNoteUtilities(doc);
  renderCanvasWorkspace();
  renderSheet();
  renderBoard();
  renderStorageWorkspace();
  renderContextPanel(doc, vault);
}

function renderSheet() {
  if (!els.sheetGrid) return;
  els.sheetGrid.innerHTML = "";
  if (els.sheetAnalysisGrid) els.sheetAnalysisGrid.innerHTML = "";
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  normalizeSheet(doc);
  const activeTable = activeSheetTable(doc);
  if (els.sheetWorkspaceTitle) els.sheetWorkspaceTitle.textContent = activeTable ? activeTable.name : "Multi-table analysis";
  if (els.sheetWorkspaceMeta) els.sheetWorkspaceMeta.textContent = `${doc.sheet.tables.length} table${doc.sheet.tables.length === 1 ? "" : "s"}`;
  renderSheetFormulaBar(doc);
  els.sheetGrid.classList.toggle("is-drop-end", draggedSheetDropMarker?.type === "end");
  doc.sheet.tables.forEach((table) => {
    const referencedColumns = new Set(referencedSheetColumns(table, currentSheetFormulaValue(table, doc)));
    const card = document.createElement("section");
    card.className = "sheet-table-card";
    card.draggable = true;
    card.dataset.tableId = table.id;
    card.style.gridColumn = `span ${Math.max(1, Math.min(3, table.span || 1)) * 4}`;
    if (doc.sheet.activeTableId === table.id) card.classList.add("active");
    card.addEventListener("click", () => {
      if (doc.sheet.activeTableId === table.id) return;
      doc.sheet.activeTableId = table.id;
      doc.sheet.selection = { kind: "table", tableId: table.id };
      save();
      renderSheet();
    });
    card.addEventListener("dragstart", (event) => {
      draggedSheetTableId = table.id;
      draggedSheetDropMarker = null;
      card.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", table.id);
    });
    card.addEventListener("dragend", () => {
      draggedSheetTableId = null;
      draggedSheetDropMarker = null;
      stopSheetAutoScroll();
      card.classList.remove("is-dragging");
      clearSheetTableDropTargets();
    });
    card.addEventListener("dragover", (event) => {
      if (!draggedSheetTableId || draggedSheetTableId === table.id) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      updateSheetAutoScroll(event.clientY);
      const rect = card.getBoundingClientRect();
      const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      setSheetDropMarker({ type: placement, tableId: table.id });
    });
    card.addEventListener("dragleave", (event) => {
      if (card.contains(event.relatedTarget)) return;
      if (!event.relatedTarget || !els.sheetGrid?.contains(event.relatedTarget)) clearSheetTableDropTargets();
    });
    card.addEventListener("drop", (event) => {
      if (!draggedSheetTableId || draggedSheetTableId === table.id) return;
      event.preventDefault();
      stopSheetAutoScroll();
      const rect = card.getBoundingClientRect();
      const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
      reorderSheetTable(draggedSheetTableId, table.id, placement);
    });

    const head = document.createElement("div");
    head.className = "sheet-table-head";

    const widthControls = document.createElement("div");
    widthControls.className = "sheet-span-controls";
    [1, 2, 3].forEach((span) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sheet-span-button";
      button.textContent = `${span}`;
      if ((table.span || 1) === span) button.classList.add("active");
      button.title = `${span} column${span === 1 ? "" : "s"} wide`;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        updateSheetTableSpan(table.id, span);
      });
      widthControls.appendChild(button);
    });

    const title = document.createElement("input");
    title.className = "sheet-table-title";
    title.value = table.name;
    title.placeholder = "Table name";
    title.addEventListener("click", (event) => event.stopPropagation());
    title.addEventListener("pointerdown", (event) => event.stopPropagation());
    title.addEventListener("focus", () => {
      doc.sheet.activeTableId = table.id;
      doc.sheet.selection = { kind: "table", tableId: table.id };
      save();
    });
    title.addEventListener("input", (event) => {
      table.name = event.target.value || table.name;
      doc.sheet.activeTableId = table.id;
      save();
      if (els.sheetWorkspaceTitle && doc.sheet.activeTableId === table.id) {
        els.sheetWorkspaceTitle.textContent = table.name;
      }
    });
    head.appendChild(widthControls);
    head.appendChild(title);

    const meta = document.createElement("p");
    meta.className = "sheet-table-meta";
    meta.textContent = `${table.rows.length} rows · ${table.columns.length} columns${table.preset && table.preset !== "custom" ? ` · ${table.preset}` : ""}`;
    head.appendChild(meta);
    card.appendChild(head);

    const scroll = document.createElement("div");
    scroll.className = "sheet-table-scroll";
    const grid = document.createElement("div");
    grid.className = "sheet-grid";
    grid.style.gridTemplateColumns = table.columnWeights.map((weight) => `minmax(140px, ${weight}fr)`).join(" ");

    table.columns.forEach((name, columnIndex) => {
      const cell = document.createElement("div");
      cell.className = "sheet-cell header";
      cell.contentEditable = "true";
      cell.spellcheck = false;
      cell.textContent = name;
      if (referencedColumns.has(name)) cell.classList.add("is-referenced");
      cell.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        doc.sheet.activeTableId = table.id;
        doc.sheet.selection = { kind: "header", tableId: table.id, columnIndex };
        save();
        renderSheetFormulaBar(doc);
      });
      cell.addEventListener("input", () => {
        table.columns[columnIndex] = cell.textContent || `Column ${columnIndex + 1}`;
        doc.sheet.activeTableId = table.id;
        save();
        renderSheetFormulaBar(doc);
      });
      if (columnIndex < table.columns.length - 1) {
        const handle = document.createElement("div");
        handle.className = "sheet-col-resizer";
        handle.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          startSheetColumnResize(table.id, columnIndex, event.clientX);
        });
        cell.appendChild(handle);
      }
      grid.appendChild(cell);
    });

    table.rows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      const cell = document.createElement("div");
      cell.className = "sheet-cell";
      cell.style.minHeight = `${table.rowHeights[rowIndex]}px`;
      cell.contentEditable = "true";
      cell.spellcheck = false;
      cell.textContent = displaySheetCell(table, rowIndex, columnIndex);
      if (referencedColumns.has(table.columns[columnIndex])) cell.classList.add("is-referenced");
      if (isFormulaValue(value)) cell.classList.add("formula");
      cell.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        doc.sheet.activeTableId = table.id;
        doc.sheet.selection = { kind: "cell", tableId: table.id, rowIndex, columnIndex };
        save();
        renderSheetFormulaBar(doc);
      });
      cell.addEventListener("focus", () => {
        doc.sheet.selection = { kind: "cell", tableId: table.id, rowIndex, columnIndex };
        renderSheetFormulaBar(doc);
        cell.textContent = table.rows[rowIndex][columnIndex] || "";
      });
      cell.addEventListener("blur", () => {
        table.rows[rowIndex][columnIndex] = cell.textContent || "";
        doc.sheet.activeTableId = table.id;
        save();
        renderSheet();
      });
      cell.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        cell.blur();
      });
      if (columnIndex === table.columns.length - 1) {
        const rowHandle = document.createElement("div");
        rowHandle.className = "sheet-row-resizer";
        rowHandle.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          event.stopPropagation();
          startSheetRowResize(table.id, rowIndex, event.clientY);
        });
        cell.appendChild(rowHandle);
      }
      grid.appendChild(cell);
    }));

    scroll.appendChild(grid);
    card.appendChild(scroll);
    els.sheetGrid.appendChild(card);
  });
  renderSheetAnalysis(doc);
}

function legacyNormalizeCanvas(doc) {
  if (!doc || doc.docType !== "canvas") return;
  if (!doc.canvas || typeof doc.canvas !== "object") doc.canvas = {};
  if (!Array.isArray(doc.canvas.nodes)) doc.canvas.nodes = [];
  if (!Array.isArray(doc.canvas.edges)) doc.canvas.edges = [];
  if (!doc.canvas.view || typeof doc.canvas.view !== "object") doc.canvas.view = { x: 0, y: 0, scale: 1 };
  if (!doc.canvas.filters || typeof doc.canvas.filters !== "object") doc.canvas.filters = { query: "", type: "all", showLocked: true };
  if (typeof doc.canvas.snapToGrid !== "boolean") doc.canvas.snapToGrid = true;
  if (typeof doc.canvas.gridVisible !== "boolean") doc.canvas.gridVisible = true;
  doc.canvas.nodes = doc.canvas.nodes.map((node, index) => ({
    id: node.id || uid(),
    type: node.type || "text",
    title: node.title || `Node ${index + 1}`,
    body: node.body || "",
    x: Number(node.x || index * 220),
    y: Number(node.y || index * 120),
    width: Number(node.width || 220),
    height: Number(node.height || 140),
    color: node.color || state.settings.canvas?.defaultNodeColor || "#8b5cf6",
    locked: Boolean(node.locked),
    collapsed: Boolean(node.collapsed),
    pinned: Boolean(node.pinned),
    tags: Array.isArray(node.tags) ? node.tags : [],
  }));
}

function legacyCanvasNodeFactory(templateId) {
  const template = CANVAS_NODE_TEMPLATES.find((entry) => entry.id === templateId) || CANVAS_NODE_TEMPLATES[0];
  return {
    id: uid(),
    type: template.type,
    title: template.name,
    body: template.type === "checklist" ? "• Task 1\n• Task 2" : "Add planning detail here.",
    x: 80 + Math.random() * 180,
    y: 80 + Math.random() * 120,
    width: template.type === "section" ? 300 : 220,
    height: template.type === "section" ? 96 : 150,
    color: template.color,
    locked: false,
    collapsed: false,
    pinned: false,
    tags: [],
  };
}

function legacyAddCanvasNode(templateId = "text") {
  const doc = activeDoc();
  if (!doc || doc.docType !== "canvas") return;
  normalizeCanvas(doc);
  const node = canvasNodeFactory(templateId);
  doc.canvas.nodes.push(node);
  doc.canvas.activeNodeId = node.id;
  doc.updatedAt = Date.now();
  save();
  renderCanvasWorkspace();
}

function legacyRenderCanvasWorkspace() {
  if (!els.canvasPanel) return;
  const doc = activeDoc();
  if (!doc || doc.docType !== "canvas") return;
  normalizeCanvas(doc);
  const query = (doc.canvas.filters?.query || "").trim().toLowerCase();
  const filteredNodes = doc.canvas.nodes.filter((node) => (!query || [node.title, node.body, ...(node.tags || [])].join(" ").toLowerCase().includes(query)) && ((doc.canvas.filters?.type || "all") === "all" || node.type === doc.canvas.filters.type));
  const selected = doc.canvas.nodes.find((node) => node.id === doc.canvas.activeNodeId) || filteredNodes[0] || null;
  if (selected && doc.canvas.activeNodeId !== selected.id) doc.canvas.activeNodeId = selected.id;
  els.canvasPanel.innerHTML = `
    <div class="canvas-designer">
      <aside class="canvas-tool-rail premium-surface">
        <p class="eyebrow">Canvas Tools</p>
        <div class="canvas-template-list">
          ${CANVAS_NODE_TEMPLATES.map((template) => `<button class="secondary-button" type="button" data-canvas-template="${escapeAttr(template.id)}">${escape(template.name)}</button>`).join("")}
        </div>
        <div class="canvas-template-list">
          ${CANVAS_TEMPLATE_LIBRARY.slice(0, 4).map((template) => `<button class="secondary-button" type="button" data-canvas-layout="${escapeAttr(template.id)}">${escape(template.name)}</button>`).join("")}
        </div>
      </aside>
      <section class="canvas-stage-wrap premium-surface">
        <div class="canvas-workspace-toolbar">
          <label class="workspace-search overlay-search">
            <span>Search</span>
            <input id="canvasNodeSearchInput" type="search" value="${escapeAttr(doc.canvas.filters.query || "")}" placeholder="Find nodes, tags, cards" />
          </label>
          <div class="toolbar-group toolbar-group-tight">
            <button class="secondary-button ${doc.canvas.gridVisible ? "active" : ""}" id="toggleCanvasGridButton" type="button">Grid</button>
            <button class="secondary-button ${doc.canvas.snapToGrid ? "active" : ""}" id="toggleCanvasSnapButton" type="button">Snap</button>
            <button class="secondary-button" id="canvasZoomOutButton" type="button">-</button>
            <button class="secondary-button" id="canvasZoomInButton" type="button">+</button>
          </div>
        </div>
        <div id="canvasStage" class="canvas-stage ${doc.canvas.gridVisible ? "with-grid" : ""}">
          <div id="canvasViewport" class="canvas-viewport" style="transform: translate(${doc.canvas.view.x}px, ${doc.canvas.view.y}px) scale(${doc.canvas.view.scale});">
            ${filteredNodes.map((node) => `<article class="canvas-node-card ${selected?.id === node.id ? "active" : ""}" data-canvas-node="${escapeAttr(node.id)}" style="left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;--node-color:${escape(node.color)}"><header><strong>${escape(node.title)}</strong><span>${escape(node.type)}</span></header>${node.collapsed ? "" : `<p>${escape(node.body)}</p>`}<footer>${node.locked ? `<span class="notification-category-badge">Locked</span>` : ""}${node.pinned ? `<span class="notification-category-badge">Pinned</span>` : ""}</footer></article>`).join("")}
          </div>
        </div>
      </section>
      <aside class="canvas-properties premium-surface">
        <p class="eyebrow">Properties</p>
        ${selected ? `
          <label class="profile-field"><span>Title</span><input id="canvasNodeTitleInput" class="modal-input" type="text" value="${escapeAttr(selected.title)}" /></label>
          <label class="profile-field"><span>Body</span><textarea id="canvasNodeBodyInput" class="modal-input">${escape(selected.body)}</textarea></label>
          <div class="document-card-actions">
            <button id="canvasNodeDuplicateButton" class="secondary-button" type="button">Duplicate</button>
            <button id="canvasNodeCollapseButton" class="secondary-button" type="button">${selected.collapsed ? "Expand" : "Collapse"}</button>
            <button id="canvasNodeLockButton" class="secondary-button" type="button">${selected.locked ? "Unlock" : "Lock"}</button>
          </div>
        ` : `<div class="empty-state">Create a planning node to start mapping systems and flows.</div>`}
      </aside>
    </div>
  `;
  document.querySelectorAll("[data-canvas-template]").forEach((button) => button.addEventListener("click", () => addCanvasNode(button.dataset.canvasTemplate)));
  document.querySelectorAll("[data-canvas-layout]").forEach((button) => button.addEventListener("click", () => applyCanvasPreset(button.dataset.canvasLayout)));
  document.querySelectorAll("[data-canvas-node]").forEach((node) => bindCanvasNode(node));
  $("#canvasNodeSearchInput")?.addEventListener("input", (event) => {
    doc.canvas.filters.query = event.target.value || "";
    save();
    renderCanvasWorkspace();
  });
  on("#toggleCanvasGridButton", "click", () => { doc.canvas.gridVisible = !doc.canvas.gridVisible; save(); renderCanvasWorkspace(); });
  on("#toggleCanvasSnapButton", "click", () => { doc.canvas.snapToGrid = !doc.canvas.snapToGrid; save(); renderCanvasWorkspace(); });
  on("#canvasZoomOutButton", "click", () => { doc.canvas.view.scale = clampNumber(doc.canvas.view.scale - 0.1, 0.5, 1.8); save(); renderCanvasWorkspace(); });
  on("#canvasZoomInButton", "click", () => { doc.canvas.view.scale = clampNumber(doc.canvas.view.scale + 0.1, 0.5, 1.8); save(); renderCanvasWorkspace(); });
  on("#canvasNodeDuplicateButton", "click", () => {
    if (!selected) return;
    const clone = { ...selected, id: uid(), x: selected.x + 36, y: selected.y + 36, title: `${selected.title} Copy` };
    doc.canvas.nodes.push(clone);
    doc.canvas.activeNodeId = clone.id;
    save();
    renderCanvasWorkspace();
  });
  on("#canvasNodeCollapseButton", "click", () => {
    if (!selected) return;
    selected.collapsed = !selected.collapsed;
    save();
    renderCanvasWorkspace();
  });
  on("#canvasNodeLockButton", "click", () => {
    if (!selected) return;
    selected.locked = !selected.locked;
    save();
    renderCanvasWorkspace();
  });
  $("#canvasNodeTitleInput")?.addEventListener("input", (event) => { if (!selected) return; selected.title = event.target.value || ""; save(); });
  $("#canvasNodeBodyInput")?.addEventListener("input", (event) => { if (!selected) return; selected.body = event.target.value || ""; save(); });
  const stage = $("#canvasStage");
  stage?.addEventListener("pointerdown", (event) => {
    if (event.target.closest("[data-canvas-node]")) return;
    canvasPanState = { startX: event.clientX, startY: event.clientY, x: doc.canvas.view.x, y: doc.canvas.view.y };
  });
  stage?.addEventListener("wheel", (event) => {
    event.preventDefault();
    doc.canvas.view.scale = clampNumber(doc.canvas.view.scale + (event.deltaY < 0 ? 0.08 : -0.08), 0.5, 1.8);
    save();
    renderCanvasWorkspace();
  }, { passive: false });
}

function legacyBindCanvasNode(nodeElement) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "canvas") return;
  const node = doc.canvas.nodes.find((entry) => entry.id === nodeElement.dataset.canvasNode);
  if (!node) return;
  nodeElement.addEventListener("click", () => {
    doc.canvas.activeNodeId = node.id;
    save();
    renderCanvasWorkspace();
  });
  nodeElement.addEventListener("pointerdown", (event) => {
    if (node.locked) return;
    event.stopPropagation();
    doc.canvas.activeNodeId = node.id;
    canvasNodeDrag = { id: node.id, startX: event.clientX, startY: event.clientY, x: node.x, y: node.y };
  });
}

function legacyApplyCanvasPreset(presetId) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "canvas") return;
  normalizeCanvas(doc);
  const rows = presetId === "org-chart" ? ["Leadership", "Discipline Leads", "Contributors"] : presetId === "economy-loop" ? ["Earn", "Spend", "Upgrade", "Retention"] : ["Discovery", "Build", "Review", "Ship"];
  doc.canvas.nodes = rows.map((label, index) => ({
    ...canvasNodeFactory(index === 0 ? "section" : "feature"),
    id: uid(),
    title: label,
    x: 80 + index * 260,
    y: 120 + (index % 2) * 120,
  }));
  doc.canvas.activeNodeId = doc.canvas.nodes[0]?.id || null;
  save();
  renderCanvasWorkspace();
  showToast("Canvas template applied");
}

function normalizeCanvas(doc) {
  return canvasRuntime.normalizeCanvas(doc);
}

function canvasNodeFactory(templateId) {
  return canvasRuntime.canvasNodeFactory(templateId);
}

function addCanvasNode(templateId = "text") {
  return canvasRuntime.addCanvasNode(templateId);
}

function renderCanvasWorkspace() {
  return canvasRuntime.renderCanvasWorkspace();
}

function bindCanvasNode(nodeElement) {
  return canvasRuntime.bindCanvasNode(nodeElement);
}

function applyCanvasPreset(presetId) {
  return canvasRuntime.applyCanvasPreset(presetId);
}

function drawBranch(container, parentId, depth) {
  children(parentId).forEach((item) => {
    if (!workspaceNodeVisible(item)) return;
    const row = document.createElement("div");
    row.className = "tree-node";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-button";
    button.draggable = item.parentId !== null;
    if (item.type === "folder") button.classList.add("folder");
    if (state.selectedNodeId === item.id || state.activeDocumentId === item.id) button.classList.add("active");
    button.style.paddingLeft = `${10 + depth * 16}px`;
    const isCollapsed = item.type === "folder" && state.collapsedFolders.includes(item.id);
    const icon = item.type === "folder"
      ? ""
      : item.docType === "sheet"
        ? "▦"
        : item.docType === "canvas"
          ? "◫"
          : item.docType === "board"
            ? "☷"
            : "≡";
    button.innerHTML = item.type === "folder"
      ? `<span class="tree-row-caret">${isCollapsed ? ">" : "v"}</span><span class="tree-row-icon">⌂</span><span class="tree-row-label">${escape(item.name)}</span>`
      : `<span class="tree-row-caret"></span><span class="tree-row-icon type-${escapeAttr(item.docType)}">${icon}</span><span class="tree-row-label">${escape(item.name)}</span>`;
    button.addEventListener("click", () => {
      state.selectedNodeId = item.id;
      if (item.type === "document") {
        openDocument(item.id);
        return;
      }
      toggleFolderCollapsed(item.id);
    });
    button.addEventListener("dblclick", (event) => {
      event.preventDefault();
      renameNode(item.id);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openNodeContextMenu(item, event.clientX, event.clientY);
    });
    button.addEventListener("dragstart", (event) => {
      draggedTreeNodeId = item.id;
      button.classList.add("is-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", item.id);
    });
    button.addEventListener("dragend", () => {
      draggedTreeNodeId = null;
      stopVaultAutoScroll();
      button.classList.remove("is-dragging");
      clearTreeDropTargets();
    });
    if (item.type === "folder") {
      button.addEventListener("dragover", (event) => handleTreeFolderDragOver(event, item.id, button));
      button.addEventListener("dragleave", () => button.classList.remove("is-drop-target"));
      button.addEventListener("drop", (event) => handleTreeFolderDrop(event, item.id, button));
    }
    row.appendChild(button);
    container.appendChild(row);
    if (item.type === "folder" && !isCollapsed) drawBranch(container, item.id, depth + 1);
  });
}

function createVaultWithStarterNote() {
  const vault = createVault(`Vault ${vaults().length + 1}`);
  vault.owner = state.profile.name || "You";
  const note = createDoc("Untitled Note", "text", vault.id);
  state.items.push(vault, note);
  state.selectedVaultId = vault.id;
  state.selectedNodeId = note.id;
  state.activeDocumentId = note.id;
  state.activeView = "workspace";
  state.openTabs = [note.id];
  save();
  writeLocationState();
  render();
  showToast(`Created ${vault.name}`);
}

function createLibraryCategoryPrompt() {
  openModal({
    eyebrow: "New Category",
    title: "Library Category",
    message: "Create a custom category to organize vaults on the library page.",
    confirmLabel: "Create Category",
    inputValue: "",
    onConfirm: (value) => {
      const name = value.trim();
      if (!name) return false;
      state.libraryCategories.push(createLibraryCategory(name));
      save();
      renderLibrary();
      return true;
    },
  });
}

function createInSelectedVault(docType) {
  const vault = selectedVault();
  if (!vault) return;
  const doc = createDoc(defaultDocName(docType), docType, vault.id);
  state.items.push(doc);
  openDocument(doc.id);
}

function createInContainer(targetId, kind) {
  const parent = item(targetId);
  if (!parent || parent.type !== "folder") return;
  if (kind === "folder") {
    state.items.push(createFolder("New Folder", targetId));
    save();
    render();
    showToast("Folder created");
    return;
  }
  const doc = createDoc(defaultDocName(kind), kind, targetId);
  state.items.push(doc);
  openDocument(doc.id);
  showToast(`${doc.name} created`);
}

function moveNodeToParent(nodeId, nextParentId) {
  const node = item(nodeId);
  if (!node) return;
  if (node.parentId === nextParentId) return;
  if (!canMoveNodeToParent(nodeId, nextParentId)) return;
  node.parentId = nextParentId;
  save();
  renderWorkspace();
  renderLibrary();
  showToast("Moved");
}

function canMoveNodeToParent(nodeId, nextParentId) {
  const node = item(nodeId);
  const nextParent = item(nextParentId);
  if (!node) return false;
  if (!nextParent || nextParent.type !== "folder") return false;
  if (nextParent.folderKind !== "folder" && nextParent.folderKind !== "vault") return false;
  if (node.id === nextParentId) return false;
  if (node.type === "folder" && descendants(node.id).some((entry) => entry.id === nextParentId)) return false;
  const sourceVaultId = vaultId(node.id);
  const targetVaultId = nextParent.folderKind === "vault" ? nextParent.id : vaultId(nextParent.id);
  return sourceVaultId && targetVaultId && sourceVaultId === targetVaultId;
}

function openVault(vaultId) {
  const vault = item(vaultId);
  if (!vault || vault.type !== "folder" || vault.folderKind !== "vault") return;
  let doc = descendants(vault.id).find((i) => i.type === "document");
  if (!doc) { doc = createDoc("Untitled Note", "text", vault.id); state.items.push(doc); }
  state.selectedVaultId = vault.id;
  state.selectedNodeId = doc.id;
  state.activeDocumentId = doc.id;
  state.activeView = "workspace";
  if (!state.openTabs.includes(doc.id)) state.openTabs.push(doc.id);
  save();
  writeLocationState();
  render();
}

function openVaultInNewTab(vaultId) {
  const url = new URL(window.location.href);
  url.searchParams.set("vault", vaultId);
  window.open(url.toString(), "_blank", "noopener");
}

function libraryCategories() {
  return Array.isArray(state.libraryCategories) ? state.libraryCategories : [];
}

function libraryCategorySections(vaultList) {
  const categorized = libraryCategories().map((category) => ({
    id: category.id,
    name: category.name,
    vaults: vaultList.filter((vault) => vault.categoryId === category.id),
  }));
  const uncategorized = {
    id: null,
    name: "Uncategorized",
    vaults: vaultList.filter((vault) => !vault.categoryId || !libraryCategories().some((category) => category.id === vault.categoryId)),
  };
  return [...categorized, uncategorized].filter((section) => section.vaults.length || section.id !== null);
}

function renderLibraryTreeSection(section) {
  const block = document.createElement("section");
  block.className = "library-tree-section";
  block.dataset.categoryId = section.id || "";
  const heading = document.createElement("div");
  heading.className = "library-tree-heading";
  heading.innerHTML = `<span class="library-tree-caret">▾</span><span>${escape(section.name)}</span>`;
  bindLibraryCategoryDropTarget(heading, section.id);
  block.appendChild(heading);
  section.vaults.forEach((vault) => block.appendChild(vaultButton(vault)));
  return block;
}

function renderLibraryCategorySection(section) {
  const wrapper = document.createElement("section");
  wrapper.className = "library-category-section";
  wrapper.dataset.categoryId = section.id || "";
  bindLibraryCategoryDropTarget(wrapper, section.id);
  wrapper.innerHTML = `
    <div class="library-category-head">
      <p class="eyebrow">Category</p>
      <h3>${escape(section.name)}</h3>
    </div>
  `;
  const grid = document.createElement("div");
  grid.className = "document-cards category-grid";
  section.vaults.forEach((vault) => grid.appendChild(renderVaultCard(vault, grid.children.length)));
  wrapper.appendChild(grid);
  return wrapper;
}

function renderVaultCard(vault, index) {
  const card = document.createElement("article");
  card.className = "document-card premium-surface";
  card.classList.add("is-pending-reveal");
  card.draggable = true;
  card.tabIndex = 0;
  card.dataset.vaultId = vault.id;
  card.style.setProperty("--stagger-index", String(index));
  card.style.setProperty("--stagger-delay", `${index * 38}ms`);
  const kids = descendants(vault.id);
  const fileCount = kids.filter((i) => i.type === "document").length;
  const folderCount = kids.filter((i) => i.type === "folder").length;
  const lastModified = kids.reduce((latest, entry) => Math.max(latest, entry.updatedAt || 0), 0);
  card.innerHTML = `
    <div class="document-card-thumb ${vault.coverImage ? "" : "document-card-thumb-fallback"}">${vault.coverImage ? `<img src="${escapeAttr(vault.coverImage)}" alt="${escapeAttr(vault.name)} cover" />` : escape((vault.name[0] || "V").toUpperCase())}</div>
    <p class="eyebrow">Vault</p>
    <h3>${escape(vault.name)}</h3>
    <p>${fileCount} files · ${folderCount} folders</p>
    <div class="document-card-actions"><button class="secondary-button" type="button">Open Vault</button></div>
  `;
  card.addEventListener("click", () => openVault(vault.id));
  card.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openVaultContextMenu(vault.id, event.clientX, event.clientY);
  });
  const actionWrap = card.querySelector(".document-card-actions");
  const primaryOpenButton = actionWrap?.querySelector("button");
  if (primaryOpenButton) primaryOpenButton.textContent = "Open";
  const metaLine = document.createElement("div");
  metaLine.className = "vault-meta-line";
  metaLine.textContent = `Updated ${formatRelativeTime(lastModified || Date.now())}`;
  actionWrap?.before(metaLine);
  [
    { label: "Rename", action: () => renameVault(vault.id) },
    { label: "Duplicate", action: () => duplicateVault(vault.id) },
    { label: "Delete", action: () => deleteVault(vault.id) },
  ].forEach((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = entry.label;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      entry.action();
    });
    actionWrap?.appendChild(button);
  });
  card.querySelector("button")?.addEventListener("click", (e) => { e.stopPropagation(); openVault(vault.id); });
  card.addEventListener("dragstart", (event) => {
    draggedVaultId = vault.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", vault.id);
  });
  card.addEventListener("dragend", () => {
    draggedVaultId = null;
    stopLibraryAutoScroll();
    clearLibraryCategoryDropTargets();
  });
  card.addEventListener("dragover", (event) => {
    updateLibraryAutoScroll(event.clientY);
    handleVaultCoverDragOver(event);
  });
  card.addEventListener("drop", (event) => handleVaultCoverDrop(event, vault.id));
  card.addEventListener("paste", (event) => handleVaultCoverPaste(event, vault.id));
  return card;
}

function bindLibraryCategoryDropTarget(node, categoryId) {
  node.addEventListener("dragover", (event) => {
    if (!draggedVaultId) return;
    event.preventDefault();
    updateLibraryAutoScroll(event.clientY);
    node.classList.add("is-drop-target");
  });
  node.addEventListener("dragleave", () => {
    node.classList.remove("is-drop-target");
    stopLibraryAutoScroll();
  });
  node.addEventListener("drop", (event) => {
    if (!draggedVaultId) return;
    event.preventDefault();
    stopLibraryAutoScroll();
    assignVaultCategory(draggedVaultId, categoryId);
    clearLibraryCategoryDropTargets();
  });
}

function clearLibraryCategoryDropTargets() {
  stopLibraryAutoScroll();
  document.querySelectorAll(".library-category-section.is-drop-target, .library-tree-heading.is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
}

function findLibraryScrollContainer(target) {
  const candidates = [
    target?.closest?.("#documentCards"),
    target?.closest?.(".library-main"),
    target?.closest?.(".library-grid"),
    document.scrollingElement,
  ].filter(Boolean);
  return candidates.find((node) => node.scrollHeight > node.clientHeight + 4) || document.scrollingElement;
}

function updateLibraryAutoScroll(clientY, target = null) {
  const scroller = findLibraryScrollContainer(target || document.elementFromPoint(window.innerWidth / 2, clientY));
  if (!scroller) return;
  const rect = scroller.getBoundingClientRect();
  const edge = 96;
  const maxSpeed = 18;
  let delta = 0;
  if (clientY < rect.top + edge) {
    delta = -Math.ceil((((rect.top + edge) - clientY) / edge) * maxSpeed);
  } else if (clientY > rect.bottom - edge) {
    delta = Math.ceil(((clientY - (rect.bottom - edge)) / edge) * maxSpeed);
  }
  if (!delta) {
    stopLibraryAutoScroll();
    return;
  }
  if (!libraryAutoScrollState) {
    libraryAutoScrollState = { delta, raf: 0, scroller };
  } else {
    libraryAutoScrollState.delta = delta;
    libraryAutoScrollState.scroller = scroller;
  }
  if (libraryAutoScrollState.raf) return;
  const tick = () => {
    if (!libraryAutoScrollState || !draggedVaultId) {
      stopLibraryAutoScroll();
      return;
    }
    libraryAutoScrollState.scroller.scrollBy({ top: libraryAutoScrollState.delta, behavior: "auto" });
    libraryAutoScrollState.raf = window.requestAnimationFrame(tick);
  };
  libraryAutoScrollState.raf = window.requestAnimationFrame(tick);
}

function stopLibraryAutoScroll() {
  if (!libraryAutoScrollState) return;
  if (libraryAutoScrollState.raf) window.cancelAnimationFrame(libraryAutoScrollState.raf);
  libraryAutoScrollState = null;
}

function handleGlobalLibraryVaultDragOver(event) {
  if (!draggedVaultId) return;
  updateLibraryAutoScroll(event.clientY, event.target);
}

function handleGlobalLibraryVaultDragStop() {
  if (!draggedVaultId && !libraryAutoScrollState) return;
  stopLibraryAutoScroll();
}

function assignVaultCategory(vaultId, categoryId) {
  const vault = item(vaultId);
  if (!vault || vault.type !== "folder" || vault.folderKind !== "vault") return;
  vault.categoryId = categoryId;
  draggedVaultId = null;
  save();
  renderLibrary();
}

function handleVaultCoverDragOver(event) {
  if (!hasImageFile(event.dataTransfer)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

async function handleVaultCoverDrop(event, vaultId) {
  if (!hasImageFile(event.dataTransfer)) return;
  event.preventDefault();
  const file = [...event.dataTransfer.files].find((entry) => entry.type.startsWith("image/"));
  if (!file) return;
  await setVaultCoverFromFile(vaultId, file);
}

async function handleVaultCoverPaste(event, vaultId) {
  const file = clipboardImageFile(event.clipboardData);
  if (!file) return;
  event.preventDefault();
  await setVaultCoverFromFile(vaultId, file);
}

async function setVaultCoverFromFile(vaultId, file) {
  const vault = item(vaultId);
  if (!vault || vault.type !== "folder" || vault.folderKind !== "vault") return;
  vault.coverImage = await fileToDataUrl(file);
  save();
  renderWorkspace();
  renderLibrary();
  showToast("Vault cover updated");
}

function openVaultCoverPicker(vaultId) {
  if (!vaultId || !els.vaultImagePicker) return;
  contextVaultId = vaultId;
  els.vaultImagePicker.click();
}

function hasImageFile(dataTransfer) {
  return Boolean(dataTransfer && [...(dataTransfer.files || [])].some((file) => file.type.startsWith("image/")));
}

function clipboardImageFile(clipboardData) {
  if (!clipboardData?.items) return null;
  const imageItem = [...clipboardData.items].find((entry) => entry.type.startsWith("image/"));
  return imageItem?.getAsFile?.() || null;
}

function handleTreeFolderDragOver(event, folderId, button) {
  if (!draggedTreeNodeId || !canMoveNodeToParent(draggedTreeNodeId, folderId)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  updateVaultAutoScroll(event.clientY);
  button.classList.add("is-drop-target");
}

function handleTreeFolderDrop(event, folderId, button) {
  if (!draggedTreeNodeId) return;
  event.preventDefault();
  event.stopPropagation();
  stopVaultAutoScroll();
  button.classList.remove("is-drop-target");
  moveNodeToParent(draggedTreeNodeId, folderId);
}

function handleVaultRootDragOver(event) {
  const vault = selectedVault();
  if (!draggedTreeNodeId || !vault || !canMoveNodeToParent(draggedTreeNodeId, vault.id)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  updateVaultAutoScroll(event.clientY);
  if (!event.target.closest(".tree-button.folder")) {
    els.vaultContentsTree?.classList.add("is-drop-target");
  }
}

function renderMarket() {
  if (!els.marketCards) return;
  const profiles = Array.isArray(state.marketProfiles) ? state.marketProfiles : [];
  const filtered = profiles.filter((profile) => {
    const matchesSearch = !marketSearch || [profile.nickname, profile.displayName, profile.role, ...(profile.tags || [])]
      .join(" ")
      .toLowerCase()
      .includes(marketSearch);
    const matchesRole = !marketRoleFilter || profile.role === marketRoleFilter;
    const matchesAvailability = !marketAvailabilityFilter || profile.availability === marketAvailabilityFilter;
    const matchesExperience = !marketExperienceFilter || profile.experience === marketExperienceFilter;
    return matchesSearch && matchesRole && matchesAvailability && matchesExperience;
  });
  if (els.marketCount) els.marketCount.textContent = String(filtered.length);
  if (els.marketAvailableCount) els.marketAvailableCount.textContent = String(filtered.filter((profile) => profile.availability === "Available for hire").length);
  if (els.marketOpenCount) els.marketOpenCount.textContent = String(filtered.filter((profile) => profile.availability === "Open to offers").length);
  els.marketCards.innerHTML = "";
  filtered.forEach((profile) => {
    const card = document.createElement("article");
    card.className = "market-card premium-surface";
    card.innerHTML = `
      <div class="market-card-head">
        <div class="market-card-avatar">${escape((profile.nickname?.[0] || "D").toUpperCase())}</div>
        <div class="market-card-copy">
          <strong>${escape(profile.nickname)}</strong>
          <span>${escape(profile.displayName)} • ${escape(profile.role)}</span>
        </div>
        <span class="market-availability ${escapeAttr(profile.availability.replace(/\s+/g, "-").toLowerCase())}">${escape(profile.availability)}</span>
      </div>
      <p class="market-card-bio">${escape(profile.bio)}</p>
      <div class="market-tag-row">${(profile.tags || []).map((tag) => `<span class="market-tag">${escape(tag)}</span>`).join("")}</div>
      <div class="market-card-meta">
        <span>${escape(profile.experience)}</span>
        <span>${escape(profile.rate)}</span>
      </div>
      <div class="document-card-actions">
        <button class="secondary-button" type="button" data-market-message="${escapeAttr(profile.id)}">Message</button>
        <button class="secondary-button" type="button" data-market-add="${escapeAttr(profile.id)}">Add Friend</button>
      </div>
    `;
    card.addEventListener("click", () => openMarketProfile(profile.id));
    els.marketCards.appendChild(card);
  });
  if (!filtered.length) {
    els.marketCards.innerHTML = `<div class="empty-state">No developers match these filters.</div>`;
  }
  document.querySelectorAll("[data-market-add]").forEach((button) => {
    button.addEventListener("click", () => addMarketProfileAsFriend(button.dataset.marketAdd));
  });
  document.querySelectorAll("[data-market-message]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      addMarketProfileAsFriend(button.dataset.marketMessage, true);
    });
  });
}

function openMarketProfile(profileId) {
  const profile = (state.marketProfiles || []).find((entry) => entry.id === profileId);
  if (!profile || !els.overlayBody || !els.overlayEyebrow || !els.overlayTitle) return;
  els.overlayCard?.classList.remove("overlay-card-chat", "overlay-card-profile");
  els.overlayCard?.classList.add("overlay-card-market");
  els.overlayPanel?.classList.remove("hidden");
  els.overlayEyebrow.textContent = "Developer Market";
  els.overlayTitle.textContent = profile.nickname;
  const portfolio = Array.isArray(profile.portfolio) ? profile.portfolio : [];
  els.overlayBody.innerHTML = `
    <section class="market-profile-shell">
      <section class="market-profile-hero premium-surface">
        <div class="market-profile-avatar">${escape((profile.nickname?.[0] || "D").toUpperCase())}</div>
        <div class="market-profile-copy">
          <h3>${escape(profile.nickname)}</h3>
          <p>${escape(profile.displayName)} • ${escape(profile.role)} • ${escape(profile.experience)}</p>
          <div class="market-tag-row">${(profile.tags || []).map((tag) => `<span class="market-tag">${escape(tag)}</span>`).join("")}</div>
        </div>
        <div class="market-profile-side">
          <span class="market-availability ${escapeAttr(profile.availability.replace(/\s+/g, "-").toLowerCase())}">${escape(profile.availability)}</span>
          <strong>${escape(profile.rate || "Contact for rate")}</strong>
        </div>
      </section>
      <section class="market-profile-grid">
        <section class="overlay-section">
          <p class="eyebrow">About</p>
          <p class="market-card-bio">${escape(profile.bio)}</p>
          <div class="market-detail-list">
            <div><span>Tools</span><strong>${escape((profile.tools || []).join(", ") || "Not listed")}</strong></div>
            <div><span>Availability</span><strong>${escape(profile.availability)}</strong></div>
          </div>
          <div class="document-card-actions">
            <button id="marketProfileMessageButton" class="secondary-button" type="button">Message</button>
            <button id="marketProfileAddButton" class="secondary-button" type="button">Add Friend</button>
          </div>
        </section>
        <section class="overlay-section">
          <p class="eyebrow">Portfolio</p>
          <div class="market-portfolio-grid">
            ${(portfolio.length ? portfolio : [{ title: "Featured Work", image: "", description: "Portfolio entry coming soon." }]).map((entry) => `
              <article class="market-portfolio-card">
                <div class="market-portfolio-thumb">${entry.image ? `<img src="${escapeAttr(entry.image)}" alt="${escapeAttr(entry.title)}" />` : `<span>${escape(entry.title)}</span>`}</div>
                <strong>${escape(entry.title)}</strong>
                <p>${escape(entry.description || "")}</p>
              </article>
            `).join("")}
          </div>
        </section>
      </section>
    </section>
  `;
  on("#marketProfileMessageButton", "click", () => addMarketProfileAsFriend(profile.id, true));
  on("#marketProfileAddButton", "click", () => addMarketProfileAsFriend(profile.id, false));
}

function fileVaultEntries() {
  return Array.isArray(state.fileVault?.files) ? state.fileVault.files : [];
}

function storageFolders() {
  return Array.isArray(state.fileVault?.folders) ? state.fileVault.folders : [];
}

function storageCategories() {
  return Array.isArray(state.fileVault?.categories) ? state.fileVault.categories : [];
}

function normalizeStorageDoc(doc) {
  if (!doc || doc.docType !== "storage") return;
  doc.storage = {
    viewMode: "grid",
    density: "comfortable",
    activeFolderId: null,
    selectedIds: [],
    search: "",
    sort: state.settings.fileVault?.defaultSort || "recent",
    activeFilter: "all",
    showArchived: false,
    detailOpen: true,
    pinnedFolderIds: [],
    savedViews: [],
    ...(doc.storage && typeof doc.storage === "object" ? doc.storage : {}),
  };
  if (!Array.isArray(doc.storage.selectedIds)) doc.storage.selectedIds = [];
  if (!Array.isArray(doc.storage.pinnedFolderIds)) doc.storage.pinnedFolderIds = [];
  if (!Array.isArray(doc.storage.savedViews)) doc.storage.savedViews = [];
}

function normalizeStorageFile(file) {
  return {
    id: file.id || uid(),
    name: file.name || "Untitled file",
    type: file.type || file.name?.split(".").at(-1)?.toUpperCase() || "Asset",
    mimeType: file.mimeType || "",
    size: Number(file.size || 0),
    updatedAt: Number(file.updatedAt || Date.now()),
    createdAt: Number(file.createdAt || file.updatedAt || Date.now()),
    preview: typeof file.preview === "string" ? file.preview : "",
    downloadUrl: typeof file.downloadUrl === "string" ? file.downloadUrl : (typeof file.preview === "string" ? file.preview : ""),
    folderId: file.folderId || null,
    categoryId: file.categoryId || null,
    tags: Array.isArray(file.tags) ? file.tags : [],
    labels: Array.isArray(file.labels) ? file.labels : [],
    favorite: Boolean(file.favorite),
    pinned: Boolean(file.pinned),
    shared: Boolean(file.shared),
    archived: Boolean(file.archived),
    deletedAt: file.deletedAt || null,
    uploadStatus: file.uploadStatus || "ready",
    projectId: file.projectId || null,
    workspaceId: file.workspaceId || vaultId(activeDoc()?.id || state.activeDocumentId) || state.selectedVaultId || null,
    ownerId: file.ownerId || state.profile.userId,
    linkedIds: Array.isArray(file.linkedIds) ? file.linkedIds : [],
    version: Number(file.version || 1),
    extension: file.extension || file.name?.split(".").at(-1)?.toLowerCase() || "",
  };
}

function normalizeStorageState() {
  if (!state.fileVault || typeof state.fileVault !== "object") state.fileVault = {};
  if (!Array.isArray(state.fileVault.files)) state.fileVault.files = [];
  if (!Array.isArray(state.fileVault.folders)) state.fileVault.folders = [];
  if (!Array.isArray(state.fileVault.categories)) state.fileVault.categories = [];
  if (!Array.isArray(state.fileVault.links)) state.fileVault.links = [];
  if (!Array.isArray(state.fileVault.permissions)) state.fileVault.permissions = [];
  if (!Array.isArray(state.fileVault.versions)) state.fileVault.versions = [];
  if (!Array.isArray(state.fileVault.activity)) state.fileVault.activity = [];
  if (!Array.isArray(state.fileVault.views)) state.fileVault.views = [];
  if (!Array.isArray(state.fileVault.trash)) state.fileVault.trash = [];
  if (!Array.isArray(state.fileVault.selectedIds)) state.fileVault.selectedIds = [];
  if (!state.fileVault.activeView) state.fileVault.activeView = "recent";
  if (!state.fileVault.sort) state.fileVault.sort = state.settings.fileVault?.defaultSort || "recent";
  if (!state.fileVault.viewMode) state.fileVault.viewMode = state.settings.fileVault?.defaultViewMode || "grid";
  if (!state.fileVault.density) state.fileVault.density = state.settings.fileVault?.defaultDensity || "comfortable";
  state.fileVault.files = state.fileVault.files.map(normalizeStorageFile);
  state.fileVault.folders = state.fileVault.folders.map((folder) => ({
    id: folder.id || uid(),
    name: folder.name || "New Folder",
    parentId: folder.parentId || null,
    pinned: Boolean(folder.pinned),
    archived: Boolean(folder.archived),
    createdAt: Number(folder.createdAt || Date.now()),
    updatedAt: Number(folder.updatedAt || Date.now()),
    presetId: folder.presetId || "",
  }));
  state.fileVault.categories = state.fileVault.categories.map((category) => ({
    id: category.id || uid(),
    name: category.name || "Category",
    color: category.color || "#8b5cf6",
  }));
}

function storageSelectionState(doc = activeDoc()) {
  if (doc?.docType === "storage") {
    normalizeStorageDoc(doc);
    return doc.storage;
  }
  normalizeStorageState();
  return state.fileVault;
}

function selectedStorageFile(doc = activeDoc()) {
  const selection = storageSelectionState(doc);
  const selectedId = selection.selectedIds?.[0] || state.fileVault?.selectedFileId || null;
  return fileVaultEntries().find((file) => file.id === selectedId) || null;
}

function setStorageSelection(ids, doc = activeDoc()) {
  const selection = storageSelectionState(doc);
  const nextIds = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean))];
  selection.selectedIds = nextIds;
  state.fileVault.selectedIds = nextIds;
  state.fileVault.selectedFileId = nextIds[0] || null;
}

function storageDescendantFolderIds(folderId) {
  const ids = [folderId];
  const queue = [folderId];
  while (queue.length) {
    const current = queue.shift();
    storageFolders().filter((folder) => folder.parentId === current).forEach((folder) => {
      ids.push(folder.id);
      queue.push(folder.id);
    });
  }
  return ids;
}

function storageFolderPath(folderId) {
  if (!folderId) return [{ id: null, name: "Storage" }];
  const trail = [];
  let currentId = folderId;
  while (currentId) {
    const folder = storageFolders().find((entry) => entry.id === currentId);
    if (!folder) break;
    trail.unshift({ id: folder.id, name: folder.name });
    currentId = folder.parentId;
  }
  return [{ id: null, name: "Storage" }, ...trail];
}

function storageFileMatchesFilter(file, filter) {
  if (filter === "trash") return Boolean(file.deletedAt);
  if (file.deletedAt) return false;
  if (filter === "all") return !file.archived;
  if (filter === "favorites") return file.favorite;
  if (filter === "pinned") return file.pinned;
  if (filter === "archived") return file.archived;
  if (filter === "recent") return true;
  if (filter === "images") return file.mimeType?.startsWith("image/");
  if (filter === "documents") return /pdf|text|json|sheet|doc/.test(file.mimeType || "") || /\.(pdf|txt|doc|docx|csv|json)$/i.test(file.name || "");
  if (filter === "videos") return file.mimeType?.startsWith("video/");
  if (filter === "audio") return file.mimeType?.startsWith("audio/");
  if (filter === "archives") return /zip|archive|rar|7z|tar/i.test(file.mimeType || "") || /\.(zip|rar|7z|tar|gz)$/i.test(file.name || "");
  return (file.tags || []).some((tag) => tag.toLowerCase() === String(filter).toLowerCase())
    || storageCategories().some((category) => category.id === file.categoryId && category.name.toLowerCase() === String(filter).toLowerCase());
}

function sortStorageFiles(files, sortKey) {
  const list = [...files];
  if (sortKey === "name") return list.sort((a, b) => a.name.localeCompare(b.name));
  if (sortKey === "size") return list.sort((a, b) => Number(b.size || 0) - Number(a.size || 0));
  if (sortKey === "type") return list.sort((a, b) => String(a.type || "").localeCompare(String(b.type || "")));
  return list.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
}

function visibleStorageFiles(doc = activeDoc()) {
  normalizeStorageState();
  if (doc?.docType === "storage") normalizeStorageDoc(doc);
  const selection = storageSelectionState(doc);
  const query = String(selection.search || state.fileVault.search || "").trim().toLowerCase();
  const folderId = selection.activeFolderId || state.fileVault.activeFolderId || null;
  const filter = selection.activeFilter || state.fileVault.activeView || "all";
  const allowedFolderIds = folderId ? storageDescendantFolderIds(folderId) : null;
  return sortStorageFiles(
    fileVaultEntries()
      .filter((file) => storageFileMatchesFilter(file, filter))
      .filter((file) => !allowedFolderIds || allowedFolderIds.includes(file.folderId))
      .filter((file) => !query || [file.name, file.type, file.mimeType, ...(file.tags || []), ...(file.labels || [])].join(" ").toLowerCase().includes(query)),
    selection.sort || state.fileVault.sort || "recent",
  );
}

function activeBoardCard() {
  const doc = activeDoc();
  if (!doc || doc.docType !== "board") return null;
  return doc.board.columns.flatMap((column) => column.cards).find((card) => card.id === doc.board.selectedCardId) || null;
}

function fileSmartViewMatches(file, view) {
  if (view === "favorites") return file.favorite;
  if (view === "shared") return file.shared;
  if (view === "archived") return file.archived;
  if (view === "images") return file.mimeType?.startsWith("image/");
  if (view === "documents") return /pdf|text|json|sheet|doc/.test(file.mimeType || "") || /\.(pdf|txt|doc|docx|csv|json)$/i.test(file.name || "");
  if (!["recent", "favorites", "shared", "archived", "images", "documents"].includes(view)) return (file.tags || []).some((tag) => tag.toLowerCase() === String(view).toLowerCase());
  return !file.archived;
}

function selectedFileVaultEntry() {
  return fileVaultEntries().find((file) => file.id === state.fileVault?.selectedFileId) || null;
}

function legacyRenderFileVaultOverlay() {
  els.overlayCard?.classList.remove("overlay-card-profile", "overlay-card-market");
  els.overlayCard?.classList.add("overlay-card-chat");
  els.overlayEyebrow.textContent = "File Vault";
  els.overlayTitle.textContent = "Universal Project Storage";
  const query = (state.fileVault?.search || "").trim().toLowerCase();
  const activeView = state.fileVault?.activeView || "recent";
  const files = fileVaultEntries()
    .filter((file) => fileSmartViewMatches(file, activeView))
    .filter((file) => !query || [file.name, file.type, ...(file.tags || [])].join(" ").toLowerCase().includes(query))
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  const selected = selectedFileVaultEntry() || files[0] || null;
  if (selected && state.fileVault.selectedFileId !== selected.id) state.fileVault.selectedFileId = selected.id;
  els.overlayBody.innerHTML = `
    <section class="overlay-section file-vault-shell">
      <div class="overlay-section-header">
        <div>
          <p class="eyebrow">Safe storage</p>
          <h3>Files, references, exports, and attachments</h3>
        </div>
        <div class="notifications-toolbar-actions">
          <button id="fileVaultUploadButton" class="secondary-button" type="button">Upload</button>
          <button id="fileVaultCreateFolderButton" class="secondary-button" type="button">Category</button>
        </div>
      </div>
      <div class="file-vault-toolbar">
        <label class="workspace-search overlay-search">
          <span>Search</span>
          <input id="fileVaultSearchInput" type="search" value="${escapeAttr(state.fileVault?.search || "")}" placeholder="Search files, tags, types" />
        </label>
        <div class="friends-tabs notification-tabs">
          ${(Array.isArray(state.fileVault?.smartViews) ? state.fileVault.smartViews : FILE_SMART_VIEWS.map((entry) => entry.id)).map((view) => `<button class="secondary-button ${activeView === (view.id || view) ? "active" : ""}" type="button" data-file-view="${escapeAttr(view.id || view)}">${escape(view.name || view)}</button>`).join("")}
        </div>
      </div>
      <div class="file-vault-layout">
        <div id="fileVaultList" class="notification-list"></div>
        <aside id="fileVaultDetail" class="file-vault-detail premium-surface"></aside>
      </div>
    </section>
  `;
  const list = $("#fileVaultList");
  const detail = $("#fileVaultDetail");
  if (list) {
    list.innerHTML = files.length ? files.map((file) => `
      <button class="file-vault-row ${selected?.id === file.id ? "active" : ""}" type="button" data-file-id="${escapeAttr(file.id)}">
        <div class="file-vault-icon">${escape(fileIcon(file))}</div>
        <div class="file-vault-copy">
          <strong>${escape(file.name)}</strong>
          <span>${escape(file.type || "Asset")} • ${escape(formatRelativeTime(file.updatedAt || Date.now()))}</span>
        </div>
        <div class="file-vault-flags">
          ${file.favorite ? `<span class="notification-category-badge">Starred</span>` : ""}
          ${file.shared ? `<span class="notification-category-badge">Shared</span>` : ""}
        </div>
      </button>
    `).join("") : `<div class="empty-state">Upload files, references, and exports to build your project vault.</div>`;
  }
  if (detail) {
    detail.innerHTML = selected ? `
      <div class="file-vault-preview">
        ${selected.preview && selected.mimeType?.startsWith("image/") ? `<img src="${escapeAttr(selected.preview)}" alt="${escapeAttr(selected.name)} preview" />` : `<div class="file-vault-preview-fallback">${escape(fileIcon(selected))}</div>`}
      </div>
      <div class="file-vault-meta">
        <h4>${escape(selected.name)}</h4>
        <p>${escape(selected.type || "Asset")} • ${escape(selected.mimeType || "Unknown type")}</p>
        <div class="market-tag-row">${(selected.tags || []).map((tag) => `<span class="market-tag">${escape(tag)}</span>`).join("")}</div>
        <div class="document-card-actions">
          <button id="fileVaultFavoriteButton" class="secondary-button" type="button">${selected.favorite ? "Unstar" : "Star"}</button>
          <button id="fileVaultArchiveButton" class="secondary-button" type="button">${selected.archived ? "Restore" : "Archive"}</button>
          <button id="fileVaultAttachButton" class="secondary-button" type="button">Attach</button>
        </div>
        <label class="profile-field">
          <span>Tags</span>
          <input id="fileVaultTagsInput" class="modal-input" type="text" value="${escapeAttr((selected.tags || []).join(", "))}" />
        </label>
      </div>
    ` : `<div class="empty-state">Select a file to preview its metadata.</div>`;
  }
  document.querySelectorAll("[data-file-view]").forEach((button) => button.addEventListener("click", () => {
    state.fileVault.activeView = button.dataset.fileView;
    save();
    renderFileVaultOverlay();
  }));
  document.querySelectorAll("[data-file-id]").forEach((button) => button.addEventListener("click", () => {
    state.fileVault.selectedFileId = button.dataset.fileId;
    save();
    renderFileVaultOverlay();
  }));
  on("#fileVaultUploadButton", "click", () => fileVaultUploadInput?.click());
  on("#fileVaultCreateFolderButton", "click", () => {
    openModal({
      eyebrow: "File Category",
      title: "Create custom category",
      message: "This lets you organize files beyond type-based sorting.",
      confirmLabel: "Create",
      inputValue: "",
      onConfirm: (value) => {
        const next = value.trim();
        if (!next) return false;
        state.fileVault.smartViews = [...new Set([...(state.fileVault.smartViews || []), next.toLowerCase()])];
        save();
        renderFileVaultOverlay();
        return true;
      },
    });
  });
  $("#fileVaultSearchInput")?.addEventListener("input", (event) => {
    state.fileVault.search = event.target.value || "";
    save();
    renderFileVaultOverlay();
  });
  on("#fileVaultFavoriteButton", "click", () => {
    const file = selectedFileVaultEntry();
    if (!file) return;
    file.favorite = !file.favorite;
    if (file.favorite) toggleWorkspaceFavorite(file.id);
    save();
    renderFileVaultOverlay();
  });
  on("#fileVaultArchiveButton", "click", () => {
    const file = selectedFileVaultEntry();
    if (!file) return;
    file.archived = !file.archived;
    save();
    renderFileVaultOverlay();
  });
  on("#fileVaultAttachButton", "click", () => {
    const file = selectedFileVaultEntry();
    if (!file) return;
    attachFileToActiveContext(file);
  });
  $("#fileVaultTagsInput")?.addEventListener("change", (event) => {
    const file = selectedFileVaultEntry();
    if (!file) return;
    file.tags = String(event.target.value || "").split(",").map((entry) => entry.trim()).filter(Boolean);
    save();
    renderFileVaultOverlay();
  });
}

function storageViewButtonsMarkup(activeView) {
  return storageViewOptions().map((view) => `<button class="secondary-button ${activeView === view.id ? "active" : ""}" type="button" data-storage-filter="${escapeAttr(view.id)}">${escape(view.name)}</button>`).join("");
}

function storageViewOptions() {
  const base = FILE_SMART_VIEWS.map((entry) => ({ id: entry.id, name: entry.name }));
  const extra = storageCategories().map((category) => ({ id: category.id, name: category.name }));
  return [...base, { id: "all", name: "All" }, { id: "pinned", name: "Pinned" }, { id: "trash", name: "Trash" }, ...extra]
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.id === entry.id) === index);
}

function formatBytes(value) {
  const size = Number(value || 0);
  if (size >= 1024 * 1024 * 1024) return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  if (size >= 1024) return `${Math.round(size / 1024)} KB`;
  return `${size} B`;
}

function storageTypeLabel(file) {
  const category = storageCategories().find((entry) => entry.id === file.categoryId);
  return category?.name || file.type || "Asset";
}

function renderStorageList(container, doc = activeDoc()) {
  if (!container) return;
  const selection = storageSelectionState(doc);
  const files = visibleStorageFiles(doc);
  const selectedIds = selection.selectedIds || [];
  container.className = `storage-file-grid storage-file-grid-${selection.viewMode || "grid"} storage-density-${selection.density || "comfortable"}`;
  container.innerHTML = files.length ? files.map((file) => {
    const folder = storageFolders().find((entry) => entry.id === file.folderId);
    return `
      <article class="storage-file-card ${selectedIds.includes(file.id) ? "active" : ""}" data-storage-file="${escapeAttr(file.id)}">
        <div class="storage-file-card-head">
          <label class="storage-select-toggle">
            <input type="checkbox" data-storage-select="${escapeAttr(file.id)}" ${selectedIds.includes(file.id) ? "checked" : ""} />
            <span></span>
          </label>
          <div class="file-vault-icon">${escape(fileIcon(file))}</div>
          <div class="storage-file-copy">
            <strong>${escape(file.name)}</strong>
            <span>${escape(storageTypeLabel(file))} | ${escape(formatBytes(file.size))} | ${escape(formatRelativeTime(file.updatedAt || Date.now()))}</span>
          </div>
        </div>
        <div class="storage-file-card-meta">
          <span>${escape(folder?.name || "Root")}</span>
          <div class="file-vault-flags">
            ${file.uploadStatus && file.uploadStatus !== "ready" ? `<span class="notification-category-badge">${escape(file.uploadStatus)}</span>` : ""}
            ${file.favorite ? `<span class="notification-category-badge">Starred</span>` : ""}
            ${file.pinned ? `<span class="notification-category-badge">Pinned</span>` : ""}
            ${file.deletedAt ? `<span class="notification-category-badge">Trash</span>` : ""}
            ${file.archived && !file.deletedAt ? `<span class="notification-category-badge">Archived</span>` : ""}
          </div>
        </div>
        <div class="storage-file-card-actions">
          <button class="secondary-button compact-action-button" type="button" data-storage-download="${escapeAttr(file.id)}">Download</button>
          <button class="secondary-button compact-action-button" type="button" data-storage-star="${escapeAttr(file.id)}">${file.favorite ? "Unstar" : "Star"}</button>
          <button class="secondary-button compact-action-button" type="button" data-storage-trash="${escapeAttr(file.id)}">${file.deletedAt ? "Restore" : "Trash"}</button>
        </div>
      </article>
    `;
  }).join("") : `<div class="empty-state">Upload any project file type here and organize it into folders, tags, and categories.</div>`;
}

function renderStorageDetail(container, doc = activeDoc(), mode = "workspace") {
  if (!container) return;
  const selection = storageSelectionState(doc);
  const selected = selectedStorageFile(doc) || visibleStorageFiles(doc)[0] || null;
  if (selected && !selection.selectedIds?.length) setStorageSelection([selected.id], doc);
  container.innerHTML = selected ? `
    <div class="file-vault-preview">
      ${selected.preview && selected.mimeType?.startsWith("image/") ? `<img src="${escapeAttr(selected.preview)}" alt="${escapeAttr(selected.name)} preview" />` : `<div class="file-vault-preview-fallback">${escape(fileIcon(selected))}</div>`}
    </div>
    <div class="file-vault-meta">
      <h4>${escape(selected.name)}</h4>
      <p>${escape(storageTypeLabel(selected))} | ${escape(selected.mimeType || "Unknown type")} | ${escape(formatBytes(selected.size))}</p>
      <div class="market-tag-row">${(selected.tags || []).map((tag) => `<span class="market-tag">${escape(tag)}</span>`).join("") || '<span class="empty-inline">No tags yet</span>'}</div>
      <div class="document-card-actions">
        <button class="secondary-button" type="button" data-storage-rename="${escapeAttr(selected.id)}">Rename</button>
        <button class="secondary-button" type="button" data-storage-move="${escapeAttr(selected.id)}">Move</button>
        <button class="secondary-button" type="button" data-storage-download="${escapeAttr(selected.id)}">Download</button>
        <button class="secondary-button" type="button" data-storage-attach="${escapeAttr(selected.id)}">Attach</button>
      </div>
      <label class="profile-field">
        <span>Tags</span>
        <input id="${mode === "overlay" ? "fileVaultTagsInput2" : "storageTagsInput"}" class="modal-input" type="text" value="${escapeAttr((selected.tags || []).join(", "))}" />
      </label>
      <label class="profile-field">
        <span>Category</span>
        <select id="${mode === "overlay" ? "fileVaultCategorySelect" : "storageCategorySelect"}" class="modal-input">
          <option value="">No category</option>
          ${storageCategories().map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === selected.categoryId ? "selected" : ""}>${escape(entry.name)}</option>`).join("")}
        </select>
      </label>
      <div class="storage-detail-grid">
        <div class="context-link-card"><span>Folder</span><strong>${escape(storageFolders().find((entry) => entry.id === selected.folderId)?.name || "Root")}</strong></div>
        <div class="context-link-card"><span>Version</span><strong>v${escape(String(selected.version || 1))}</strong></div>
        <div class="context-link-card"><span>Owner</span><strong>${escape(selected.ownerId === state.profile.userId ? state.profile.name : "Collaborator")}</strong></div>
        <div class="context-link-card"><span>Updated</span><strong>${escape(new Date(selected.updatedAt || Date.now()).toLocaleString())}</strong></div>
      </div>
    </div>
  ` : `<div class="empty-state">Select a file to preview metadata, download it, tag it, or move it into a better folder.</div>`;
}

function renderStorageFolderButtons(container, doc = activeDoc()) {
  if (!container) return;
  const selection = storageSelectionState(doc);
  const activeFolderId = selection.activeFolderId || null;
  const roots = storageFolders().filter((folder) => !folder.parentId && !folder.archived);
  const renderBranch = (folder, depth = 0) => {
    const childrenMarkup = storageFolders()
      .filter((entry) => entry.parentId === folder.id && !entry.archived)
      .map((entry) => renderBranch(entry, depth + 1))
      .join("");
    return `
      <button class="storage-folder-button ${activeFolderId === folder.id ? "active" : ""}" type="button" data-storage-folder="${escapeAttr(folder.id)}" style="padding-left:${12 + depth * 18}px">
        <span>${folder.pinned ? "PIN" : "DIR"}</span>
        <strong>${escape(folder.name)}</strong>
      </button>
      ${childrenMarkup}
    `;
  };
  container.innerHTML = `
    <button class="storage-folder-button ${!activeFolderId ? "active" : ""}" type="button" data-storage-folder="">
      <span>ALL</span>
      <strong>Root Storage</strong>
    </button>
    ${roots.map((folder) => renderBranch(folder)).join("") || '<div class="empty-state">No folders yet.</div>'}
  `;
}

function renderStorageBulkBar(doc = activeDoc()) {
  if (!els.storageBulkBar) return;
  const selection = storageSelectionState(doc);
  const count = selection.selectedIds?.length || 0;
  els.storageBulkBar.classList.toggle("hidden", count === 0);
  els.storageBulkBar.innerHTML = count ? `
    <div class="storage-bulk-copy">${count} selected</div>
    <div class="storage-bulk-actions">
      <button class="secondary-button compact-action-button" type="button" data-storage-bulk="download">Download</button>
      <button class="secondary-button compact-action-button" type="button" data-storage-bulk="favorite">Star</button>
      <button class="secondary-button compact-action-button" type="button" data-storage-bulk="move">Move</button>
      <button class="secondary-button compact-action-button" type="button" data-storage-bulk="trash">Trash</button>
    </div>
  ` : "";
}

function renderStorageWorkspace() {
  if (!els.storageFileGrid || !els.storageDetailPanel || !els.storageSidebarViews || !els.storageFolderTree) return;
  const doc = activeDoc();
  if (!doc || doc.docType !== "storage") return;
  normalizeStorageState();
  normalizeStorageDoc(doc);
  const files = visibleStorageFiles(doc);
  if (els.storageWorkspaceTitle) els.storageWorkspaceTitle.textContent = doc.name || "Storage";
  if (els.storageWorkspaceMeta) {
    const trashed = fileVaultEntries().filter((entry) => entry.deletedAt).length;
    els.storageWorkspaceMeta.textContent = `${files.length} items | ${storageFolders().length} folders | ${trashed} trash`;
  }
  if ($("#storageSearchInput")) $("#storageSearchInput").value = doc.storage.search || "";
  if (els.storageSortSelect) els.storageSortSelect.value = doc.storage.sort || "recent";
  document.querySelectorAll("[data-storage-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.storageView === (doc.storage.viewMode || "grid"));
  });
  document.querySelectorAll("[data-storage-density]").forEach((button) => {
    button.classList.toggle("active", button.dataset.storageDensity === (doc.storage.density || "comfortable"));
  });
  if (els.storageBreadcrumbs) {
    els.storageBreadcrumbs.innerHTML = storageFolderPath(doc.storage.activeFolderId).map((crumb) => `<button class="storage-crumb ${crumb.id === doc.storage.activeFolderId ? "active" : ""}" type="button" data-storage-folder="${escapeAttr(crumb.id || "")}">${escape(crumb.name)}</button>`).join("<span>/</span>");
  }
  if (els.storageSidebarViews) {
    const activeFilter = doc.storage.activeFilter || "all";
    els.storageSidebarViews.innerHTML = storageViewOptions().map((view) => `<button class="storage-folder-button ${activeFilter === view.id ? "active" : ""}" type="button" data-storage-filter="${escapeAttr(view.id)}"><span>VIEW</span><strong>${escape(view.name)}</strong></button>`).join("");
  }
  renderStorageFolderButtons(els.storageFolderTree, doc);
  renderStorageBulkBar(doc);
  renderStorageList(els.storageFileGrid, doc);
  renderStorageDetail(els.storageDetailPanel, doc, "workspace");
  bindStorageBrowserEvents("workspace");
}

function renderFileVaultOverlay() {
  normalizeStorageState();
  els.overlayCard?.classList.remove("overlay-card-profile", "overlay-card-market");
  els.overlayCard?.classList.add("overlay-card-chat");
  els.overlayEyebrow.textContent = "Storage";
  els.overlayTitle.textContent = "Universal Game File Storage";
  els.overlayBody.innerHTML = `
    <section class="overlay-section file-vault-shell">
      <div class="overlay-section-header">
        <div>
          <p class="eyebrow">Storage Hub</p>
          <h3>Files, source, exports, references, and uploads</h3>
        </div>
        <div class="notifications-toolbar-actions">
          <button id="fileVaultUploadButton" class="secondary-button" type="button">Upload</button>
          <button id="fileVaultCreateFolderButton" class="secondary-button" type="button">Folder</button>
          <button id="fileVaultCreateCategoryButton" class="secondary-button" type="button">Category</button>
        </div>
      </div>
      <div class="file-vault-toolbar">
        <label class="workspace-search overlay-search">
          <span>Search</span>
          <input id="fileVaultSearchInput" type="search" value="${escapeAttr(state.fileVault?.search || "")}" placeholder="Search files, tags, types" />
        </label>
        <div class="friends-tabs notification-tabs">${storageViewButtonsMarkup(state.fileVault?.activeView || "recent")}</div>
      </div>
      <div class="file-vault-layout">
        <div class="storage-overlay-column">
          <div id="fileVaultList" class="storage-file-grid storage-file-grid-list"></div>
        </div>
        <aside id="fileVaultDetail" class="file-vault-detail premium-surface"></aside>
      </div>
    </section>
  `;
  renderStorageList($("#fileVaultList"), null);
  renderStorageDetail($("#fileVaultDetail"), null, "overlay");
  bindStorageBrowserEvents("overlay");
}

function bindStorageBrowserEvents(mode = "workspace") {
  const doc = activeDoc();
  const rerender = () => {
    if (mode === "overlay") renderFileVaultOverlay();
    else renderStorageWorkspace();
  };
  document.querySelectorAll("[data-storage-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const selection = storageSelectionState(mode === "workspace" ? doc : null);
      selection.activeFilter = button.dataset.storageFilter || "all";
      if (mode === "overlay") state.fileVault.activeView = selection.activeFilter;
      save();
      rerender();
    });
  });
  document.querySelectorAll("[data-storage-folder]").forEach((button) => {
    button.addEventListener("click", () => {
      const selection = storageSelectionState(mode === "workspace" ? doc : null);
      selection.activeFolderId = button.dataset.storageFolder || null;
      save();
      rerender();
    });
  });
  document.querySelectorAll("[data-storage-file]").forEach((card) => {
    card.addEventListener("click", (event) => {
      if (event.target.closest("button, input, select, label")) return;
      setStorageSelection([card.dataset.storageFile], mode === "workspace" ? doc : null);
      save();
      rerender();
    });
  });
  document.querySelectorAll("[data-storage-select]").forEach((input) => {
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("change", (event) => {
      const selection = storageSelectionState(mode === "workspace" ? doc : null);
      const next = new Set(selection.selectedIds || []);
      if (event.target.checked) next.add(event.target.dataset.storageSelect);
      else next.delete(event.target.dataset.storageSelect);
      setStorageSelection([...next], mode === "workspace" ? doc : null);
      save();
      rerender();
    });
  });
  document.querySelectorAll("[data-storage-download]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    downloadStorageFile(button.dataset.storageDownload);
  }));
  document.querySelectorAll("[data-storage-star]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleStorageFavorite(button.dataset.storageStar);
    rerender();
  }));
  document.querySelectorAll("[data-storage-trash]").forEach((button) => button.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleStorageTrash(button.dataset.storageTrash);
    rerender();
  }));
  document.querySelectorAll("[data-storage-rename]").forEach((button) => button.addEventListener("click", () => promptRenameStorageFile(button.dataset.storageRename)));
  document.querySelectorAll("[data-storage-move]").forEach((button) => button.addEventListener("click", () => promptMoveStorageFile(button.dataset.storageMove)));
  document.querySelectorAll("[data-storage-attach]").forEach((button) => button.addEventListener("click", () => {
    const file = fileVaultEntries().find((entry) => entry.id === button.dataset.storageAttach);
    if (!file) return;
    attachFileToActiveContext(file);
  }));
  document.querySelectorAll("[data-storage-bulk]").forEach((button) => button.addEventListener("click", () => handleStorageBulkAction(button.dataset.storageBulk, mode === "workspace" ? doc : null)));
  $("#fileVaultUploadButton")?.addEventListener("click", () => startStorageUpload(mode === "workspace" ? doc?.storage?.activeFolderId : state.fileVault.activeFolderId, mode));
  $("#fileVaultCreateFolderButton")?.addEventListener("click", promptCreateStorageFolder);
  $("#fileVaultCreateCategoryButton")?.addEventListener("click", promptCreateStorageCategory);
  $("#fileVaultSearchInput")?.addEventListener("input", (event) => {
    state.fileVault.search = event.target.value || "";
    save();
    rerender();
  });
  $("#fileVaultTagsInput2, #storageTagsInput")?.addEventListener("change", (event) => {
    const file = selectedStorageFile(mode === "workspace" ? doc : null);
    if (!file) return;
    file.tags = String(event.target.value || "").split(",").map((entry) => entry.trim()).filter(Boolean);
    save();
    rerender();
  });
  $("#fileVaultCategorySelect, #storageCategorySelect")?.addEventListener("change", (event) => {
    const file = selectedStorageFile(mode === "workspace" ? doc : null);
    if (!file) return;
    file.categoryId = event.target.value || null;
    save();
    rerender();
  });
}

function legacyFileIcon(file) {
  if (file.mimeType?.startsWith("image/")) return "IMG";
  if (file.mimeType?.startsWith("video/")) return "VID";
  if (/pdf/i.test(file.mimeType || "") || /\.pdf$/i.test(file.name || "")) return "PDF";
  if (/zip|archive/i.test(file.mimeType || "") || /\.(zip|rar|7z)$/i.test(file.name || "")) return "ZIP";
  return "FILE";
}

function legacyHandleFileVaultUpload(event) {
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  files.forEach((file) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      state.fileVault.files.unshift({
        id: uid(),
        name: file.name,
        type: file.name.split(".").at(-1)?.toUpperCase() || "Asset",
        mimeType: file.type || "",
        size: file.size || 0,
        updatedAt: Date.now(),
        preview: typeof reader.result === "string" ? reader.result : "",
        tags: [],
        favorite: false,
        shared: false,
        archived: false,
      });
      save();
      renderChrome();
      if (!els.overlayPanel?.classList.contains("hidden")) renderFileVaultOverlay();
    });
    reader.readAsDataURL(file);
  });
  event.target.value = "";
}

function startStorageUpload(folderId = null, mode = "workspace") {
  fileVaultUploadContext = { folderId: folderId || null, mode };
  fileVaultUploadInput?.click();
}

function logStorageActivity(action, file) {
  normalizeStorageState();
  state.fileVault.activity.unshift({
    id: uid(),
    itemId: file?.id || null,
    action,
    createdAt: Date.now(),
    actorId: state.profile.userId,
  });
}

function downloadStorageFile(fileId) {
  const file = fileVaultEntries().find((entry) => entry.id === fileId);
  if (!file || !file.downloadUrl) {
    showToast("File is not available for download", "warning");
    return;
  }
  const link = document.createElement("a");
  link.href = file.downloadUrl;
  link.download = file.name || "download";
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  logStorageActivity("download", file);
  save();
}

function toggleStorageFavorite(fileId) {
  const file = fileVaultEntries().find((entry) => entry.id === fileId);
  if (!file) return;
  file.favorite = !file.favorite;
  if (file.favorite) toggleWorkspaceFavorite(file.id);
  logStorageActivity(file.favorite ? "favorite" : "unfavorite", file);
  save();
}

function toggleStorageTrash(fileId) {
  const file = fileVaultEntries().find((entry) => entry.id === fileId);
  if (!file) return;
  if (file.deletedAt) {
    file.deletedAt = null;
    file.archived = false;
    state.fileVault.trash = (state.fileVault.trash || []).filter((entry) => entry.id !== file.id);
    logStorageActivity("restore", file);
  } else {
    file.deletedAt = Date.now();
    state.fileVault.trash = [...(state.fileVault.trash || []).filter((entry) => entry.id !== file.id), { id: file.id, deletedAt: file.deletedAt }];
    logStorageActivity("trash", file);
  }
  save();
}

function promptRenameStorageFile(fileId) {
  const file = fileVaultEntries().find((entry) => entry.id === fileId);
  if (!file) return;
  openModal({
    eyebrow: "Rename File",
    title: file.name,
    message: "Update the file name while keeping its storage references intact.",
    confirmLabel: "Save Name",
    inputValue: file.name,
    onConfirm: (value) => {
      const next = value.trim();
      if (!next) return false;
      file.name = next;
      file.updatedAt = Date.now();
      logStorageActivity("rename", file);
      save();
      render();
      return true;
    },
  });
}

function promptMoveStorageFile(fileId, selectedTargetId = null) {
  const file = fileVaultEntries().find((entry) => entry.id === fileId);
  if (!file) return;
  openModal({
    eyebrow: "Move File",
    title: file.name,
    message: "Type a folder name to move this file, or leave empty to return it to the root.",
    confirmLabel: "Move File",
    inputValue: storageFolders().find((entry) => entry.id === file.folderId)?.name || "",
    onConfirm: (value) => {
      const next = value.trim();
      let folderId = null;
      if (next) {
        let folder = storageFolders().find((entry) => entry.name.toLowerCase() === next.toLowerCase());
        if (!folder) {
          folder = { id: uid(), name: next, parentId: null, pinned: false, archived: false, createdAt: Date.now(), updatedAt: Date.now(), presetId: "" };
          state.fileVault.folders.push(folder);
        }
        folderId = folder.id;
      }
      file.folderId = selectedTargetId || folderId;
      file.updatedAt = Date.now();
      logStorageActivity("move", file);
      save();
      render();
      return true;
    },
  });
}

function promptCreateStorageFolder() {
  const doc = activeDoc();
  const targetParentId = doc?.docType === "storage" ? (doc.storage.activeFolderId || null) : (state.fileVault.activeFolderId || null);
  openModal({
    eyebrow: "Storage Folder",
    title: "Create folder",
    message: "Folders let you organize any file type by project, milestone, discipline, or any structure you want.",
    confirmLabel: "Create Folder",
    inputValue: "",
    onConfirm: (value) => {
      const next = value.trim();
      if (!next) return false;
      state.fileVault.folders.push({
        id: uid(),
        name: next,
        parentId: targetParentId,
        pinned: false,
        archived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        presetId: "",
      });
      save();
      render();
      return true;
    },
  });
}

function promptCreateStorageCategory() {
  openModal({
    eyebrow: "Storage Category",
    title: "Create category",
    message: "Categories help you build custom organization and filtering rules across the storage hub.",
    confirmLabel: "Create Category",
    inputValue: "",
    onConfirm: (value) => {
      const next = value.trim();
      if (!next) return false;
      state.fileVault.categories.push({ id: uid(), name: next, color: "#8b5cf6" });
      state.fileVault.smartViews = [...new Set([...(state.fileVault.smartViews || []), next.toLowerCase()])];
      save();
      render();
      return true;
    },
  });
}

function promptApplyStoragePreset() {
  openModal({
    eyebrow: "Storage Preset",
    title: "Apply folder preset",
    message: `Choose one preset: ${STORAGE_STRUCTURE_PRESETS.map((entry) => entry.name).join(", ")}`,
    confirmLabel: "Apply Preset",
    inputValue: STORAGE_STRUCTURE_PRESETS[0]?.name || "",
    onConfirm: (value) => {
      const preset = STORAGE_STRUCTURE_PRESETS.find((entry) => entry.name.toLowerCase() === String(value || "").trim().toLowerCase());
      if (!preset) return false;
      preset.folders.forEach((name) => {
        if (!storageFolders().some((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
          state.fileVault.folders.push({
            id: uid(),
            name,
            parentId: null,
            pinned: false,
            archived: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            presetId: preset.id,
          });
        }
      });
      save();
      render();
      showToast(`${preset.name} applied`);
      return true;
    },
  });
}

function handleStorageBulkAction(action, doc = activeDoc()) {
  const selection = storageSelectionState(doc);
  const ids = selection.selectedIds || [];
  if (!ids.length) return;
  if (action === "download") ids.forEach(downloadStorageFile);
  if (action === "favorite") ids.forEach(toggleStorageFavorite);
  if (action === "trash") ids.forEach(toggleStorageTrash);
  if (action === "move") {
    promptMoveStorageFile(ids[0]);
    return;
  }
  save();
  render();
}

function handleFileVaultUpload(event) {
  normalizeStorageState();
  const files = [...(event.target.files || [])];
  if (!files.length) return;
  const contextDoc = activeDoc();
  const contextFolderId = fileVaultUploadContext?.folderId || (contextDoc?.docType === "storage" ? contextDoc.storage.activeFolderId : state.fileVault.activeFolderId) || null;
  files.forEach((file) => {
    const reader = new FileReader();
    const entry = {
      id: uid(),
      name: file.name,
      type: file.name.split(".").at(-1)?.toUpperCase() || "Asset",
      mimeType: file.type || "",
      size: file.size || 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      preview: "",
      downloadUrl: "",
      folderId: contextFolderId,
      categoryId: null,
      tags: [],
      labels: [],
      favorite: false,
      pinned: false,
      shared: false,
      archived: false,
      deletedAt: null,
      ownerId: state.profile.userId,
      workspaceId: state.selectedVaultId || vaultId(contextDoc?.id) || null,
      linkedIds: [contextDoc?.id].filter(Boolean),
      version: 1,
      extension: file.name.split(".").at(-1)?.toLowerCase() || "",
      uploadStatus: "uploading",
    };
    state.fileVault.files.unshift(entry);
    setStorageSelection([entry.id], contextDoc?.docType === "storage" ? contextDoc : null);
    const finish = (payload = "") => {
      entry.preview = typeof payload === "string" ? payload : "";
      entry.downloadUrl = typeof payload === "string" ? payload : "";
      entry.uploadStatus = "ready";
      logStorageActivity("upload", entry);
      save();
      renderChrome();
      if (!els.overlayPanel?.classList.contains("hidden")) renderFileVaultOverlay();
      renderStorageWorkspace();
    };
    reader.addEventListener("load", () => finish(reader.result));
    reader.addEventListener("error", () => {
      entry.uploadStatus = "failed";
      save();
      renderStorageWorkspace();
      showToast(`Upload failed for ${file.name}`, "warning");
    });
    reader.readAsDataURL(file);
  });
  fileVaultUploadContext = null;
  event.target.value = "";
}

function fileIcon(file) {
  const name = String(file?.name || "").toLowerCase();
  const mime = String(file?.mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "IMG";
  if (mime.startsWith("video/")) return "VID";
  if (mime.startsWith("audio/")) return "AUD";
  if (/pdf/.test(mime) || /\.pdf$/i.test(name)) return "PDF";
  if (/zip|archive|compressed/.test(mime) || /\.(zip|rar|7z|tar|gz)$/i.test(name)) return "ZIP";
  if (/json|xml|yaml|toml/.test(mime) || /\.(json|xml|ya?ml|toml|ini|cfg)$/i.test(name)) return "CFG";
  if (/javascript|typescript|python|text\/plain|html|css|x-c|x-java/.test(mime) || /\.(js|ts|tsx|jsx|py|lua|json|css|html|cpp|c|h|cs|java)$/i.test(name)) return "SRC";
  if (/sheet|excel|csv|spreadsheet/.test(mime) || /\.(csv|xls|xlsx)$/i.test(name)) return "XLS";
  if (/presentation|powerpoint/.test(mime) || /\.(ppt|pptx|key)$/i.test(name)) return "PPT";
  if (/word|document|rtf/.test(mime) || /\.(doc|docx|rtf|txt|md)$/i.test(name)) return "DOC";
  if (/model|fbx|obj|gltf/.test(mime) || /\.(fbx|obj|blend|gltf|glb)$/i.test(name)) return "3D";
  return "FILE";
}

function attachFileToActiveContext(file) {
  const doc = activeDoc();
  const card = activeBoardCard();
  file.linkedIds = [...new Set([...(file.linkedIds || []), ...(doc ? [doc.id] : []), ...(card ? [card.id] : [])])];
  if (card) {
    card.attachments = [...(card.attachments || []), { id: file.id, name: file.name }];
    save();
    showToast("Attached to active card");
    renderBoard();
    return;
  }
  if (doc) {
    if (doc.docType === "text") {
      insertHtmlAtSelection(`<p><a href="${escapeAttr(file.preview || "#")}" target="_blank" rel="noreferrer">${escape(file.name)}</a></p>`);
      syncEditorFromDom();
    } else {
      doc.content = `${doc.content || ""}\n${file.name}`;
    }
    save();
    showToast("Attached to document");
    renderStorageWorkspace();
    return;
  }
  showToast("Open a document or board card first");
}

function handleVaultRootDragLeave(event) {
  if (!els.vaultContentsTree) return;
  if (event.currentTarget.contains(event.relatedTarget)) return;
  stopVaultAutoScroll();
  els.vaultContentsTree.classList.remove("is-drop-target");
}

function handleVaultRootDrop(event) {
  const vault = selectedVault();
  if (!draggedTreeNodeId || !vault || event.target.closest(".tree-button.folder")) return;
  event.preventDefault();
  stopVaultAutoScroll();
  moveNodeToParent(draggedTreeNodeId, vault.id);
  clearTreeDropTargets();
}

function clearTreeDropTargets() {
  stopVaultAutoScroll();
  els.vaultContentsTree?.classList.remove("is-drop-target");
  els.vaultContentsTree?.querySelectorAll(".is-drop-target").forEach((node) => node.classList.remove("is-drop-target"));
  els.vaultContentsTree?.querySelectorAll(".is-dragging").forEach((node) => node.classList.remove("is-dragging"));
}

function updateVaultAutoScroll(clientY) {
  const scroller = els.vaultContentsTree?.closest("#vaultTreePanel") || els.vaultContentsTree;
  if (!scroller) return;
  const rect = scroller.getBoundingClientRect();
  const edge = 72;
  const maxSpeed = 16;
  let delta = 0;
  if (clientY < rect.top + edge) {
    delta = -Math.ceil(((rect.top + edge - clientY) / edge) * maxSpeed);
  } else if (clientY > rect.bottom - edge) {
    delta = Math.ceil(((clientY - (rect.bottom - edge)) / edge) * maxSpeed);
  }
  if (!delta) {
    stopVaultAutoScroll();
    return;
  }
  if (!vaultAutoScrollState) {
    vaultAutoScrollState = { delta, raf: 0, scroller };
  } else {
    vaultAutoScrollState.delta = delta;
    vaultAutoScrollState.scroller = scroller;
  }
  if (vaultAutoScrollState.raf) return;
  const tick = () => {
    if (!vaultAutoScrollState || !draggedTreeNodeId) {
      stopVaultAutoScroll();
      return;
    }
    vaultAutoScrollState.scroller.scrollBy({ top: vaultAutoScrollState.delta, behavior: "auto" });
    vaultAutoScrollState.raf = window.requestAnimationFrame(tick);
  };
  vaultAutoScrollState.raf = window.requestAnimationFrame(tick);
}

function stopVaultAutoScroll() {
  if (!vaultAutoScrollState) return;
  if (vaultAutoScrollState.raf) window.cancelAnimationFrame(vaultAutoScrollState.raf);
  vaultAutoScrollState = null;
}

function renameVault(vaultId) {
  const vault = item(vaultId);
  if (!vault || vault.type !== "folder" || vault.folderKind !== "vault") return;
  openModal({
    eyebrow: "Rename Vault",
    title: vault.name,
    message: "Choose a new vault name. This updates the library and explorer immediately.",
    confirmLabel: "Save Name",
    inputValue: vault.name,
    onConfirm: (value) => {
      const next = value.trim();
      if (!next) return false;
      vault.name = next;
      save();
      writeLocationState();
      render();
      showToast("Vault renamed");
      return true;
    },
  });
}

function duplicateVault(vaultId) {
  const vault = item(vaultId);
  if (!vault || vault.type !== "folder" || vault.folderKind !== "vault") return;
  const cloneVault = createVault(`${vault.name} Copy`);
  cloneVault.categoryId = vault.categoryId || null;
  cloneVault.coverImage = vault.coverImage || "";
  cloneVault.owner = vault.owner || "You";
  cloneVault.members = [...(vault.members || [])];
  const mapping = new Map([[vault.id, cloneVault.id]]);
  const clones = [cloneVault];
  descendants(vault.id).forEach((entry) => {
    const nextParentId = mapping.get(entry.parentId) || cloneVault.id;
    if (entry.type === "folder") {
      const folderClone = createFolder(`${entry.name}`, nextParentId);
      mapping.set(entry.id, folderClone.id);
      clones.push(folderClone);
      return;
    }
    const docClone = structuredClone(entry);
    docClone.id = uid();
    docClone.parentId = nextParentId;
    docClone.name = `${entry.name}`;
    docClone.updatedAt = Date.now();
    docClone.lastOpenedAt = Date.now();
    clones.push(docClone);
  });
  state.items.push(...clones);
  save();
  render();
  showToast("Vault duplicated");
}

function deleteVault(vaultId) {
  const vault = item(vaultId);
  if (!vault || vault.type !== "folder" || vault.folderKind !== "vault") return;
  openModal({
    eyebrow: "Delete Vault",
    title: vault.name,
    message: `Delete "${vault.name}"? Its notes and folders will be removed from this browser workspace.`,
    confirmLabel: "Delete Vault",
    destructive: true,
    onConfirm: () => {
      const idsToDelete = new Set([vault.id, ...descendants(vault.id).map((entry) => entry.id)]);
      state.items = state.items.filter((entry) => !idsToDelete.has(entry.id));
      state.openTabs = state.openTabs.filter((docId) => !idsToDelete.has(docId));
      if (state.selectedVaultId === vault.id) state.selectedVaultId = null;
      if (state.activeDocumentId && idsToDelete.has(state.activeDocumentId)) state.activeDocumentId = null;
      if (state.selectedNodeId && idsToDelete.has(state.selectedNodeId)) state.selectedNodeId = null;
      normalize();
      save();
      writeLocationState();
      render();
      showToast("Vault deleted");
      return true;
    },
  });
}

function openDocument(docId) {
  const doc = item(docId);
  if (!doc || doc.type !== "document") return;
  doc.lastOpenedAt = Date.now();
  state.selectedVaultId = vaultId(doc.id);
  state.selectedNodeId = doc.id;
  state.activeDocumentId = doc.id;
  state.activeView = "workspace";
  if (!state.openTabs.includes(doc.id)) state.openTabs.push(doc.id);
  save();
  writeLocationState();
  render();
}

function openOverlay(mode) {
  if (!els.overlayPanel || !els.overlayBody || !els.overlayEyebrow || !els.overlayTitle) return;
  els.overlayCard?.classList.toggle("overlay-card-chat", mode === "messages");
  els.overlayPanel.classList.remove("hidden");
  if (mode === "settings") {
    renderSettingsOverlay();
    return;
  }
  if (mode === "profile") {
    renderProfileOverlay();
    return;
  }
  if (mode === "friends") {
    renderFriendsOverlay();
    return;
  }
  if (mode === "notifications") {
    renderNotificationsOverlay();
    return;
  }
  if (mode === "file-vault") {
    renderFileVaultOverlay();
    return;
  }
  if (mode === "switcher") {
    els.overlayEyebrow.textContent = "Command Palette";
    els.overlayTitle.textContent = "Navigate, Create, and Switch Modes";
    els.overlayBody.innerHTML = `
      <div class="overlay-section">
        <label class="workspace-search overlay-search">
          <span>Jump</span>
          <input id="switcherInput" type="search" placeholder="Search docs, boards, canvases, users, market, files" />
        </label>
        <div id="switcherResults" class="overlay-list"></div>
      </div>
      <div class="overlay-section">
        <h3>Quick Actions</h3>
        <div class="overlay-inline-actions">
          <button class="secondary-button" type="button" data-switch-action="note">New Note</button>
          <button class="secondary-button" type="button" data-switch-action="canvas">New Canvas</button>
          <button class="secondary-button" type="button" data-switch-action="sheet">New Sheet</button>
          <button class="secondary-button" type="button" data-switch-action="board">New Board</button>
          <button class="secondary-button" type="button" data-switch-action="storage">New Storage</button>
          <button class="secondary-button" type="button" data-switch-action="vault-files">File Vault</button>
          <button class="secondary-button" type="button" data-switch-action="favorite-active">Star Active</button>
        </div>
      </div>
      <div class="overlay-section">
        <h3>Layouts</h3>
        <div class="overlay-inline-actions">
          <button class="secondary-button" type="button" data-layout-preset="writer">Writer</button>
          <button class="secondary-button" type="button" data-layout-preset="balancer">Balancer</button>
          <button class="secondary-button" type="button" data-layout-preset="manager">Manager</button>
          <button class="secondary-button" type="button" data-layout-preset="minimal">Minimal</button>
        </div>
      </div>
      <div class="overlay-section">
        <h3>Document Presets</h3>
        <div class="overlay-inline-actions command-palette-grid">
          ${DOCUMENT_TEMPLATE_LIBRARY.slice(0, 10).map((template) => `<button class="secondary-button" type="button" data-switch-template="${escapeAttr(template.id)}">${escape(template.name)}</button>`).join("")}
        </div>
      </div>
      <div class="overlay-section">
        <h3>Recent & Starred</h3>
        <div id="switcherPinned" class="overlay-list"></div>
      </div>
    `;
    const input = $("#switcherInput");
    const results = $("#switcherResults");
    const pinned = $("#switcherPinned");
    els.overlayBody.querySelectorAll("[data-switch-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const vault = selectedVault() || vaults()[0];
        const action = button.dataset.switchAction;
        if (action === "vault-files") {
          openOverlay("file-vault");
          return;
        }
        if (action === "favorite-active") {
          toggleWorkspaceFavorite(activeDoc()?.id || selectedVault()?.id);
          render();
          openOverlay("switcher");
          return;
        }
        if (!vault) return;
        createInContainer(vault.id, action === "note" ? "text" : action);
        closeOverlay();
      });
    });
    els.overlayBody.querySelectorAll("[data-layout-preset]").forEach((button) => {
      button.addEventListener("click", () => {
        applyWorkspaceLayout(button.dataset.layoutPreset);
        save();
        render();
        openOverlay("switcher");
      });
    });
    els.overlayBody.querySelectorAll("[data-switch-template]").forEach((button) => {
      button.addEventListener("click", () => {
        const vault = selectedVault() || vaults()[0];
        if (!vault) return;
        const doc = createDoc(templateNameForId(button.dataset.switchTemplate), "text", vault.id);
        doc.content = wrapWritingBlock(button.dataset.switchTemplate, noteTemplateMarkup(button.dataset.switchTemplate));
        state.items.push(doc);
        openDocument(doc.id);
        closeOverlay();
      });
    });
    const renderResults = (query = "") => {
      if (!results) return;
      const q = query.trim().toLowerCase();
      const itemMatches = state.items
        .filter((entry) => !q || [entry.name, entry.docType, entry.folderKind].filter(Boolean).join(" ").toLowerCase().includes(q))
        .map((entry) => ({ kind: "workspace", entry }));
      const marketMatches = (state.marketProfiles || [])
        .filter((profile) => !q || [profile.nickname, profile.role, ...(profile.tags || []), ...(profile.tools || [])].join(" ").toLowerCase().includes(q))
        .map((entry) => ({ kind: "market", entry }));
      const fileMatches = (state.fileVault?.files || [])
        .filter((file) => !q || [file.name, file.type, ...(file.tags || [])].join(" ").toLowerCase().includes(q))
        .map((entry) => ({ kind: "file", entry }));
      const matches = [...itemMatches, ...marketMatches, ...fileMatches]
        .sort((a, b) => paletteSortKey(b) - paletteSortKey(a))
        .slice(0, 30);
      results.innerHTML = "";
      matches.forEach((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "overlay-result-button";
        const label = entry.kind === "market"
          ? entry.entry.nickname
          : entry.kind === "file"
            ? entry.entry.name
            : entry.entry.name;
        const kind = entry.kind === "market"
          ? `Market • ${entry.entry.role || "Developer"}`
          : entry.kind === "file"
            ? `File • ${entry.entry.type || "Asset"}`
            : entry.entry.type === "folder"
              ? (entry.entry.folderKind === "vault" ? "Vault" : "Folder")
              : entry.entry.docType === "sheet"
                ? "Sheet"
                : entry.entry.docType === "canvas"
                  ? "Canvas"
            : entry.entry.docType === "board"
              ? "Board"
              : entry.entry.docType === "storage"
                ? "Storage"
                : "Note";
        button.innerHTML = `<strong>${escape(label)}</strong><span>${escape(kind)}</span>`;
        button.addEventListener("click", () => {
          if (entry.kind === "market") {
            openMarketProfile(entry.entry.id);
            return;
          } else if (entry.kind === "file") {
            openOverlay("file-vault");
            state.fileVault.selectedFileId = entry.entry.id;
            return;
          } else if (entry.entry.type === "folder" && entry.entry.folderKind === "vault") openVault(entry.entry.id);
          else if (entry.entry.type === "document") openDocument(entry.entry.id);
          else if (entry.entry.type === "folder") {
            state.selectedVaultId = vaultId(entry.entry.id);
            state.selectedNodeId = entry.entry.id;
            state.activeView = "workspace";
            save();
            render();
          }
          closeOverlay();
        });
        results.appendChild(button);
      });
      if (!matches.length) results.innerHTML = `<div class="empty-state">No results</div>`;
    };
    if (pinned) {
      const starred = palettePinnedItems();
      pinned.innerHTML = starred.length
        ? starred.map((entry) => `<button class="overlay-result-button" type="button" data-palette-item="${escapeAttr(entry.id)}"><strong>${escape(entry.name)}</strong><span>${escape(entry.meta)}</span></button>`).join("")
        : `<div class="empty-state">Star files, boards, docs, and vaults to keep them here.</div>`;
      pinned.querySelectorAll("[data-palette-item]").forEach((button) => {
        button.addEventListener("click", () => openPaletteItem(button.dataset.paletteItem));
      });
    }
    input?.addEventListener("input", (event) => renderResults(event.target.value));
    renderResults("");
    requestAnimationFrame(() => input?.focus());
    return;
  }
  if (mode === "profile") {
    const stats = profileStats();
    els.overlayEyebrow.textContent = "Profile";
    els.overlayTitle.textContent = state.profile.name;
    els.overlayBody.innerHTML = `
      <section class="profile-shell">
        <section class="profile-identity premium-surface">
          <div class="profile-banner" style="${state.profile.banner ? `background-image:url('${escapeAttr(state.profile.banner)}')` : ""}">
            <button id="changeBannerButton" class="secondary-button profile-banner-action" type="button">Change Banner</button>
          </div>
          <div class="profile-hero">
            <button id="changeAvatarButton" class="profile-avatar ${state.profile.avatar ? "has-image" : ""}" type="button">
              ${state.profile.avatar ? `<img src="${escapeAttr(state.profile.avatar)}" alt="${escapeAttr(state.profile.name)} avatar" />` : `<span>${escape((state.profile.name?.[0] || "Y").toUpperCase())}</span>`}
            </button>
            <div class="profile-copy">
              <div class="profile-title-row">
                <div>
                  <h3>${escape(state.profile.name)}</h3>
                  <p>${escape(state.profile.role || "Designer")} | ${escape(state.profile.status || "Available")}</p>
                </div>
                <button id="copyProfileIdButton" class="secondary-button" type="button">${escape(state.profile.userId || randomUserId())}</button>
              </div>
              <p class="profile-bio-preview">${escape(state.profile.tagline || "")}</p>
            </div>
          </div>
        </section>

        <section class="profile-main-grid">
          <section class="profile-edit-panel overlay-section">
            <div class="overlay-section-header">
              <div>
                <p class="eyebrow">Identity</p>
                <h3>Customize Profile</h3>
              </div>
            </div>
            <label class="profile-field">
              <span>Name</span>
              <input id="profileNameInput" class="modal-input" type="text" value="${escapeAttr(state.profile.name || "")}" />
            </label>
            <label class="profile-field">
              <span>Role</span>
              <input id="profileRoleInput" class="modal-input" type="text" value="${escapeAttr(state.profile.role || "")}" />
            </label>
            <label class="profile-field">
              <span>Tagline</span>
              <input id="profileTaglineInput" class="modal-input" type="text" value="${escapeAttr(state.profile.tagline || "")}" />
            </label>
            <label class="profile-field">
              <span>Status</span>
              <input id="profileStatusInput" class="modal-input" type="text" value="${escapeAttr(state.profile.status || "")}" />
            </label>
            <label class="profile-field">
              <span>Bio</span>
              <textarea id="profileBioInput" class="modal-input profile-bio-input">${escape(state.profile.bio || "")}</textarea>
            </label>
            <label class="profile-field">
              <span>Private Note</span>
              <textarea id="profileNoteInput" class="modal-input profile-bio-input">${escape(state.profile.note || "")}</textarea>
            </label>
            <label class="profile-field profile-accent-field">
              <span>Accent</span>
              <input id="profileAccentInput" type="color" value="${escapeAttr(state.profile.accent || "#8b5cf6")}" />
            </label>
          </section>

          <section class="profile-side-stack">
            <section class="overlay-section">
              <p class="eyebrow">Studio Stats</p>
              <div class="stats-grid profile-stats-grid">
                <article class="stats-card"><span>Vaults Owned</span><strong>${stats.owned}</strong></article>
                <article class="stats-card"><span>Vaults In</span><strong>${stats.joined}</strong></article>
                <article class="stats-card"><span>Words Written</span><strong>${stats.words}</strong></article>
              </div>
            </section>

            <section class="overlay-section">
              <div class="overlay-section-header">
                <div>
                  <p class="eyebrow">Friends</p>
                  <h3>Connections</h3>
                </div>
                <div class="overlay-inline-actions">
                  <button id="openMessagesButton" class="secondary-button compact-action-button" type="button"><span class="button-icon">✉</span><span>Messages</span></button>
                  <button id="findProfileFriendButtonInline" class="secondary-button" type="button">Add Contact</button>
                </div>
              </div>
              <label class="profile-field">
                <span>Find by ID</span>
                <div class="overlay-inline-actions">
                  <input id="profileFriendSearchInput" class="modal-input" type="text" placeholder="FG-1234-123456" />
                  <button id="findProfileFriendButton" class="secondary-button" type="button">Find</button>
                </div>
              </label>
              <div id="profileFriendList" class="profile-friend-list"></div>
            </section>
          </section>
        </section>
      </section>
    `;
    bindProfileOverlay();
    return;
  }
  if (mode === "messages") {
    renderMessagesOverlay();
    return;
  }
  if (mode === "share") {
    const vault = selectedVault();
    els.overlayEyebrow.textContent = "Share Vault";
    els.overlayTitle.textContent = vault ? vault.name : "No vault selected";
    const friendOptions = (state.profile.friends || []).map((friend) => `<option value="${escapeAttr(friend.name)}">${escape(friend.name)} • ${escape(friend.role || "Collaborator")}</option>`).join("");
    els.overlayBody.innerHTML = vault ? `
      <div class="overlay-section">
        <h3>Vault Access</h3>
        <p>Owner: ${escape(vault.owner)}</p>
        <div class="overlay-inline-actions">
          <select id="shareVaultMemberSelect" class="modal-input">
            <option value="">Select teammate</option>
            ${friendOptions}
          </select>
          <button id="shareVaultInviteButton" class="secondary-button" type="button">Invite</button>
        </div>
        <div id="vaultMemberList" class="profile-friend-list"></div>
      </div>
    ` : `<div class="overlay-section"><h3>Vault Access</h3><p>Open a vault first.</p></div>`;
    if (vault) {
      const list = $("#vaultMemberList");
      if (list) {
        list.innerHTML = (vault.members || []).length
          ? vault.members.map((member) => `<article class="profile-friend-row"><div class="profile-friend-avatar"><span>${escape((member[0] || "M").toUpperCase())}</span></div><div class="profile-friend-copy"><strong>${escape(member)}</strong><span>Vault collaborator</span></div></article>`).join("")
          : `<div class="empty-state">No collaborators yet.</div>`;
      }
      on("#shareVaultInviteButton", "click", () => {
        const select = $("#shareVaultMemberSelect");
        const member = select?.value;
        if (!member) return;
        vault.members = [...new Set([...(vault.members || []), member])];
        save();
        pushNotification("team", "Vault shared", `${member} was added to ${vault.name}.`, {
          scopeType: "team",
          scopeId: vault.id,
          groupLabel: vault.name,
          actionLabel: "Open vault",
          destination: { view: "workspace", vaultId: vault.id },
        });
        openOverlay("share");
      });
    }
    return;
  }
}

function closeOverlay() {
  els.overlayCard?.classList.remove("overlay-card-chat", "overlay-card-profile", "overlay-card-market", "overlay-card-settings");
  if (els.overlayPanel) els.overlayPanel.classList.add("hidden");
}

function renderSettingsOverlay() {
  const settingsPage = renderSettingsPage({
    state,
    createDefaultSettings,
    save,
    rerender: renderSettingsOverlay,
    refreshUI: () => {
      syncSettingsAliases();
      save();
      renderChrome();
      renderLibrary();
      renderWorkspace();
    },
    notify: (title, body) => showToast(`${title}${body ? `: ${body}` : ""}`),
    replaceSettings: (nextSettings) => {
      state.settings = deepMerge(createDefaultSettings(), nextSettings || {});
      syncSettingsAliases();
      normalize();
      save();
      renderChrome();
      renderLibrary();
      renderWorkspace();
    },
    setSetting: (path, value, shouldSave = true) => {
      setByPath(state, path, value);
      syncSettingsAliases(path, value);
      normalize();
      if (shouldSave) save();
    },
    toggleFavorite: (path) => {
      const favorites = Array.isArray(state.settingsMeta.favorites) ? state.settingsMeta.favorites : [];
      const index = favorites.indexOf(path);
      if (index >= 0) favorites.splice(index, 1);
      else favorites.push(path);
      state.settingsMeta.favorites = favorites;
      save();
    },
    markRecent: (path, meta) => {
      const existing = Array.isArray(state.settingsMeta.recent) ? state.settingsMeta.recent.filter((entry) => entry.path !== path) : [];
      existing.unshift({ path, at: Date.now(), label: meta?.setting?.label || path, group: meta?.group?.title || "" });
      state.settingsMeta.recent = existing.slice(0, 18);
      save();
    },
    resetCategory: (categoryId) => {
      const defaults = createDefaultSettings();
      if (categoryId === "appearance") {
        state.settings.appearance = deepMerge(defaults.appearance, {});
        state.settings.theme = defaults.theme;
        state.settings.glowMode = defaults.glowMode;
      }
      if (categoryId === "workspace") state.settings.workspace = deepMerge(defaults.workspace, {});
      if (categoryId === "editor") {
        state.settings.editor = deepMerge(defaults.editor, {});
        state.settings.writingWidth = defaults.writingWidth;
      }
      if (categoryId === "sheets") state.settings.sheets = deepMerge(defaults.sheets, {});
      if (categoryId === "boards") state.settings.boards = deepMerge(defaults.boards, {});
      if (categoryId === "canvas") state.settings.canvas = deepMerge(defaults.canvas, {});
      if (categoryId === "notifications") state.settings.notifications = deepMerge(defaults.notifications, {});
      if (categoryId === "friends-messages") {
        state.settings.friendsMessages = deepMerge(defaults.friendsMessages, {});
        state.settings.chatSidebarWidth = defaults.chatSidebarWidth;
        state.settings.chatMembersWidth = defaults.chatMembersWidth;
      }
      if (categoryId === "marketplace") state.settings.marketplace = deepMerge(defaults.marketplace, {});
      if (categoryId === "profile") {
        state.settings.profile = deepMerge(defaults.profile, {});
        state.profile.tagline = defaults.profile.headline;
        state.profile.accent = defaults.profile.customProfileAccent;
      }
      if (categoryId === "accessibility") state.settings.accessibility = deepMerge(defaults.accessibility, {});
      if (categoryId === "shortcuts") state.settings.shortcuts = deepMerge(defaults.shortcuts, {});
      if (categoryId === "advanced") state.settings.advanced = deepMerge(defaults.advanced, {});
      syncSettingsAliases();
      normalize();
      save();
      renderChrome();
      renderWorkspace();
    },
  });
  els.overlayCard?.classList.remove("overlay-card-chat", "overlay-card-profile", "overlay-card-market");
  els.overlayCard?.classList.add(settingsPage.cardClass);
  els.overlayEyebrow.textContent = settingsPage.eyebrow;
  els.overlayTitle.textContent = settingsPage.title;
  els.overlayBody.innerHTML = settingsPage.html;
  settingsPage.bind(els.overlayBody);
}

function renderProfileOverlay() {
  els.overlayCard?.classList.remove("overlay-card-chat", "overlay-card-market");
  els.overlayCard?.classList.add("overlay-card-profile");
  const stats = profileStats();
  const blocks = Array.isArray(state.profile.blocks) ? state.profile.blocks : [];
  els.overlayEyebrow.textContent = "Profile";
  els.overlayTitle.textContent = state.profile.name;
  els.overlayBody.innerHTML = `
    <section class="profile-shell profile-theme-${escapeAttr(state.profile.themeVariant || "dark-glass")} profile-layout-${escapeAttr(state.profile.layoutStyle || "studio")}">
      <section class="profile-identity premium-surface">
        <div class="profile-banner" style="${state.profile.banner ? `background-image:url('${escapeAttr(state.profile.banner)}')` : ""}">
          <button id="changeBannerButton" class="secondary-button profile-banner-action" type="button">Change Banner</button>
        </div>
        <div class="profile-hero">
          <button id="changeAvatarButton" class="profile-avatar ${state.profile.avatar ? "has-image" : ""}" type="button">
            ${state.profile.avatar ? `<img src="${escapeAttr(state.profile.avatar)}" alt="${escapeAttr(state.profile.name)} avatar" />` : `<span>${escape((state.profile.name?.[0] || "Y").toUpperCase())}</span>`}
          </button>
          <div class="profile-copy">
            <div class="profile-title-row">
              <div>
                <h3>${escape(state.profile.name)}</h3>
                <p>${escape(state.profile.role || "Designer")} | ${escape(state.profile.status || "Available")}</p>
              </div>
              <button id="copyProfileIdButton" class="secondary-button" type="button">${escape(state.profile.userId || randomUserId())}</button>
            </div>
            <p class="profile-bio-preview">${escape(state.profile.tagline || "")}</p>
          </div>
        </div>
      </section>

      <section class="profile-main-grid">
        <section class="profile-edit-panel overlay-section">
          <div class="overlay-section-header">
            <div>
              <p class="eyebrow">Identity</p>
              <h3>Customize Profile</h3>
            </div>
          </div>
          <label class="profile-field">
            <span>Name</span>
            <input id="profileNameInput" class="modal-input" type="text" value="${escapeAttr(state.profile.name || "")}" />
          </label>
          <label class="profile-field">
            <span>Role</span>
            <select id="profileRoleInput" class="modal-input">
              ${renderSelectOptions([
                "Game Designer",
                "Balancing Specialist",
                "Producer",
                "Technical Designer",
                "Narrative Designer",
                "Level Designer",
                "Systems Designer",
                "Economy Designer",
                "Combat Designer",
                "Quest Designer",
                "Worldbuilder",
                "UI Designer",
                "UX Designer",
                "VFX Artist",
                "Animator",
                "3D Artist",
                "Environment Artist",
                "Technical Artist",
                "Audio Designer",
                "Sound Designer",
                "Programmer",
                "Gameplay Programmer",
                "Tools Programmer",
                "QA Analyst",
                "Creative Director",
              ], state.profile.role || "Game Designer")}
            </select>
          </label>
          <label class="profile-field">
            <span>Tagline</span>
            <input id="profileTaglineInput" class="modal-input" type="text" value="${escapeAttr(state.profile.tagline || "")}" />
          </label>
          <label class="profile-field">
            <span>Status</span>
            <select id="profileStatusInput" class="modal-input">
              ${renderSelectOptions([
                "Available for collaboration",
                "Available for hire",
                "Open to offers",
                "In production",
                "Heads down building",
                "Not available",
              ], state.profile.status || "Available for collaboration")}
            </select>
          </label>
          <label class="profile-field">
            <span>Bio</span>
            <textarea id="profileBioInput" class="modal-input profile-bio-input">${escape(state.profile.bio || "")}</textarea>
          </label>
          <label class="profile-field">
            <span>Private Note</span>
            <textarea id="profileNoteInput" class="modal-input profile-bio-input">${escape(state.profile.note || "")}</textarea>
          </label>
          <div class="profile-config-grid">
            <label class="profile-field profile-accent-field">
              <span>Accent</span>
              <input id="profileAccentInput" type="color" value="${escapeAttr(state.profile.accent || "#8b5cf6")}" />
            </label>
            <label class="profile-field">
              <span>Theme Variant</span>
              <select id="profileThemeVariantInput" class="modal-input">
                <option value="dark-glass" ${state.profile.themeVariant === "dark-glass" ? "selected" : ""}>Dark Glass</option>
                <option value="neon" ${state.profile.themeVariant === "neon" ? "selected" : ""}>Neon</option>
                <option value="minimal" ${state.profile.themeVariant === "minimal" ? "selected" : ""}>Minimal</option>
              </select>
            </label>
            <label class="profile-field">
              <span>Layout Style</span>
              <select id="profileLayoutStyleInput" class="modal-input">
                <option value="studio" ${state.profile.layoutStyle === "studio" ? "selected" : ""}>Studio</option>
                <option value="compact" ${state.profile.layoutStyle === "compact" ? "selected" : ""}>Compact</option>
                <option value="showcase" ${state.profile.layoutStyle === "showcase" ? "selected" : ""}>Showcase</option>
              </select>
            </label>
          </div>
        </section>

        <section class="profile-side-stack">
          <section class="overlay-section">
            <p class="eyebrow">Studio Stats</p>
            <div class="stats-grid profile-stats-grid">
              <article class="stats-card"><span>Docs</span><strong>${stats.documents}</strong></article>
              <article class="stats-card"><span>Boards</span><strong>${stats.boards}</strong></article>
              <article class="stats-card"><span>Sheets</span><strong>${stats.sheets}</strong></article>
              <article class="stats-card"><span>Vaults Owned</span><strong>${stats.owned}</strong></article>
              <article class="stats-card"><span>Collaborations</span><strong>${stats.joined}</strong></article>
              <article class="stats-card"><span>Words</span><strong>${stats.words}</strong></article>
            </div>
          </section>

          <section class="overlay-section">
            <div class="overlay-section-header">
              <div>
                <p class="eyebrow">Profile Badges</p>
                <h3>Specializations</h3>
              </div>
              <div class="overlay-inline-actions">
                <button id="openFriendsButton" class="secondary-button compact-action-button" type="button"><span class="button-icon">◎</span><span>Friends</span></button>
                <button id="openMessagesButton" class="secondary-button compact-action-button" type="button"><span class="button-icon">✉</span><span>Messages</span></button>
              </div>
            </div>
            <div id="profileBadgeGrid" class="profile-badge-grid"></div>
          </section>

          <section class="overlay-section">
            <div class="overlay-section-header">
              <div>
                <p class="eyebrow">Portfolio Blocks</p>
                <h3>Profile structure</h3>
              </div>
              <button id="addProfileBlockButton" class="secondary-button" type="button">Add Block</button>
            </div>
            <div id="profileBlockList" class="profile-block-list"></div>
            <div class="profile-block-footnote">${blocks.length} active blocks</div>
          </section>
        </section>
      </section>
    </section>
  `;
  bindProfileOverlay();
  renderProfileBadges();
  renderProfileBlocks();
}

function bindProfileOverlay() {
  on("#changeAvatarButton", "click", () => openProfileMediaPicker("avatar"));
  on("#changeBannerButton", "click", () => openProfileMediaPicker("banner"));
  on("#copyProfileIdButton", "click", async () => {
    const id = state.profile.userId || "";
    try {
      await navigator.clipboard.writeText(id);
      showToast("Profile ID copied");
    } catch {
      showToast(id);
    }
  });
  bindProfileField("#profileNameInput", "name");
  bindProfileField("#profileRoleInput", "role");
  bindProfileField("#profileTaglineInput", "tagline");
  bindProfileField("#profileStatusInput", "status");
  bindProfileField("#profileBioInput", "bio");
  bindProfileField("#profileNoteInput", "note");
  bindProfileField("#profileAccentInput", "accent");
  bindProfileField("#profileThemeVariantInput", "themeVariant");
  bindProfileField("#profileLayoutStyleInput", "layoutStyle");
  on("#openFriendsButton", "click", () => openOverlay("friends"));
  on("#openMessagesButton", "click", () => openOverlay("messages"));
  on("#findProfileFriendButton", "click", findProfileFriendById);
  on("#findProfileFriendButtonInline", "click", findProfileFriendById);
  on("#addProfileBlockButton", "click", addProfileBlock);
}

function renderProfileBadges() {
  const host = $("#profileBadgeGrid");
  if (!host) return;
  const options = [
    "Game Designer",
    "Balancing Specialist",
    "Producer",
    "Technical Designer",
    "Narrative Designer",
    "Level Designer",
    "Systems Designer",
    "Economy Designer",
    "Combat Designer",
    "Quest Designer",
    "Worldbuilder",
    "UI Designer",
    "UX Designer",
    "VFX Artist",
    "Animator",
    "3D Artist",
    "Environment Artist",
    "Technical Artist",
    "Audio Designer",
    "Sound Designer",
    "Programmer",
    "Gameplay Programmer",
    "Tools Programmer",
    "QA Analyst",
    "Creative Director",
  ];
  host.innerHTML = "";
  options.forEach((badge) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile-badge-chip";
    if ((state.profile.badges || []).includes(badge)) button.classList.add("active");
    button.textContent = badge;
    button.addEventListener("click", () => toggleProfileBadge(badge));
    host.appendChild(button);
  });
}

function renderProfileBlocks() {
  const host = $("#profileBlockList");
  if (!host) return;
  host.innerHTML = "";
  (state.profile.blocks || []).forEach((block, index) => {
    const row = document.createElement("div");
    row.className = "profile-block-row";
    row.innerHTML = `
      <strong>${escape(block)}</strong>
      <div class="overlay-inline-actions">
        <button class="secondary-button compact-icon-button" type="button" data-profile-move-up="${index}" title="Move up">↑</button>
        <button class="secondary-button compact-icon-button" type="button" data-profile-move-down="${index}" title="Move down">↓</button>
        <button class="secondary-button compact-icon-button" type="button" data-profile-remove-block="${index}" title="Remove">×</button>
      </div>
    `;
    host.appendChild(row);
  });
  host.querySelectorAll("[data-profile-move-up]").forEach((button) => {
    button.addEventListener("click", () => moveProfileBlock(Number(button.dataset.profileMoveUp), -1));
  });
  host.querySelectorAll("[data-profile-move-down]").forEach((button) => {
    button.addEventListener("click", () => moveProfileBlock(Number(button.dataset.profileMoveDown), 1));
  });
  host.querySelectorAll("[data-profile-remove-block]").forEach((button) => {
    button.addEventListener("click", () => removeProfileBlock(Number(button.dataset.profileRemoveBlock)));
  });
}

function toggleProfileBadge(badge) {
  const active = new Set(state.profile.badges || []);
  if (active.has(badge)) active.delete(badge);
  else active.add(badge);
  state.profile.badges = [...active];
  save();
  renderProfileBadges();
}

function addProfileBlock() {
  const suggestions = ["About", "Skills", "Projects", "Portfolio", "Achievements", "Tools Used", "Social Links"];
  openModal({
    eyebrow: "Profile Block",
    title: "Add Portfolio Block",
    message: "Add a new visible block to your profile.",
    confirmLabel: "Add Block",
    inputValue: suggestions.find((entry) => !(state.profile.blocks || []).includes(entry)) || "",
    onConfirm: (value) => {
      const name = value.trim();
      if (!name) return false;
      if (!Array.isArray(state.profile.blocks)) state.profile.blocks = [];
      state.profile.blocks.push(name);
      save();
      renderProfileBlocks();
      showToast("Profile block added");
      return true;
    },
  });
}

function moveProfileBlock(index, direction) {
  const blocks = Array.isArray(state.profile.blocks) ? state.profile.blocks : [];
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return;
  [blocks[index], blocks[nextIndex]] = [blocks[nextIndex], blocks[index]];
  save();
  renderProfileBlocks();
}

function removeProfileBlock(index) {
  if (!Array.isArray(state.profile.blocks)) return;
  state.profile.blocks.splice(index, 1);
  save();
  renderProfileBlocks();
}

function bindProfileField(selector, key) {
  const node = $(selector);
  if (!node) return;
  const commit = (event) => {
    state.profile[key] = event.target.value;
    save();
    if (key === "name") {
      document.title = `${state.profile.name} - ${state.softwareName}`;
    }
  };
  node.addEventListener("input", commit);
  node.addEventListener("change", commit);
}

function renderSelectOptions(options, selectedValue) {
  return options
    .map((option) => `<option value="${escapeAttr(option)}" ${option === selectedValue ? "selected" : ""}>${escape(option)}</option>`)
    .join("");
}

function openProfileMediaPicker(target) {
  if (!els.profileImagePicker) return;
  profileMediaTarget = target;
  els.profileImagePicker.click();
}

function legacyRenderProfileFriendList() {
  const host = $("#profileFriendList");
  if (!host) return;
  host.innerHTML = "";
  const friends = Array.isArray(state.profile.friends) ? state.profile.friends : [];
  if (!friends.length) {
    host.innerHTML = `<div class="empty-state">No connections yet. Add teammates by ID to start building your network.</div>`;
    return;
  }
  friends.forEach((friend) => {
    const row = document.createElement("article");
    row.className = "friend-card friend-card-compact";
    row.innerHTML = `
      <div class="profile-friend-avatar ${friend.avatar ? "has-image" : ""}">
        ${friend.avatar ? `<img src="${escapeAttr(friend.avatar)}" alt="${escapeAttr(friend.name)} avatar" />` : `<span>${escape((friend.name?.[0] || "F").toUpperCase())}</span>`}
      </div>
      <div class="profile-friend-copy">
        <strong>${escape(friend.name)}</strong>
        <span>${escape(friend.role || "Collaborator")} | ${escape(friend.userId || "")}</span>
      </div>
      <div class="overlay-inline-actions">
        <button class="secondary-button compact-action-button" type="button" data-message-friend="${escapeAttr(friend.id)}"><span class="button-icon">✉</span><span>Message</span></button>
        <button class="secondary-button compact-icon-button" type="button" data-remove-friend="${escapeAttr(friend.id)}" title="Remove contact">×</button>
      </div>
    `;
    host.appendChild(row);
  });
  host.querySelectorAll("[data-message-friend]").forEach((button) => {
    button.addEventListener("click", () => {
      openDirectMessage(button.dataset.messageFriend);
      openOverlay("messages");
    });
  });
  host.querySelectorAll("[data-remove-friend]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.friends = state.profile.friends.filter((friend) => friend.id !== button.dataset.removeFriend);
      save();
      renderProfileFriendList();
      showToast("Connection removed");
    });
  });
}

function legacyFindProfileFriendById() {
  const input = $("#profileFriendSearchInput");
  if (!input) return;
  const query = input.value.trim().toUpperCase();
  if (!query) return;
  const existing = (state.profile.friends || []).find((friend) => String(friend.userId || "").toUpperCase() === query);
  if (existing) {
    showToast(`Found ${existing.name}`);
    return;
  }
  const created = {
    id: uid(),
    userId: query,
    name: `Contact ${query.slice(-4)}`,
    role: "Collaborator",
    status: "Invited",
    avatar: "",
  };
  if (!Array.isArray(state.profile.friends)) state.profile.friends = [];
  state.profile.friends.push(created);
  save();
  renderProfileFriendList();
  showToast("Contact added by ID");
}

function legacyAddMarketProfileAsFriend(profileId, openMessage = false) {
  const profile = (state.marketProfiles || []).find((entry) => entry.id === profileId);
  if (!profile) return;
  let friend = (state.profile.friends || []).find((entry) => entry.userId === profile.userId);
  if (!friend) {
    friend = {
      id: uid(),
      userId: profile.userId || randomUserId(),
      name: profile.nickname,
      role: profile.role,
      status: profile.availability,
      avatar: profile.avatar || "",
    };
    state.profile.friends = [...(state.profile.friends || []), friend];
    save();
    pushNotification("friend", "New market connection", `${profile.nickname} was added to your network.`);
  }
  if (openMessage) {
    openDirectMessage(friend.id);
    openOverlay("messages");
  } else {
    showToast("Developer added to friends");
  }
}

function openMarketComposer() {
  const existing = (state.marketProfiles || []).find((entry) => entry.userId === state.profile.userId);
  els.overlayCard?.classList.remove("overlay-card-chat", "overlay-card-profile");
  els.overlayCard?.classList.add("overlay-card-market");
  els.overlayPanel?.classList.remove("hidden");
  els.overlayEyebrow.textContent = "Developer Market";
  els.overlayTitle.textContent = existing ? "Edit Your Post" : "Create Your Post";
  const tags = (existing?.tags || state.profile.badges || []).join(", ");
  const tools = (existing?.tools || []).join(", ");
  els.overlayBody.innerHTML = `
    <section class="overlay-section market-compose-grid">
      <label class="profile-field">
        <span>Nickname</span>
        <input id="marketPostNicknameInput" class="modal-input" type="text" value="${escapeAttr(existing?.nickname || state.profile.name || "")}" />
      </label>
      <label class="profile-field">
        <span>Display Name</span>
        <input id="marketPostDisplayInput" class="modal-input" type="text" value="${escapeAttr(existing?.displayName || state.profile.name || "")}" />
      </label>
      <label class="profile-field">
        <span>Role</span>
        <input id="marketPostRoleInput" class="modal-input" type="text" value="${escapeAttr(existing?.role || state.profile.role || "")}" />
      </label>
      <label class="profile-field">
        <span>Experience</span>
        <select id="marketPostExperienceInput" class="modal-input">
          <option value="Junior" ${(existing?.experience || "") === "Junior" ? "selected" : ""}>Junior</option>
          <option value="Mid" ${(!existing || existing?.experience === "Mid") ? "selected" : ""}>Mid</option>
          <option value="Senior" ${existing?.experience === "Senior" ? "selected" : ""}>Senior</option>
          <option value="Lead" ${existing?.experience === "Lead" ? "selected" : ""}>Lead</option>
        </select>
      </label>
      <label class="profile-field">
        <span>Availability</span>
        <select id="marketPostAvailabilityInput" class="modal-input">
          <option value="Available for hire" ${(!existing || existing?.availability === "Available for hire") ? "selected" : ""}>Available for hire</option>
          <option value="Open to offers" ${existing?.availability === "Open to offers" ? "selected" : ""}>Open to offers</option>
          <option value="Not available" ${existing?.availability === "Not available" ? "selected" : ""}>Not available</option>
        </select>
      </label>
      <label class="profile-field">
        <span>Rate</span>
        <input id="marketPostRateInput" class="modal-input" type="text" value="${escapeAttr(existing?.rate || "")}" placeholder="$40/hr" />
      </label>
      <label class="profile-field market-compose-span">
        <span>Short Description</span>
        <textarea id="marketPostBioInput" class="modal-input profile-bio-input">${escape(existing?.bio || state.profile.bio || "")}</textarea>
      </label>
      <label class="profile-field">
        <span>Tags</span>
        <input id="marketPostTagsInput" class="modal-input" type="text" value="${escapeAttr(tags)}" placeholder="Game Designer, UI Designer" />
      </label>
      <label class="profile-field">
        <span>Tools</span>
        <input id="marketPostToolsInput" class="modal-input" type="text" value="${escapeAttr(tools)}" placeholder="ForgeBook, Roblox Studio, Figma" />
      </label>
      <div class="document-card-actions">
        <button id="saveMarketPostButton" class="primary-button" type="button">${existing ? "Update Post" : "Publish Post"}</button>
      </div>
    </section>
  `;
  on("#saveMarketPostButton", "click", () => {
    const payload = {
      id: existing?.id || uid(),
      userId: state.profile.userId,
      nickname: $("#marketPostNicknameInput")?.value.trim() || state.profile.name,
      displayName: $("#marketPostDisplayInput")?.value.trim() || state.profile.name,
      role: $("#marketPostRoleInput")?.value.trim() || state.profile.role || "Designer",
      experience: $("#marketPostExperienceInput")?.value || "Mid",
      availability: $("#marketPostAvailabilityInput")?.value || "Open to offers",
      rate: $("#marketPostRateInput")?.value.trim() || "Contact for rate",
      bio: $("#marketPostBioInput")?.value.trim() || state.profile.bio || "",
      tags: ($("#marketPostTagsInput")?.value || "").split(",").map((entry) => entry.trim()).filter(Boolean),
      tools: ($("#marketPostToolsInput")?.value || "").split(",").map((entry) => entry.trim()).filter(Boolean),
      portfolio: existing?.portfolio || [{ title: "Featured Work", description: "Portfolio entry" }],
      avatar: state.profile.avatar || "",
    };
    state.marketProfiles = (state.marketProfiles || []).filter((entry) => entry.userId !== state.profile.userId);
    state.marketProfiles.unshift(payload);
    save();
    pushNotification("market", "Market profile published", `${payload.nickname} is now visible in the market.`, {
      scopeType: "market",
      scopeId: payload.userId,
      groupLabel: "Your marketplace profile",
      actionLabel: "Open market",
      destination: { view: "market" },
    });
    closeOverlay();
    renderMarket();
    showToast(existing ? "Market post updated" : "Market post created");
  });
}

function legacyRenderFriendsOverlay() {
  els.overlayCard?.classList.remove("overlay-card-profile", "overlay-card-market");
  els.overlayCard?.classList.add("overlay-card-chat");
  els.overlayEyebrow.textContent = "Friends";
  els.overlayTitle.textContent = "Team Network";
  const friends = Array.isArray(state.profile.friends) ? state.profile.friends : [];
  const requests = Array.isArray(state.profile.friendRequests) ? state.profile.friendRequests : [];
  const sent = Array.isArray(state.profile.sentRequests) ? state.profile.sentRequests : [];
  const blocked = Array.isArray(state.profile.blockedUsers) ? state.profile.blockedUsers : [];
  els.overlayBody.innerHTML = `
    <section class="friends-shell friends-shell-${escapeAttr(friendsTab)}">
      <aside class="friends-sidebar overlay-section">
        <div class="overlay-section-header">
          <div>
            <p class="eyebrow">Find Users</p>
            <h3>Discover developers</h3>
          </div>
        </div>
        <label class="profile-field">
          <span>Search developers</span>
          <div class="overlay-inline-actions">
            <input id="friendsSearchInput" class="modal-input" type="text" placeholder="Search nickname or display name" value="${escapeAttr(friendsSearch)}" />
            <button id="friendsSearchButton" class="secondary-button" type="button">Find</button>
          </div>
        </label>
        <label class="profile-field">
          <span>Search by ID</span>
          <div class="overlay-inline-actions">
            <input id="friendsIdSearchInput" class="modal-input" type="text" placeholder="FG-1234-123456" />
            <button id="friendsIdSearchButton" class="secondary-button" type="button">Add</button>
          </div>
        </label>
        <div class="friends-micro-stats">
          <article class="stats-card"><span>Friends</span><strong>${friends.length}</strong></article>
          <article class="stats-card"><span>Requests</span><strong>${requests.length}</strong></article>
        </div>
        <div class="overlay-inline-actions friends-quick-actions">
          <button id="friendsOpenMessagesButton" class="secondary-button" type="button">Open Messages</button>
        </div>
      </aside>

      <section class="friends-main overlay-section">
        <div class="overlay-section-header">
          <div>
            <p class="eyebrow">Connections</p>
            <h3>Network</h3>
          </div>
          <div class="friends-count-badge">${friends.length} total</div>
        </div>
        <div class="friends-tabs">
          <button class="secondary-button ${friendsTab === "friends" ? "active" : ""}" type="button" data-friends-tab="friends">Friends</button>
          <button class="secondary-button ${friendsTab === "requests" ? "active" : ""}" type="button" data-friends-tab="requests">Requests</button>
          <button class="secondary-button ${friendsTab === "sent" ? "active" : ""}" type="button" data-friends-tab="sent">Sent Requests</button>
          <button class="secondary-button ${friendsTab === "blocked" ? "active" : ""}" type="button" data-friends-tab="blocked">Blocked</button>
        </div>
        <div id="friendsList" class="friends-list-grid"></div>
      </section>

      <section class="friends-requests overlay-section">
        <div class="overlay-section-header">
          <div>
            <p class="eyebrow">Requests</p>
            <h3>Incoming</h3>
          </div>
        </div>
        <div id="friendRequestList" class="friends-request-list"></div>
        <div class="friends-side-footnote">Sent: ${sent.length} • Blocked: ${blocked.length}</div>
      </section>
    </section>
  `;
  document.querySelectorAll("[data-friends-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      friendsTab = button.dataset.friendsTab;
      renderFriendsOverlay();
    });
  });
  on("#friendsSearchInput", "input", (event) => {
    friendsSearch = event.target.value.trim().toLowerCase();
    renderFriendRows();
  });
  on("#friendsOpenMessagesButton", "click", () => openOverlay("messages"));
  on("#friendsSearchButton", "click", () => {
    renderFriendRows();
  });
  on("#friendsIdSearchButton", "click", () => {
    const input = $("#friendsIdSearchInput");
    if (!input) return;
    const query = input.value.trim().toUpperCase();
    if (!query) return;
    const request = {
      id: uid(),
      userId: query,
      name: `Contact ${query.slice(-4)}`,
      role: "Collaborator",
      status: "Pending",
      avatar: "",
    };
    state.profile.sentRequests = [request, ...(state.profile.sentRequests || []).filter((entry) => entry.userId !== query)];
    save();
    pushNotification("friend", "Friend request sent", `Invite sent to ${query}.`);
    renderFriendsOverlay();
  });
  renderFriendRows();
}

function legacyRenderFriendRows() {
  const friendsHost = $("#friendsList");
  const requestHost = $("#friendRequestList");
  if (friendsHost) friendsHost.innerHTML = "";
  if (requestHost) requestHost.innerHTML = "";
  const filteredFriends = (state.profile.friends || []).filter((friend) => {
    if (!friendsSearch) return true;
    return [friend.name, friend.role, friend.userId].join(" ").toLowerCase().includes(friendsSearch);
  });
  if (friendsTab === "friends") filteredFriends.forEach((friend) => {
    const row = document.createElement("article");
    row.className = "friend-card";
    row.innerHTML = `
      <div class="friend-card-head">
        <div class="profile-friend-avatar ${friend.avatar ? "has-image" : ""}">
          ${friend.avatar ? `<img src="${escapeAttr(friend.avatar)}" alt="${escapeAttr(friend.name)} avatar" />` : `<span>${escape((friend.name?.[0] || "F").toUpperCase())}</span>`}
        </div>
        <div class="profile-friend-copy">
          <strong>${escape(friend.name)}</strong>
          <span>${escape(friend.role || "Collaborator")}</span>
        </div>
      </div>
      <div class="friend-card-meta">
        <span>${escape(friend.status || "Online")}</span>
        <span>${escape(friend.userId || "")}</span>
      </div>
      <div class="overlay-inline-actions friend-card-actions">
        <button class="secondary-button compact-action-button" type="button" data-friend-message="${escapeAttr(friend.id)}">Message</button>
        <button class="secondary-button compact-action-button" type="button" data-friend-remove="${escapeAttr(friend.id)}">Remove</button>
        <button class="secondary-button compact-action-button" type="button" data-friend-block="${escapeAttr(friend.id)}">Block</button>
      </div>
    `;
    friendsHost?.appendChild(row);
  });
  if (friendsTab === "requests") (state.profile.friendRequests || []).forEach((request) => {
    const row = document.createElement("article");
    row.className = "profile-friend-row";
    row.innerHTML = `
      <div class="friend-card-head">
        <div class="profile-friend-avatar"><span>${escape((request.name?.[0] || "R").toUpperCase())}</span></div>
        <div class="profile-friend-copy">
          <strong>${escape(request.name)}</strong>
          <span>${escape(request.userId || "")}</span>
        </div>
      </div>
      <div class="overlay-inline-actions friend-card-actions">
        <button class="secondary-button compact-action-button" type="button" data-request-accept="${escapeAttr(request.id)}">Accept</button>
        <button class="secondary-button compact-action-button" type="button" data-request-decline="${escapeAttr(request.id)}">Decline</button>
      </div>
    `;
    requestHost?.appendChild(row);
  });
  if (friendsTab === "sent") {
    friendsHost.innerHTML = (state.profile.sentRequests || []).map((request) => `
      <article class="profile-friend-row">
        <div class="profile-friend-avatar"><span>${escape((request.name?.[0] || "S").toUpperCase())}</span></div>
        <div class="profile-friend-copy">
          <strong>${escape(request.name)}</strong>
          <span>Sent request • ${escape(request.userId || "")}</span>
        </div>
      </article>
    `).join("") || `<div class="empty-state">No sent requests.</div>`;
  }
  if (friendsTab === "blocked") {
    friendsHost.innerHTML = (state.profile.blockedUsers || []).map((entry) => `
      <article class="profile-friend-row">
        <div class="profile-friend-avatar"><span>B</span></div>
        <div class="profile-friend-copy">
          <strong>${escape(entry)}</strong>
          <span>Blocked user</span>
        </div>
      </article>
    `).join("") || `<div class="empty-state">No blocked users.</div>`;
  }
  if (friendsTab !== "requests" && requestHost) {
    requestHost.innerHTML = `<div class="empty-state">Switch to Requests to manage incoming invites.</div>`;
  }
  if (friendsTab === "friends" && !filteredFriends.length && friendsHost) {
    friendsHost.innerHTML = `<div class="empty-state">No friends match this search.</div>`;
  }
  document.querySelectorAll("[data-friend-message]").forEach((button) => {
    button.addEventListener("click", () => {
      openDirectMessage(button.dataset.friendMessage);
      openOverlay("messages");
    });
  });
  document.querySelectorAll("[data-friend-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.friends = (state.profile.friends || []).filter((friend) => friend.id !== button.dataset.friendRemove);
      save();
      pushNotification("friend", "Connection removed", "A collaborator was removed from your network.");
      renderFriendsOverlay();
    });
  });
  document.querySelectorAll("[data-friend-block]").forEach((button) => {
    button.addEventListener("click", () => {
      const blocked = (state.profile.friends || []).find((friend) => friend.id === button.dataset.friendBlock);
      if (blocked) state.profile.blockedUsers = [...new Set([...(state.profile.blockedUsers || []), blocked.userId])];
      state.profile.friends = (state.profile.friends || []).filter((friend) => friend.id !== button.dataset.friendBlock);
      save();
      pushNotification("friend", "User blocked", blocked?.name || "Blocked user");
      renderFriendsOverlay();
    });
  });
  document.querySelectorAll("[data-request-accept]").forEach((button) => {
    button.addEventListener("click", () => {
      const request = (state.profile.friendRequests || []).find((entry) => entry.id === button.dataset.requestAccept);
      if (!request) return;
      state.profile.friends = [...(state.profile.friends || []), { ...request, status: "Online" }];
      state.profile.friendRequests = (state.profile.friendRequests || []).filter((entry) => entry.id !== request.id);
      save();
      pushNotification("friend", "Friend request accepted", `${request.name} is now in your network.`);
      renderFriendsOverlay();
    });
  });
  document.querySelectorAll("[data-request-decline]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.friendRequests = (state.profile.friendRequests || []).filter((entry) => entry.id !== button.dataset.requestDecline);
      save();
      renderFriendsOverlay();
    });
  });
}

function createFriendProfile(seed = {}) {
  const displayName = seed.displayName || seed.name || `Developer ${String(seed.userId || "").slice(-4) || "0000"}`;
  const role = seed.role || "Collaborator";
  const status = seed.status || "Available for collaboration";
  const baseBadges = Array.isArray(seed.badges) && seed.badges.length ? seed.badges : [role];
  return {
    id: seed.id || uid(),
    userId: seed.userId || randomUserId(),
    name: seed.name || displayName,
    displayName,
    nickname: seed.nickname || displayName,
    role,
    status,
    availability: seed.availability || status,
    avatar: seed.avatar || "",
    banner: seed.banner || "",
    bio: seed.bio || `${displayName} works across design, collaboration, and production inside ForgeBook.`,
    tagline: seed.tagline || `${role} | ${status}`,
    note: seed.note || "",
    badges: baseBadges,
    blocks: Array.isArray(seed.blocks) && seed.blocks.length ? seed.blocks : ["About", "Skills", "Projects"],
    skills: Array.isArray(seed.skills) && seed.skills.length ? seed.skills : baseBadges,
    socialLinks: Array.isArray(seed.socialLinks) ? seed.socialLinks : [],
    memberSince: seed.memberSince || "Recently joined",
  };
}

function openFriendProfileOverlay(profileId, source = "friends") {
  const entry =
    (state.profile.friends || []).find((friend) => friend.id === profileId || friend.userId === profileId) ||
    (state.profile.friendRequests || []).find((friend) => friend.id === profileId || friend.userId === profileId) ||
    (state.profile.sentRequests || []).find((friend) => friend.id === profileId || friend.userId === profileId);
  if (!entry) return;
  const profile = createFriendProfile(entry);
  const mutualFriends = (state.profile.friends || []).filter((friend) => friend.id !== profile.id).slice(0, 12);
  const isExistingFriend = (state.profile.friends || []).some((friend) => friend.id === profile.id || friend.userId === profile.userId);
  const isIncomingRequest = (state.profile.friendRequests || []).some((friend) => friend.id === profile.id || friend.userId === profile.userId);
  els.overlayCard?.classList.remove("overlay-card-chat", "overlay-card-market");
  els.overlayCard?.classList.add("overlay-card-profile");
  els.overlayEyebrow.textContent = source === "profile" ? "Connection" : "Friend";
  els.overlayTitle.textContent = profile.displayName || profile.name;
  els.overlayBody.innerHTML = `
    <section class="friend-profile-shell">
      <section class="friend-profile-main overlay-section">
        <div class="friend-profile-banner" style="${profile.banner ? `background-image:url('${escapeAttr(profile.banner)}')` : ""}"></div>
        <div class="friend-profile-hero">
          <div class="friend-profile-avatar ${profile.avatar ? "has-image" : ""}">
            ${profile.avatar ? `<img src="${escapeAttr(profile.avatar)}" alt="${escapeAttr(profile.name)} avatar" />` : `<span>${escape((profile.name?.[0] || "F").toUpperCase())}</span>`}
          </div>
          <div class="friend-profile-copy">
            <h3>${escape(profile.displayName || profile.name)}</h3>
            <p>${escape(profile.role)} | ${escape(profile.status)}</p>
            <span class="friend-profile-id">${escape(profile.userId || "")}</span>
            <p class="profile-bio-preview">${escape(profile.tagline || "")}</p>
          </div>
          <div class="overlay-inline-actions friend-profile-actions">
            <button class="secondary-button compact-action-button" type="button" data-friend-profile-message="${escapeAttr(profile.id)}"><span class="button-icon">✉</span><span>Message</span></button>
            ${isIncomingRequest ? `<button class="secondary-button compact-action-button" type="button" data-friend-profile-accept="${escapeAttr(profile.id)}"><span class="button-icon">+</span><span>Accept</span></button>` : ""}
            ${!isExistingFriend && !isIncomingRequest ? `<button class="secondary-button compact-action-button" type="button" data-friend-profile-request="${escapeAttr(profile.id)}"><span class="button-icon">◉</span><span>Request</span></button>` : ""}
          </div>
        </div>
        <div class="friend-profile-body">
          <section class="friend-profile-section">
            <p class="eyebrow">About</p>
            <p>${escape(profile.bio || "No public bio added yet.")}</p>
          </section>
          <section class="friend-profile-section">
            <p class="eyebrow">Specializations</p>
            <div class="friend-profile-chip-grid">
              ${(profile.badges || []).map((badge) => `<span class="profile-badge-chip active readonly">${escape(badge)}</span>`).join("")}
            </div>
          </section>
          <section class="friend-profile-section">
            <p class="eyebrow">Visible Blocks</p>
            <div class="friend-profile-blocks">
              ${(profile.blocks || []).map((block) => `<div class="profile-block-row readonly"><strong>${escape(block)}</strong></div>`).join("")}
            </div>
          </section>
        </div>
      </section>
      <aside class="friend-profile-side overlay-section">
        <div class="overlay-section-header">
          <div>
            <p class="eyebrow">Network</p>
            <h3>Mutual Connections</h3>
          </div>
          <div class="friends-count-badge">${mutualFriends.length}</div>
        </div>
        <div class="friends-request-list">
          ${mutualFriends.length ? mutualFriends.map((friend) => `
            <article class="profile-friend-row readonly">
              <div class="profile-friend-avatar ${friend.avatar ? "has-image" : ""}">
                ${friend.avatar ? `<img src="${escapeAttr(friend.avatar)}" alt="${escapeAttr(friend.name)} avatar" />` : `<span>${escape((friend.name?.[0] || "F").toUpperCase())}</span>`}
              </div>
              <div class="profile-friend-copy">
                <strong>${escape(friend.name)}</strong>
                <span>${escape(friend.role || "Collaborator")}</span>
              </div>
            </article>
          `).join("") : `<div class="empty-state">No mutual connections yet.</div>`}
        </div>
      </aside>
    </section>
  `;
  document.querySelectorAll("[data-friend-profile-message]").forEach((button) => {
    button.addEventListener("click", () => {
      const pending = (state.profile.friendRequests || []).find((entry) => entry.id === button.dataset.friendProfileMessage || entry.userId === button.dataset.friendProfileMessage);
      if (pending && !(state.profile.friends || []).some((friend) => friend.userId === pending.userId)) {
        state.profile.friends = [...(state.profile.friends || []), { ...pending, status: "Online" }];
        state.profile.friendRequests = (state.profile.friendRequests || []).filter((entry) => entry.id !== pending.id);
        save();
      }
      openDirectMessage(button.dataset.friendProfileMessage);
      openOverlay("messages");
    });
  });
  document.querySelectorAll("[data-friend-profile-accept]").forEach((button) => {
    button.addEventListener("click", () => {
      const request = (state.profile.friendRequests || []).find((entry) => entry.id === button.dataset.friendProfileAccept || entry.userId === button.dataset.friendProfileAccept);
      if (!request) return;
      state.profile.friends = [...(state.profile.friends || []), { ...request, status: "Online" }];
      state.profile.friendRequests = (state.profile.friendRequests || []).filter((entry) => entry.id !== request.id);
      state.profile.sentRequests = (state.profile.sentRequests || []).filter((entry) => entry.userId !== request.userId);
      save();
      pushNotification("friend", "Friend request accepted", `${request.name} is now in your network.`);
      openFriendProfileOverlay(request.id, "friends");
    });
  });
  document.querySelectorAll("[data-friend-profile-request]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.sentRequests = [profile, ...(state.profile.sentRequests || []).filter((entry) => entry.userId !== profile.userId)];
      save();
      pushNotification("friend", "Friend request sent", `Invite sent to ${profile.name}.`);
      showToast("Request sent");
      openFriendProfileOverlay(profile.id, "friends");
    });
  });
}

function renderProfileFriendList() {
  const host = $("#profileFriendList");
  if (!host) return;
  host.innerHTML = "";
  const friends = Array.isArray(state.profile.friends) ? state.profile.friends : [];
  if (!friends.length) {
    host.innerHTML = `<div class="empty-state">No connections yet. Add teammates by ID to start building your network.</div>`;
    return;
  }
  friends.forEach((friend) => {
    const row = document.createElement("article");
    row.className = "friend-card friend-card-compact";
    row.innerHTML = `
      <div class="profile-friend-avatar ${friend.avatar ? "has-image" : ""}">
        ${friend.avatar ? `<img src="${escapeAttr(friend.avatar)}" alt="${escapeAttr(friend.name)} avatar" />` : `<span>${escape((friend.name?.[0] || "F").toUpperCase())}</span>`}
      </div>
      <div class="profile-friend-copy">
        <strong>${escape(friend.name)}</strong>
        <span>${escape(friend.role || "Collaborator")} | ${escape(friend.userId || "")}</span>
      </div>
      <div class="overlay-inline-actions">
        <button class="secondary-button compact-action-button" type="button" data-view-friend-profile="${escapeAttr(friend.id)}"><span class="button-icon">◉</span><span>Profile</span></button>
        <button class="secondary-button compact-action-button" type="button" data-message-friend="${escapeAttr(friend.id)}"><span class="button-icon">✉</span><span>Message</span></button>
        <button class="secondary-button compact-icon-button" type="button" data-remove-friend="${escapeAttr(friend.id)}" title="Remove contact">×</button>
      </div>
    `;
    host.appendChild(row);
  });
  host.querySelectorAll("[data-view-friend-profile]").forEach((button) => {
    button.addEventListener("click", () => openFriendProfileOverlay(button.dataset.viewFriendProfile, "profile"));
  });
  host.querySelectorAll("[data-message-friend]").forEach((button) => {
    button.addEventListener("click", () => {
      openDirectMessage(button.dataset.messageFriend);
      openOverlay("messages");
    });
  });
  host.querySelectorAll("[data-remove-friend]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.friends = state.profile.friends.filter((friend) => friend.id !== button.dataset.removeFriend);
      save();
      renderProfileFriendList();
      showToast("Connection removed");
    });
  });
}

function findProfileFriendById() {
  const input = $("#profileFriendSearchInput");
  if (!input) return;
  const query = input.value.trim().toUpperCase();
  if (!query) return;
  const existing = (state.profile.friends || []).find((friend) => String(friend.userId || "").toUpperCase() === query);
  if (existing) {
    showToast(`Found ${existing.name}`);
    return;
  }
  const created = createFriendProfile({
    userId: query,
    name: `Contact ${query.slice(-4)}`,
    role: "Collaborator",
    status: "Pending request",
  });
  state.profile.sentRequests = [created, ...(state.profile.sentRequests || []).filter((entry) => entry.userId !== query)];
  save();
  renderProfileFriendList();
  pushNotification("friend", "Friend request sent", `Invite sent to ${query}.`);
  showToast("Request sent by ID");
}

function addMarketProfileAsFriend(profileId, openMessage = false) {
  const profile = (state.marketProfiles || []).find((entry) => entry.id === profileId);
  if (!profile) return;
  let friend = (state.profile.friends || []).find((entry) => entry.userId === profile.userId);
  if (!friend) {
    friend = createFriendProfile({
      userId: profile.userId || randomUserId(),
      name: profile.nickname,
      displayName: profile.displayName || profile.nickname,
      nickname: profile.nickname,
      role: profile.role,
      status: profile.availability,
      availability: profile.availability,
      avatar: profile.avatar || "",
      banner: profile.banner || "",
      bio: profile.bio || "",
      badges: profile.tags || [],
      skills: profile.tools || [],
    });
    if (!openMessage) {
      state.profile.sentRequests = [friend, ...(state.profile.sentRequests || []).filter((entry) => entry.userId !== friend.userId)];
      save();
      pushNotification("friend", "Friend request sent", `Invite sent to ${profile.nickname}.`);
      showToast("Request sent");
      return;
    }
    state.profile.friends = [...(state.profile.friends || []), friend];
    save();
    pushNotification("friend", "New market connection", `${profile.nickname} was added to your network.`);
  }
  if (openMessage) {
    openDirectMessage(friend.id);
    openOverlay("messages");
  } else {
    showToast("Developer added to friends");
  }
}

function renderFriendsOverlay() {
  els.overlayCard?.classList.remove("overlay-card-profile", "overlay-card-market");
  els.overlayCard?.classList.add("overlay-card-chat");
  els.overlayEyebrow.textContent = "Friends";
  els.overlayTitle.textContent = "Team Network";
  const friends = Array.isArray(state.profile.friends) ? state.profile.friends : [];
  const requests = Array.isArray(state.profile.friendRequests) ? state.profile.friendRequests : [];
  const sent = Array.isArray(state.profile.sentRequests) ? state.profile.sentRequests : [];
  const blocked = Array.isArray(state.profile.blockedUsers) ? state.profile.blockedUsers : [];
  els.overlayBody.innerHTML = `
    <section class="friends-shell">
      <aside class="friends-sidebar overlay-section">
        <div class="overlay-section-header">
          <div>
            <p class="eyebrow">Find Users</p>
            <h3>Discover developers</h3>
          </div>
        </div>
        <label class="profile-field">
          <span>Search developers</span>
          <div class="overlay-inline-actions">
            <input id="friendsSearchInput" class="modal-input" type="text" placeholder="Search nickname or display name" value="${escapeAttr(friendsSearch)}" />
            <button id="friendsSearchButton" class="secondary-button" type="button">Find</button>
          </div>
        </label>
        <label class="profile-field">
          <span>Search by ID</span>
          <div class="overlay-inline-actions">
            <input id="friendsIdSearchInput" class="modal-input" type="text" placeholder="FG-1234-123456" />
            <button id="friendsIdSearchButton" class="secondary-button" type="button">Add</button>
          </div>
        </label>
        <div class="friends-micro-stats">
          <article class="stats-card"><span>Friends</span><strong>${friends.length}</strong></article>
          <article class="stats-card"><span>Requests</span><strong>${requests.length}</strong></article>
        </div>
        <div class="overlay-inline-actions friends-quick-actions">
          <button id="friendsOpenMessagesButton" class="secondary-button" type="button">Open Messages</button>
        </div>
      </aside>

      <section class="friends-main overlay-section">
        <div class="overlay-section-header">
          <div>
            <p class="eyebrow">Connections</p>
            <h3>Network</h3>
          </div>
          <div class="friends-count-badge">${friends.length} total</div>
        </div>
        <div class="friends-tabs">
          <button class="secondary-button ${friendsTab === "friends" ? "active" : ""}" type="button" data-friends-tab="friends">Friends</button>
          <button class="secondary-button ${friendsTab === "requests" ? "active" : ""}" type="button" data-friends-tab="requests">Requests</button>
          <button class="secondary-button ${friendsTab === "sent" ? "active" : ""}" type="button" data-friends-tab="sent">Sent Requests</button>
          <button class="secondary-button ${friendsTab === "blocked" ? "active" : ""}" type="button" data-friends-tab="blocked">Blocked</button>
        </div>
        <div id="friendsList" class="friends-list-grid"></div>
      </section>

      <section class="friends-requests overlay-section">
        <div class="overlay-section-header">
          <div>
            <p class="eyebrow">Requests</p>
            <h3>Incoming</h3>
          </div>
        </div>
        <div id="friendRequestList" class="friends-request-list"></div>
        <div class="friends-side-footnote">Sent: ${sent.length} • Blocked: ${blocked.length}</div>
      </section>
    </section>
  `;
  document.querySelectorAll("[data-friends-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      friendsTab = button.dataset.friendsTab;
      renderFriendsOverlay();
    });
  });
  on("#friendsSearchInput", "input", (event) => {
    friendsSearch = event.target.value.trim().toLowerCase();
    renderFriendRows();
  });
  on("#friendsOpenMessagesButton", "click", () => openOverlay("messages"));
  on("#friendsSearchButton", "click", () => {
    renderFriendRows();
  });
  on("#friendsIdSearchButton", "click", () => {
    const input = $("#friendsIdSearchInput");
    if (!input) return;
    const query = input.value.trim().toUpperCase();
    if (!query) return;
    const request = createFriendProfile({
      userId: query,
      name: `Contact ${query.slice(-4)}`,
      role: "Collaborator",
      status: "Pending request",
    });
    state.profile.sentRequests = [request, ...(state.profile.sentRequests || []).filter((entry) => entry.userId !== query)];
    save();
    pushNotification("friend", "Friend request sent", `Invite sent to ${query}.`);
    friendsTab = "sent";
    renderFriendsOverlay();
  });
  renderFriendRows();
}

function renderFriendRows() {
  const friendsHost = $("#friendsList");
  const requestHost = $("#friendRequestList");
  if (friendsHost) friendsHost.innerHTML = "";
  if (requestHost) requestHost.innerHTML = "";
  const filteredFriends = (state.profile.friends || []).filter((friend) => {
    if (!friendsSearch) return true;
    return [friend.name, friend.role, friend.userId].join(" ").toLowerCase().includes(friendsSearch);
  });
  if (friendsTab === "friends") filteredFriends.forEach((friend) => {
    const row = document.createElement("article");
    row.className = "friend-card";
    row.innerHTML = `
      <div class="friend-card-head">
        <div class="profile-friend-avatar ${friend.avatar ? "has-image" : ""}">
          ${friend.avatar ? `<img src="${escapeAttr(friend.avatar)}" alt="${escapeAttr(friend.name)} avatar" />` : `<span>${escape((friend.name?.[0] || "F").toUpperCase())}</span>`}
        </div>
        <div class="profile-friend-copy">
          <strong>${escape(friend.name)}</strong>
          <span>${escape(friend.role || "Collaborator")}</span>
        </div>
      </div>
      <div class="friend-card-meta">
        <span>${escape(friend.status || "Online")}</span>
        <span>${escape(friend.userId || "")}</span>
      </div>
      <div class="overlay-inline-actions friend-card-actions">
        <button class="secondary-button compact-action-button" type="button" data-friend-view="${escapeAttr(friend.id)}">Profile</button>
        <button class="secondary-button compact-action-button" type="button" data-friend-message="${escapeAttr(friend.id)}">Message</button>
        <button class="secondary-button compact-action-button" type="button" data-friend-remove="${escapeAttr(friend.id)}">Remove</button>
        <button class="secondary-button compact-action-button" type="button" data-friend-block="${escapeAttr(friend.id)}">Block</button>
      </div>
    `;
    row.addEventListener("click", () => openFriendProfileOverlay(friend.id, "friends"));
    friendsHost?.appendChild(row);
  });
  if (friendsTab === "requests") (state.profile.friendRequests || []).forEach((request) => {
    const row = document.createElement("article");
    row.className = "profile-friend-row";
    row.innerHTML = `
      <div class="friend-card-head">
        <div class="profile-friend-avatar ${request.avatar ? "has-image" : ""}">
          ${request.avatar ? `<img src="${escapeAttr(request.avatar)}" alt="${escapeAttr(request.name)} avatar" />` : `<span>${escape((request.name?.[0] || "R").toUpperCase())}</span>`}
        </div>
        <div class="profile-friend-copy">
          <strong>${escape(request.name)}</strong>
          <span>${escape(request.userId || "")}</span>
        </div>
      </div>
      <div class="overlay-inline-actions friend-card-actions">
        <button class="secondary-button compact-action-button" type="button" data-request-view="${escapeAttr(request.id)}">Profile</button>
        <button class="secondary-button compact-action-button" type="button" data-request-accept="${escapeAttr(request.id)}">Accept</button>
        <button class="secondary-button compact-action-button" type="button" data-request-decline="${escapeAttr(request.id)}">Decline</button>
      </div>
    `;
    row.addEventListener("click", () => openFriendProfileOverlay(request.id, "requests"));
    if (friendsHost) {
      const mirror = row.cloneNode(true);
      mirror.addEventListener("click", () => openFriendProfileOverlay(request.id, "requests"));
      friendsHost.appendChild(mirror);
    }
    requestHost?.appendChild(row);
  });
  if (friendsTab === "sent") {
    friendsHost.innerHTML = (state.profile.sentRequests || []).map((request) => `
      <article class="profile-friend-row">
        <div class="profile-friend-avatar ${request.avatar ? "has-image" : ""}">
          ${request.avatar ? `<img src="${escapeAttr(request.avatar)}" alt="${escapeAttr(request.name)} avatar" />` : `<span>${escape((request.name?.[0] || "S").toUpperCase())}</span>`}
        </div>
        <div class="profile-friend-copy">
          <strong>${escape(request.name)}</strong>
          <span>Sent request • ${escape(request.userId || "")}</span>
        </div>
        <div class="overlay-inline-actions friend-card-actions">
          <button class="secondary-button compact-action-button" type="button" data-sent-view="${escapeAttr(request.id)}">Profile</button>
          <button class="secondary-button compact-action-button" type="button" data-sent-cancel="${escapeAttr(request.id)}">Cancel</button>
        </div>
      </article>
    `).join("") || `<div class="empty-state">No sent requests.</div>`;
  }
  if (friendsTab === "blocked") {
    friendsHost.innerHTML = (state.profile.blockedUsers || []).map((entry) => `
      <article class="profile-friend-row">
        <div class="profile-friend-avatar"><span>B</span></div>
        <div class="profile-friend-copy">
          <strong>${escape(entry)}</strong>
          <span>Blocked user</span>
        </div>
      </article>
    `).join("") || `<div class="empty-state">No blocked users.</div>`;
  }
  if (friendsTab === "requests" && !(state.profile.friendRequests || []).length && friendsHost) {
    friendsHost.innerHTML = `<div class="empty-state">No incoming friend requests.</div>`;
  }
  if (friendsTab !== "requests" && requestHost) {
    requestHost.innerHTML = `<div class="empty-state">Switch to Requests to manage incoming invites.</div>`;
  }
  if (friendsTab === "friends" && !filteredFriends.length && friendsHost) {
    friendsHost.innerHTML = `<div class="empty-state">No friends match this search.</div>`;
  }
  document.querySelectorAll("[data-friend-view]").forEach((button) => {
    button.addEventListener("click", () => openFriendProfileOverlay(button.dataset.friendView, "friends"));
  });
  document.querySelectorAll("[data-request-view]").forEach((button) => {
    button.addEventListener("click", () => openFriendProfileOverlay(button.dataset.requestView, "requests"));
  });
  document.querySelectorAll("[data-sent-view]").forEach((button) => {
    button.addEventListener("click", () => openFriendProfileOverlay(button.dataset.sentView, "sent"));
  });
  document.querySelectorAll("[data-friend-message]").forEach((button) => {
    button.addEventListener("click", () => {
      openDirectMessage(button.dataset.friendMessage);
      openOverlay("messages");
    });
  });
  document.querySelectorAll("[data-friend-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.friends = (state.profile.friends || []).filter((friend) => friend.id !== button.dataset.friendRemove);
      save();
      pushNotification("friend", "Connection removed", "A collaborator was removed from your network.");
      renderFriendsOverlay();
    });
  });
  document.querySelectorAll("[data-friend-block]").forEach((button) => {
    button.addEventListener("click", () => {
      const blocked = (state.profile.friends || []).find((friend) => friend.id === button.dataset.friendBlock);
      if (blocked) state.profile.blockedUsers = [...new Set([...(state.profile.blockedUsers || []), blocked.userId])];
      state.profile.friends = (state.profile.friends || []).filter((friend) => friend.id !== button.dataset.friendBlock);
      save();
      pushNotification("friend", "User blocked", blocked?.name || "Blocked user");
      renderFriendsOverlay();
    });
  });
  document.querySelectorAll("[data-request-accept]").forEach((button) => {
    button.addEventListener("click", () => {
      const request = (state.profile.friendRequests || []).find((entry) => entry.id === button.dataset.requestAccept);
      if (!request) return;
      state.profile.friends = [...(state.profile.friends || []), { ...request, status: "Online" }];
      state.profile.friendRequests = (state.profile.friendRequests || []).filter((entry) => entry.id !== request.id);
      state.profile.sentRequests = (state.profile.sentRequests || []).filter((entry) => entry.userId !== request.userId);
      save();
      pushNotification("friend", "Friend request accepted", `${request.name} is now in your network.`);
      renderFriendsOverlay();
    });
  });
  document.querySelectorAll("[data-request-decline]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.friendRequests = (state.profile.friendRequests || []).filter((entry) => entry.id !== button.dataset.requestDecline);
      save();
      renderFriendsOverlay();
    });
  });
  document.querySelectorAll("[data-sent-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      state.profile.sentRequests = (state.profile.sentRequests || []).filter((entry) => entry.id !== button.dataset.sentCancel);
      save();
      showToast("Request cancelled");
      renderFriendsOverlay();
    });
  });
}

function renderNotificationsOverlay() {
  els.overlayCard?.classList.remove("overlay-card-profile", "overlay-card-market");
  els.overlayCard?.classList.add("overlay-card-chat");
  els.overlayEyebrow.textContent = "Notifications";
  els.overlayTitle.textContent = "Notification Center";
  pruneNotifications();
  const notifications = (state.notifications || [])
    .filter((entry) => !isMutedNotification(entry))
    .slice()
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const tab = window.__forgebookNotificationTab || "all";
  const filtered = notifications.filter((entry) => {
    if (tab === "all") return true;
    if (tab === "teams") return entry.category === "team";
    if (tab === "market") return entry.category === "market";
    if (tab === "system") return entry.category === "system";
    return true;
  });
  const unreadCount = notifications.filter((entry) => !entry.read).length;
  const tabCounts = {
    all: notifications.length,
    teams: notifications.filter((entry) => entry.category === "team").length,
    market: notifications.filter((entry) => entry.category === "market").length,
    system: notifications.filter((entry) => entry.category === "system").length,
  };
  const grouped = filtered.reduce((acc, entry) => {
    const key = entry.groupLabel || (entry.category === "team" ? "Team updates" : entry.category === "market" ? "Marketplace" : "System");
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});
  els.overlayBody.innerHTML = `
    <section class="overlay-section notifications-shell">
      <div class="overlay-section-header">
        <div>
          <p class="eyebrow">High-signal only</p>
          <h3>Important updates</h3>
          <p class="overlay-muted-copy">${unreadCount ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "Everything is caught up."}</p>
        </div>
        <div class="notifications-toolbar-actions">
          <button id="markAllNotificationsReadButton" class="secondary-button" type="button">Mark all read</button>
          <button id="clearReadNotificationsButton" class="secondary-button" type="button">Clear read</button>
        </div>
      </div>
      <div class="friends-tabs notification-tabs">
        <button class="secondary-button ${tab === "all" ? "active" : ""}" type="button" data-notification-tab="all">All <span>${tabCounts.all}</span></button>
        <button class="secondary-button ${tab === "teams" ? "active" : ""}" type="button" data-notification-tab="teams">Teams <span>${tabCounts.teams}</span></button>
        <button class="secondary-button ${tab === "market" ? "active" : ""}" type="button" data-notification-tab="market">Marketplace <span>${tabCounts.market}</span></button>
        <button class="secondary-button ${tab === "system" ? "active" : ""}" type="button" data-notification-tab="system">System <span>${tabCounts.system}</span></button>
      </div>
      <div id="notificationList" class="notification-list"></div>
    </section>
  `;
  const host = $("#notificationList");
  if (host) {
    host.innerHTML = filtered.length
      ? Object.entries(grouped).map(([groupName, items]) => `
        <section class="notification-group">
          <div class="notification-group-header">
            <strong>${escape(groupName)}</strong>
            <span>${items.length} item${items.length === 1 ? "" : "s"}</span>
          </div>
          <div class="notification-group-list">
            ${items.map((entry) => `
              <article class="notification-row ${entry.read ? "" : "unread"}" data-notification-id="${escapeAttr(entry.id)}">
                <div class="notification-leading">
                  <span class="notification-icon notification-icon-${escapeAttr(entry.category)}">${escape(notificationIcon(entry.category))}</span>
                </div>
                <div class="notification-copy">
                  <div class="notification-head">
                    <strong>${escape(entry.title || "Update")}</strong>
                    <span>${escape(formatRelativeTime(entry.createdAt || Date.now()))}</span>
                  </div>
                  <p>${escape(entry.body || "")}</p>
                  <div class="notification-meta-row">
                    <span class="notification-category-badge">${escape(entry.category === "team" ? "Team" : entry.category === "market" ? "Marketplace" : "System")}</span>
                    ${entry.count > 1 ? `<span class="notification-repeat-count">${entry.count}x</span>` : ""}
                  </div>
                </div>
                <div class="notification-actions">
                  ${entry.actionLabel ? `<button class="secondary-button" type="button" data-notification-open="${escapeAttr(entry.id)}">${escape(entry.actionLabel)}</button>` : ""}
                  <button class="secondary-button" type="button" data-notification-read="${escapeAttr(entry.id)}">${entry.read ? "Unread" : "Read"}</button>
                  ${entry.category === "team" && entry.scopeId ? `<button class="secondary-button" type="button" data-notification-mute="${escapeAttr(entry.id)}">Mute</button>` : ""}
                  ${entry.category === "market" && entry.kind === "suggestion" ? `<button class="secondary-button" type="button" data-notification-mute-market="${escapeAttr(entry.id)}">Mute suggestions</button>` : ""}
                  <button class="secondary-button danger-button" type="button" data-notification-delete="${escapeAttr(entry.id)}">Delete</button>
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      `).join("")
      : `<div class="empty-state">No notifications yet.</div>`;
  }
  document.querySelectorAll("[data-notification-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      window.__forgebookNotificationTab = button.dataset.notificationTab;
      renderNotificationsOverlay();
    });
  });
  on("#markAllNotificationsReadButton", "click", () => {
    state.notifications = (state.notifications || []).map((entry) => ({ ...entry, read: true }));
    save();
    renderChrome();
    renderNotificationsOverlay();
  });
  on("#clearReadNotificationsButton", "click", () => {
    state.notifications = (state.notifications || []).filter((entry) => !entry.read);
    save();
    renderChrome();
    renderNotificationsOverlay();
  });
  document.querySelectorAll("[data-notification-read]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = state.notifications.find((entry) => entry.id === button.dataset.notificationRead);
      if (!target) return;
      target.read = !target.read;
      save();
      renderChrome();
      renderNotificationsOverlay();
    });
  });
  document.querySelectorAll("[data-notification-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      state.notifications = (state.notifications || []).filter((entry) => entry.id !== button.dataset.notificationDelete);
      save();
      renderChrome();
      renderNotificationsOverlay();
    });
  });
  document.querySelectorAll("[data-notification-open]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = state.notifications.find((entry) => entry.id === button.dataset.notificationOpen);
      if (!target) return;
      target.read = true;
      openNotificationDestination(target);
      save();
      renderChrome();
    });
  });
  document.querySelectorAll("[data-notification-mute]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = state.notifications.find((entry) => entry.id === button.dataset.notificationMute);
      if (!target) return;
      muteNotificationScope(target);
      save();
      renderChrome();
      renderNotificationsOverlay();
    });
  });
  document.querySelectorAll("[data-notification-mute-market]").forEach((button) => {
    button.addEventListener("click", () => {
      state.settings.notifications.muteMarketplaceSuggestions = true;
      save();
      renderChrome();
      renderNotificationsOverlay();
    });
  });
}

function legacyNotificationIcon(type) {
  if (type === "message") return "✉";
  if (type === "friend") return "◎";
  if (type === "vault" || type === "share" || type === "project") return "◇";
  return "•";
}

function legacyPushNotification(type, title, body) {
  state.notifications = state.notifications || [];
  state.notifications.unshift({
    id: uid(),
    type,
    title,
    body,
    createdAt: Date.now(),
  });
  state.notifications = state.notifications.slice(0, 40);
  save();
}

function notificationIcon(type) {
  if (type === "team") return "T";
  if (type === "market") return "M";
  if (type === "system") return "S";
  return "•";
}

function openNotificationDestination(entry) {
  const destination = entry?.destination;
  if (!destination) {
    renderNotificationsOverlay();
    return;
  }
  if (destination.view === "market") {
    closeOverlay();
    state.activeView = "market";
    render();
    return;
  }
  if (destination.view === "workspace") {
    if (destination.vaultId && item(destination.vaultId)?.type === "vault") state.selectedVaultId = destination.vaultId;
    if (destination.docId && item(destination.docId)?.type === "document") {
      state.activeDocumentId = destination.docId;
      if (!state.openTabs.includes(destination.docId)) state.openTabs.unshift(destination.docId);
    }
    closeOverlay();
    state.activeView = "workspace";
    render();
    return;
  }
  if (destination.overlay) {
    openOverlay(destination.overlay);
    return;
  }
  renderNotificationsOverlay();
}

function muteNotificationScope(entry) {
  const settings = state.settings.notifications;
  if (entry.scopeType === "project" && entry.scopeId) {
    settings.mutedProjectIds = [...new Set([...(settings.mutedProjectIds || []), entry.scopeId])];
    showToast("Project notifications muted");
    return;
  }
  if (entry.scopeId) {
    settings.mutedTeamIds = [...new Set([...(settings.mutedTeamIds || []), entry.scopeId])];
    showToast("Team notifications muted");
  }
}

function pushNotification(type, title, body, meta = {}) {
  const entry = normalizeNotificationEntry({
    id: uid(),
    category: type,
    type,
    title,
    body,
    createdAt: Date.now(),
    ...meta,
  });
  if (!entry || isMutedNotification(entry)) return;
  state.notifications = state.notifications || [];
  const existing = state.notifications.find((notification) =>
    notification.category === entry.category
    && notification.title === entry.title
    && notification.scopeType === entry.scopeType
    && notification.scopeId === entry.scopeId
    && Number(entry.createdAt) - Number(notification.createdAt || 0) < 300000);
  if (existing) {
    existing.body = entry.body;
    existing.createdAt = entry.createdAt;
    existing.read = false;
    existing.count = Math.max(1, Number(existing.count || 1)) + 1;
    existing.actionLabel = entry.actionLabel || existing.actionLabel;
    existing.destination = entry.destination || existing.destination;
    existing.groupLabel = entry.groupLabel || existing.groupLabel;
    existing.kind = entry.kind || existing.kind;
  } else {
    state.notifications.unshift(entry);
  }
  pruneNotifications();
  save();
  renderChrome();
}

function socialProfileById(userId) {
  if (userId === state.profile.userId) {
    return {
      id: "self",
      userId: state.profile.userId,
      name: state.profile.name,
      role: state.profile.role || "Designer",
      status: state.profile.status || "Available",
      avatar: state.profile.avatar || "",
    };
  }
  return (state.profile.friends || []).find((friend) => friend.userId === userId || friend.id === userId) || null;
}

function ensureDirectConversation(friendId) {
  const friend = (state.profile.friends || []).find((entry) => entry.id === friendId || entry.userId === friendId);
  if (!friend) return null;
  const memberIds = [state.profile.userId, friend.userId].sort();
  let conversation = state.social.conversations.find((entry) => entry.type === "direct" && [...entry.memberIds].sort().join("|") === memberIds.join("|"));
  if (!conversation) {
    conversation = {
      id: uid(),
      type: "direct",
      name: friend.name,
      categoryId: "general",
      memberIds,
      messages: [
        {
          id: uid(),
          authorId: friend.userId,
          content: `Opened a direct line with ${state.profile.name}.`,
          createdAt: Date.now(),
        },
      ],
    };
    state.social.conversations.unshift(conversation);
  }
  state.social.activeConversationId = conversation.id;
  save();
  return conversation;
}

function openDirectMessage(friendId) {
  ensureDirectConversation(friendId);
}

function renderMessagesOverlay() {
  normalize();
  if (!els.overlayBody) return;
  els.overlayCard?.classList.remove("overlay-card-profile", "overlay-card-market");
  els.overlayCard?.classList.add("overlay-card-chat");
  if (!state.social.activeConversationId) {
    const firstFriend = state.profile.friends?.[0];
    if (firstFriend) ensureDirectConversation(firstFriend.id);
  }
  const conversation = state.social.conversations.find((entry) => entry.id === state.social.activeConversationId) || state.social.conversations[0] || null;
  if (conversation && !state.social.activeConversationId) state.social.activeConversationId = conversation.id;
  const chatSidebarWidth = clampNumber(Number(state.settings.chatSidebarWidth) || 300, 240, 420);
  const chatMembersWidth = clampNumber(Number(state.settings.chatMembersWidth) || 260, 220, 380);
  els.overlayEyebrow.textContent = "Messages";
  els.overlayTitle.textContent = "Direct Messages";
  els.overlayBody.innerHTML = `
    <section class="chat-shell" style="--chat-sidebar-width:${chatSidebarWidth}px; --chat-members-width:${chatMembersWidth}px;">
      <aside class="chat-sidebar">
        <div class="chat-sidebar-top">
          <label class="workspace-search overlay-search">
            <span>Find or start a conversation</span>
            <input id="chatSearchInput" type="search" placeholder="Search teammates or chats" />
          </label>
          <div class="overlay-inline-actions">
            <button id="newDirectChatButton" class="secondary-button compact-action-button" type="button"><span class="button-icon">✉</span><span>New DM</span></button>
            <button id="newTeamChatButton" class="secondary-button compact-action-button" type="button"><span class="button-icon">#</span><span>Team Chat</span></button>
            <button id="newChatCategoryButton" class="secondary-button compact-action-button" type="button"><span class="button-icon">+</span><span>Category</span></button>
          </div>
        </div>
        <div id="chatConversationList" class="chat-conversation-list"></div>
      </aside>

      <section class="chat-main">
        <header class="chat-main-header">
          <div>
            <p class="eyebrow">${conversation?.type === "group" ? "Team Chat" : "Direct Message"}</p>
            <h3>${escape(conversation?.name || "No conversation")}</h3>
          </div>
          <div class="chat-header-actions">
            <button id="chatShareActiveFileButton" class="secondary-button compact-action-button" type="button"><span class="button-icon">↗</span><span>Share File</span></button>
            <button id="chatAddGroupMessageButton" class="secondary-button compact-action-button" type="button"><span class="button-icon">+</span><span>Quick Update</span></button>
          </div>
        </header>
        <div class="chat-resize-bar">
          <label class="compact-range-field">
            <span>List</span>
            <input id="chatSidebarWidthInput" type="range" min="240" max="420" step="10" value="${chatSidebarWidth}" />
          </label>
          <label class="compact-range-field">
            <span>Members</span>
            <input id="chatMembersWidthInput" type="range" min="220" max="380" step="10" value="${chatMembersWidth}" />
          </label>
        </div>
        <div id="chatFeed" class="chat-feed"></div>
        <div class="chat-compose">
          <textarea id="chatComposerInput" class="chat-composer-input" placeholder="Message ${escape(conversation?.name || "conversation")}"></textarea>
          <button id="sendChatMessageButton" class="primary-button compact-action-button" type="button"><span class="button-icon">➤</span><span>Send</span></button>
        </div>
      </section>

      <aside class="chat-members-panel">
        <p class="eyebrow">Members</p>
        <div id="chatMemberList" class="chat-member-list"></div>
      </aside>
    </section>
  `;
  bindMessagesOverlay();
  renderConversationList();
  renderConversationFeed();
  renderConversationMembers();
}

function bindMessagesOverlay() {
  on("#newChatCategoryButton", "click", () => {
    openModal({
      eyebrow: "DM Category",
      title: "Create Conversation Category",
      message: "Add a category to group your direct messages and team chats.",
      confirmLabel: "Create Category",
      inputValue: `Category ${(state.social.categories || []).length + 1}`,
      onConfirm: (value) => {
        const name = value.trim();
        if (!name) return false;
        if (!Array.isArray(state.social.categories)) state.social.categories = [];
        state.social.categories.push({ id: uid(), name });
        save();
        renderMessagesOverlay();
        showToast("Category created");
        return true;
      },
    });
  });
  on("#newDirectChatButton", "click", () => {
    const matches = (state.profile.friends || []).filter((friend) => {
      const query = ($("#chatSearchInput")?.value || "").trim().toLowerCase();
      return !query || [friend.name, friend.role, friend.userId].join(" ").toLowerCase().includes(query);
    });
    const firstFriend = matches[0] || state.profile.friends?.[0];
    if (!firstFriend) {
      showToast("Add a friend first");
      return;
    }
    ensureDirectConversation(firstFriend.id);
    renderMessagesOverlay();
  });
  on("#newTeamChatButton", "click", () => {
    if (!(state.profile.friends || []).length) {
      showToast("Add friends first");
      return;
    }
    openModal({
      eyebrow: "New Team Chat",
      title: "Create Team Conversation",
      message: "Name a group chat for your developers.",
      confirmLabel: "Create Chat",
      inputValue: `Team ${state.social.conversations.filter((entry) => entry.type === "group").length + 1}`,
      onConfirm: (value) => {
        const name = value.trim();
        if (!name) return false;
        const members = [state.profile.userId, ...(state.profile.friends || []).slice(0, 4).map((friend) => friend.userId)];
        state.social.conversations.unshift({
          id: uid(),
          type: "group",
          name,
          categoryId: "team",
          memberIds: members,
          messages: [{
            id: uid(),
            authorId: state.profile.userId,
            content: `Created ${name}.`,
            createdAt: Date.now(),
          }],
        });
        state.social.activeConversationId = state.social.conversations[0].id;
        save();
        pushNotification("message", "Team chat created", `${name} is ready for collaboration.`);
        renderMessagesOverlay();
        showToast("Team chat created");
        return true;
      },
    });
  });
  on("#sendChatMessageButton", "click", sendConversationMessage);
  on("#chatAddGroupMessageButton", "click", sendQuickSystemMessage);
  on("#chatShareActiveFileButton", "click", shareActiveFileToConversation);
  const composer = $("#chatComposerInput");
  composer?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendConversationMessage();
    }
  });
  $("#chatSearchInput")?.addEventListener("input", renderConversationList);
  $("#chatSidebarWidthInput")?.addEventListener("input", (event) => {
    state.settings.chatSidebarWidth = clampNumber(Number(event.target.value), 240, 420);
    save();
    renderMessagesOverlay();
  });
  $("#chatMembersWidthInput")?.addEventListener("input", (event) => {
    state.settings.chatMembersWidth = clampNumber(Number(event.target.value), 220, 380);
    save();
    renderMessagesOverlay();
  });
  $("#chatConversationList")?.querySelectorAll("[data-conversation-category]").forEach((select) => {
    select.addEventListener("click", (event) => event.stopPropagation());
    select.addEventListener("change", (event) => {
      const conversation = state.social.conversations.find((entry) => entry.id === select.dataset.conversationCategory);
      if (!conversation) return;
      conversation.categoryId = event.target.value || "general";
      save();
      renderMessagesOverlay();
      showToast("Conversation moved");
    });
  });
}

function activeConversation() {
  return state.social.conversations.find((entry) => entry.id === state.social.activeConversationId) || null;
}

function renderConversationList() {
  const host = $("#chatConversationList");
  if (!host) return;
  const query = ($("#chatSearchInput")?.value || "").trim().toLowerCase();
  host.innerHTML = "";
  const items = state.social.conversations
    .filter((entry) => !query || entry.name.toLowerCase().includes(query))
    .sort((a, b) => Number(b.messages.at(-1)?.createdAt || 0) - Number(a.messages.at(-1)?.createdAt || 0));
  if (!items.length) {
    host.innerHTML = `<div class="empty-state">No conversations yet.</div>`;
    return;
  }
  const categories = Array.isArray(state.social.categories) && state.social.categories.length
    ? state.social.categories
    : [{ id: "general", name: "General" }, { id: "team", name: "Team" }];
  categories.forEach((category) => {
    const group = items.filter((entry) => (entry.categoryId || (entry.type === "group" ? "team" : "general")) === category.id);
    if (!group.length) return;
    const label = document.createElement("div");
    label.className = "workspace-pane-label chat-category-label";
    label.textContent = category.name;
    host.appendChild(label);
    group.forEach((conversation) => {
      const last = conversation.messages.at(-1);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-conversation-item";
      if (conversation.id === state.social.activeConversationId) button.classList.add("active");
      button.innerHTML = `
        <div class="chat-conversation-avatar">${escape((conversation.name?.[0] || "C").toUpperCase())}</div>
        <div class="chat-conversation-copy">
          <strong>${escape(conversation.name)}</strong>
          <span>${escape(last?.content || (conversation.type === "group" ? "Team chat ready" : "Direct line ready"))}</span>
        </div>
        <select class="chat-conversation-category-select" data-conversation-category="${escapeAttr(conversation.id)}">
          ${categories.map((entry) => `<option value="${escapeAttr(entry.id)}" ${entry.id === (conversation.categoryId || "general") ? "selected" : ""}>${escape(entry.name)}</option>`).join("")}
        </select>
      `;
      button.addEventListener("click", () => {
        state.social.activeConversationId = conversation.id;
        save();
        renderMessagesOverlay();
      });
      host.appendChild(button);
    });
  });
  const quickFriends = (state.profile.friends || [])
    .filter((friend) => !query || [friend.name, friend.role, friend.userId].join(" ").toLowerCase().includes(query))
    .filter((friend) => !state.social.conversations.some((entry) => entry.type === "direct" && entry.memberIds.includes(friend.userId)))
    .slice(0, 6);
  if (quickFriends.length) {
    const label = document.createElement("div");
    label.className = "workspace-pane-label";
    label.textContent = "Start Direct Message";
    host.appendChild(label);
    quickFriends.forEach((friend) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-conversation-item";
      button.innerHTML = `
        <div class="chat-conversation-avatar">${escape((friend.name?.[0] || "F").toUpperCase())}</div>
        <div class="chat-conversation-copy">
          <strong>${escape(friend.name)}</strong>
          <span>${escape(friend.role || "Collaborator")}</span>
        </div>
      `;
      button.addEventListener("click", () => {
        ensureDirectConversation(friend.id);
        renderMessagesOverlay();
      });
      host.appendChild(button);
    });
  }
}

function renderConversationFeed() {
  const host = $("#chatFeed");
  const conversation = activeConversation();
  if (!host) return;
  host.innerHTML = "";
  if (!conversation) {
    host.innerHTML = `<div class="empty-state">Start a conversation with a friend.</div>`;
    return;
  }
  conversation.messages.forEach((message) => {
    const author = socialProfileById(message.authorId) || { name: "Unknown", avatar: "" };
    const row = document.createElement("article");
    row.className = "chat-message";
    row.innerHTML = `
      <div class="chat-message-avatar ${author.avatar ? "has-image" : ""}">
        ${author.avatar ? `<img src="${escapeAttr(author.avatar)}" alt="${escapeAttr(author.name)} avatar" />` : `<span>${escape((author.name?.[0] || "U").toUpperCase())}</span>`}
      </div>
      <div class="chat-message-body">
        <div class="chat-message-head">
          <strong>${escape(author.name)}</strong>
          <span>${new Date(message.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
        <p>${escape(message.content)}</p>
      </div>
    `;
    host.appendChild(row);
  });
  host.scrollTop = host.scrollHeight;
}

function renderConversationMembers() {
  const host = $("#chatMemberList");
  const conversation = activeConversation();
  if (!host) return;
  host.innerHTML = "";
  if (!conversation) return;
  conversation.memberIds.forEach((memberId) => {
    const member = socialProfileById(memberId);
    if (!member) return;
    const row = document.createElement("article");
    row.className = "profile-friend-row";
    row.innerHTML = `
      <div class="profile-friend-avatar ${member.avatar ? "has-image" : ""}">
        ${member.avatar ? `<img src="${escapeAttr(member.avatar)}" alt="${escapeAttr(member.name)} avatar" />` : `<span>${escape((member.name?.[0] || "M").toUpperCase())}</span>`}
      </div>
      <div class="profile-friend-copy">
        <strong>${escape(member.name)}</strong>
        <span>${escape(member.role || member.status || "Member")}</span>
      </div>
    `;
    host.appendChild(row);
  });
}

function sendConversationMessage() {
  const input = $("#chatComposerInput");
  const conversation = activeConversation();
  if (!input || !conversation) return;
  const content = input.value.trim();
  if (!content) return;
  conversation.messages.push({
    id: uid(),
    authorId: state.profile.userId,
    content,
    createdAt: Date.now(),
  });
  input.value = "";
  save();
  pushNotification("message", `Message sent to ${conversation.name}`, content.slice(0, 72));
  renderConversationList();
  renderConversationFeed();
}

function sendQuickSystemMessage() {
  const conversation = activeConversation();
  if (!conversation) return;
  conversation.messages.push({
    id: uid(),
    authorId: state.profile.userId,
    content: conversation.type === "group" ? "Posted an update for the team." : "Sent a quick follow-up.",
    createdAt: Date.now(),
  });
  save();
  renderConversationList();
  renderConversationFeed();
}

function shareActiveFileToConversation() {
  const conversation = activeConversation();
  const doc = activeDoc();
  if (!conversation || !doc) {
    showToast("Open a file first");
    return;
  }
  conversation.messages.push({
    id: uid(),
    authorId: state.profile.userId,
    content: `Shared file: ${doc.name} (${doc.docType})`,
    createdAt: Date.now(),
  });
  save();
  pushNotification("share", "File shared in chat", doc.name);
  renderConversationList();
  renderConversationFeed();
}

function openModal(config) {
  modalAction = config.onConfirm || null;
  if (!els.modalPanel || !els.modalEyebrow || !els.modalTitle || !els.modalMessage || !els.modalConfirmButton || !els.modalInput || !els.modalInputWrap) return;
  els.modalEyebrow.textContent = config.eyebrow || "Vault";
  els.modalTitle.textContent = config.title || "Action";
  els.modalMessage.textContent = config.message || "";
  els.modalConfirmButton.textContent = config.confirmLabel || "Confirm";
  els.modalConfirmButton.classList.toggle("is-destructive", Boolean(config.destructive));
  const hasInput = typeof config.inputValue === "string";
  els.modalInputWrap.classList.toggle("hidden", !hasInput);
  els.modalInput.value = hasInput ? config.inputValue : "";
  els.modalPanel.classList.remove("hidden");
  if (hasInput) {
    requestAnimationFrame(() => {
      els.modalInput.focus();
      els.modalInput.select();
    });
  }
}

function closeModal() {
  modalAction = null;
  if (!els.modalPanel || !els.modalConfirmButton) return;
  els.modalConfirmButton.classList.remove("is-destructive");
  els.modalPanel.classList.add("hidden");
}

function confirmModal() {
  if (!modalAction) {
    closeModal();
    return;
  }
  const shouldClose = modalAction(els.modalInput?.value || "");
  if (shouldClose !== false) closeModal();
}

function openVaultContextMenu(vaultId, x, y) {
  contextVaultId = vaultId;
  openContextMenu(x, y, [
    { label: "New text file", action: () => createInContainer(vaultId, "text") },
    { label: "New canvas file", action: () => createInContainer(vaultId, "canvas") },
    { label: "New balancing sheet", action: () => createInContainer(vaultId, "sheet") },
    { label: "New production board", action: () => createInContainer(vaultId, "board") },
    { label: "New storage hub", action: () => createInContainer(vaultId, "storage") },
    { label: "New folder", action: () => createInContainer(vaultId, "folder") },
    { label: "Set vault cover", action: () => openVaultCoverPicker(vaultId) },
    { label: "Rename vault", action: () => renameVault(vaultId) },
    { label: "Duplicate vault", action: () => duplicateVault(vaultId) },
    { label: "Delete vault", action: () => deleteVault(vaultId) },
    { label: "Open in new tab", action: () => openVaultInNewTab(vaultId) },
  ]);
}

function openNodeContextMenu(node, x, y) {
  if (node.type === "folder") {
    openContextMenu(x, y, [
      { label: "New text file", action: () => createInContainer(node.id, "text") },
      { label: "New canvas file", action: () => createInContainer(node.id, "canvas") },
      { label: "New balancing sheet", action: () => createInContainer(node.id, "sheet") },
      { label: "New production board", action: () => createInContainer(node.id, "board") },
      { label: "New storage hub", action: () => createInContainer(node.id, "storage") },
      { label: "New folder", action: () => createInContainer(node.id, "folder") },
      { label: "Rename folder", action: () => renameNode(node.id) },
      { label: "Delete folder", action: () => deleteFolder(node.id) },
    ]);
    return;
  }
  openContextMenu(x, y, [
    { label: "Rename file", action: () => renameNode(node.id) },
    { label: "Duplicate file", action: () => duplicateDocument(node.id) },
    { label: "Close tab", action: () => closeDocumentTab(node.id) },
    { label: "Delete file", action: () => deleteDocument(node.id) },
  ]);
}

function openCreateMenuAtButton(button, parentId) {
  if (!button || !parentId) return;
  const rect = button.getBoundingClientRect();
  openContextMenu(rect.left, rect.bottom + 8, [
    { label: "New text file", action: () => createInContainer(parentId, "text") },
    { label: "New canvas file", action: () => createInContainer(parentId, "canvas") },
    { label: "New balancing sheet", action: () => createInContainer(parentId, "sheet") },
    { label: "New production board", action: () => createInContainer(parentId, "board") },
    { label: "New storage hub", action: () => createInContainer(parentId, "storage") },
    { label: "New folder", action: () => createInContainer(parentId, "folder") },
  ]);
}

function closeDocumentTab(docId) {
  state.openTabs = state.openTabs.filter((id) => id !== docId);
  if (state.activeDocumentId === docId) {
    const fallback = state.openTabs.find((id) => vaultId(id) === state.selectedVaultId) || descendants(state.selectedVaultId).find((entry) => entry.type === "document")?.id || null;
    state.activeDocumentId = fallback;
    state.selectedNodeId = fallback;
  }
  save();
  render();
  showToast("Tab closed");
}

function deleteDocument(docId) {
  const doc = item(docId);
  if (!doc || doc.type !== "document") return;
  openModal({
    eyebrow: "Delete File",
    title: doc.name,
    message: `Delete "${doc.name}" from this vault?`,
    confirmLabel: "Delete File",
    destructive: true,
    onConfirm: () => {
      state.items = state.items.filter((entry) => entry.id !== docId);
      state.openTabs = state.openTabs.filter((id) => id !== docId);
      if (state.activeDocumentId === docId) state.activeDocumentId = null;
      if (state.selectedNodeId === docId) state.selectedNodeId = null;
      const fallback = selectedVault() ? descendants(state.selectedVaultId).find((entry) => entry.type === "document") : null;
      if (fallback) {
        state.activeDocumentId = fallback.id;
        state.selectedNodeId = fallback.id;
        if (!state.openTabs.includes(fallback.id)) state.openTabs.push(fallback.id);
      }
      save();
      render();
      showToast("File deleted");
      return true;
    },
  });
}

function deleteFolder(folderId) {
  const folder = item(folderId);
  if (!folder || folder.type !== "folder" || folder.folderKind !== "folder") return;
  openModal({
    eyebrow: "Delete Folder",
    title: folder.name,
    message: `Delete folder "${folder.name}" and all of its files?`,
    confirmLabel: "Delete Folder",
    destructive: true,
    onConfirm: () => {
      const idsToDelete = new Set([folder.id, ...descendants(folder.id).map((entry) => entry.id)]);
      state.items = state.items.filter((entry) => !idsToDelete.has(entry.id));
      state.openTabs = state.openTabs.filter((id) => !idsToDelete.has(id));
      if (state.activeDocumentId && idsToDelete.has(state.activeDocumentId)) state.activeDocumentId = null;
      if (state.selectedNodeId && idsToDelete.has(state.selectedNodeId)) state.selectedNodeId = null;
      save();
      render();
      showToast("Folder deleted");
      return true;
    },
  });
}

function normalize() {
  if (!Array.isArray(state.items)) state.items = [];
  if (!Array.isArray(state.openTabs)) state.openTabs = [];
  if (!Array.isArray(state.collapsedFolders)) state.collapsedFolders = [];
  if (!Array.isArray(state.libraryCategories)) state.libraryCategories = [];
  if (!state.social || typeof state.social !== "object") {
    state.social = {
      conversations: [],
      activeConversationId: null,
      categories: [{ id: "general", name: "General" }, { id: "team", name: "Team" }],
    };
  }
  if (!Array.isArray(state.social.conversations)) state.social.conversations = [];
  if (!Array.isArray(state.social.categories) || !state.social.categories.length) {
    state.social.categories = [{ id: "general", name: "General" }, { id: "team", name: "Team" }];
  }
  if (!Array.isArray(state.notifications)) state.notifications = [];
  state.notifications = state.notifications.map(normalizeNotificationEntry).filter(Boolean);
  pruneNotifications();
  if (!Array.isArray(state.starredItems)) state.starredItems = [];
  if (!Array.isArray(state.pinnedItems)) state.pinnedItems = [];
  if (!state.fileVault || typeof state.fileVault !== "object") {
    state.fileVault = { files: [], smartViews: ["recent", "favorites", "shared", "archived", "images", "documents"], activeView: "recent", search: "", selectedFileId: null };
  }
  if (!Array.isArray(state.fileVault.smartViews) || !state.fileVault.smartViews.length) state.fileVault.smartViews = ["recent", "favorites", "shared", "archived", "images", "documents"];
  normalizeStorageState();
  if (!Array.isArray(state.profile.badges)) state.profile.badges = ["Game Designer"];
  if (!Array.isArray(state.profile.blocks)) state.profile.blocks = ["About", "Skills", "Projects", "Achievements"];
  if (!state.profile.themeVariant) state.profile.themeVariant = "dark-glass";
  if (!state.profile.layoutStyle) state.profile.layoutStyle = "studio";
  if (!Array.isArray(state.profile.friendRequests)) state.profile.friendRequests = [];
  if (!Array.isArray(state.profile.sentRequests)) state.profile.sentRequests = [];
  if (!Array.isArray(state.profile.blockedUsers)) state.profile.blockedUsers = [];
  if (!Array.isArray(state.marketProfiles)) state.marketProfiles = [];
  state.settings = deepMerge(createDefaultSettings(), state.settings && typeof state.settings === "object" ? state.settings : {});
  state.settingsMeta = deepMerge(createDefaultSettingsMeta(), state.settingsMeta && typeof state.settingsMeta === "object" ? state.settingsMeta : {});
  syncSettingsAliases();
  if (![1, 2, 3].includes(Number(state.settings.writingWidth))) state.settings.writingWidth = 2;
  state.openTabs = state.openTabs.filter((docId) => item(docId)?.type === "document");
  state.collapsedFolders = state.collapsedFolders.filter((folderId) => item(folderId)?.type === "folder");
  state.libraryCategories = state.libraryCategories.filter((category) => category && typeof category.name === "string");
  if (state.selectedVaultId && !selectedVault()) state.selectedVaultId = null;
  if (!state.selectedVaultId && vaults().length) state.selectedVaultId = vaults()[0].id;
  if (state.activeDocumentId && item(state.activeDocumentId)?.type !== "document") state.activeDocumentId = null;
  documents().filter((doc) => doc.docType === "sheet").forEach(normalizeSheet);
  documents().filter((doc) => doc.docType === "board").forEach(normalizeBoard);
  documents().filter((doc) => doc.docType === "storage").forEach(normalizeStorageDoc);
  state.social.conversations = state.social.conversations.map((conversation) => ({
    id: conversation.id || uid(),
    type: conversation.type || "direct",
    name: conversation.name || "Conversation",
    categoryId: conversation.categoryId || (conversation.type === "group" ? "team" : "general"),
    memberIds: Array.isArray(conversation.memberIds) ? conversation.memberIds : [state.profile.userId],
    messages: Array.isArray(conversation.messages) ? conversation.messages : [],
  }));
  if (state.social.activeConversationId && !state.social.conversations.some((conversation) => conversation.id === state.social.activeConversationId)) {
    state.social.activeConversationId = state.social.conversations[0]?.id || null;
  }
}

function normalizeNotificationEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const legacyType = entry.category || entry.type || "system";
  let category = legacyType;
  if (legacyType === "vault") category = "team";
  else if (legacyType === "project") category = "market";
  else if (legacyType === "system") category = "system";
  if (["message", "friend", "share", "messages", "friends"].includes(category)) return null;
  if (!["team", "market", "system"].includes(category)) return null;
  return {
    id: entry.id || uid(),
    category,
    title: entry.title || "Update",
    body: entry.body || "",
    createdAt: Number(entry.createdAt || Date.now()),
    read: Boolean(entry.read),
    scopeType: entry.scopeType || (category === "team" ? "team" : category === "market" ? "market" : "system"),
    scopeId: entry.scopeId || "",
    groupLabel: entry.groupLabel || (category === "team" ? "Team updates" : category === "market" ? "Marketplace" : "System"),
    actionLabel: entry.actionLabel || "",
    destination: entry.destination || null,
    kind: entry.kind || "",
    count: Math.max(1, Number(entry.count || 1)),
  };
}

function pruneNotifications() {
  const days = clampNumber(Number(state.settings?.notifications?.autoExpireDays || 30), 7, 90);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  state.notifications = (state.notifications || [])
    .filter((entry) => Number(entry.createdAt || 0) >= cutoff)
    .slice(0, 80);
}

function isMutedNotification(entry) {
  if (!entry) return true;
  const settings = state.settings?.notifications || {};
  if (entry.category === "team") {
    if (settings.teamNotifications === "off") return true;
    if (entry.scopeType === "team" && Array.isArray(settings.mutedTeamIds) && settings.mutedTeamIds.includes(entry.scopeId)) return true;
    if (entry.scopeType === "project" && Array.isArray(settings.mutedProjectIds) && settings.mutedProjectIds.includes(entry.scopeId)) return true;
  }
  if (entry.category === "market") {
    if (settings.marketplaceNotifications === "off") return true;
    if (settings.muteMarketplaceSuggestions && entry.kind === "suggestion") return true;
  }
  if (entry.category === "system" && settings.systemNotifications === "off") return true;
  return false;
}

function syncSettingsAliases(changedPath = "", value) {
  if (!state.settings || typeof state.settings !== "object") return;
  const defaults = createDefaultSettings();
  if (!state.settings.appearance) state.settings.appearance = createDefaultSettings().appearance;
  if (!state.settings.editor) state.settings.editor = createDefaultSettings().editor;
  if (!state.settings.friendsMessages) state.settings.friendsMessages = createDefaultSettings().friendsMessages;
  if (!state.settings.profile) state.settings.profile = createDefaultSettings().profile;
  if (!state.settings.accessibility) state.settings.accessibility = createDefaultSettings().accessibility;
  if (changedPath === "settings.editor.defaultEditorWidth") state.settings.writingWidth = Number(value) || 2;
  if (changedPath === "settings.writingWidth") state.settings.editor.defaultEditorWidth = Number(value) || 2;
  if (changedPath === "settings.profile.headline") state.profile.tagline = String(value || "");
  if (changedPath === "settings.profile.customProfileAccent") state.profile.accent = String(value || "#8b5cf6");
  if (changedPath === "settings.profile.availabilityStatus") state.profile.status = String(value || "");
  state.settings.editor.defaultEditorWidth = Number(state.settings.editor.defaultEditorWidth || state.settings.writingWidth || 2);
  state.settings.writingWidth = Number(state.settings.writingWidth || state.settings.editor.defaultEditorWidth || 2);
  state.settings.appearance.highContrastMode = Boolean(state.settings.appearance.highContrastMode || state.settings.accessibility.highContrastMode);
  state.settings.appearance.reducedMotion = Boolean(state.settings.appearance.reducedMotion || state.settings.accessibility.reducedMotion || state.settings.advanced?.disableAnimations);
  state.settings.chatSidebarWidth = clampNumber(Number(state.settings.chatSidebarWidth) || 300, 240, 420);
  state.settings.chatMembersWidth = clampNumber(Number(state.settings.chatMembersWidth) || 260, 220, 380);
  if ((!state.settings.profile?.headline || state.settings.profile.headline === defaults.profile.headline) && state.profile.tagline) {
    state.settings.profile.headline = state.profile.tagline;
  } else if (state.settings.profile?.headline) {
    state.profile.tagline = state.settings.profile.headline;
  }
  if ((!state.settings.profile?.customProfileAccent || state.settings.profile.customProfileAccent === defaults.profile.customProfileAccent) && state.profile.accent) {
    state.settings.profile.customProfileAccent = state.profile.accent;
  } else if (state.settings.profile?.customProfileAccent) {
    state.profile.accent = state.settings.profile.customProfileAccent;
  }
  if ((!state.settings.profile?.availabilityStatus || state.settings.profile.availabilityStatus === defaults.profile.availabilityStatus) && state.profile.status) {
    state.settings.profile.availabilityStatus = state.profile.status;
  } else if (state.settings.profile?.availabilityStatus) {
    state.profile.status = state.settings.profile.availabilityStatus;
  }
}

function setByPath(root, path, value) {
  const parts = String(path).split(".");
  let node = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (!node[key] || typeof node[key] !== "object") node[key] = {};
    node = node[key];
  }
  node[parts[parts.length - 1]] = value;
}

function deepMerge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch.slice() : base.slice();
  if (!base || typeof base !== "object") return patch === undefined ? base : patch;
  const merged = { ...base };
  if (!patch || typeof patch !== "object") return merged;
  Object.keys(patch).forEach((key) => {
    const next = patch[key];
    if (Array.isArray(next)) merged[key] = next.slice();
    else if (next && typeof next === "object") merged[key] = deepMerge(base[key] && typeof base[key] === "object" ? base[key] : {}, next);
    else merged[key] = next;
  });
  return merged;
}

function toggleFolderCollapsed(folderId) {
  const index = state.collapsedFolders.indexOf(folderId);
  if (index >= 0) state.collapsedFolders.splice(index, 1);
  else state.collapsedFolders.push(folderId);
  save();
  renderWorkspace();
}

function applyLocationState() {
  const url = new URL(window.location.href);
  const requestedVaultId = url.searchParams.get("vault");
  if (!requestedVaultId) return;
  const vault = item(requestedVaultId);
  if (!vault || vault.type !== "folder" || vault.folderKind !== "vault") return;
  let doc = descendants(vault.id).find((entry) => entry.type === "document");
  if (!doc) {
    doc = createDoc("Untitled Note", "text", vault.id);
    state.items.push(doc);
  }
  state.selectedVaultId = vault.id;
  state.selectedNodeId = doc.id;
  state.activeDocumentId = doc.id;
  state.activeView = "workspace";
  if (!state.openTabs.includes(doc.id)) state.openTabs.push(doc.id);
}

function writeLocationState() {
  const url = new URL(window.location.href);
  if (state.activeView === "workspace" && state.selectedVaultId) {
    url.searchParams.set("vault", state.selectedVaultId);
  } else {
    url.searchParams.delete("vault");
  }
  window.history.replaceState({}, "", url);
}

function armLibraryReveal() {
  if (!els.documentCards) return;
  if (libraryRevealObserver) libraryRevealObserver.disconnect();
  const cards = [...els.documentCards.querySelectorAll(".document-card")];
  if (!cards.length) return;
  if (!("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-visible"));
    return;
  }
  libraryRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      libraryRevealObserver.unobserve(entry.target);
    });
  }, {
    root: null,
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.14,
  });
  cards.forEach((card) => libraryRevealObserver.observe(card));
}

function applyPremiumMotion() {
  const reducedMotion = document.body.dataset.reducedMotion === "true";
  document.querySelectorAll(".premium-surface").forEach((node) => {
    const interactiveBounds = node.getBoundingClientRect();
    const isMotionCandidate = interactiveBounds.width >= 280
      && interactiveBounds.height >= 140
      && !node.closest(".workspace-view, .canvas-designer, .board-shell, .sheet-shell, .storage-browser, .messages-shell");
    if (node.classList.contains("motion-static")) {
      node.style.setProperty("--mx", "50%");
      node.style.setProperty("--my", "50%");
      node.style.setProperty("--rx", "0deg");
      node.style.setProperty("--ry", "0deg");
      return;
    }
    if (
      reducedMotion
      || node.closest(".canvas-stage-wrap, .storage-stage")
      || node.classList.contains("board-card")
      || node.classList.contains("canvas-node-card")
      || node.classList.contains("storage-file-card")
      || !isMotionCandidate
    ) {
      node.style.setProperty("--mx", "50%");
      node.style.setProperty("--my", "50%");
      node.style.setProperty("--rx", "0deg");
      node.style.setProperty("--ry", "0deg");
      return;
    }
    if (node.dataset.motionBound === "true") return;
    node.dataset.motionBound = "true";
    let frameId = 0;
    let pendingEvent = null;
    node.addEventListener("pointermove", (event) => {
      pendingEvent = event;
      if (frameId) return;
      frameId = requestAnimationFrame(() => {
        frameId = 0;
        if (!pendingEvent) return;
        const rect = node.getBoundingClientRect();
        const px = (pendingEvent.clientX - rect.left) / rect.width;
        const py = (pendingEvent.clientY - rect.top) / rect.height;
        const rx = (0.5 - py) * 2.2;
        const ry = (px - 0.5) * 2.8;
        node.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
        node.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
        node.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
        node.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
        pendingEvent = null;
      });
    });
    node.addEventListener("pointerleave", () => {
      node.style.setProperty("--mx", "50%");
      node.style.setProperty("--my", "50%");
      node.style.setProperty("--rx", "0deg");
      node.style.setProperty("--ry", "0deg");
    });
  });
}

function bindFormattingTools() {
  document.querySelectorAll("[data-command]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      if (!activeDoc() || activeDoc().docType !== "text") return;
      focusEditor();
      const command = button.dataset.command;
      const value = button.dataset.value || undefined;
      if (command === "createLink") {
        const url = window.prompt("Link URL");
        if (!url) return;
        document.execCommand(command, false, url);
      } else {
        document.execCommand(command, false, value);
      }
      persistActiveTextDocument();
    });
  });

  document.querySelectorAll("[data-block]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => {
      if (!activeDoc() || activeDoc().docType !== "text") return;
      focusEditor();
      document.execCommand("formatBlock", false, button.dataset.block);
      persistActiveTextDocument();
    });
  });

  on("#inlineCodeButton", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const text = selection.toString();
    document.execCommand("insertHTML", false, `<code>${escape(text)}</code>`);
    persistActiveTextDocument();
  });

  on("#highlightButton", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    focusEditor();
    const color = $("#highlightColorInput")?.value || "#5b4a15";
    document.execCommand("hiliteColor", false, color);
    persistActiveTextDocument();
  });

  on("#textColorInput", "input", (event) => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    focusEditor();
    document.execCommand("foreColor", false, event.target.value);
    persistActiveTextDocument();
  });

  on("#highlightColorInput", "input", (event) => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    focusEditor();
    document.execCommand("hiliteColor", false, event.target.value);
    persistActiveTextDocument();
  });

  on("#insertImageButton", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    els.imagePicker?.click();
  });
}

function focusEditor() {
  if (!els.textEditor) return;
  els.textEditor.focus();
}

function persistActiveTextDocument() {
  const doc = activeDoc();
  if (!doc || doc.docType !== "text" || !els.textEditor) return;
  doc.content = els.textEditor.innerHTML;
  doc.updatedAt = Date.now();
  save();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function insertHtmlAtSelection(html) {
  focusEditor();
  document.execCommand("insertHTML", false, html);
}

function normalizeFloatingImages(doc) {
  if (!doc || doc.docType !== "text") return;
  if (!Array.isArray(doc.floatingImages)) doc.floatingImages = [];
  const temp = document.createElement("div");
  temp.innerHTML = doc.content || "";
  temp.querySelectorAll(".floating-image").forEach((node) => {
    const img = node.querySelector("img");
    if (!img) {
      node.remove();
      return;
    }
    doc.floatingImages.push({
      id: uid(),
      src: img.getAttribute("src") || "",
      alt: img.getAttribute("alt") || "",
      x: parseFloat(node.style.left || "72") || 72,
      y: parseFloat(node.style.top || "72") || 72,
      width: parseFloat(node.style.width || "280") || 280,
      height: parseFloat(node.style.height || "0") || 0,
    });
    node.remove();
  });
  doc.content = temp.innerHTML || "<p></p>";
}

function addFloatingImage(src, alt = "") {
  const doc = activeDoc();
  if (!doc || doc.docType !== "text") return;
  if (!Array.isArray(doc.floatingImages)) doc.floatingImages = [];
  doc.floatingImages.push({
    id: uid(),
    src,
    alt,
    x: 72,
    y: 72,
    width: 320,
    height: 0,
  });
  doc.updatedAt = Date.now();
  save();
  renderFloatingImages(doc);
}

function handleTextEditorPaste(event) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "text") return;
  const file = clipboardImageFile(event.clipboardData);
  if (!file) return;
  event.preventDefault();
  fileToDataUrl(file).then((dataUrl) => {
    addFloatingImage(dataUrl, file.name || "Pasted image");
  });
}

function handleTextEditorDragOver(event) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "text" || !hasImageFile(event.dataTransfer)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

function handleTextEditorDrop(event) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "text") return;
  const file = [...(event.dataTransfer?.files || [])].find((entry) => entry.type.startsWith("image/"));
  if (!file) return;
  event.preventDefault();
  fileToDataUrl(file).then((dataUrl) => {
    addFloatingImage(dataUrl, file.name || "Dropped image");
  });
}

function renderFloatingImages(doc) {
  if (!els.editorFloatingLayer) return;
  els.editorFloatingLayer.innerHTML = "";
  if (!doc || doc.docType !== "text" || !Array.isArray(doc.floatingImages)) return;
  doc.floatingImages.forEach((image) => {
    const node = document.createElement("div");
    node.className = "floating-image";
    node.style.left = `${image.x}px`;
    node.style.top = `${image.y}px`;
    node.style.width = `${image.width || 320}px`;
    if (image.height) node.style.height = `${image.height}px`;
    node.dataset.imageId = image.id;
    node.innerHTML = `
      <div class="floating-image-toolbar">
        <button class="floating-image-grip" type="button" title="Move image">Move</button>
        <div class="floating-image-toolbar-spacer"></div>
        <span class="floating-image-size">${Math.round(image.width || 320)}×${Math.round(image.height || 220)}</span>
        <button class="floating-image-scale" type="button" data-scale="down" title="Make smaller">−</button>
        <button class="floating-image-scale" type="button" data-scale="up" title="Make bigger">+</button>
      </div>
      <img src="${escapeAttr(image.src)}" alt="${escapeAttr(image.alt || "")}" />
      <button class="floating-image-resize" type="button" title="Resize image"></button>
    `;
    bindFloatingImage(node, image.id);
    els.editorFloatingLayer.appendChild(node);
  });
}

function bindFloatingImage(node, imageId) {
  const grip = node.querySelector(".floating-image-grip");
  const resize = node.querySelector(".floating-image-resize");
  const scaleButtons = node.querySelectorAll(".floating-image-scale");
  grip?.addEventListener("pointerdown", (event) => startFloatingImageInteraction(event, node, imageId, "move"));
  resize?.addEventListener("pointerdown", (event) => startFloatingImageInteraction(event, node, imageId, "resize"));
  scaleButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const doc = activeDoc();
      const image = doc?.floatingImages?.find((entry) => entry.id === imageId);
      if (!image) return;
      const factor = button.dataset.scale === "up" ? 1.1 : 0.9;
      image.width = Math.max(180, Math.min(960, Math.round((image.width || 320) * factor)));
      image.height = Math.max(120, Math.min(720, Math.round((image.height || 220) * factor)));
      renderFloatingImages(doc);
      save();
    });
  });
  node.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".floating-image-grip, .floating-image-resize, .floating-image-scale")) return;
    event.stopPropagation();
  });
}

function startFloatingImageInteraction(event, node, imageId, mode) {
  if (event.button !== 0 || !els.editorFloatingLayer) return;
  const doc = activeDoc();
  const image = doc?.floatingImages?.find((entry) => entry.id === imageId);
  if (!image) return;
  event.preventDefault();
  event.stopPropagation();
  const rect = node.getBoundingClientRect();
  floatingImageInteraction = {
    mode,
    imageId,
    node,
    startX: event.clientX,
    startY: event.clientY,
    startLeft: image.x,
    startTop: image.y,
    startWidth: image.width || rect.width,
    startHeight: image.height || rect.height,
  };
  node.classList.add("is-selected");
  document.body.style.cursor = mode === "resize" ? "nwse-resize" : "grabbing";
}

function handleFloatingImageInteraction(event) {
  if (!floatingImageInteraction || !els.editorFloatingLayer) return;
  const doc = activeDoc();
  const image = doc?.floatingImages?.find((entry) => entry.id === floatingImageInteraction.imageId);
  if (!image) return;
  const dx = event.clientX - floatingImageInteraction.startX;
  const dy = event.clientY - floatingImageInteraction.startY;
  if (floatingImageInteraction.mode === "move") {
    image.x = Math.max(0, floatingImageInteraction.startLeft + dx);
    image.y = Math.max(0, floatingImageInteraction.startTop + dy);
  } else {
    image.width = Math.max(180, floatingImageInteraction.startWidth + dx);
    image.height = Math.max(120, floatingImageInteraction.startHeight + dy);
  }
  floatingImageInteraction.node.style.left = `${image.x}px`;
  floatingImageInteraction.node.style.top = `${image.y}px`;
  floatingImageInteraction.node.style.width = `${image.width}px`;
  if (image.height) floatingImageInteraction.node.style.height = `${image.height}px`;
}

function stopFloatingImageInteraction() {
  if (!floatingImageInteraction) return;
  floatingImageInteraction.node.classList.remove("is-selected");
  const doc = activeDoc();
  if (doc && doc.docType === "text") doc.updatedAt = Date.now();
  if (doc && doc.docType === "text") renderFloatingImages(doc);
  floatingImageInteraction = null;
  document.body.style.cursor = "";
  save();
}

function save() {
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    pendingSaveSnapshot = JSON.stringify(state);
    if (pendingSaveSnapshot === lastWrittenSnapshot) {
      saveTimer = null;
      return;
    }
    writeWorkspaceSnapshot(pendingSaveSnapshot);
    lastWrittenSnapshot = pendingSaveSnapshot;
    saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
  lastSavedAt = new Date();
  if (state.activeView === "workspace") updateDocumentState(savedStateLabel());
}

function flushSave() {
  if (!pendingSaveSnapshot) pendingSaveSnapshot = JSON.stringify(state);
  if (saveTimer) {
    window.clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (pendingSaveSnapshot === lastWrittenSnapshot) return;
  writeWorkspaceSnapshot(pendingSaveSnapshot);
  lastWrittenSnapshot = pendingSaveSnapshot;
}

function scheduleLibraryRender() {
  if (libraryRenderRaf) return;
  libraryRenderRaf = window.requestAnimationFrame(() => {
    libraryRenderRaf = 0;
    renderLibrary();
  });
}

function scheduleWorkspaceRender() {
  if (workspaceRenderRaf) return;
  workspaceRenderRaf = window.requestAnimationFrame(() => {
    workspaceRenderRaf = 0;
    renderWorkspace();
  });
}

function exportWorkspace() {
  flushSave();
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  link.href = url;
  link.download = `forgebook-backup-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Workspace exported");
}

function normalizeSheet(doc) {
  if (!doc || doc.docType !== "sheet") return;
  if (!doc.sheet || typeof doc.sheet !== "object") {
    doc.sheet = { tables: [createSheetTable("Table 1")], activeTableId: null, selection: null };
  }
  if (!Array.isArray(doc.sheet.tables)) {
    const legacyColumns = Array.isArray(doc.sheet.columns) ? doc.sheet.columns : ["Column 1", "Column 2", "Column 3"];
    const legacyRows = Array.isArray(doc.sheet.rows) ? doc.sheet.rows : [["", "", ""], ["", "", ""], ["", "", ""]];
    doc.sheet.tables = [{
      id: uid(),
      name: "Table 1",
      columns: legacyColumns,
      rows: legacyRows,
    }];
  }
  if (!doc.sheet.tables.length) doc.sheet.tables.push(createSheetTable("Table 1"));
  doc.sheet.tables.forEach((table, index) => {
    if (!table.id) table.id = uid();
    if (!table.name) table.name = `Table ${index + 1}`;
    if (!table.preset) table.preset = "custom";
    table.span = clampNumber(Number(table.span) || 1, 1, 3);
    if (!Array.isArray(table.columns) || !table.columns.length) table.columns = ["Column 1", "Column 2", "Column 3"];
    if (!Array.isArray(table.columnWeights) || table.columnWeights.length !== table.columns.length) {
      table.columnWeights = Array(table.columns.length).fill(1);
    }
    if (!Array.isArray(table.rows) || !table.rows.length) {
      table.rows = [["", "", ""], ["", "", ""], ["", "", ""]];
    }
    table.rows = table.rows.map((row) => {
      const nextRow = Array.isArray(row) ? row.slice(0, table.columns.length) : [];
      while (nextRow.length < table.columns.length) nextRow.push("");
      return nextRow;
    });
    if (!Array.isArray(table.rowHeights) || table.rowHeights.length !== table.rows.length) {
      table.rowHeights = table.rows.map((_, rowIndex) => table.rowHeights?.[rowIndex] || 48);
    }
  });
  if (!doc.sheet.activeTableId || !doc.sheet.tables.some((table) => table.id === doc.sheet.activeTableId)) {
    doc.sheet.activeTableId = doc.sheet.tables[0].id;
  }
  if (!doc.sheet.selection || !doc.sheet.tables.some((table) => table.id === doc.sheet.selection.tableId)) {
    doc.sheet.selection = { kind: "table", tableId: doc.sheet.activeTableId };
  }
}

function activeSheetTable(doc = activeDoc()) {
  if (!doc || doc.docType !== "sheet") return null;
  normalizeSheet(doc);
  return doc.sheet.tables.find((table) => table.id === doc.sheet.activeTableId) || doc.sheet.tables[0] || null;
}

function activeSheetSelection(doc = activeDoc()) {
  if (!doc || doc.docType !== "sheet") return {};
  normalizeSheet(doc);
  return doc.sheet.selection || { kind: "table", tableId: doc.sheet.activeTableId };
}

function renderSheetFormulaBar(doc = activeDoc()) {
  if (!els.sheetFormulaInput || !els.sheetSelectionLabel) return;
  if (!doc || doc.docType !== "sheet") {
    els.sheetSelectionLabel.textContent = "--";
    if (!isEditingSheetFormula) els.sheetFormulaInput.value = "";
    els.sheetFormulaInput.disabled = true;
    if (els.sheetFormulaSuggestions) els.sheetFormulaSuggestions.innerHTML = "";
    return;
  }
  normalizeSheet(doc);
  const selection = activeSheetSelection(doc);
  const table = doc.sheet.tables.find((entry) => entry.id === selection.tableId) || activeSheetTable(doc);
  if (!table) {
    els.sheetSelectionLabel.textContent = "--";
    if (!isEditingSheetFormula) els.sheetFormulaInput.value = "";
    els.sheetFormulaInput.disabled = true;
    if (els.sheetFormulaSuggestions) els.sheetFormulaSuggestions.innerHTML = "";
    return;
  }
  els.sheetFormulaInput.disabled = false;
  renderSheetFormulaSuggestions(table);
  if (selection.kind === "cell" && selection.rowIndex != null && selection.columnIndex != null) {
    els.sheetSelectionLabel.textContent = `${sheetColumnLabel(selection.columnIndex)}${selection.rowIndex + 1}`;
    if (!isEditingSheetFormula) els.sheetFormulaInput.value = table.rows[selection.rowIndex]?.[selection.columnIndex] ?? "";
    return;
  }
  if (selection.kind === "header" && selection.columnIndex != null) {
    els.sheetSelectionLabel.textContent = `${sheetColumnLabel(selection.columnIndex)} header`;
    if (!isEditingSheetFormula) els.sheetFormulaInput.value = table.columns[selection.columnIndex] ?? "";
    return;
  }
  els.sheetSelectionLabel.textContent = table.name;
  if (!isEditingSheetFormula) els.sheetFormulaInput.value = "";
}

function renderSheetFormulaSuggestions(table) {
  if (!els.sheetFormulaSuggestions) return;
  const source = isEditingSheetFormula ? els.sheetFormulaInput?.value || "" : currentSheetFormulaValue(table);
  const refs = referencedSheetColumns(table, source);
  const suggestions = refs.length ? refs.map((entry) => ({ kind: "Column", value: entry })) : table.columns.slice(0, 6).map((entry) => ({ kind: "Field", value: entry }));
  suggestions.push({ kind: "Fn", value: "round()" }, { kind: "Fn", value: "min()" }, { kind: "Fn", value: "max()" });
  els.sheetFormulaSuggestions.innerHTML = "";
  suggestions.slice(0, 9).forEach((entry) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "sheet-suggestion-chip";
    chip.innerHTML = `<span>${escape(entry.kind)}</span><strong>${escape(entry.value)}</strong>`;
    chip.addEventListener("click", () => {
      if (!els.sheetFormulaInput) return;
      els.sheetFormulaInput.focus();
      const insert = entry.kind === "Fn" ? `=${entry.value}` : entry.value;
      const current = els.sheetFormulaInput.value || "";
      const next = current ? `${current}${current.endsWith(" ") ? "" : " "}${insert}` : insert;
      els.sheetFormulaInput.value = next;
      isEditingSheetFormula = true;
      handleSheetFormulaInput();
      renderSheet();
    });
    els.sheetFormulaSuggestions.appendChild(chip);
  });
}

function addSheetRow() {
  const doc = activeDoc();
  const table = activeSheetTable(doc);
  if (!doc || !table) return;
  table.rows.push(Array(table.columns.length).fill(""));
  table.rowHeights.push(48);
  doc.sheet.selection = { kind: "cell", tableId: table.id, rowIndex: table.rows.length - 1, columnIndex: 0 };
  save();
  renderSheet();
}

function addSheetColumn() {
  const doc = activeDoc();
  const table = activeSheetTable(doc);
  if (!doc || !table) return;
  table.columns.push(`Column ${table.columns.length + 1}`);
  table.columnWeights.push(1);
  table.rows.forEach((row) => row.push(""));
  doc.sheet.selection = { kind: "header", tableId: table.id, columnIndex: table.columns.length - 1 };
  save();
  renderSheet();
}

function addSheetTable() {
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  normalizeSheet(doc);
  const table = createSheetTable(`Table ${doc.sheet.tables.length + 1}`);
  doc.sheet.tables.push(table);
  doc.sheet.activeTableId = table.id;
  doc.sheet.selection = { kind: "table", tableId: table.id };
  save();
  renderSheet();
}

function addSheetPreset(preset) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  normalizeSheet(doc);
  const table = sheetPresetFactory(preset, doc.sheet.tables.length + 1);
  doc.sheet.tables.push(table);
  doc.sheet.activeTableId = table.id;
  doc.sheet.selection = { kind: "table", tableId: table.id };
  save();
  renderSheet();
}

function removeSheetTable(tableId) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  normalizeSheet(doc);
  if (doc.sheet.tables.length <= 1) return;
  doc.sheet.tables = doc.sheet.tables.filter((table) => table.id !== tableId);
  if (!doc.sheet.tables.some((table) => table.id === doc.sheet.activeTableId)) {
    doc.sheet.activeTableId = doc.sheet.tables[0]?.id || null;
  }
  doc.sheet.selection = { kind: "table", tableId: doc.sheet.activeTableId };
  save();
  renderSheet();
}

function clearSheetTableDropTargets() {
  els.sheetGrid?.querySelectorAll(".sheet-table-card.is-drop-before, .sheet-table-card.is-drop-after, .sheet-table-card.is-dragging").forEach((node) => {
    node.classList.remove("is-drop-before");
    node.classList.remove("is-drop-after");
    node.classList.remove("is-dragging");
  });
  els.sheetGrid?.classList.remove("is-drop-end");
}

function setSheetDropMarker(marker) {
  draggedSheetDropMarker = marker;
  clearSheetTableDropTargets();
  if (!marker || !els.sheetGrid) return;
  const draggedCard = draggedSheetTableId ? els.sheetGrid.querySelector(`.sheet-table-card[data-table-id="${draggedSheetTableId}"]`) : null;
  draggedCard?.classList.add("is-dragging");
  if (marker.type === "end") {
    els.sheetGrid.classList.add("is-drop-end");
    return;
  }
  const card = els.sheetGrid.querySelector(`.sheet-table-card[data-table-id="${marker.tableId}"]`);
  if (!card) return;
  card.classList.add(marker.type === "before" ? "is-drop-before" : "is-drop-after");
}

function reorderSheetTable(sourceTableId, targetTableId, placement = "before") {
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  const fromIndex = doc.sheet.tables.findIndex((table) => table.id === sourceTableId);
  const targetIndex = doc.sheet.tables.findIndex((table) => table.id === targetTableId);
  if (fromIndex < 0 || targetIndex < 0) return;
  let insertIndex = targetIndex + (placement === "after" ? 1 : 0);
  if (fromIndex < insertIndex) insertIndex -= 1;
  reorderSheetTableToIndex(sourceTableId, insertIndex);
}

function reorderSheetTableToIndex(sourceTableId, insertIndex) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  const fromIndex = doc.sheet.tables.findIndex((table) => table.id === sourceTableId);
  if (fromIndex < 0) return;
  const [moved] = doc.sheet.tables.splice(fromIndex, 1);
  const safeIndex = clampNumber(insertIndex, 0, doc.sheet.tables.length);
  doc.sheet.tables.splice(safeIndex, 0, moved);
  doc.sheet.activeTableId = moved.id;
  doc.sheet.selection = { kind: "table", tableId: moved.id };
  draggedSheetTableId = null;
  draggedSheetDropMarker = null;
  stopSheetAutoScroll();
  save();
  renderSheet();
}

function updateSheetTableSpan(tableId, span) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  const table = doc.sheet.tables.find((entry) => entry.id === tableId);
  if (!table) return;
  table.span = clampNumber(span, 1, 3);
  doc.sheet.activeTableId = table.id;
  doc.sheet.selection = { kind: "table", tableId: table.id };
  save();
  renderSheet();
}

function handleSheetFormulaInput() {
  const doc = activeDoc();
  const selection = activeSheetSelection(doc);
  const table = activeSheetTable(doc);
  if (!doc || doc.docType !== "sheet" || !table || !els.sheetFormulaInput) return;
  const normalized = normalizeSheetFormulaInputValue(els.sheetFormulaInput.value);
  if (selection.kind === "cell" && selection.rowIndex != null && selection.columnIndex != null) {
    table.rows[selection.rowIndex][selection.columnIndex] = normalized;
    save();
    return;
  }
  if (selection.kind === "header" && selection.columnIndex != null) {
    table.columns[selection.columnIndex] = els.sheetFormulaInput.value || `Column ${selection.columnIndex + 1}`;
    save();
  }
}

function commitSheetFormulaInput() {
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet" || !els.sheetFormulaInput) return;
  handleSheetFormulaInput();
  isEditingSheetFormula = false;
  renderSheet();
}

function insertSheetFormulaTemplate(template) {
  if (!els.sheetFormulaInput) return;
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  const input = els.sheetFormulaInput;
  input.focus();
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  input.value = `${before}${template}${after}`;
  const cursor = before.length + template.length - (template.endsWith(")") ? 1 : 0);
  input.setSelectionRange(cursor, cursor);
  isEditingSheetFormula = true;
  handleSheetFormulaInput();
}

function normalizeSheetFormulaInputValue(value) {
  const raw = String(value ?? "");
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("=")) return trimmed;
  if (trimmed.endsWith("=")) {
    const expression = trimmed.slice(0, -1).trim();
    return expression ? `=${expression}` : "";
  }
  return raw;
}

function handleSheetGridDragOver(event) {
  if (!draggedSheetTableId || !els.sheetGrid) return;
  updateSheetAutoScroll(event.clientY);
  const card = event.target.closest(".sheet-table-card");
  if (card && els.sheetGrid.contains(card)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  setSheetDropMarker({ type: "end" });
}

function handleSheetGridDrop(event) {
  if (!draggedSheetTableId || !els.sheetGrid) return;
  const card = event.target.closest(".sheet-table-card");
  if (card && els.sheetGrid.contains(card)) return;
  event.preventDefault();
  stopSheetAutoScroll();
  const doc = activeDoc();
  if (!doc || doc.docType !== "sheet") return;
  reorderSheetTableToIndex(draggedSheetTableId, doc.sheet.tables.length);
}

function handleSheetGridDragLeave(event) {
  if (!draggedSheetTableId || !els.sheetGrid) return;
  if (event.relatedTarget && els.sheetGrid.contains(event.relatedTarget)) return;
  stopSheetAutoScroll();
  clearSheetTableDropTargets();
}

function updateSheetAutoScroll(clientY) {
  const edge = 100;
  const maxSpeed = 18;
  let delta = 0;
  if (clientY < edge) {
    delta = -Math.ceil(((edge - clientY) / edge) * maxSpeed);
  } else if (clientY > window.innerHeight - edge) {
    delta = Math.ceil(((clientY - (window.innerHeight - edge)) / edge) * maxSpeed);
  }
  if (!delta) {
    stopSheetAutoScroll();
    return;
  }
  if (!sheetAutoScrollState) {
    sheetAutoScrollState = { delta, raf: 0 };
  } else {
    sheetAutoScrollState.delta = delta;
  }
  if (sheetAutoScrollState.raf) return;
  const tick = () => {
    if (!sheetAutoScrollState || !draggedSheetTableId) {
      stopSheetAutoScroll();
      return;
    }
    window.scrollBy({ top: sheetAutoScrollState.delta, behavior: "auto" });
    sheetAutoScrollState.raf = window.requestAnimationFrame(tick);
  };
  sheetAutoScrollState.raf = window.requestAnimationFrame(tick);
}

function stopSheetAutoScroll() {
  if (!sheetAutoScrollState) return;
  if (sheetAutoScrollState.raf) window.cancelAnimationFrame(sheetAutoScrollState.raf);
  sheetAutoScrollState = null;
}

function handleGlobalSheetDragStop() {
  if (!draggedSheetTableId && !sheetAutoScrollState) return;
  draggedSheetTableId = null;
  draggedSheetDropMarker = null;
  stopSheetAutoScroll();
  clearSheetTableDropTargets();
}

function deleteSheetRow() {
  const doc = activeDoc();
  const selection = activeSheetSelection(doc);
  const table = activeSheetTable(doc);
  if (!doc || !table || selection.rowIndex == null || table.rows.length <= 1) return;
  table.rows.splice(selection.rowIndex, 1);
  table.rowHeights.splice(selection.rowIndex, 1);
  const nextRowIndex = Math.min(selection.rowIndex, table.rows.length - 1);
  doc.sheet.selection = {
    kind: "cell",
    tableId: table.id,
    rowIndex: nextRowIndex,
    columnIndex: Math.min(selection.columnIndex ?? 0, table.columns.length - 1),
  };
  save();
  renderSheet();
}

function deleteSheetColumn() {
  const doc = activeDoc();
  const selection = activeSheetSelection(doc);
  const table = activeSheetTable(doc);
  if (!doc || !table || selection.columnIndex == null || table.columns.length <= 1) return;
  table.columns.splice(selection.columnIndex, 1);
  table.columnWeights.splice(selection.columnIndex, 1);
  table.rows.forEach((row) => row.splice(selection.columnIndex, 1));
  const nextColumnIndex = Math.min(selection.columnIndex, table.columns.length - 1);
  doc.sheet.selection = { kind: "header", tableId: table.id, columnIndex: nextColumnIndex };
  save();
  renderSheet();
}

function deleteActiveSheetTable() {
  const doc = activeDoc();
  const selection = activeSheetSelection(doc);
  if (!doc || doc.docType !== "sheet" || !selection.tableId) return;
  removeSheetTable(selection.tableId);
}

function sheetPresetFactory(preset, index) {
  const table = createSheetTable(`Table ${index}`);
  table.preset = preset;
  if (preset === "weapon") {
    table.name = "Weapon Balance";
    table.columns = ["Weapon", "BaseDamage", "FireRate", "CritMultiplier", "DPS", "Cost"];
    table.rows = [
      ["Rifle", "24", "0.18", "1.5", "=round(BaseDamage / FireRate)", "900"],
      ["SMG", "14", "0.08", "1.35", "=round(BaseDamage / FireRate)", "700"],
      ["Shotgun", "80", "1.2", "1.2", "=round(BaseDamage / FireRate)", "1200"],
    ];
    return table;
  }
  if (preset === "enemy") {
    table.name = "Enemy Stats";
    table.columns = ["Enemy", "Health", "Armor", "Speed", "RewardCoins", "TTK_Target"];
    table.rows = [
      ["Zombie", "180", "0", "5", "25", "2.3"],
      ["Brute", "420", "0.18", "3", "80", "4.8"],
      ["Runner", "120", "0", "8", "18", "1.6"],
    ];
    return table;
  }
  if (preset === "economy") {
    table.name = "Economy Rewards";
    table.columns = ["Source", "CoinsPerMatch", "MatchesPerHour", "CoinsPerHour", "ItemCost", "HoursToUnlock"];
    table.rows = [
      ["Daily Mission", "120", "1", "=CoinsPerMatch * MatchesPerHour", "900", "=round(ItemCost / CoinsPerHour)"],
      ["Ranked Match", "55", "8", "=CoinsPerMatch * MatchesPerHour", "900", "=round(ItemCost / CoinsPerHour)"],
      ["Casual Match", "34", "10", "=CoinsPerMatch * MatchesPerHour", "900", "=round(ItemCost / CoinsPerHour)"],
    ];
    return table;
  }
  if (preset === "progression") {
    table.name = "Progression Curve";
    table.columns = ["Level", "XPBase", "CurvePower", "XPRequired"];
    table.rows = [
      ["1", "50", "1.6", "=round(XPBase * pow(Level, CurvePower))"],
      ["5", "50", "1.6", "=round(XPBase * pow(Level, CurvePower))"],
      ["10", "50", "1.6", "=round(XPBase * pow(Level, CurvePower))"],
      ["20", "50", "1.6", "=round(XPBase * pow(Level, CurvePower))"],
    ];
    return table;
  }
  if (preset === "loot") {
    table.name = "Loot Table";
    table.columns = ["Item", "DropChance", "RarityWeight", "QuantityMin", "QuantityMax"];
    table.rows = [
      ["Potion", "0.35", "60", "1", "2"],
      ["Rare Core", "0.08", "12", "1", "1"],
      ["Gold Cache", "0.18", "28", "50", "120"],
    ];
    return table;
  }
  return table;
}

function renderSheetAnalysis(doc) {
  if (!els.sheetAnalysisGrid || !doc || doc.docType !== "sheet") return;
  const table = activeSheetTable(doc);
  if (!table) return;
  const flatValues = table.rows.flat();
  const numericValues = flatValues.map(parseFloat).filter((value) => Number.isFinite(value));
  const formulaCount = flatValues.filter(isFormulaValue).length;
  const average = numericValues.length ? (numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length) : 0;
  const stats = [
    { label: "Tables", value: String(doc.sheet.tables.length) },
    { label: "Rows", value: String(table.rows.length) },
    { label: "Columns", value: String(table.columns.length) },
    { label: "Formulas", value: String(formulaCount) },
    { label: "Min", value: numericValues.length ? trimNumber(Math.min(...numericValues)) : "--" },
    { label: "Max", value: numericValues.length ? trimNumber(Math.max(...numericValues)) : "--" },
    { label: "Average", value: numericValues.length ? trimNumber(average) : "--" },
    { label: "Preset", value: table.preset || "custom" },
  ];
  stats.forEach((stat) => {
    const card = document.createElement("article");
    card.className = "sheet-analysis-card";
    card.innerHTML = `<span>${escape(stat.label)}</span><strong>${escape(stat.value)}</strong>`;
    els.sheetAnalysisGrid.appendChild(card);
  });
}

function isFormulaValue(value) {
  return typeof value === "string" && value.trim().startsWith("=");
}

function displaySheetCell(table, rowIndex, columnIndex) {
  const raw = table.rows[rowIndex]?.[columnIndex] ?? "";
  if (!isFormulaValue(raw)) return raw;
  const result = evaluateSheetFormula(table, rowIndex, columnIndex);
  return Number.isFinite(result) ? trimNumber(result) : raw;
}

function currentSheetFormulaValue(table, doc = activeDoc()) {
  const selection = activeSheetSelection(doc);
  if (!table || !selection) return "";
  if (selection.kind === "cell" && selection.rowIndex != null && selection.columnIndex != null) {
    return table.rows[selection.rowIndex]?.[selection.columnIndex] ?? "";
  }
  if (selection.kind === "header" && selection.columnIndex != null) {
    return table.columns[selection.columnIndex] ?? "";
  }
  return "";
}

function referencedSheetColumns(table, input) {
  if (!table || !isFormulaValue(input || "")) return [];
  return table.columns.filter((name) => name && input.includes(name));
}

function evaluateSheetFormula(table, rowIndex, columnIndex, stack = new Set()) {
  const raw = table.rows[rowIndex]?.[columnIndex] ?? "";
  if (!isFormulaValue(raw)) {
    const numeric = parseFloat(raw);
    return Number.isFinite(numeric) ? numeric : NaN;
  }
  const key = `${table.id}:${rowIndex}:${columnIndex}`;
  if (stack.has(key)) return NaN;
  stack.add(key);

  const expression = raw.trim().slice(1);
  const context = {};
  table.columns.forEach((header, index) => {
    const aliases = formulaAliases(header);
    if (!aliases.length) return;
    const value = table.rows[rowIndex]?.[index] ?? "";
    let numeric;
    if (index === columnIndex) {
      numeric = NaN;
    } else if (isFormulaValue(value)) {
      numeric = evaluateSheetFormula(table, rowIndex, index, stack);
    } else {
      numeric = parseFloat(value);
    }
    aliases.forEach((alias) => {
      context[alias] = Number.isFinite(numeric) ? numeric : 0;
    });
  });

  try {
    const evaluator = new Function(...Object.keys(context), "min", "max", "clamp", "round", "pow", "sqrt", `return (${expression});`);
    const result = evaluator(
      ...Object.values(context),
      Math.min,
      Math.max,
      (value, lower, upper) => Math.min(Math.max(value, lower), upper),
      Math.round,
      Math.pow,
      Math.sqrt,
    );
    return Number(result);
  } catch {
    return NaN;
  } finally {
    stack.delete(key);
  }
}

function normalizeFormulaKey(value) {
  return String(value || "")
    .replaceAll(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((part, index) => index === 0 ? part.toLowerCase() : `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join("");
}

function formulaAliases(value) {
  const raw = String(value || "").replace(/[^a-zA-Z0-9_]+/g, "");
  const camel = normalizeFormulaKey(value);
  return [...new Set([raw, camel].filter(Boolean))];
}

function startSheetColumnResize(tableId, columnIndex, startX) {
  const doc = activeDoc();
  const table = doc?.docType === "sheet" ? doc.sheet.tables.find((entry) => entry.id === tableId) : null;
  if (!table || columnIndex >= table.columnWeights.length - 1) return;
  sheetResizeState = {
    kind: "column",
    tableId,
    columnIndex,
    startX,
    leftWeight: table.columnWeights[columnIndex],
    rightWeight: table.columnWeights[columnIndex + 1],
  };
  document.body.style.cursor = "col-resize";
}

function startSheetRowResize(tableId, rowIndex, startY) {
  const doc = activeDoc();
  const table = doc?.docType === "sheet" ? doc.sheet.tables.find((entry) => entry.id === tableId) : null;
  if (!table) return;
  sheetResizeState = {
    kind: "row",
    tableId,
    rowIndex,
    startY,
    startHeight: table.rowHeights[rowIndex] || 48,
  };
  document.body.style.cursor = "row-resize";
}

function handleSheetResizeMove(event) {
  if (!sheetResizeState) return;
  const doc = activeDoc();
  const table = doc?.docType === "sheet" ? doc.sheet.tables.find((entry) => entry.id === sheetResizeState.tableId) : null;
  if (!table) return;
  if (sheetResizeState.kind === "column") {
    const delta = (event.clientX - sheetResizeState.startX) / 120;
    const total = sheetResizeState.leftWeight + sheetResizeState.rightWeight;
    const left = clampNumber(sheetResizeState.leftWeight + delta, 0.6, total - 0.6);
    const right = total - left;
    table.columnWeights[sheetResizeState.columnIndex] = left;
    table.columnWeights[sheetResizeState.columnIndex + 1] = right;
  } else {
    const nextHeight = clampNumber(sheetResizeState.startHeight + (event.clientY - sheetResizeState.startY), 42, 180);
    table.rowHeights[sheetResizeState.rowIndex] = nextHeight;
  }
  renderSheet();
}

function stopSheetResize() {
  if (!sheetResizeState) return;
  sheetResizeState = null;
  document.body.style.cursor = "";
  save();
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex) {
  const normalized = String(hex || "").trim().replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbaString(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(139, 92, 246, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function sheetColumnLabel(index) {
  let value = Number(index) + 1;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label || "A";
}

function trimNumber(value) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function vaultButton(vault) {
  const node = document.createElement("div");
  node.className = "tree-node";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "tree-button folder";
  button.style.setProperty("--stagger-index", String(els.homeTree?.children.length || els.workspaceTree?.children.length || 0));
  if (state.selectedVaultId === vault.id) button.classList.add("active");
  button.innerHTML = `<span class="tree-row-caret"></span><span class="tree-row-icon">⌂</span><span class="tree-row-label">${escape(vault.name)}</span>`;
  button.addEventListener("click", () => openVault(vault.id));
  button.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    openVaultContextMenu(vault.id, event.clientX, event.clientY);
  });
  node.appendChild(button);
  return node;
}

function profileStats() {
  if (!state.profile.userId) state.profile.userId = randomUserId();
  return {
    owned: vaults().filter((v) => v.owner === state.profile.name).length,
    joined: vaults().filter((v) => v.owner === state.profile.name || v.members.includes(state.profile.name)).length,
    documents: documents().filter((doc) => doc.docType === "text").length,
    boards: documents().filter((doc) => doc.docType === "board").length,
    sheets: documents().filter((doc) => doc.docType === "sheet").length,
    words: documents().reduce((sum, doc) => sum + String(doc.content || "").replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length, 0),
  };
}

function item(itemId) { return state.items.find((i) => i.id === itemId) || null; }
function selectedVault() { const i = item(state.selectedVaultId); return i && i.type === "folder" && i.folderKind === "vault" ? i : null; }
function activeDoc() { const i = item(state.activeDocumentId); return i && i.type === "document" ? i : null; }
function vaults() { return state.items.filter((i) => i.type === "folder" && i.folderKind === "vault"); }
function folders() { return state.items.filter((i) => i.type === "folder" && i.folderKind === "folder"); }
function documents() { return state.items.filter((i) => i.type === "document"); }
function children(parentId) { return state.items.filter((i) => i.parentId === parentId).sort((a, b) => a.type !== b.type ? (a.type === "folder" ? -1 : 1) : a.name.localeCompare(b.name)); }
function descendants(rootId) { const out = []; const walk = (p) => children(p).forEach((c) => { out.push(c); if (c.type === "folder") walk(c.id); }); walk(rootId); return out; }
function vaultId(itemId) { let current = item(itemId); while (current?.parentId) current = item(current.parentId); return current?.type === "folder" && current.folderKind === "vault" ? current.id : null; }
function path(parentId) { const names = []; let currentId = parentId; while (currentId) { const i = item(currentId); if (!i) break; names.unshift(i.name); currentId = i.parentId; } return names.join(" / ") || "Vault"; }
function defaultDocName(type) {
  return type === "canvas"
    ? "Untitled Canvas"
    : type === "sheet"
      ? "Untitled Sheet"
      : type === "board"
        ? "Untitled Board"
        : type === "storage"
          ? "Untitled Storage"
        : "Untitled Note";
}
function escape(value) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"); }
function escapeAttr(value) { return escape(value).replaceAll('"', "&quot;"); }

function openContextMenu(x, y, items) {
  if (!els.contextMenu) return;
  els.contextMenu.innerHTML = "";
  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    button.addEventListener("click", () => {
      item.action();
      closeContextMenu();
    });
    els.contextMenu.appendChild(button);
  });
  els.contextMenu.classList.remove("hidden");
  els.contextMenu.style.visibility = "hidden";
  els.contextMenu.style.left = "0px";
  els.contextMenu.style.top = "0px";
  const width = els.contextMenu.offsetWidth;
  const height = els.contextMenu.offsetHeight;
  const left = Math.min(Math.max(8, x), Math.max(8, window.innerWidth - width - 8));
  const top = Math.min(Math.max(8, y), Math.max(8, window.innerHeight - height - 8));
  els.contextMenu.style.left = `${left}px`;
  els.contextMenu.style.top = `${top}px`;
  els.contextMenu.style.visibility = "";
}

function closeContextMenu() {
  if (!els.contextMenu) return;
  els.contextMenu.classList.add("hidden");
}

function renameNode(nodeId) {
  const node = item(nodeId);
  if (!node) return;
  openModal({
    eyebrow: node.type === "folder" ? "Rename Folder" : "Rename File",
    title: node.name,
    message: "Choose a new name.",
    confirmLabel: "Save Name",
    inputValue: node.name,
    onConfirm: (value) => {
      const next = value.trim();
      if (!next) return false;
      node.name = next;
      save();
      render();
      showToast("Renamed");
      return true;
    },
  });
}

function duplicateDocument(docId) {
  const doc = item(docId);
  if (!doc || doc.type !== "document") return;
  const clone = structuredClone(doc);
  clone.id = uid();
  clone.name = `${doc.name} Copy`;
  clone.updatedAt = Date.now();
  clone.lastOpenedAt = Date.now();
  state.items.push(clone);
  openDocument(clone.id);
  showToast("File duplicated");
}

function workspaceNodeVisible(node) {
  if (!workspaceSearch) return true;
  const ownMatch = node.name.toLowerCase().includes(workspaceSearch);
  if (ownMatch) return true;
  if (node.type === "folder") {
    return descendants(node.id).some((entry) => entry.parentId === node.id ? workspaceNodeVisible(entry) : entry.name.toLowerCase().includes(workspaceSearch));
  }
  return false;
}

function updateDocumentState(label) {
  if (!els.documentStateBadge) return;
  els.documentStateBadge.textContent = label;
}

function savedStateLabel() {
  if (!lastSavedAt) return "Saved";
  return `Saved ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function showToast(message, tone = "default") {
  if (!els.toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast ${tone !== "default" ? `toast-${tone}` : ""}`;
  toast.textContent = message;
  const toastId = ++toastTimerSeed;
  toast.dataset.toastId = String(toastId);
  els.toastStack.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("is-visible"));
  window.setTimeout(() => {
    const current = els.toastStack?.querySelector(`.toast[data-toast-id="${toastId}"]`);
    if (!current) return;
    current.classList.remove("is-visible");
    window.setTimeout(() => current.remove(), 220);
  }, 2200);
}

function recentDocuments(limit = 6) {
  return documents()
    .slice()
    .sort((a, b) => Number(b.updatedAt || b.lastOpenedAt || 0) - Number(a.updatedAt || a.lastOpenedAt || 0))
    .slice(0, limit);
}

function renderRecentDocs() {
  if (!els.recentDocs) return;
  const docs = recentDocuments(6);
  els.recentDocs.innerHTML = "";
  if (!docs.length) {
    els.recentDocs.innerHTML = `<div class="empty-state">Open and edit files to build a recent work list.</div>`;
    return;
  }
  docs.forEach((doc) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-doc-card";
    const vault = item(vaultId(doc.id));
    const stamp = doc.updatedAt || doc.lastOpenedAt || 0;
    button.innerHTML = `<strong>${escape(doc.name)}</strong><span>${escape(vault?.name || "Vault")} • ${stamp ? new Date(stamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No activity yet"}</span>`;
    button.addEventListener("click", () => openDocument(doc.id));
    els.recentDocs.appendChild(button);
  });
}

function templateNameForId(templateId) {
  return DOCUMENT_TEMPLATE_LIBRARY.find((entry) => entry.id === templateId)?.name || "Untitled Note";
}

function itemLabelForPalette(entry) {
  if (!entry) return "Unknown";
  if (entry.type === "folder") return entry.folderKind === "vault" ? "Vault" : "Folder";
  if (entry.docType === "sheet") return "Sheet";
  if (entry.docType === "canvas") return "Canvas";
  if (entry.docType === "board") return "Board";
  if (entry.docType === "storage") return "Storage";
  return "Note";
}

function paletteSortKey(match) {
  if (match.kind === "market") return Number(match.entry.lastActiveAt || 0);
  if (match.kind === "file") return Number(match.entry.updatedAt || 0);
  return Number(match.entry.lastOpenedAt || match.entry.updatedAt || 0);
}

function isWorkspaceFavorite(targetId) {
  return Boolean(targetId && (state.starredItems || []).includes(targetId));
}

function isWorkspacePinned(targetId) {
  return Boolean(targetId && (state.pinnedItems || []).includes(targetId));
}

function toggleWorkspaceFavorite(targetId) {
  if (!targetId) return;
  state.starredItems = Array.isArray(state.starredItems) ? state.starredItems : [];
  state.starredItems = state.starredItems.includes(targetId)
    ? state.starredItems.filter((id) => id !== targetId)
    : [...state.starredItems, targetId];
  showToast(state.starredItems.includes(targetId) ? "Starred" : "Removed from starred");
}

function toggleWorkspacePin(targetId) {
  if (!targetId) return;
  state.pinnedItems = Array.isArray(state.pinnedItems) ? state.pinnedItems : [];
  state.pinnedItems = state.pinnedItems.includes(targetId)
    ? state.pinnedItems.filter((id) => id !== targetId)
    : [...state.pinnedItems, targetId];
  showToast(state.pinnedItems.includes(targetId) ? "Pinned" : "Unpinned");
}

function palettePinnedItems() {
  const ids = [...new Set([...(state.pinnedItems || []), ...(state.starredItems || [])])];
  return ids.map((id) => {
    const entry = item(id) || (state.fileVault?.files || []).find((file) => file.id === id);
    if (!entry) return null;
    if (entry.type === "document" || entry.type === "folder") {
      return { id, name: entry.name, meta: itemLabelForPalette(entry) };
    }
    return { id, name: entry.name, meta: `File • ${entry.type || "Asset"}` };
  }).filter(Boolean).slice(0, 12);
}

function openPaletteItem(targetId) {
  const entry = item(targetId);
  if (entry?.type === "folder" && entry.folderKind === "vault") {
    openVault(entry.id);
    closeOverlay();
    return;
  }
  if (entry?.type === "document") {
    openDocument(entry.id);
    closeOverlay();
    return;
  }
  if ((state.fileVault?.files || []).some((file) => file.id === targetId)) {
    state.fileVault.selectedFileId = targetId;
    openOverlay("file-vault");
  }
}

function applyWorkspaceLayout(layoutId) {
  state.settings.workspace.activeLayout = layoutId;
  state.settings.appearance.layoutDensity = layoutId === "minimal" ? "compact" : layoutId === "manager" ? "comfortable" : "comfortable";
  state.settings.editor.focusMode = layoutId === "writer";
  state.contextPanelCollapsed = layoutId === "minimal";
  state.sidebarCollapsed = layoutId === "minimal";
}

function cycleWorkspaceLayout() {
  const layouts = ["writer", "balancer", "manager", "minimal"];
  const index = layouts.indexOf(state.settings.workspace.activeLayout || "writer");
  applyWorkspaceLayout(layouts[(index + 1) % layouts.length]);
}

function renderWorkspaceStatusLegacy(doc, vault) {
  if (els.workspaceStatusPrimary) {
    if (!vault) els.workspaceStatusPrimary.textContent = "No vault selected";
    else if (!doc) els.workspaceStatusPrimary.textContent = `${vault.name} • no file open`;
    else {
      const kind = doc.docType === "sheet" ? "balancing sheet" : doc.docType === "canvas" ? "canvas" : "text note";
      els.workspaceStatusPrimary.textContent = `${vault.name} • ${doc.name} • ${kind}`;
    }
  }
  if (els.workspaceStatusSecondary) {
    const counts = vault ? descendants(vault.id).filter((entry) => entry.type === "document").length : 0;
    const saved = lastSavedAt ? `Last save ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Autosave ready";
    els.workspaceStatusSecondary.textContent = `${counts} files • ${saved} • Ctrl+S save • Ctrl+K switch • Ctrl+F search`;
  }
}
function bindExtraWritingTools() {
  on("#insertChecklistButton", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    insertWritingBlock("checklist", "<ul><li><input type=\"checkbox\" /> Checklist item</li></ul>");
    persistActiveTextDocument();
  });
  on("#insertChecklistButtonVisible", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    insertWritingBlock("checklist", "<ul><li><input type=\"checkbox\" /> Checklist item</li></ul>");
    persistActiveTextDocument();
  });
  on("#insertCalloutButton", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    insertWritingBlock("callout", "<blockquote><strong>Callout</strong><p>Add key production or design note here.</p></blockquote>");
    persistActiveTextDocument();
  });
  on("#insertCalloutButtonVisible", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    insertWritingBlock("callout", "<blockquote><strong>Callout</strong><p>Add key production or design note here.</p></blockquote>");
    persistActiveTextDocument();
  });
  on("#insertTableButton", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    insertWritingBlock("table", "<table><tr><th>Column 1</th><th>Column 2</th></tr><tr><td>Value</td><td>Value</td></tr></table><p></p>");
    persistActiveTextDocument();
  });
  on("#insertTableButtonVisible", "click", () => {
    if (!activeDoc() || activeDoc().docType !== "text") return;
    insertWritingBlock("table", "<table><tr><th>Column 1</th><th>Column 2</th></tr><tr><td>Value</td><td>Value</td></tr></table><p></p>");
    persistActiveTextDocument();
  });
  on("#removeLatestWritingBlockButton", "click", removeLatestWritingBlock);
}

function applyNoteTemplate(template) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "text" || !els.textEditor) return;
  const markup = wrapWritingBlock(template, noteTemplateMarkup(template));
  const current = String(doc.content || "").replace(/<[^>]+>/g, " ").trim();
  doc.content = current ? `${doc.content}<hr />${markup}` : markup;
  doc.updatedAt = Date.now();
  save();
  renderWorkspace();
  showToast("Template inserted");
}

function noteTemplateMarkup(template) {
  if (template === "system" || template === "system-design") return `<h1>System Overview</h1><p>High-level summary.</p><h2>Design Goals</h2><ul><li></li><li></li></ul><h2>Core Loop Impact</h2><p></p><h2>Player Experience</h2><p></p><h2>Risks</h2><p></p>`;
  if (template === "quest" || template === "quest-design") return `<h1>Quest Summary</h1><p>Core premise and player goal.</p><h2>Objectives</h2><ol><li></li><li></li><li></li></ol><h2>Rewards</h2><p></p><h2>Dependencies</h2><p></p><h2>Failure States</h2><p></p>`;
  if (template === "level" || template === "level-design") return `<h1>Level Brief</h1><p>Purpose of the level.</p><h2>Primary Beats</h2><ul><li>Entrance</li><li>Midpoint</li><li>Climax</li></ul><h2>Enemies</h2><p></p><h2>Secrets and Rewards</h2><p></p>`;
  if (template === "narrative" || template === "narrative-structure") return `<h1>Narrative Beat</h1><p>Story moment summary.</p><h2>Character Goals</h2><p></p><h2>Conflict</h2><p></p><h2>Player Choice</h2><p></p><h2>Outcome</h2><p></p>`;
  if (template === "playtest") return `<h1>Playtest Review</h1><h2>Session Summary</h2><p></p><h2>Key Problems</h2><ul><li></li><li></li></ul><h2>Player Quotes</h2><blockquote></blockquote><h2>Action Items</h2><ul><li></li></ul>`;
  if (template === "gdd") return `<h1>Game Design Document</h1><h2>Vision</h2><p></p><h2>Core Loop</h2><p></p><h2>Systems</h2><ul><li></li></ul><h2>Content Scope</h2><p></p><h2>Production Risks</h2><p></p>`;
  if (template === "one-pager") return `<h1>One-Pager</h1><h2>Hook</h2><p></p><h2>Audience</h2><p></p><h2>Why It Wins</h2><p></p><h2>Production Snapshot</h2><p></p>`;
  if (template === "feature-spec") return `<h1>Feature Spec</h1><h2>Problem</h2><p></p><h2>Goals</h2><p></p><h2>User Experience</h2><p></p><h2>Dependencies</h2><p></p><h2>Success Criteria</h2><p></p>`;
  if (template === "economy-design") return `<h1>Economy Design</h1><h2>Sources</h2><p></p><h2>Sinks</h2><p></p><h2>Target Pacing</h2><p></p><h2>Inflation Risks</h2><p></p>`;
  if (template === "progression-design") return `<h1>Progression Design</h1><h2>Player Journey</h2><p></p><h2>Unlock Structure</h2><p></p><h2>Reward Timing</h2><p></p><h2>Retention Risks</h2><p></p>`;
  if (template === "balancing-brief") return `<h1>Balancing Brief</h1><h2>Current Hypothesis</h2><p></p><h2>Metrics to Watch</h2><p></p><h2>Expected Buffs / Nerfs</h2><p></p><h2>Open Questions</h2><p></p>`;
  if (template === "live-ops-planning") return `<h1>Live Ops Planning</h1><h2>Event Goal</h2><p></p><h2>Cadence</h2><p></p><h2>Rewards</h2><p></p><h2>Risk Monitoring</h2><p></p>`;
  if (template === "sprint-plan") return `<h1>Sprint Plan</h1><h2>Goals</h2><ul><li></li></ul><h2>Owners</h2><p></p><h2>Risks</h2><p></p><h2>Checkpoints</h2><p></p>`;
  if (template === "meeting-notes") return `<h1>Meeting Notes</h1><h2>Agenda</h2><ul><li></li></ul><h2>Decisions</h2><p></p><h2>Action Items</h2><p></p>`;
  if (template === "retrospective") return `<h1>Retrospective</h1><h2>Wins</h2><p></p><h2>Pain Points</h2><p></p><h2>What Changes Next</h2><p></p>`;
  if (template === "roadmap") return `<h1>Roadmap</h1><h2>Now</h2><p></p><h2>Next</h2><p></p><h2>Later</h2><p></p><h2>Dependencies</h2><p></p>`;
  if (template === "patch-notes") return `<h1>Patch Notes</h1><h2>Highlights</h2><ul><li></li></ul><h2>Balance Changes</h2><p></p><h2>Known Issues</h2><p></p>`;
  if (template === "pitch-deck") return `<h1>Pitch Deck Structure</h1><h2>Vision</h2><p></p><h2>Audience</h2><p></p><h2>Market Angle</h2><p></p><h2>Production Ask</h2><p></p>`;
  if (template === "onboarding-doc") return `<h1>Onboarding Doc</h1><h2>Project Overview</h2><p></p><h2>Key Links</h2><ul><li></li></ul><h2>Glossary</h2><p></p><h2>First Week Tasks</h2><p></p>`;
  if (template === "qa-test-plan") return `<h1>QA Test Plan</h1><h2>Scope</h2><p></p><h2>Critical Cases</h2><p></p><h2>Risks</h2><p></p><h2>Verification</h2><p></p>`;
  if (template === "bug-triage") return `<h1>Bug Triage Notes</h1><h2>Incoming Issues</h2><p></p><h2>Severity Calls</h2><p></p><h2>Release Impact</h2><p></p>`;
  if (template === "task-breakdown") return `<h1>Task Breakdown</h1><h2>Deliverables</h2><ul><li></li></ul><h2>Owners</h2><p></p><h2>Dependencies</h2><p></p>`;
  if (template === "team-brief") return `<h1>Team Brief</h1><h2>Context</h2><p></p><h2>Priorities</h2><p></p><h2>Owners</h2><p></p><h2>Watchouts</h2><p></p>`;
  return `<h1>New Section</h1><p></p>`;
}

function renderNoteUtilities(doc) {
  if (els.noteStats) els.noteStats.innerHTML = "";
  if (els.noteOutline) els.noteOutline.innerHTML = "";
  if (els.notePresetGallery) els.notePresetGallery.innerHTML = "";
  if (els.noteSectionPresets) els.noteSectionPresets.innerHTML = "";
  if (!doc || doc.docType !== "text") return;
  if (els.noteStats) {
    [...noteStatsSummary(doc), `${countWritingBlocks(doc)} writing blocks`].forEach((entry) => {
      const chip = document.createElement("span");
      chip.className = "note-stat-chip";
      chip.textContent = entry;
      els.noteStats.appendChild(chip);
    });
  }
  if (!els.noteOutline) return;
  const headings = extractNoteOutline(doc.content || "");
  if (!headings.length) {
    els.noteOutline.innerHTML = `<div class="empty-state">Use headings to build an outline for long design docs.</div>`;
    return;
  }
  headings.forEach((heading) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "note-outline-item";
    button.style.paddingLeft = `${8 + (heading.level - 1) * 14}px`;
    button.textContent = heading.text;
    button.addEventListener("click", () => scrollEditorToHeading(heading.text));
    els.noteOutline.appendChild(button);
  });
  if (els.notePresetGallery) {
    DOCUMENT_TEMPLATE_LIBRARY.slice(0, 12).forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = template.name;
      button.addEventListener("click", () => applyNoteTemplate(template.id));
      els.notePresetGallery.appendChild(button);
    });
  }
  if (els.noteSectionPresets) {
    WRITING_SECTION_PRESETS.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = preset.name;
      button.addEventListener("click", () => {
        insertWritingBlock(preset.id, preset.html);
        showToast(`${preset.name} inserted`);
      });
      els.noteSectionPresets.appendChild(button);
    });
  }
}

function noteStatsSummary(doc) {
  const plain = String(doc?.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const words = plain ? plain.split(" ").filter(Boolean).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 220));
  return [`${words} words`, `${minutes} min read`];
}

function wrapWritingBlock(type, html) {
  return `<section class="writing-block" data-writing-block="${escapeAttr(type)}" data-writing-block-id="${uid()}">${html}</section>`;
}

function insertWritingBlock(type, html) {
  insertHtmlAtSelection(wrapWritingBlock(type, html));
}

function countWritingBlocks(doc) {
  const host = document.createElement("div");
  host.innerHTML = doc?.content || "";
  return host.querySelectorAll("[data-writing-block]").length;
}

function removeLatestWritingBlock() {
  const doc = activeDoc();
  if (!doc || doc.docType !== "text") return;
  const host = document.createElement("div");
  host.innerHTML = doc.content || "";
  const blocks = [...host.querySelectorAll("[data-writing-block]")];
  const latest = blocks.at(-1);
  if (!latest) {
    showToast("No writing block to remove");
    return;
  }
  const previous = latest.previousElementSibling;
  if (previous && previous.tagName === "HR") previous.remove();
  latest.remove();
  doc.content = host.innerHTML || "<p></p>";
  doc.updatedAt = Date.now();
  save();
  renderWorkspace();
  showToast("Latest writing block removed");
}

function insertQuickBlock() {
  const doc = activeDoc();
  if (!doc) return;
  if (doc.docType === "text") {
    applyNoteTemplate("system");
    return;
  }
  if (doc.docType === "board") {
    addBoardCard();
    return;
  }
  if (doc.docType === "sheet") {
    addSheetRow();
    return;
  }
  if (doc.docType === "canvas") {
    showToast("Canvas quick blocks are coming next");
  }
}

function extractNoteOutline(html) {
  const host = document.createElement("div");
  host.innerHTML = html;
  return [...host.querySelectorAll("h1, h2, h3")].map((node) => ({
    level: Number(node.tagName.slice(1)),
    text: node.textContent?.trim() || "Untitled heading",
  })).filter((entry) => entry.text);
}

function extractDocLinks(html) {
  const matches = html.match(/\[\[([^\]]+)\]\]/g) || [];
  return [...new Set(matches.map((entry) => entry.replace(/\[\[|\]\]/g, "").trim()).filter(Boolean))];
}

function formatRelativeTime(timestamp) {
  const diff = Math.max(0, Date.now() - Number(timestamp || Date.now()));
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return `${Math.floor(diff / day)}d ago`;
}

function scrollEditorToHeading(text) {
  if (!els.textEditor) return;
  const target = [...els.textEditor.querySelectorAll("h1, h2, h3")].find((node) => node.textContent?.trim() === text);
  target?.scrollIntoView({ block: "center", behavior: "smooth" });
}

function normalizeBoard(doc) {
  if (!doc || doc.docType !== "board") return;
  if (!doc.board || typeof doc.board !== "object") doc.board = { columns: [], selectedCardId: null, selectedColumnId: null };
  if (!Array.isArray(doc.board.columns) || !doc.board.columns.length) doc.board.columns = [createBoardColumn("Backlog"), createBoardColumn("In Progress"), createBoardColumn("Review"), createBoardColumn("Done")];
  if (![1, 2, 3].includes(Number(doc.board.size))) doc.board.size = Number(state.settings?.boards?.defaultBoardSize || 2);
  if (!["kanban", "list", "table"].includes(doc.board.view)) doc.board.view = "kanban";
  if (typeof doc.board.search !== "string") doc.board.search = "";
  if (!Array.isArray(doc.board.savedViews)) doc.board.savedViews = [];
  if (!Array.isArray(doc.board.archivedCards)) doc.board.archivedCards = [];
  doc.board.columns.forEach((column, index) => {
    if (!column.id) column.id = uid();
    if (!column.name) column.name = `Column ${index + 1}`;
    if (!Array.isArray(column.cards)) column.cards = [];
    column.cards = column.cards.map((card) => ({ id: card.id || uid(), title: card.title || "New Card", body: card.body || "", assignee: card.assignee || "", subAssignee: card.subAssignee || "", dueDate: card.dueDate || "", checklist: Array.isArray(card.checklist) ? card.checklist : [], comments: Array.isArray(card.comments) ? card.comments : [], attachments: Array.isArray(card.attachments) ? card.attachments : [], color: card.color || "", status: card.status || column.name, priority: card.priority || "medium", labels: Array.isArray(card.labels) ? card.labels : [], sprint: card.sprint || "", milestone: card.milestone || "", watchers: Array.isArray(card.watchers) ? card.watchers : [], dependencies: Array.isArray(card.dependencies) ? card.dependencies : [], activity: Array.isArray(card.activity) ? card.activity : [] }));
  });
  if (!doc.board.selectedColumnId || !doc.board.columns.some((column) => column.id === doc.board.selectedColumnId)) doc.board.selectedColumnId = doc.board.columns[0]?.id || null;
}

function boardPresetConfig(presetId) {
  const entry = BOARD_PRESET_LIBRARY.find((preset) => preset.id === presetId) || BOARD_PRESET_LIBRARY[0];
  const columns = (entry?.columns || ["Backlog", "In Progress", "Done"]).map((name, index) => createBoardColumn(name, index === 0 ? [createBoardCard(`${name} item`, `Starter card for ${entry.name}`, { status: name })] : []));
  return { columns, selectedCardId: null, selectedColumnId: null, size: Number(state.settings?.boards?.defaultBoardSize || 2), view: "kanban", search: "", savedViews: [], archivedCards: [] };
}

function addBoardColumn() {
  const doc = activeDoc();
  if (!doc || doc.docType !== "board") return;
  normalizeBoard(doc);
  const column = createBoardColumn(`Column ${doc.board.columns.length + 1}`);
  doc.board.columns.push(column);
  doc.board.selectedColumnId = column.id;
  doc.updatedAt = Date.now();
  save();
  renderBoard();
  showToast("Column added");
}

function addBoardCard(options = {}) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "board") return;
  normalizeBoard(doc);
  const column = doc.board.columns.find((entry) => entry.id === doc.board.selectedColumnId) || doc.board.columns[0];
  if (!column) return;
  const card = createBoardCard(options.title || "New Card", options.body || "", options);
  column.cards.push(card);
  doc.board.selectedColumnId = column.id;
  doc.board.selectedCardId = card.id;
  doc.updatedAt = Date.now();
  save();
  renderBoard();
  showToast("Card added");
}

function applyBoardPreset(preset) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "board") return;
  doc.board = boardPresetConfig(preset);
  doc.updatedAt = Date.now();
  save();
  renderBoard();
  showToast("Board preset applied");
}

function renderBoard() {
  if (!els.boardColumns || !els.boardSummary || !els.boardWorkspaceTitle || !els.boardWorkspaceMeta) return;
  els.boardColumns.innerHTML = "";
  els.boardSummary.innerHTML = "";
  const doc = activeDoc();
  if (!doc || doc.docType !== "board") return;
  normalizeBoard(doc);
  const query = (doc.board.search || "").trim().toLowerCase();
  const totalCards = doc.board.columns.reduce((sum, column) => sum + column.cards.length, 0);
  const filteredColumns = doc.board.columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => !query || [card.title, card.body, card.assignee, ...(card.labels || [])].join(" ").toLowerCase().includes(query)),
  }));
  els.boardColumns.dataset.view = doc.board.view;
  els.boardColumns.dataset.size = String(doc.board.size || 2);
  els.boardWorkspaceTitle.textContent = doc.name;
  els.boardWorkspaceMeta.textContent = `${doc.board.columns.length} columns â€˘ ${totalCards} cards`;
  const searchInput = $("#boardSearchInput");
  if (searchInput && searchInput.value !== (doc.board.search || "")) searchInput.value = doc.board.search || "";
  els.boardWorkspaceMeta.textContent = `${doc.board.columns.length} columns | ${totalCards} cards | ${BOARD_SIZE_PRESETS.find((entry) => entry.id === doc.board.size)?.name || "Standard"}`;
  document.querySelectorAll("[data-board-size]").forEach((button) => button.classList.toggle("active", Number(button.dataset.boardSize) === Number(doc.board.size || 2)));
  document.querySelectorAll("[data-board-view]").forEach((button) => button.classList.toggle("active", button.dataset.boardView === (doc.board.view || "kanban")));
  if (doc.board.view === "table") {
    const table = document.createElement("section");
    table.className = "board-table-view premium-surface";
    table.innerHTML = `
      <div class="board-table-head"><span>Title</span><span>Column</span><span>Owner</span><span>Due</span><span>Priority</span></div>
      ${filteredColumns.flatMap((column) => column.cards.map((card) => `<button class="board-table-row" type="button" data-board-open-card="${escapeAttr(card.id)}"><strong>${escape(card.title)}</strong><span>${escape(column.name)}</span><span>${escape(card.assignee || "Unassigned")}</span><span>${escape(card.dueDate || "No date")}</span><span>${escape(card.priority || "medium")}</span></button>`)).join("") || `<div class="empty-state">No cards match this view.</div>`}
    `;
    els.boardColumns.appendChild(table);
    table.querySelectorAll("[data-board-open-card]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = doc.board.columns.flatMap((column) => column.cards).find((card) => card.id === button.dataset.boardOpenCard);
        if (!target) return;
        doc.board.selectedCardId = target.id;
        save();
        renderBoard();
      });
    });
  } else filteredColumns.forEach((column) => {
    const columnNode = document.createElement("section");
    columnNode.className = "board-column";
    columnNode.dataset.columnId = column.id;
    if (doc.board.selectedColumnId === column.id) columnNode.classList.add("active");
    columnNode.addEventListener("dragover", (event) => handleBoardColumnDragOver(event));
    columnNode.addEventListener("drop", (event) => handleBoardColumnDrop(event, column.id));

    const head = document.createElement("div");
    head.className = "board-column-head";
    const title = document.createElement("input");
    title.className = "board-column-title";
    title.value = column.name;
    title.addEventListener("focus", () => { doc.board.selectedColumnId = column.id; save(); });
    title.addEventListener("input", (event) => { column.name = event.target.value || column.name; doc.updatedAt = Date.now(); save(); });
    const actions = document.createElement("div");
    actions.className = "board-column-actions";
    const addCardButton = document.createElement("button");
    addCardButton.type = "button";
    addCardButton.className = "secondary-button";
    addCardButton.textContent = "Add Card";
    addCardButton.addEventListener("click", () => { doc.board.selectedColumnId = column.id; addBoardCard(); });
    const deleteColumnButton = document.createElement("button");
    deleteColumnButton.type = "button";
    deleteColumnButton.className = "secondary-button";
    deleteColumnButton.textContent = "Delete";
    deleteColumnButton.disabled = doc.board.columns.length <= 1;
    deleteColumnButton.addEventListener("click", () => deleteBoardColumn(column.id));
    actions.append(addCardButton, deleteColumnButton);
    head.append(title, actions);
    columnNode.appendChild(head);

    const stack = document.createElement("div");
    stack.className = `board-card-stack board-card-stack-${doc.board.view}`;
    if (!column.cards.length) {
      const empty = document.createElement("div");
      empty.className = "board-empty";
      empty.textContent = "Drop cards here";
      stack.appendChild(empty);
    }
    column.cards.forEach((card) => stack.appendChild(renderBoardCard(doc, column, card)));
    columnNode.appendChild(stack);
    els.boardColumns.appendChild(columnNode);
  });
  const allCards = doc.board.columns.flatMap((column) => column.cards);
  const overdue = allCards.filter((card) => card.dueDate && new Date(card.dueDate) < new Date()).length;
  const checklistItems = allCards.flatMap((card) => card.checklist || []);
  const blocked = allCards.filter((card) => /block/i.test(card.body || "") || (card.labels || []).includes("Blocked")).length;
  [
    { label: "Columns", value: String(doc.board.columns.length) },
    { label: "Cards", value: String(totalCards) },
    { label: "Assigned", value: String(allCards.filter((card) => card.assignee).length) },
    { label: "Overdue", value: String(overdue) },
    { label: "Checklist", value: `${checklistItems.filter((entry) => entry.done).length}/${checklistItems.length || 0}` },
    { label: "Blockers", value: String(blocked) },
  ].forEach((stat) => {
    const chip = document.createElement("article");
    chip.className = "board-summary-card";
    chip.innerHTML = `<span>${escape(stat.label)}</span><strong>${escape(stat.value)}</strong>`;
    els.boardSummary.appendChild(chip);
  });
}

function renderContextPanel(doc, vault = selectedVault()) {
  if (els.contextMeta) els.contextMeta.innerHTML = "";
  if (els.contextLinks) els.contextLinks.innerHTML = "";
  if (els.contextActionGrid) els.contextActionGrid.innerHTML = "";
  const writingSection = $("#contextWritingToolsSection");
  if (writingSection) writingSection.classList.toggle("hidden", doc?.docType !== "text");
  if (!els.contextMeta) return;
  const metaItems = !doc
    ? [
        { label: "Vault", value: vault?.name || "No vault selected" },
        { label: "State", value: "Open or create a file to begin" },
      ]
    : [
        { label: "Vault", value: vault?.name || "No vault" },
    { label: "Type", value: doc.docType === "sheet" ? "Balancing Sheet" : doc.docType === "canvas" ? "Canvas" : doc.docType === "board" ? "Manager Board" : doc.docType === "storage" ? "Storage Hub" : "Text Note" },
        { label: "Updated", value: formatRelativeTime(doc.updatedAt || Date.now()) },
        { label: "Path", value: `${path(doc.parentId)} / ${doc.name}` },
      ];
  metaItems.forEach((entry) => {
    const node = document.createElement("article");
    node.className = "context-meta-card";
    node.innerHTML = `<span>${escape(entry.label)}</span><strong>${escape(entry.value)}</strong>`;
    els.contextMeta.appendChild(node);
  });
  if (!els.contextLinks) return;
  const links = doc?.docType === "text"
    ? extractDocLinks(doc.content || "").map((entry) => ({ label: "Linked Note", value: entry }))
    : doc?.docType === "sheet"
      ? (activeSheetTable(doc)?.columns || []).slice(0, 6).map((entry) => ({ label: "Column", value: entry }))
      : doc?.docType === "board"
        ? doc.board.columns.slice(0, 6).map((entry) => ({ label: "Column", value: `${entry.name} (${entry.cards.length})` }))
        : doc?.docType === "storage"
          ? visibleStorageFiles(doc).slice(0, 6).map((entry) => ({ label: "File", value: `${entry.name} (${storageTypeLabel(entry)})` }))
        : [];
  if (!links.length) {
    els.contextLinks.innerHTML = `<div class="empty-state">No linked items yet.</div>`;
    return;
  }
  links.forEach((entry) => {
    const node = document.createElement("article");
    node.className = "context-link-card";
    node.innerHTML = `<span>${escape(entry.label)}</span><strong>${escape(entry.value)}</strong>`;
    els.contextLinks.appendChild(node);
  });
  if (els.contextActionGrid) {
    const targetId = doc?.id || vault?.id;
    [
      { label: isWorkspaceFavorite(targetId) ? "Unstar" : "Star", action: () => toggleWorkspaceFavorite(targetId) },
      { label: isWorkspacePinned(targetId) ? "Unpin" : "Pin", action: () => toggleWorkspacePin(targetId) },
      { label: "File Vault", action: () => openOverlay("file-vault") },
      { label: "Cycle Layout", action: () => cycleWorkspaceLayout() },
    ].forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button";
      button.textContent = entry.label;
      button.addEventListener("click", () => {
        entry.action();
        save();
        render();
      });
      els.contextActionGrid.appendChild(button);
    });
  }
}

function renderBoardCard(doc, column, card) {
  const node = document.createElement("article");
  node.className = "board-card";
  node.draggable = true;
  node.dataset.cardId = card.id;
  if (doc.board.selectedCardId === card.id) node.classList.add("active");
  node.addEventListener("click", () => { doc.board.selectedColumnId = column.id; doc.board.selectedCardId = card.id; save(); renderBoard(); });
  node.addEventListener("dragstart", (event) => { draggedBoardCard = { sourceColumnId: column.id, cardId: card.id }; node.classList.add("is-dragging"); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", card.id); });
  node.addEventListener("dragend", () => { draggedBoardCard = null; clearBoardDropTargets(); node.classList.remove("is-dragging"); });
  node.addEventListener("dragover", (event) => handleBoardCardDragOver(event));
  node.addEventListener("drop", (event) => handleBoardCardDrop(event, column.id, card.id));

  const title = document.createElement("input");
  title.className = "board-card-title";
  title.value = card.title;
  title.placeholder = "Card title";
  title.addEventListener("pointerdown", (event) => event.stopPropagation());
  title.addEventListener("click", (event) => event.stopPropagation());
  title.addEventListener("focus", () => {
    doc.board.selectedColumnId = column.id;
    doc.board.selectedCardId = card.id;
    save();
  });
  title.addEventListener("input", (event) => updateBoardCard(card.id, { title: event.target.value }));

  const body = document.createElement("textarea");
  body.className = "board-card-body";
  body.value = card.body || "";
  body.placeholder = "Notes, blockers, acceptance criteria";
  body.addEventListener("pointerdown", (event) => event.stopPropagation());
  body.addEventListener("click", (event) => event.stopPropagation());
  body.addEventListener("focus", () => {
    doc.board.selectedColumnId = column.id;
    doc.board.selectedCardId = card.id;
    save();
  });
  body.addEventListener("input", (event) => updateBoardCard(card.id, { body: event.target.value }));

  const meta = document.createElement("div");
  meta.className = "board-card-meta";
  const assignee = document.createElement("input");
  assignee.className = "board-card-meta-input";
  assignee.placeholder = "Owner";
  assignee.value = card.assignee || "";
  assignee.addEventListener("pointerdown", (event) => event.stopPropagation());
  assignee.addEventListener("click", (event) => event.stopPropagation());
  assignee.addEventListener("input", (event) => updateBoardCard(card.id, { assignee: event.target.value }));
  const dueDate = document.createElement("input");
  dueDate.className = "board-card-meta-input";
  dueDate.type = "date";
  dueDate.value = card.dueDate || "";
  dueDate.addEventListener("pointerdown", (event) => event.stopPropagation());
  dueDate.addEventListener("click", (event) => event.stopPropagation());
  dueDate.addEventListener("input", (event) => updateBoardCard(card.id, { dueDate: event.target.value }));
  meta.append(assignee, dueDate);

  const checklist = document.createElement("div");
  checklist.className = "board-checklist";
  (card.checklist || []).forEach((itemEntry, itemIndex) => {
    const row = document.createElement("label");
    row.className = "board-checklist-item";
    row.innerHTML = `<input type="checkbox" ${itemEntry.done ? "checked" : ""} /><span contenteditable="true">${escape(itemEntry.text || "Task")}</span>`;
    row.addEventListener("pointerdown", (event) => event.stopPropagation());
    row.addEventListener("click", (event) => event.stopPropagation());
    row.querySelector("input")?.addEventListener("input", (event) => { card.checklist[itemIndex].done = Boolean(event.target.checked); touchBoardDoc(); });
    row.querySelector("span")?.addEventListener("input", (event) => { card.checklist[itemIndex].text = event.target.textContent || "Task"; touchBoardDoc(); });
    checklist.appendChild(row);
  });

  const footer = document.createElement("div");
  footer.className = "board-card-footer";
  const addChecklist = document.createElement("button");
  addChecklist.type = "button";
  addChecklist.className = "secondary-button";
  addChecklist.textContent = "Checklist";
  addChecklist.addEventListener("pointerdown", (event) => event.stopPropagation());
  addChecklist.addEventListener("click", () => { if (!Array.isArray(card.checklist)) card.checklist = []; card.checklist.push({ text: "Task", done: false }); touchBoardDoc(); renderBoard(); });
  const detailsButton = document.createElement("button");
  detailsButton.type = "button";
  detailsButton.className = "secondary-button";
  detailsButton.textContent = "Details";
  detailsButton.addEventListener("pointerdown", (event) => event.stopPropagation());
  detailsButton.addEventListener("click", () => openBoardCardDetails(card.id));
  const deleteCard = document.createElement("button");
  deleteCard.type = "button";
  deleteCard.className = "secondary-button";
  deleteCard.textContent = "Delete";
  deleteCard.addEventListener("pointerdown", (event) => event.stopPropagation());
  deleteCard.addEventListener("click", () => deleteBoardCard(card.id));
  footer.append(addChecklist, detailsButton, deleteCard);

  node.append(title, body, meta, checklist, footer);
  return node;
}

function updateBoardCard(cardId, patch) {
  const target = findBoardCard(cardId);
  if (!target) return;
  Object.assign(target.card, patch);
  touchBoardDoc();
}

function openBoardCardDetails(cardId) {
  const target = findBoardCard(cardId);
  if (!target || !els.overlayBody || !els.overlayEyebrow || !els.overlayTitle) return;
  const { column, card } = target;
  els.overlayCard?.classList.remove("overlay-card-chat");
  els.overlayEyebrow.textContent = "Board Card";
  els.overlayTitle.textContent = card.title || "Card details";
  els.overlayBody.innerHTML = `
    <section class="overlay-section board-card-detail-grid">
      <label class="modal-input-wrap">
        <span class="eyebrow">Description</span>
        <textarea id="boardDetailBody" class="modal-input">${escape(card.body || "")}</textarea>
      </label>
      <div class="overlay-inline-actions">
        <input id="boardDetailOwner" class="modal-input" type="text" placeholder="Owner" value="${escapeAttr(card.assignee || "")}" />
        <input id="boardDetailDueDate" class="modal-input" type="date" value="${escapeAttr(card.dueDate || "")}" />
      </div>
      <section class="context-section">
        <p class="eyebrow">Checklist</p>
        <div>${(card.checklist || []).map((entry, index) => `<label class="board-checklist-item"><input type="checkbox" data-board-detail-check="${index}" ${entry.done ? "checked" : ""} /><span contenteditable="true" data-board-detail-text="${index}">${escape(entry.text || "Task")}</span></label>`).join("") || '<div class="empty-state">No checklist items yet.</div>'}</div>
      </section>
      <section class="context-section">
        <p class="eyebrow">Attachments</p>
        <div id="boardDetailAttachments">${(card.attachments || []).length ? card.attachments.map((entry) => `<div class="context-link-card"><strong>${escape(entry)}</strong></div>`).join("") : '<div class="empty-state">No attachments yet.</div>'}</div>
      </section>
      <section class="context-section">
        <p class="eyebrow">Comments</p>
        <div id="boardDetailComments">${(card.comments || []).length ? card.comments.map((entry) => `<div class="context-link-card"><strong>${escape(entry.author || "User")}</strong><span>${escape(entry.body || "")}</span></div>`).join("") : '<div class="empty-state">No comments yet.</div>'}</div>
        <div class="overlay-inline-actions">
          <input id="boardDetailCommentInput" class="modal-input" type="text" placeholder="Add comment" />
          <button id="boardDetailAddCommentButton" class="secondary-button" type="button">Comment</button>
        </div>
      </section>
      <div class="overlay-inline-actions">
        <span class="state-badge">${escape(column.name)}</span>
      </div>
    </section>
  `;
  els.overlayPanel?.classList.remove("hidden");
  $("#boardDetailBody")?.addEventListener("input", (event) => updateBoardCard(card.id, { body: event.target.value }));
  $("#boardDetailOwner")?.addEventListener("input", (event) => updateBoardCard(card.id, { assignee: event.target.value }));
  $("#boardDetailDueDate")?.addEventListener("input", (event) => updateBoardCard(card.id, { dueDate: event.target.value }));
  els.overlayBody.querySelectorAll("[data-board-detail-check]").forEach((input) => {
    input.addEventListener("input", (event) => {
      card.checklist[Number(event.target.dataset.boardDetailCheck)].done = Boolean(event.target.checked);
      touchBoardDoc();
    });
  });
  els.overlayBody.querySelectorAll("[data-board-detail-text]").forEach((input) => {
    input.addEventListener("input", (event) => {
      card.checklist[Number(event.target.dataset.boardDetailText)].text = event.target.textContent || "Task";
      touchBoardDoc();
    });
  });
  on("#boardDetailAddCommentButton", "click", () => {
    const input = $("#boardDetailCommentInput");
    const value = input?.value.trim();
    if (!value) return;
    card.comments.push({ author: state.profile.name, body: value, createdAt: Date.now() });
    touchBoardDoc();
    openBoardCardDetails(card.id);
  });
}

function deleteBoardCard(cardId) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "board") return;
  let removed = false;
  doc.board.columns.forEach((column) => {
    const next = column.cards.filter((card) => card.id !== cardId);
    if (next.length !== column.cards.length) removed = true;
    column.cards = next;
  });
  if (!removed) return;
  if (doc.board.selectedCardId === cardId) doc.board.selectedCardId = null;
  touchBoardDoc();
  renderBoard();
  showToast("Card deleted");
}

function deleteBoardColumn(columnId) {
  const doc = activeDoc();
  if (!doc || doc.docType !== "board" || doc.board.columns.length <= 1) return;
  doc.board.columns = doc.board.columns.filter((column) => column.id !== columnId);
  if (doc.board.selectedColumnId === columnId) doc.board.selectedColumnId = doc.board.columns[0]?.id || null;
  touchBoardDoc();
  renderBoard();
  showToast("Column deleted");
}

function findBoardCard(cardId, doc = activeDoc()) {
  if (!doc || doc.docType !== "board") return null;
  for (const column of doc.board.columns) {
    const card = column.cards.find((entry) => entry.id === cardId);
    if (card) return { column, card };
  }
  return null;
}

function handleBoardColumnDragOver(event) {
  if (!draggedBoardCard) return;
  event.preventDefault();
  event.currentTarget.classList.add("is-drop-target");
}

function handleBoardColumnDrop(event, columnId) {
  if (!draggedBoardCard) return;
  event.preventDefault();
  moveBoardCard(draggedBoardCard.cardId, draggedBoardCard.sourceColumnId, columnId, null, "end");
}

function handleBoardCardDragOver(event) {
  if (!draggedBoardCard) return;
  event.preventDefault();
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  clearBoardDropTargets();
  card.classList.add(placement === "before" ? "is-drop-before" : "is-drop-after");
  card.closest(".board-column")?.classList.add("is-drop-target");
}

function handleBoardCardDrop(event, columnId, cardId) {
  if (!draggedBoardCard || draggedBoardCard.cardId === cardId) return;
  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  const placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  moveBoardCard(draggedBoardCard.cardId, draggedBoardCard.sourceColumnId, columnId, cardId, placement);
}

function moveBoardCard(cardId, sourceColumnId, targetColumnId, targetCardId = null, placement = "end") {
  const doc = activeDoc();
  if (!doc || doc.docType !== "board") return;
  const sourceColumn = doc.board.columns.find((column) => column.id === sourceColumnId);
  const targetColumn = doc.board.columns.find((column) => column.id === targetColumnId);
  if (!sourceColumn || !targetColumn) return;
  const fromIndex = sourceColumn.cards.findIndex((card) => card.id === cardId);
  if (fromIndex < 0) return;
  const [card] = sourceColumn.cards.splice(fromIndex, 1);
  let insertIndex = targetColumn.cards.length;
  if (targetCardId) {
    const targetIndex = targetColumn.cards.findIndex((entry) => entry.id === targetCardId);
    insertIndex = targetIndex < 0 ? targetColumn.cards.length : targetIndex + (placement === "after" ? 1 : 0);
  }
  targetColumn.cards.splice(insertIndex, 0, card);
  doc.board.selectedColumnId = targetColumn.id;
  doc.board.selectedCardId = card.id;
  draggedBoardCard = null;
  clearBoardDropTargets();
  touchBoardDoc();
  renderBoard();
}

function clearBoardDropTargets() {
  document.querySelectorAll(".board-column.is-drop-target, .board-card.is-drop-before, .board-card.is-drop-after, .board-card.is-dragging").forEach((node) => {
    node.classList.remove("is-drop-target");
    node.classList.remove("is-drop-before");
    node.classList.remove("is-drop-after");
    node.classList.remove("is-dragging");
  });
}

function touchBoardDoc() {
  const doc = activeDoc();
  if (!doc || doc.docType !== "board") return;
  doc.updatedAt = Date.now();
  save();
}

function renderWorkspaceStatusBroken(doc, vault) {
  if (els.workspaceStatusPrimary) {
    if (!vault) els.workspaceStatusPrimary.textContent = "No vault selected";
    else if (!doc) els.workspaceStatusPrimary.textContent = `${vault.name} â€˘ no file open`;
    else {
      const kind = doc.docType === "sheet" ? "balancing sheet" : doc.docType === "canvas" ? "canvas" : doc.docType === "board" ? "production board" : doc.docType === "storage" ? "storage hub" : "text note";
      els.workspaceStatusPrimary.textContent = `${vault.name} â€˘ ${doc.name} â€˘ ${kind}`;
    }
  }
  if (els.workspaceStatusSecondary) {
    const counts = vault ? descendants(vault.id).filter((entry) => entry.type === "document").length : 0;
    const saved = lastSavedAt ? `Last save ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Autosave ready";
    const meta = doc?.docType === "text" ? ` â€˘ ${noteStatsSummary(doc).join(" â€˘ ")}` : "";
    els.workspaceStatusSecondary.textContent = `${counts} files â€˘ ${saved}${meta} â€˘ Ctrl+S save â€˘ Ctrl+K switch â€˘ Ctrl+F search`;
  }
}
function renderWorkspaceStatus(doc, vault) {
  if (els.workspaceStatusPrimary) {
    if (!vault) els.workspaceStatusPrimary.textContent = "No vault selected";
    else if (!doc) els.workspaceStatusPrimary.textContent = `${vault.name} | no file open`;
    else {
      const kind = doc.docType === "sheet" ? "balancing sheet" : doc.docType === "canvas" ? "canvas" : doc.docType === "board" ? "production board" : "text note";
      els.workspaceStatusPrimary.textContent = `${vault.name} | ${doc.name} | ${kind}`;
    }
  }
  if (els.workspaceStatusSecondary) {
    const counts = vault ? descendants(vault.id).filter((entry) => entry.type === "document").length : 0;
    const saved = lastSavedAt ? `Last save ${lastSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Autosave ready";
  const meta = doc?.docType === "text" ? ` | ${noteStatsSummary(doc).join(" | ")}` : doc?.docType === "storage" ? ` | ${fileVaultEntries().length} stored files | ${storageFolders().length} folders` : "";
    els.workspaceStatusSecondary.textContent = `${counts} files | ${saved}${meta} | Ctrl+S save | Ctrl+K switch | Ctrl+F search`;
  }
}
