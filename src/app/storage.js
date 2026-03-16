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

export function parseWorkspaceCandidate(raw) {
  try {
    const parsed = JSON.parse(raw);
    const next = createDefaultStateSnapshot();
    next.activeView = parsed.activeView || next.activeView;
    next.selectedVaultId = parsed.selectedVaultId || null;
    next.selectedNodeId = parsed.selectedNodeId || null;
    next.activeDocumentId = parsed.activeDocumentId || null;
    next.sidebarCollapsed = Boolean(parsed.sidebarCollapsed);
    next.contextPanelCollapsed = Boolean(parsed.contextPanelCollapsed);
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
    return recoverWorkspaceSnapshot(next);
  } catch {
    return null;
  }
}

export function loadWorkspaceState() {
  const candidates = [];
  const seen = new Set();
  WORKSPACE_STORAGE_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key);
    if (raw && !seen.has(raw)) {
      seen.add(raw);
      candidates.push(raw);
    }
  });
  const parsed = candidates.map(parseWorkspaceCandidate).filter(Boolean);
  const diagnostics = parsed
    .map((candidate) => ({
      score: scoreWorkspaceSnapshot(candidate),
      items: candidate.items.length,
      vaults: candidate.items.filter((item) => item.type === "folder" && item.folderKind === "vault").length,
    }))
    .sort((a, b) => b.score - a.score);
  parsed.sort((a, b) => scoreWorkspaceSnapshot(b) - scoreWorkspaceSnapshot(a));
  return {
    state: parsed[0] || createDefaultStateSnapshot(),
    diagnostics,
  };
}

export function writeWorkspaceSnapshot(snapshot) {
  localStorage.setItem(WORKSPACE_STORAGE_KEYS[0], snapshot);
  localStorage.setItem(WORKSPACE_STORAGE_KEYS[2], snapshot);
  window.ForgeBookRuntime?.persistence?.persistWorkspaceSnapshot(snapshot);
}
