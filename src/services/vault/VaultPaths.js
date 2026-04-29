export const FORGEBOOK_ROOT = "/ForgeBook";
export const FORGEBOOK_META_DIR = `${FORGEBOOK_ROOT}/.forgebook`;
export const FORGEBOOK_BACKUPS_DIR = `${FORGEBOOK_META_DIR}/backups`;
export const FORGEBOOK_CONFLICTS_DIR = `${FORGEBOOK_META_DIR}/conflicts`;
export const FORGEBOOK_VAULTS_DIR = `${FORGEBOOK_ROOT}/vaults`;
export const FORGEBOOK_APP_STATE_PATH = `${FORGEBOOK_META_DIR}/app-state.json`;
export const FORGEBOOK_VAULT_INDEX_PATH = `${FORGEBOOK_META_DIR}/vault-index.json`;
export const FORGEBOOK_RECOVERY_LOG_PATH = `${FORGEBOOK_META_DIR}/recovery-log.json`;
export const FORGEBOOK_IMPORT_BACKUP_PATH = `${FORGEBOOK_META_DIR}/import-backup.json`;

function normalizePath(path = "/") {
  const value = String(path || "/").replace(/\\/g, "/");
  const collapsed = value.replace(/\/+/g, "/");
  if (collapsed === "/") return "/";
  return collapsed.startsWith("/") ? collapsed.replace(/\/+$/g, "") : `/${collapsed.replace(/\/+$/g, "")}`;
}

function joinPath(...parts) {
  return normalizePath(parts.filter(Boolean).join("/"));
}

function sanitizeSegment(value) {
  return String(value || "untitled").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function vaultRootPath(vaultId) {
  return joinPath(FORGEBOOK_VAULTS_DIR, vaultId);
}

export function vaultMetaPath(vaultId) {
  return joinPath(vaultRootPath(vaultId), ".forgebook/settings.json");
}

export function vaultFolderDir(vaultId) {
  return joinPath(vaultRootPath(vaultId), "folders");
}

export function vaultNotesDir(vaultId) {
  return joinPath(vaultRootPath(vaultId), "notes");
}

export function vaultBoardsDir(vaultId) {
  return joinPath(vaultRootPath(vaultId), "boards");
}

export function vaultDocsDir(vaultId) {
  return joinPath(vaultRootPath(vaultId), "docs");
}

export function vaultFilesDir(vaultId) {
  return joinPath(vaultRootPath(vaultId), "files");
}

export function vaultDatabasePath(vaultId) {
  return joinPath(vaultRootPath(vaultId), ".forgebook/vault.db");
}

export function folderPath(vaultId, folderId) {
  return joinPath(vaultFolderDir(vaultId), `${sanitizeSegment(folderId)}.json`);
}

export function documentPath(vaultId, doc) {
  const fileName = `${sanitizeSegment(doc?.id)}.json`;
  if (doc?.docType === "text") return joinPath(vaultNotesDir(vaultId), fileName);
  if (doc?.docType === "board") return joinPath(vaultBoardsDir(vaultId), fileName);
  return joinPath(vaultDocsDir(vaultId), fileName);
}

export function documentFolderForType(vaultId, docType) {
  if (docType === "text") return vaultNotesDir(vaultId);
  if (docType === "board") return vaultBoardsDir(vaultId);
  return vaultDocsDir(vaultId);
}

export function appBackupPath(label, stamp = Date.now()) {
  return joinPath(FORGEBOOK_BACKUPS_DIR, `${sanitizeSegment(label)}-${stamp}.json`);
}

export function itemBackupPrefix(path) {
  return joinPath(FORGEBOOK_BACKUPS_DIR, sanitizeSegment(path));
}

export function itemBackupPath(path, stamp = Date.now()) {
  return joinPath(itemBackupPrefix(path), `${stamp}.json`);
}

export function conflictCopyPath(path) {
  const normalized = normalizePath(path);
  const extensionIndex = normalized.lastIndexOf(".");
  if (extensionIndex <= normalized.lastIndexOf("/")) return `${normalized} (conflict)`;
  return `${normalized.slice(0, extensionIndex)} (conflict)${normalized.slice(extensionIndex)}`;
}

export function workspaceConflictPath(label = "local") {
  return joinPath(FORGEBOOK_CONFLICTS_DIR, `${sanitizeSegment(label)}.json`);
}

export function isVaultPath(path) {
  return normalizePath(path).startsWith(`${FORGEBOOK_ROOT}/`);
}

export { normalizePath, joinPath, sanitizeSegment };
