import { createVault as createVaultRecord, createDefaultStateSnapshot } from "../../app/state.js";
import { createStorageProvider } from "../storage/providers/createStorageProvider.js";
import {
  createVault as createDesktopVault,
  getAppPaths,
  isDesktop,
  isDesktopEnvironment,
  listRecentVaults,
  loadVault as loadDesktopVault,
  selectVaultFolder,
} from "../desktop/DesktopBridge.js";
import { createVaultManager } from "./VaultManager.js";

const provider = createStorageProvider();
const manager = createVaultManager({
  provider,
  createBaseStateSnapshot: createDefaultStateSnapshot,
});

export async function createVault(options = {}) {
  if (isDesktopEnvironment() && options.path) {
    return createDesktopVault(options.path);
  }
  const record = options.record || createVaultRecord(options.name || "New Vault");
  return manager.createVault(record);
}

export async function loadVault(vaultIdOrPath) {
  if (isDesktopEnvironment() && typeof vaultIdOrPath === "string" && /[\\/]/.test(vaultIdOrPath)) {
    return loadDesktopVault(vaultIdOrPath);
  }
  return manager.loadVault(vaultIdOrPath);
}

export async function saveNote(vaultId, note) {
  return manager.saveNote(vaultId, note);
}

export async function saveBoard(vaultId, board) {
  return manager.saveBoard(vaultId, board);
}

export async function saveFile(vaultId, file) {
  return manager.saveFile(vaultId, file);
}

export async function deleteItem(vaultId, item) {
  return manager.deleteItem(vaultId, item);
}

export async function listVaultFiles(vaultId, options = {}) {
  return manager.listVaultFiles(vaultId, options);
}

export async function pickVaultFolder() {
  if (!isDesktop) return null;
  return selectVaultFolder();
}

export async function getRecentVaults() {
  if (!isDesktop) return [];
  return listRecentVaults();
}

export async function getVaultAppPaths() {
  return getAppPaths();
}
