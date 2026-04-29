import { WORKSPACE_STORAGE_KEYS } from "../utils/constants.js";
import {
  createDefaultStateSnapshot,
  createDoc,
  createFolder,
  createVault,
  randomUserId,
  uid,
} from "./state.js";
import { filterLegacyMockMarketProfiles } from "../utils/marketProfiles.js";
import { createStorageProvider, getStorageProvider } from "../services/storage/providers/createStorageProvider.js";
import { createVaultManager } from "../services/vault/VaultManager.js";
import {
  FORGEBOOK_IMPORT_BACKUP_PATH,
  FORGEBOOK_META_DIR,
  workspaceConflictPath,
} from "../services/vault/VaultPaths.js";
import { createVaultWatchService } from "../services/vault/VaultWatchService.js";

const PRIMARY_WORKSPACE_KEY = WORKSPACE_STORAGE_KEYS[0];
const LEGACY_BACKUP_KEY = WORKSPACE_STORAGE_KEYS[2];
const PREVIOUS_WORKSPACE_KEY = "forgebook-workspace-previous";
const PREVIOUS_2_WORKSPACE_KEY = "forgebook-workspace-previous-2";
const LAST_KNOWN_GOOD_WORKSPACE_KEY = "forgebook-workspace-last-known-good";
const DIRTY_BUFFER_KEY = "forgebook-workspace-dirty-buffer";
const RECOVERY_STATE_KEY = "forgebook-workspace-recovery-state";
const CORRUPTED_SNAPSHOT_PREFIX = "forgebook-workspace-corrupt-";
const PRE_IMPORT_BACKUP_KEY = "forgebook-workspace-pre-import";
const CLOUD_CONFLICT_LOCAL_KEY = "forgebook-workspace-conflict-local";
const CLOUD_CONFLICT_REMOTE_KEY = "forgebook-workspace-conflict-remote";
const MAX_CORRUPTED_SNAPSHOTS = 4;
const BOOT_CACHE_KEY = "__FORGEBOOK_VAULT_BOOT__";

let cachedVaultRuntime = null;
let vaultWatchRuntime = null;
const DESKTOP_DIRTY_BUFFER_PATH = `${FORGEBOOK_META_DIR}/dirty-buffer.json`;

function nowIso() {
  return new Date().toISOString();
}

function safeLocalStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`ForgeBook could not read localStorage key ${key}`, error);
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    console.error(`ForgeBook could not write localStorage key ${key}`, error);
    return { ok: false, error };
  }
}

function safeLocalStorageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`ForgeBook could not remove localStorage key ${key}`, error);
  }
}

function readRecoveryState() {
  try {
    const raw = safeLocalStorageGet(RECOVERY_STATE_KEY);
    if (!raw) return { warnings: [], corruptKeys: [], lastFailure: null, importBackupAvailable: false, conflict: null };
    const parsed = JSON.parse(raw);
    return {
      warnings: Array.isArray(parsed?.warnings) ? parsed.warnings : [],
      corruptKeys: Array.isArray(parsed?.corruptKeys) ? parsed.corruptKeys : [],
      lastFailure: parsed?.lastFailure || null,
      importBackupAvailable: Boolean(parsed?.importBackupAvailable),
      conflict: parsed?.conflict || null,
    };
  } catch {
    return { warnings: [], corruptKeys: [], lastFailure: null, importBackupAvailable: false, conflict: null };
  }
}

function writeRecoveryState(next) {
  safeLocalStorageSet(RECOVERY_STATE_KEY, JSON.stringify(next));
  return next;
}

function updateRecoveryState(patch) {
  const current = readRecoveryState();
  const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
  return writeRecoveryState(next);
}

function normalizeSnapshotPersistence(next) {
  if (!next.persistence || typeof next.persistence !== "object") next.persistence = {};
  next.persistence.deviceId = next.persistence.deviceId || uid();
  next.persistence.localRevision = Number(next.persistence.localRevision || 0);
  next.persistence.cloudRevision = Number(next.persistence.cloudRevision || 0);
  next.persistence.lastLocalSaveAt = next.persistence.lastLocalSaveAt || "";
  next.persistence.lastCloudSyncAt = next.persistence.lastCloudSyncAt || "";
  next.persistence.lastKnownGoodAt = next.persistence.lastKnownGoodAt || "";
  next.persistence.status = {
    saved_local: Boolean(next.persistence.status?.saved_local),
    saving_local: Boolean(next.persistence.status?.saving_local),
    local_save_failed: Boolean(next.persistence.status?.local_save_failed),
    pending_cloud_sync: Boolean(next.persistence.status?.pending_cloud_sync),
    cloud_synced: Boolean(next.persistence.status?.cloud_synced),
    cloud_sync_failed: Boolean(next.persistence.status?.cloud_sync_failed),
    conflict: Boolean(next.persistence.status?.conflict),
    oversized_cloud_snapshot: Boolean(next.persistence.status?.oversized_cloud_snapshot),
    offline: Boolean(next.persistence.status?.offline),
    message: typeof next.persistence.status?.message === "string" ? next.persistence.status.message : "",
  };
  return next;
}

function snapshotMetadataFromState(parsed) {
  const persistence = parsed?.persistence || {};
  return {
    localRevision: Number(persistence.localRevision || 0),
    cloudRevision: Number(persistence.cloudRevision || 0),
    updatedAt: persistence.lastLocalSaveAt || parsed?.updatedAt || "",
    cloudSyncedAt: persistence.lastCloudSyncAt || "",
    deviceId: persistence.deviceId || "",
    pendingCloudSync: Boolean(persistence.status?.pending_cloud_sync),
    conflict: Boolean(persistence.status?.conflict),
  };
}

function isSnapshotMetadataNewer(candidateMetadata = {}, baselineMetadata = {}) {
  const candidateRevision = Number(candidateMetadata.localRevision || 0);
  const baselineRevision = Number(baselineMetadata.localRevision || 0);
  if (candidateRevision !== baselineRevision) return candidateRevision > baselineRevision;
  const candidateUpdatedAt = Date.parse(candidateMetadata.updatedAt || "") || 0;
  const baselineUpdatedAt = Date.parse(baselineMetadata.updatedAt || "") || 0;
  return candidateUpdatedAt > baselineUpdatedAt;
}

export function extractWorkspaceSnapshotMetadata(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return snapshotMetadataFromState(parsed);
  } catch {
    return null;
  }
}

function storeCorruptedSnapshot(raw, sourceKey, errorMessage = "Workspace snapshot could not be parsed") {
  const recoveryState = readRecoveryState();
  const corruptKey = `${CORRUPTED_SNAPSHOT_PREFIX}${Date.now()}`;
  safeLocalStorageSet(corruptKey, raw);
  const nextCorruptKeys = [corruptKey, ...recoveryState.corruptKeys].slice(0, MAX_CORRUPTED_SNAPSHOTS);
  recoveryState.corruptKeys.slice(MAX_CORRUPTED_SNAPSHOTS - 1).forEach((key) => safeLocalStorageRemove(key));
  writeRecoveryState({
    ...recoveryState,
    corruptKeys: nextCorruptKeys,
    lastFailure: {
      sourceKey,
      errorMessage,
      capturedAt: nowIso(),
    },
    warnings: [
      `Recovered from a corrupted local workspace snapshot (${sourceKey}). A recovery copy was preserved.`,
      ...recoveryState.warnings,
    ].slice(0, 6),
  });
}

function safeParseRawSnapshot(raw, sourceKey = "workspace") {
  try {
    return JSON.parse(raw);
  } catch (error) {
    storeCorruptedSnapshot(raw, sourceKey, error?.message || "JSON parse failure");
    console.warn(`ForgeBook workspace snapshot parse failed for ${sourceKey}`, error);
    return null;
  }
}

function makeCandidateResult(candidate, sourceKey, raw) {
  return {
    candidate,
    sourceKey,
    raw,
    metadata: extractWorkspaceSnapshotMetadata(raw),
  };
}

function normalizeParsedSnapshot(parsed) {
  const next = createDefaultStateSnapshot();
  next.activeView = parsed.activeView || next.activeView;
  next.selectedVaultId = parsed.selectedVaultId || null;
  next.selectedNodeId = parsed.selectedNodeId || null;
  next.activeDocumentId = parsed.activeDocumentId || null;
  next.sidebarCollapsed = Boolean(parsed.sidebarCollapsed);
  next.contextPanelCollapsed = Boolean(parsed.contextPanelCollapsed);
  next.comparisonDocumentId = parsed.comparisonDocumentId || null;
  next.collapsedFolders = Array.isArray(parsed.collapsedFolders) ? parsed.collapsedFolders : [];
  next.softwareName = parsed.softwareName || next.softwareName;
  next.profile = { ...next.profile, ...(parsed.profile || {}) };
  if (!next.profile.userId) next.profile.userId = randomUserId();
  if (!next.profile.accountId) next.profile.accountId = "";
  if (!next.profile.publicId) next.profile.publicId = "";
  if (!Array.isArray(next.profile.friends)) next.profile.friends = [];
  if (!Array.isArray(next.profile.sentRequests)) next.profile.sentRequests = [];
  next.social = {
    conversations: Array.isArray(parsed.social?.conversations) ? parsed.social.conversations : [],
    activeConversationId: parsed.social?.activeConversationId || null,
    directory: Array.isArray(parsed.social?.directory) ? parsed.social.directory : [],
    categories: Array.isArray(parsed.social?.categories) ? parsed.social.categories : [],
    activeSection: parsed.social?.activeSection || "direct",
    activeChannelId: parsed.social?.activeChannelId || null,
    searchQuery: parsed.social?.searchQuery || "",
    typing: parsed.social?.typing || {},
    savedMessages: Array.isArray(parsed.social?.savedMessages) ? parsed.social.savedMessages : [],
    unreadByConversation: parsed.social?.unreadByConversation || {},
    notificationPrefs: parsed.social?.notificationPrefs || {},
    communities: Array.isArray(parsed.social?.communities) ? parsed.social.communities : [],
    workspaces: Array.isArray(parsed.social?.workspaces) ? parsed.social.workspaces : [],
  };
  next.marketProfiles =
    Array.isArray(parsed.marketProfiles) && parsed.marketProfiles.length
      ? filterLegacyMockMarketProfiles(parsed.marketProfiles).map((entry) => ({
          ...entry,
          id: entry.id || uid(),
          userId: entry.userId || randomUserId(),
        }))
      : next.marketProfiles;
  next.settings = { ...next.settings, ...(parsed.settings || {}) };
  if (parsed.settingsMeta && typeof parsed.settingsMeta === "object") next.settingsMeta = { ...next.settingsMeta, ...parsed.settingsMeta };
  next.libraryCategories = Array.isArray(parsed.libraryCategories)
    ? parsed.libraryCategories.map((entry) => ({
        id: entry.id || uid(),
        name: entry.name || "Category",
      }))
    : [];
  next.openTabs = Array.isArray(parsed.openTabs) ? parsed.openTabs : [];
  next.items = Array.isArray(parsed.items)
    ? parsed.items.map((entry) => {
        if (entry.type === "document") {
          return {
            ...createDoc(entry.name || "Untitled Note", entry.docType || "text", entry.parentId ?? null),
            ...entry,
          };
        }
        return {
          ...(entry.parentId == null
            ? createVault(entry.name || "Vault")
            : createFolder(entry.name || "Folder", entry.parentId)),
          ...entry,
          folderKind: entry.folderKind || (entry.parentId == null ? "vault" : "folder"),
          members: Array.isArray(entry.members) ? entry.members : [],
          coverImage: entry.coverImage || "",
          categoryId: entry.categoryId || null,
        };
      })
    : [];
  if (parsed.fileVault && typeof parsed.fileVault === "object") next.fileVault = { ...next.fileVault, ...parsed.fileVault };
  if (parsed.notifications && Array.isArray(parsed.notifications)) next.notifications = parsed.notifications;
  if (parsed.starredItems && Array.isArray(parsed.starredItems)) next.starredItems = parsed.starredItems;
  if (parsed.pinnedItems && Array.isArray(parsed.pinnedItems)) next.pinnedItems = parsed.pinnedItems;
  next.persistence = { ...next.persistence, ...(parsed.persistence || {}) };
  return normalizeSnapshotPersistence(recoverWorkspaceSnapshot(next));
}

export function scoreWorkspaceSnapshot(next) {
  return (
    next.items.length * 10 +
    next.items.filter((item) => item.type === "folder" && item.folderKind === "vault").length * 100 +
    next.openTabs.length
  );
}

export function recoverWorkspaceSnapshot(next) {
  if (next.items.some((item) => item.type === "folder" && item.folderKind === "vault")) return next;
  const roots = next.items.filter((item) => item.parentId == null);
  if (!roots.length) return next;
  const vault = createVault("Recovered Vault");
  next.items.push(vault);
  next.items = next.items.map((item) => {
    if (item.id === vault.id) return item;
    if (item.parentId == null) {
      return {
        ...item,
        parentId: vault.id,
        folderKind: item.type === "folder" ? "folder" : item.folderKind,
      };
    }
    return item;
  });
  next.selectedVaultId = next.selectedVaultId || vault.id;
  return next;
}

export function parseWorkspaceCandidate(raw, sourceKey = "workspace") {
  const parsed = safeParseRawSnapshot(raw, sourceKey);
  if (!parsed) return null;
  try {
    return normalizeParsedSnapshot(parsed);
  } catch (error) {
    console.warn(`ForgeBook workspace candidate normalization failed for ${sourceKey}`, error);
    storeCorruptedSnapshot(raw, sourceKey, error?.message || "Workspace normalization failed");
    return null;
  }
}

function orderedSnapshotKeys() {
  return [
    DIRTY_BUFFER_KEY,
    PRIMARY_WORKSPACE_KEY,
    PREVIOUS_WORKSPACE_KEY,
    PREVIOUS_2_WORKSPACE_KEY,
    LAST_KNOWN_GOOD_WORKSPACE_KEY,
    LEGACY_BACKUP_KEY,
    ...WORKSPACE_STORAGE_KEYS.slice(1).filter((key) => ![LEGACY_BACKUP_KEY].includes(key)),
  ];
}

function buildLegacySnapshotCandidates() {
  const diagnostics = [];
  const candidates = [];
  const seen = new Set();
  orderedSnapshotKeys().forEach((key) => {
    const raw = safeLocalStorageGet(key);
    if (!raw || seen.has(raw)) return;
    seen.add(raw);
    const candidate = parseWorkspaceCandidate(raw, key);
    if (!candidate) return;
    const score = scoreWorkspaceSnapshot(candidate);
    diagnostics.push({
      key,
      score,
      items: candidate.items.length,
      vaults: candidate.items.filter((item) => item.type === "folder" && item.folderKind === "vault").length,
      metadata: snapshotMetadataFromState(candidate),
    });
    candidates.push(makeCandidateResult(candidate, key, raw));
  });
  candidates.sort((a, b) => scoreWorkspaceSnapshot(b.candidate) - scoreWorkspaceSnapshot(a.candidate));
  return {
    candidates,
    diagnostics: diagnostics.sort((a, b) => b.score - a.score),
  };
}

function createVaultRuntime() {
  const provider = getStorageProvider() || createStorageProvider();
  const manager = createVaultManager({ provider, createBaseStateSnapshot: createDefaultStateSnapshot });
  const watchService = createVaultWatchService({ provider, vaultManager: manager });
  return { provider, manager, watchService };
}

function getVaultRuntime() {
  if (!cachedVaultRuntime) {
    cachedVaultRuntime = createVaultRuntime();
  }
  return cachedVaultRuntime;
}

function desktopVaultRuntimeActive() {
  return getVaultRuntime().provider?.kind === "desktop";
}

async function writeDesktopRecoveryFile(path, contents) {
  const runtime = getVaultRuntime();
  if (runtime.provider?.kind !== "desktop") return { ok: false, skipped: true };
  try {
    await runtime.provider.save(path, contents, { atomic: true });
    return { ok: true };
  } catch (error) {
    console.error(`ForgeBook desktop recovery write failed for ${path}`, error);
    return { ok: false, error };
  }
}

async function readDesktopRecoveryFile(path) {
  const runtime = getVaultRuntime();
  if (runtime.provider?.kind !== "desktop") return null;
  try {
    return await runtime.provider.load(path);
  } catch (error) {
    console.warn(`ForgeBook desktop recovery read failed for ${path}`, error);
    return null;
  }
}

async function deleteDesktopRecoveryFile(path) {
  const runtime = getVaultRuntime();
  if (runtime.provider?.kind !== "desktop") return;
  try {
    await runtime.provider.delete(path);
  } catch (error) {
    console.warn(`ForgeBook desktop recovery delete failed for ${path}`, error);
  }
}

function getBootCache() {
  return typeof window !== "undefined" ? window[BOOT_CACHE_KEY] || null : null;
}

function setBootCache(value) {
  if (typeof window !== "undefined") {
    window[BOOT_CACHE_KEY] = value;
  }
}

function mergeRecoveryWarnings(primary = [], secondary = []) {
  return Array.from(new Set([...(primary || []), ...(secondary || [])]));
}

function maybeMigrateLegacySnapshotToVault(legacyState, runtime) {
  if (!runtime?.provider?.isSynchronous || !legacyState?.items?.length) return false;
  const vaultCount = legacyState.items.filter((item) => item.type === "folder" && item.folderKind === "vault").length;
  if (!vaultCount) return false;
  const result = runtime.manager.saveWorkspaceStateSync(legacyState);
  return Boolean(result?.ok);
}

export async function prepareLocalFirstWorkspaceBoot() {
  const runtime = getVaultRuntime();
  const recovery = readRecoveryState();
  const vaultLoaded = await runtime.manager.loadWorkspaceState();
  const normalizedVaultState = normalizeParsedSnapshot(vaultLoaded.state || createDefaultStateSnapshot());
  const vaultHasContent = Array.isArray(normalizedVaultState.items) && normalizedVaultState.items.length > 0;
  const legacy = buildLegacySnapshotCandidates();
  const legacyBest = legacy.candidates[0]?.candidate || null;
  const desktopDirtyRaw = desktopVaultRuntimeActive() ? await readDesktopRecoveryFile(DESKTOP_DIRTY_BUFFER_PATH) : null;
  const desktopDirtyState = desktopDirtyRaw ? parseWorkspaceCandidate(desktopDirtyRaw, "desktop-dirty-buffer") : null;
  let recoveredDesktopBufferApplied = false;

  let finalState = normalizedVaultState;
  let sourceKey = "vault";
  let recoveryWarnings = mergeRecoveryWarnings(recovery.warnings, vaultLoaded.recoveryWarnings);

  if (!vaultHasContent && legacyBest) {
    finalState = legacyBest;
    sourceKey = legacy.candidates[0]?.sourceKey || "legacy-snapshot";
    const migrated = maybeMigrateLegacySnapshotToVault(legacyBest, runtime);
    if (migrated) {
      recoveryWarnings = mergeRecoveryWarnings(recoveryWarnings, ["Migrated your legacy workspace snapshot into local-first vault storage."]);
    }
  }

  if (
    desktopDirtyState &&
    isSnapshotMetadataNewer(snapshotMetadataFromState(desktopDirtyState), snapshotMetadataFromState(finalState))
  ) {
    finalState = desktopDirtyState;
    sourceKey = "desktop-dirty-buffer";
    recoveryWarnings = mergeRecoveryWarnings(recoveryWarnings, [
      "Recovered newer unsaved desktop changes after an interrupted session.",
    ]);
    recoveredDesktopBufferApplied = await runtime.manager.saveWorkspaceState(desktopDirtyState).then(() => true).catch((error) => {
      console.error("ForgeBook could not apply recovered desktop dirty buffer", error);
      return false;
    });
  }

  if (desktopDirtyRaw && recoveredDesktopBufferApplied) {
    await deleteDesktopRecoveryFile(DESKTOP_DIRTY_BUFFER_PATH);
  }

  const bootPayload = {
    state: normalizeSnapshotPersistence(finalState),
    diagnostics: legacy.diagnostics,
    recoveryWarnings,
    recoveryState: recovery,
    sourceKey,
    provider: runtime.provider?.kind || "browser",
  };
  setBootCache(bootPayload);
  return bootPayload;
}

export function loadWorkspaceState() {
  const boot = getBootCache();
  if (boot?.state) {
    return {
      state: normalizeSnapshotPersistence(boot.state),
      diagnostics: Array.isArray(boot.diagnostics) ? boot.diagnostics : [],
      recoveryWarnings: Array.isArray(boot.recoveryWarnings) ? boot.recoveryWarnings : [],
      recoveryState: boot.recoveryState || readRecoveryState(),
      sourceKey: boot.sourceKey || "vault",
    };
  }

  const recovery = readRecoveryState();
  const runtime = getVaultRuntime();
  if (runtime.provider?.isSynchronous) {
    const vaultLoaded = runtime.manager.loadWorkspaceStateSync();
    const normalizedVaultState = normalizeParsedSnapshot(vaultLoaded.state || createDefaultStateSnapshot());
    const vaultHasContent = Array.isArray(normalizedVaultState.items) && normalizedVaultState.items.length > 0;
    const legacy = buildLegacySnapshotCandidates();
    const legacyBest = legacy.candidates[0]?.candidate || null;
    let finalState = normalizedVaultState;
    let sourceKey = "vault";
    let recoveryWarnings = mergeRecoveryWarnings(recovery.warnings, vaultLoaded.recoveryWarnings);
    if (!vaultHasContent && legacyBest) {
      finalState = legacyBest;
      sourceKey = legacy.candidates[0]?.sourceKey || "legacy-snapshot";
      const migrated = maybeMigrateLegacySnapshotToVault(legacyBest, runtime);
      if (migrated) recoveryWarnings = mergeRecoveryWarnings(recoveryWarnings, ["Migrated your legacy workspace snapshot into local-first vault storage."]);
    }
    return {
      state: normalizeSnapshotPersistence(finalState),
      diagnostics: legacy.diagnostics,
      recoveryWarnings,
      recoveryState: recovery,
      sourceKey,
    };
  }

  const legacy = buildLegacySnapshotCandidates();
  const best = legacy.candidates[0];
  const state = best?.candidate || createDefaultStateSnapshot();
  normalizeSnapshotPersistence(state);
  if (best?.raw) state.persistence.lastKnownGoodAt = state.persistence.lastKnownGoodAt || nowIso();
  return {
    state,
    diagnostics: legacy.diagnostics,
    recoveryWarnings: mergeRecoveryWarnings(recovery.warnings, ["Desktop vault boot is still loading. Using the most recent local backup for now."]),
    recoveryState: recovery,
    sourceKey: best?.sourceKey || null,
  };
}

function snapshotStringIsUsable(snapshot) {
  const candidate = parseWorkspaceCandidate(snapshot, "save-validation");
  return Boolean(candidate);
}

function rotateBackups(snapshot) {
  if (desktopVaultRuntimeActive()) return;
  const current = safeLocalStorageGet(PRIMARY_WORKSPACE_KEY);
  const previous = safeLocalStorageGet(PREVIOUS_WORKSPACE_KEY);
  if (previous) safeLocalStorageSet(PREVIOUS_2_WORKSPACE_KEY, previous);
  if (current && current !== snapshot) safeLocalStorageSet(PREVIOUS_WORKSPACE_KEY, current);
  safeLocalStorageSet(LAST_KNOWN_GOOD_WORKSPACE_KEY, snapshot);
}

export function writeDirtyWorkspaceBuffer(snapshot) {
  if (!snapshot) return { ok: false, error: new Error("Missing workspace snapshot") };
  if (desktopVaultRuntimeActive()) {
    writeDesktopRecoveryFile(DESKTOP_DIRTY_BUFFER_PATH, snapshot).then((result) => {
      if (!result.ok) {
        updateRecoveryState((current) => ({
          ...current,
          warnings: ["Desktop crash-recovery buffer failed to write.", ...current.warnings].slice(0, 6),
          lastFailure: {
            sourceKey: "desktop-dirty-buffer",
            errorMessage: result.error?.message || "Desktop crash-recovery buffer write failed",
            capturedAt: nowIso(),
          },
        }));
      }
    });
    return { ok: true, pending: true };
  }
  return safeLocalStorageSet(DIRTY_BUFFER_KEY, snapshot);
}

export function clearDirtyWorkspaceBuffer() {
  if (desktopVaultRuntimeActive()) {
    deleteDesktopRecoveryFile(DESKTOP_DIRTY_BUFFER_PATH);
    return;
  }
  safeLocalStorageRemove(DIRTY_BUFFER_KEY);
}

export function writeWorkspaceSnapshot(snapshot, options = {}) {
  if (!snapshot) {
    return { ok: false, error: new Error("Missing workspace snapshot") };
  }
  if (!snapshotStringIsUsable(snapshot)) {
    return { ok: false, error: new Error("Workspace snapshot validation failed") };
  }

  const dirtyResult = options.skipDirtyBuffer ? { ok: true } : writeDirtyWorkspaceBuffer(snapshot);
  if (!dirtyResult.ok) {
    const result = {
      ok: false,
      error: dirtyResult.error,
      emergencySnapshot: snapshot,
      localOnly: true,
    };
    window.ForgeBookRuntime?.persistence?.setLocalWriteResult?.(result, snapshot);
    return result;
  }

  const runtime = getVaultRuntime();
  const parsedState = parseWorkspaceCandidate(snapshot, "vault-write") || createDefaultStateSnapshot();
  try {
    let vaultResult = { ok: true };
    if (runtime.provider?.isSynchronous) {
      vaultResult = runtime.manager.saveWorkspaceStateSync(parsedState);
    } else {
      runtime.manager.saveWorkspaceState(parsedState).then(() => {
        window.ForgeBookRuntime?.persistence?.setLocalWriteResult?.({ ok: true }, snapshot);
      }).catch((error) => {
        console.error("ForgeBook async vault save failed", error);
        updateRecoveryState((current) => ({
          ...current,
          warnings: ["Local vault save failed. Export a backup before closing ForgeBook.", ...current.warnings].slice(0, 6),
          lastFailure: {
            sourceKey: "vault-write",
            errorMessage: error?.message || "Async vault save failed",
            capturedAt: nowIso(),
          },
        }));
        window.ForgeBookRuntime?.persistence?.setLocalWriteResult?.({ ok: false, error, emergencySnapshot: snapshot, localOnly: true }, snapshot);
      });
    }
    if (!vaultResult.ok) throw vaultResult.error || new Error("Vault save failed");
  } catch (error) {
    updateRecoveryState((current) => ({
      ...current,
      warnings: ["Local vault save failed. Export a backup before closing ForgeBook.", ...current.warnings].slice(0, 6),
      lastFailure: {
        sourceKey: "vault-write",
        errorMessage: error?.message || "Local vault save failed",
        capturedAt: nowIso(),
      },
    }));
    const result = {
      ok: false,
      error,
      emergencySnapshot: snapshot,
      localOnly: true,
    };
    window.ForgeBookRuntime?.persistence?.setLocalWriteResult?.(result, snapshot);
    return result;
  }

  if (!desktopVaultRuntimeActive()) {
    const backupResults = [];
    rotateBackups(snapshot);
    backupResults.push(safeLocalStorageSet(PRIMARY_WORKSPACE_KEY, snapshot));
    backupResults.push(safeLocalStorageSet(LEGACY_BACKUP_KEY, snapshot));
    const backupFailure = backupResults.find((entry) => !entry.ok);
    if (backupFailure) {
      updateRecoveryState((current) => ({
        ...current,
        warnings: [
          "Legacy backup write failed. Vault save succeeded, but export a JSON backup soon.",
          ...current.warnings,
        ].slice(0, 6),
        lastFailure: {
          sourceKey: backupFailure.error?.name || "localStorage",
          errorMessage: backupFailure.error?.message || "Legacy snapshot backup write failed",
          capturedAt: nowIso(),
        },
      }));
    }
  }

  clearDirtyWorkspaceBuffer();
  setBootCache({
    state: parsedState,
    diagnostics: buildLegacySnapshotCandidates().diagnostics,
    recoveryWarnings: readRecoveryState().warnings,
    recoveryState: readRecoveryState(),
    sourceKey: "vault",
    provider: runtime.provider?.kind || "browser",
  });
  window.ForgeBookRuntime?.persistence?.setLocalWriteResult?.({ ok: true, localFirst: true }, snapshot);
  return { ok: true, localFirst: true, provider: runtime.provider?.kind || "browser", pending: !runtime.provider?.isSynchronous };
}

export async function savePreImportBackup(snapshot) {
  if (!snapshot) return;
  if (desktopVaultRuntimeActive()) {
    const result = await writeDesktopRecoveryFile(FORGEBOOK_IMPORT_BACKUP_PATH, snapshot);
    if (!result.ok) {
      updateRecoveryState((current) => ({
        ...current,
        warnings: ["Desktop import backup failed to write.", ...current.warnings].slice(0, 6),
      }));
      return;
    }
  } else {
    safeLocalStorageSet(PRE_IMPORT_BACKUP_KEY, snapshot);
  }
  updateRecoveryState((current) => ({
    ...current,
    importBackupAvailable: true,
  }));
}

export async function importWorkspaceSnapshot(raw) {
  const candidate = parseWorkspaceCandidate(raw, "import");
  if (!candidate) {
    return { ok: false, error: new Error("Imported workspace JSON is invalid.") };
  }
  let current = safeLocalStorageGet(PRIMARY_WORKSPACE_KEY);
  if (desktopVaultRuntimeActive()) {
    const reloaded = await reloadWorkspaceStateFromVault().catch(() => null);
    current = reloaded?.state ? JSON.stringify(reloaded.state) : current;
  }
  if (current) await savePreImportBackup(current);
  const result = writeWorkspaceSnapshot(raw, { reason: "import", immediateCloud: false });
  if (!result.ok) return result;
  return {
    ok: true,
    state: candidate,
    summary: {
      items: candidate.items.length,
      vaults: candidate.items.filter((item) => item.type === "folder" && item.folderKind === "vault").length,
      documents: candidate.items.filter((item) => item.type === "document").length,
    },
  };
}

export async function restorePreImportBackup() {
  const backup = desktopVaultRuntimeActive()
    ? await readDesktopRecoveryFile(FORGEBOOK_IMPORT_BACKUP_PATH)
    : safeLocalStorageGet(PRE_IMPORT_BACKUP_KEY);
  if (!backup) return { ok: false, error: new Error("No pre-import backup available") };
  return writeWorkspaceSnapshot(backup, { reason: "restore-pre-import", immediateCloud: false });
}

export function recordWorkspaceConflict(localSnapshot, cloudSnapshot, reason = "Local snapshot is newer than cloud snapshot") {
  if (desktopVaultRuntimeActive()) {
    if (localSnapshot) void writeDesktopRecoveryFile(workspaceConflictPath("local"), localSnapshot);
    if (cloudSnapshot) void writeDesktopRecoveryFile(workspaceConflictPath("cloud"), cloudSnapshot);
  } else {
    if (localSnapshot) safeLocalStorageSet(CLOUD_CONFLICT_LOCAL_KEY, localSnapshot);
    if (cloudSnapshot) safeLocalStorageSet(CLOUD_CONFLICT_REMOTE_KEY, cloudSnapshot);
  }
  updateRecoveryState((current) => ({
    ...current,
    conflict: {
      reason,
      capturedAt: nowIso(),
      localKey: desktopVaultRuntimeActive() ? workspaceConflictPath("local") : CLOUD_CONFLICT_LOCAL_KEY,
      remoteKey: desktopVaultRuntimeActive() ? workspaceConflictPath("cloud") : CLOUD_CONFLICT_REMOTE_KEY,
    },
    warnings: [
      `Workspace sync conflict detected: ${reason}`,
      ...current.warnings,
    ].slice(0, 6),
  }));
}

export function clearWorkspaceConflict() {
  if (desktopVaultRuntimeActive()) {
    void deleteDesktopRecoveryFile(workspaceConflictPath("local"));
    void deleteDesktopRecoveryFile(workspaceConflictPath("cloud"));
  } else {
    safeLocalStorageRemove(CLOUD_CONFLICT_LOCAL_KEY);
    safeLocalStorageRemove(CLOUD_CONFLICT_REMOTE_KEY);
  }
  updateRecoveryState((current) => ({
    ...current,
    conflict: null,
  }));
}

export function getVaultManager() {
  return getVaultRuntime().manager;
}

export function getVaultProvider() {
  return getVaultRuntime().provider;
}

export async function reloadWorkspaceStateFromVault() {
  const runtime = getVaultRuntime();
  const recovery = readRecoveryState();
  const vaultLoaded = await runtime.manager.loadWorkspaceState();
  const normalizedVaultState = normalizeParsedSnapshot(vaultLoaded.state || createDefaultStateSnapshot());
  const payload = {
    state: normalizeSnapshotPersistence(normalizedVaultState),
    diagnostics: [],
    recoveryWarnings: mergeRecoveryWarnings(recovery.warnings, vaultLoaded.recoveryWarnings),
    recoveryState: recovery,
    sourceKey: "vault",
    provider: runtime.provider?.kind || "browser",
  };
  setBootCache(payload);
  return payload;
}

export function listVaults() {
  const boot = getBootCache();
  if (Array.isArray(boot?.state?.items)) {
    return boot.state.items.filter((item) => item.type === "folder" && item.folderKind === "vault");
  }
  const runtime = getVaultRuntime();
  if (runtime.provider?.isSynchronous) {
    return runtime.manager.loadWorkspaceStateSync().state.items.filter((item) => item.type === "folder" && item.folderKind === "vault");
  }
  return [];
}

export function startVaultWatch(vaultId, handlers = {}) {
  if (vaultWatchRuntime?.stop) vaultWatchRuntime.stop();
  const runtime = getVaultRuntime();
  if (runtime.provider?.kind !== "desktop") return () => {};
  vaultWatchRuntime = runtime.watchService;
  return vaultWatchRuntime.start(vaultId, handlers);
}



