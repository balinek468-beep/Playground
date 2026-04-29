import { createDefaultStateSnapshot, createVault } from "../../app/state.js";
import {
  FORGEBOOK_APP_STATE_PATH,
  FORGEBOOK_BACKUPS_DIR,
  FORGEBOOK_RECOVERY_LOG_PATH,
  FORGEBOOK_VAULT_INDEX_PATH,
  conflictCopyPath,
  documentFolderForType,
  documentPath,
  folderPath,
  itemBackupPath,
  itemBackupPrefix,
  normalizePath,
  vaultBoardsDir,
  vaultDocsDir,
  vaultFilesDir,
  vaultMetaPath,
  vaultNotesDir,
  vaultRootPath,
} from "./VaultPaths.js";

const DEFAULT_BACKUP_LIMIT = 8;
const DEFAULT_HISTORY_LIMIT = 20;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function makeRecoveryWarning(message, path) {
  return path ? `${message} (${path})` : message;
}

function sortByUpdatedDesc(entries) {
  return [...entries].sort((left, right) => right.path.localeCompare(left.path));
}

export class VaultManager {
  constructor(options = {}) {
    this.provider = options.provider;
    this.createBaseStateSnapshot = options.createBaseStateSnapshot || createDefaultStateSnapshot;
    this.backupLimit = Number(options.backupLimit || DEFAULT_BACKUP_LIMIT);
    this.historyLimit = Number(options.historyLimit || DEFAULT_HISTORY_LIMIT);
  }

  _hasSync() {
    return Boolean(this.provider?.isSynchronous && this.provider?.loadSync && this.provider?.saveSync && this.provider?.listSync && this.provider?.deleteSync);
  }

  _readTextSync(path) {
    return this.provider.loadSync(normalizePath(path));
  }

  async _readText(path) {
    if (this._hasSync()) return this._readTextSync(path);
    return this.provider.load(normalizePath(path));
  }

  _writeTextSync(path, contents, options = {}) {
    return this.provider.saveSync(normalizePath(path), contents, options);
  }

  async _writeText(path, contents, options = {}) {
    if (this._hasSync()) return this._writeTextSync(path, contents, options);
    return this.provider.save(normalizePath(path), contents, options);
  }

  _deleteSync(path) {
    return this.provider.deleteSync(normalizePath(path));
  }

  async _delete(path) {
    if (this._hasSync()) return this._deleteSync(path);
    return this.provider.delete(normalizePath(path));
  }

  _listSync(prefix) {
    return this.provider.listSync(normalizePath(prefix));
  }

  async _list(prefix) {
    if (this._hasSync()) return this._listSync(prefix);
    return this.provider.list(normalizePath(prefix));
  }

  _parseJson(raw, path) {
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`ForgeBook vault JSON parse failed for ${path}`, error);
      return { __forgebookParseError: error?.message || "Invalid JSON", __forgebookRaw: raw };
    }
  }

  _appendRecoveryLogSync(entry) {
    const current = this._loadJsonWithRecoverySync(FORGEBOOK_RECOVERY_LOG_PATH, { events: [] }).data;
    const next = {
      events: [
        {
          at: nowIso(),
          ...entry,
        },
        ...(Array.isArray(current?.events) ? current.events : []),
      ].slice(0, this.historyLimit),
    };
    this._writeJsonWithBackupSync(FORGEBOOK_RECOVERY_LOG_PATH, next, { skipBackup: true });
  }

  async _appendRecoveryLog(entry) {
    if (this._hasSync()) return this._appendRecoveryLogSync(entry);
    const current = (await this._loadJsonWithRecovery(FORGEBOOK_RECOVERY_LOG_PATH, { events: [] })).data;
    const next = {
      events: [
        {
          at: nowIso(),
          ...entry,
        },
        ...(Array.isArray(current?.events) ? current.events : []),
      ].slice(0, this.historyLimit),
    };
    await this._writeJsonWithBackup(FORGEBOOK_RECOVERY_LOG_PATH, next, { skipBackup: true });
  }

  _readBackupsSync(path) {
    const prefix = itemBackupPrefix(path);
    return sortByUpdatedDesc(this._listSync(prefix));
  }

  async _readBackups(path) {
    const prefix = itemBackupPrefix(path);
    return sortByUpdatedDesc(await this._list(prefix));
  }

  _loadJsonWithRecoverySync(path, fallback = null) {
    const normalizedPath = normalizePath(path);
    const raw = this._readTextSync(normalizedPath);
    if (raw == null) return { data: fallback, warnings: [] };
    const parsed = this._parseJson(raw, normalizedPath);
    if (!parsed || !parsed.__forgebookParseError) return { data: parsed, warnings: [] };
    const backups = this._readBackupsSync(normalizedPath);
    for (const backup of backups) {
      const backupRaw = this._readTextSync(backup.path);
      const recovered = this._parseJson(backupRaw, backup.path);
      if (recovered && !recovered.__forgebookParseError) {
        const warning = makeRecoveryWarning("Recovered from backup after vault file corruption", normalizedPath);
        this._appendRecoveryLogSync({ type: "recovered_from_backup", path: normalizedPath, backupPath: backup.path });
        return { data: recovered, warnings: [warning] };
      }
    }
    this._appendRecoveryLogSync({ type: "corrupt_file", path: normalizedPath, error: parsed.__forgebookParseError });
    return { data: fallback, warnings: [makeRecoveryWarning("Vault file is corrupted and no valid backup was found", normalizedPath)] };
  }

  async _loadJsonWithRecovery(path, fallback = null) {
    if (this._hasSync()) return this._loadJsonWithRecoverySync(path, fallback);
    const normalizedPath = normalizePath(path);
    const raw = await this._readText(normalizedPath);
    if (raw == null) return { data: fallback, warnings: [] };
    const parsed = this._parseJson(raw, normalizedPath);
    if (!parsed || !parsed.__forgebookParseError) return { data: parsed, warnings: [] };
    const backups = await this._readBackups(normalizedPath);
    for (const backup of backups) {
      const backupRaw = await this._readText(backup.path);
      const recovered = this._parseJson(backupRaw, backup.path);
      if (recovered && !recovered.__forgebookParseError) {
        const warning = makeRecoveryWarning("Recovered from backup after vault file corruption", normalizedPath);
        await this._appendRecoveryLog({ type: "recovered_from_backup", path: normalizedPath, backupPath: backup.path });
        return { data: recovered, warnings: [warning] };
      }
    }
    await this._appendRecoveryLog({ type: "corrupt_file", path: normalizedPath, error: parsed.__forgebookParseError });
    return { data: fallback, warnings: [makeRecoveryWarning("Vault file is corrupted and no valid backup was found", normalizedPath)] };
  }

  _pruneBackupsSync(path) {
    const backups = this._readBackupsSync(path);
    backups.slice(this.backupLimit).forEach((entry) => this._deleteSync(entry.path));
  }

  async _pruneBackups(path) {
    const backups = await this._readBackups(path);
    for (const entry of backups.slice(this.backupLimit)) {
      await this._delete(entry.path);
    }
  }

  _writeJsonWithBackupSync(path, data, options = {}) {
    const normalizedPath = normalizePath(path);
    const previous = this._readTextSync(normalizedPath);
    if (previous != null && !options.skipBackup) {
      this._writeTextSync(itemBackupPath(normalizedPath), previous, { atomic: true });
      this._pruneBackupsSync(normalizedPath);
    }
    return this._writeTextSync(normalizedPath, JSON.stringify(data, null, 2), { atomic: true });
  }

  async _writeJsonWithBackup(path, data, options = {}) {
    if (this._hasSync()) return this._writeJsonWithBackupSync(path, data, options);
    const normalizedPath = normalizePath(path);
    const previous = await this._readText(normalizedPath);
    if (previous != null && !options.skipBackup) {
      await this._writeText(itemBackupPath(normalizedPath), previous, { atomic: true });
      await this._pruneBackups(normalizedPath);
    }
    return this._writeText(normalizedPath, JSON.stringify(data, null, 2), { atomic: true });
  }

  _findOwningVaultId(itemId, itemMap) {
    let current = itemMap.get(itemId) || null;
    while (current) {
      if (current.type === "folder" && current.folderKind === "vault") return current.id;
      current = current.parentId ? itemMap.get(current.parentId) || null : null;
    }
    return null;
  }

  _decomposeState(state) {
    const safeState = deepClone(state || this.createBaseStateSnapshot());
    const itemMap = new Map((safeState.items || []).map((item) => [item.id, item]));
    const vaults = [];
    const foldersByVault = new Map();
    const documentsByVault = new Map();
    for (const item of safeState.items || []) {
      if (item.type === "folder" && item.folderKind === "vault") {
        vaults.push(item);
        foldersByVault.set(item.id, []);
        documentsByVault.set(item.id, []);
      }
    }
    for (const item of safeState.items || []) {
      if (item.type === "folder" && item.folderKind !== "vault") {
        const vaultId = this._findOwningVaultId(item.id, itemMap);
        if (vaultId) {
          if (!foldersByVault.has(vaultId)) foldersByVault.set(vaultId, []);
          foldersByVault.get(vaultId).push(item);
        }
      }
      if (item.type === "document") {
        const vaultId = this._findOwningVaultId(item.id, itemMap);
        if (vaultId) {
          if (!documentsByVault.has(vaultId)) documentsByVault.set(vaultId, []);
          documentsByVault.get(vaultId).push(item);
        }
      }
    }

    const appState = {
      schemaVersion: 1,
      activeView: safeState.activeView,
      selectedVaultId: safeState.selectedVaultId,
      selectedNodeId: safeState.selectedNodeId,
      activeDocumentId: safeState.activeDocumentId,
      sidebarCollapsed: safeState.sidebarCollapsed,
      contextPanelCollapsed: safeState.contextPanelCollapsed,
      comparisonDocumentId: safeState.comparisonDocumentId,
      collapsedFolders: safeState.collapsedFolders,
      softwareName: safeState.softwareName,
      profile: safeState.profile,
      social: safeState.social,
      marketProfiles: safeState.marketProfiles,
      notifications: safeState.notifications,
      starredItems: safeState.starredItems,
      pinnedItems: safeState.pinnedItems,
      fileVault: safeState.fileVault,
      persistence: safeState.persistence,
      settings: safeState.settings,
      settingsMeta: safeState.settingsMeta,
      libraryCategories: safeState.libraryCategories,
      openTabs: safeState.openTabs,
      itemOrder: (safeState.items || []).map((item) => item.id),
    };

    return { appState, vaults, foldersByVault, documentsByVault };
  }

  _mergeAppState(baseState, appState) {
    const next = deepClone(baseState);
    const scalarKeys = [
      "activeView",
      "selectedVaultId",
      "selectedNodeId",
      "activeDocumentId",
      "sidebarCollapsed",
      "contextPanelCollapsed",
      "comparisonDocumentId",
      "softwareName",
      "notifications",
      "starredItems",
      "pinnedItems",
      "fileVault",
      "persistence",
      "settings",
      "settingsMeta",
      "libraryCategories",
      "openTabs",
      "marketProfiles",
      "collapsedFolders",
    ];
    scalarKeys.forEach((key) => {
      if (appState?.[key] !== undefined) next[key] = appState[key];
    });
    if (appState?.profile) next.profile = { ...next.profile, ...appState.profile };
    if (appState?.social) next.social = { ...next.social, ...appState.social };
    return next;
  }

  _orderItems(items, itemOrder = []) {
    const orderMap = new Map(itemOrder.map((id, index) => [id, index]));
    return [...items].sort((left, right) => {
      const leftOrder = orderMap.has(left.id) ? orderMap.get(left.id) : Number.MAX_SAFE_INTEGER;
      const rightOrder = orderMap.has(right.id) ? orderMap.get(right.id) : Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return String(left.name || left.id).localeCompare(String(right.name || right.id));
    });
  }

  _scanVaultIdsFromEntries(entries) {
    const ids = new Set();
    entries.forEach((entry) => {
      const match = String(entry.path || "").match(/^\/ForgeBook\/vaults\/([^/]+)/);
      if (match?.[1]) ids.add(match[1]);
    });
    return Array.from(ids);
  }

  _rebuildStateSync() {
    const warnings = [];
    const baseState = this.createBaseStateSnapshot();
    const appStateResult = this._loadJsonWithRecoverySync(FORGEBOOK_APP_STATE_PATH, {});
    warnings.push(...appStateResult.warnings);
    const indexResult = this._loadJsonWithRecoverySync(FORGEBOOK_VAULT_INDEX_PATH, { vaults: [] });
    warnings.push(...indexResult.warnings);
    const indexData = indexResult.data || { vaults: [] };
    let vaultIds = Array.isArray(indexData.vaults) ? indexData.vaults.map((entry) => (typeof entry === "string" ? entry : entry.id)).filter(Boolean) : [];
    if (!vaultIds.length) {
      vaultIds = this._scanVaultIdsFromEntries(this._listSync("/ForgeBook/vaults"));
    }

    const items = [];
    vaultIds.forEach((vaultId) => {
      const vaultResult = this._loadJsonWithRecoverySync(vaultMetaPath(vaultId), createVault("Recovered Vault"));
      warnings.push(...vaultResult.warnings);
      const vault = { ...createVault("Recovered Vault"), ...(vaultResult.data || {}), id: vaultId };
      items.push(vault);

      const folderEntries = this._listSync(`/ForgeBook/vaults/${vaultId}/folders`);
      folderEntries.forEach((entry) => {
        const folderResult = this._loadJsonWithRecoverySync(entry.path, null);
        warnings.push(...folderResult.warnings);
        if (folderResult.data) items.push(folderResult.data);
      });

      const docEntries = [
        ...this._listSync(vaultNotesDir(vaultId)),
        ...this._listSync(vaultBoardsDir(vaultId)),
        ...this._listSync(vaultDocsDir(vaultId)),
      ];
      docEntries.forEach((entry) => {
        const docResult = this._loadJsonWithRecoverySync(entry.path, null);
        warnings.push(...docResult.warnings);
        if (docResult.data) items.push(docResult.data);
      });
    });

    const merged = this._mergeAppState(baseState, appStateResult.data || {});
    merged.items = this._orderItems(items, Array.isArray(appStateResult.data?.itemOrder) ? appStateResult.data.itemOrder : []);
    return { state: merged, recoveryWarnings: Array.from(new Set(warnings)), source: "vault" };
  }

  async _rebuildState() {
    if (this._hasSync()) return this._rebuildStateSync();
    const warnings = [];
    const baseState = this.createBaseStateSnapshot();
    const appStateResult = await this._loadJsonWithRecovery(FORGEBOOK_APP_STATE_PATH, {});
    warnings.push(...appStateResult.warnings);
    const indexResult = await this._loadJsonWithRecovery(FORGEBOOK_VAULT_INDEX_PATH, { vaults: [] });
    warnings.push(...indexResult.warnings);
    const indexData = indexResult.data || { vaults: [] };
    let vaultIds = Array.isArray(indexData.vaults) ? indexData.vaults.map((entry) => (typeof entry === "string" ? entry : entry.id)).filter(Boolean) : [];
    if (!vaultIds.length) {
      vaultIds = this._scanVaultIdsFromEntries(await this._list("/ForgeBook/vaults"));
    }

    const items = [];
    for (const vaultId of vaultIds) {
      const vaultResult = await this._loadJsonWithRecovery(vaultMetaPath(vaultId), createVault("Recovered Vault"));
      warnings.push(...vaultResult.warnings);
      const vault = { ...createVault("Recovered Vault"), ...(vaultResult.data || {}), id: vaultId };
      items.push(vault);

      const folderEntries = await this._list(`/ForgeBook/vaults/${vaultId}/folders`);
      for (const entry of folderEntries) {
        const folderResult = await this._loadJsonWithRecovery(entry.path, null);
        warnings.push(...folderResult.warnings);
        if (folderResult.data) items.push(folderResult.data);
      }

      const docEntries = [
        ...(await this._list(vaultNotesDir(vaultId))),
        ...(await this._list(vaultBoardsDir(vaultId))),
        ...(await this._list(vaultDocsDir(vaultId))),
      ];
      for (const entry of docEntries) {
        const docResult = await this._loadJsonWithRecovery(entry.path, null);
        warnings.push(...docResult.warnings);
        if (docResult.data) items.push(docResult.data);
      }
    }

    const merged = this._mergeAppState(baseState, appStateResult.data || {});
    merged.items = this._orderItems(items, Array.isArray(appStateResult.data?.itemOrder) ? appStateResult.data.itemOrder : []);
    return { state: merged, recoveryWarnings: Array.from(new Set(warnings)), source: "vault" };
  }

  _expectedPathsForVault(vaultId, folders, documents) {
    const expected = new Set([vaultMetaPath(vaultId)]);
    folders.forEach((folder) => expected.add(folderPath(vaultId, folder.id)));
    documents.forEach((doc) => expected.add(documentPath(vaultId, doc)));
    return expected;
  }

  _cleanupStaleVaultFilesSync(vaultId, expectedPaths) {
    const existing = [
      ...this._listSync(`/ForgeBook/vaults/${vaultId}/folders`),
      ...this._listSync(vaultNotesDir(vaultId)),
      ...this._listSync(vaultBoardsDir(vaultId)),
      ...this._listSync(vaultDocsDir(vaultId)),
    ];
    existing.forEach((entry) => {
      if (!expectedPaths.has(entry.path)) {
        this._deleteSync(entry.path);
      }
    });
  }

  async _cleanupStaleVaultFiles(vaultId, expectedPaths) {
    if (this._hasSync()) return this._cleanupStaleVaultFilesSync(vaultId, expectedPaths);
    const existing = [
      ...(await this._list(`/ForgeBook/vaults/${vaultId}/folders`)),
      ...(await this._list(vaultNotesDir(vaultId))),
      ...(await this._list(vaultBoardsDir(vaultId))),
      ...(await this._list(vaultDocsDir(vaultId))),
    ];
    for (const entry of existing) {
      if (!expectedPaths.has(entry.path)) {
        await this._delete(entry.path);
      }
    }
  }

  _writeWorkspaceBackupSync(state) {
    this._writeJsonWithBackupSync(`${FORGEBOOK_BACKUPS_DIR}/workspace-${Date.now()}.json`, state, { skipBackup: true });
    const backups = sortByUpdatedDesc(this._listSync(FORGEBOOK_BACKUPS_DIR).filter((entry) => /workspace-\d+\.json$/.test(entry.path)));
    backups.slice(this.backupLimit).forEach((entry) => this._deleteSync(entry.path));
  }

  async _writeWorkspaceBackup(state) {
    if (this._hasSync()) return this._writeWorkspaceBackupSync(state);
    await this._writeJsonWithBackup(`${FORGEBOOK_BACKUPS_DIR}/workspace-${Date.now()}.json`, state, { skipBackup: true });
    const backups = sortByUpdatedDesc((await this._list(FORGEBOOK_BACKUPS_DIR)).filter((entry) => /workspace-\d+\.json$/.test(entry.path)));
    for (const entry of backups.slice(this.backupLimit)) {
      await this._delete(entry.path);
    }
  }

  loadWorkspaceStateSync() {
    return this._rebuildStateSync();
  }

  async loadWorkspaceState() {
    return this._rebuildState();
  }

  saveWorkspaceStateSync(state) {
    const safeState = deepClone(state || this.createBaseStateSnapshot());
    const { appState, vaults, foldersByVault, documentsByVault } = this._decomposeState(safeState);
    this._writeJsonWithBackupSync(FORGEBOOK_VAULT_INDEX_PATH, {
      schemaVersion: 1,
      updatedAt: nowIso(),
      vaults: vaults.map((vault) => ({ id: vault.id, name: vault.name })),
    });
    this._writeJsonWithBackupSync(FORGEBOOK_APP_STATE_PATH, appState);
    vaults.forEach((vault) => {
      this._writeJsonWithBackupSync(vaultMetaPath(vault.id), vault);
      const folders = foldersByVault.get(vault.id) || [];
      const documents = documentsByVault.get(vault.id) || [];
      folders.forEach((folder) => this._writeJsonWithBackupSync(folderPath(vault.id, folder.id), folder));
      documents.forEach((doc) => this._writeJsonWithBackupSync(documentPath(vault.id, doc), doc));
      this._cleanupStaleVaultFilesSync(vault.id, this._expectedPathsForVault(vault.id, folders, documents));
    });
    this._writeWorkspaceBackupSync(safeState);
    return { ok: true, source: "vault" };
  }

  async saveWorkspaceState(state) {
    if (this._hasSync()) return this.saveWorkspaceStateSync(state);
    const safeState = deepClone(state || this.createBaseStateSnapshot());
    const { appState, vaults, foldersByVault, documentsByVault } = this._decomposeState(safeState);
    await this._writeJsonWithBackup(FORGEBOOK_VAULT_INDEX_PATH, {
      schemaVersion: 1,
      updatedAt: nowIso(),
      vaults: vaults.map((vault) => ({ id: vault.id, name: vault.name })),
    });
    await this._writeJsonWithBackup(FORGEBOOK_APP_STATE_PATH, appState);
    for (const vault of vaults) {
      await this._writeJsonWithBackup(vaultMetaPath(vault.id), vault);
      const folders = foldersByVault.get(vault.id) || [];
      const documents = documentsByVault.get(vault.id) || [];
      for (const folder of folders) await this._writeJsonWithBackup(folderPath(vault.id, folder.id), folder);
      for (const doc of documents) await this._writeJsonWithBackup(documentPath(vault.id, doc), doc);
      await this._cleanupStaleVaultFiles(vault.id, this._expectedPathsForVault(vault.id, folders, documents));
    }
    await this._writeWorkspaceBackup(safeState);
    return { ok: true, source: "vault" };
  }

  async createVault(vault) {
    const record = vault || createVault("New Vault");
    if (this._hasSync()) {
      this._writeJsonWithBackupSync(vaultMetaPath(record.id), record);
      const index = this._loadJsonWithRecoverySync(FORGEBOOK_VAULT_INDEX_PATH, { vaults: [] }).data;
      const nextVaults = Array.isArray(index?.vaults) ? index.vaults.filter((entry) => (typeof entry === "string" ? entry : entry.id) !== record.id) : [];
      nextVaults.push({ id: record.id, name: record.name });
      this._writeJsonWithBackupSync(FORGEBOOK_VAULT_INDEX_PATH, { schemaVersion: 1, updatedAt: nowIso(), vaults: nextVaults });
      return record;
    }
    await this._writeJsonWithBackup(vaultMetaPath(record.id), record);
    const index = (await this._loadJsonWithRecovery(FORGEBOOK_VAULT_INDEX_PATH, { vaults: [] })).data;
    const nextVaults = Array.isArray(index?.vaults) ? index.vaults.filter((entry) => (typeof entry === "string" ? entry : entry.id) !== record.id) : [];
    nextVaults.push({ id: record.id, name: record.name });
    await this._writeJsonWithBackup(FORGEBOOK_VAULT_INDEX_PATH, { schemaVersion: 1, updatedAt: nowIso(), vaults: nextVaults });
    return record;
  }

  async listVaults() {
    const state = await this.loadWorkspaceState();
    return (state.state.items || []).filter((item) => item.type === "folder" && item.folderKind === "vault");
  }

  async listVaultFiles(vaultId, options = {}) {
    if (!vaultId) return [];
    const entries = await this._list(vaultRootPath(vaultId));
    return (entries || []).filter((entry) => {
      if (options.includeMeta) return true;
      return !String(entry.path || "").includes("/.forgebook/");
    });
  }

  async loadVault(vaultId) {
    const state = await this.loadWorkspaceState();
    return {
      vault: state.state.items.find((item) => item.id === vaultId && item.type === "folder" && item.folderKind === "vault") || null,
      items: state.state.items.filter((item) => item.id === vaultId || item.parentId === vaultId),
      recoveryWarnings: state.recoveryWarnings,
    };
  }

  async saveNote(vaultId, note) {
    return this._writeJsonWithBackup(documentPath(vaultId, { ...note, docType: "text" }), note);
  }

  async saveBoard(vaultId, board) {
    return this._writeJsonWithBackup(documentPath(vaultId, { ...board, docType: "board" }), board);
  }

  async saveFile(vaultId, file) {
    const path = `${vaultFilesDir(vaultId)}/${file.id || file.name || Date.now()}.json`;
    return this._writeJsonWithBackup(path, file);
  }

  async deleteItem(vaultId, item) {
    const targetPath = item?.type === "folder"
      ? folderPath(vaultId, item.id)
      : item?.type === "document"
        ? documentPath(vaultId, item)
        : null;
    if (!targetPath) return { ok: false, error: new Error("Unsupported vault item") };
    return this._delete(targetPath);
  }

  async createConflictCopy(path, contents) {
    return this._writeText(conflictCopyPath(path), contents, { atomic: true });
  }
}

export function createVaultManager(options = {}) {
  return new VaultManager(options);
}
