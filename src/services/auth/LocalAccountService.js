import { randomUserId } from "../../app/state.js";

const LOCAL_ACCOUNT_STORAGE_KEY = "forgebook.local-account.v1";

function nowIso() {
  return new Date().toISOString();
}

function safeLocalStorageGet(key) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function normalizeLocalAccountName(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
}

export function createLocalAccountRecord(seed = {}) {
  const baseId = String(seed.userId || seed.accountId || seed.publicId || "").trim() || randomUserId();
  const userId = String(seed.userId || baseId).trim() || baseId;
  const accountId = String(seed.accountId || userId).trim() || userId;
  const publicId = String(seed.publicId || userId).trim() || userId;
  return {
    name: normalizeLocalAccountName(seed.name || seed.nickname || ""),
    userId,
    accountId,
    publicId,
    createdAt: seed.createdAt || nowIso(),
    updatedAt: seed.updatedAt || nowIso(),
  };
}

export function readLocalAccount() {
  const raw = safeLocalStorageGet(LOCAL_ACCOUNT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return createLocalAccountRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalAccount(seed = {}) {
  const account = createLocalAccountRecord({
    ...seed,
    updatedAt: nowIso(),
  });
  safeLocalStorageSet(LOCAL_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  return account;
}

export function resolveLocalAccountFromProfile(profile = {}, storedAccount = readLocalAccount()) {
  const workspaceName = normalizeLocalAccountName(profile?.name || "");
  const preferredName = workspaceName && workspaceName.toLowerCase() !== "you"
    ? workspaceName
    : storedAccount?.name || "";
  const fallbackId = String(profile?.accountId || profile?.publicId || profile?.userId || "").trim();

  return createLocalAccountRecord({
    ...storedAccount,
    name: preferredName,
    userId: storedAccount?.userId || fallbackId || undefined,
    accountId: storedAccount?.accountId || profile?.accountId || storedAccount?.userId || fallbackId || undefined,
    publicId: storedAccount?.publicId || profile?.publicId || storedAccount?.userId || fallbackId || undefined,
    createdAt: storedAccount?.createdAt,
  });
}

export function shouldPromptForLocalAccount(account) {
  return !normalizeLocalAccountName(account?.name || "");
}

export function applyLocalAccountToProfile(profile = {}, account = null) {
  if (!account) return { ...profile };
  return {
    ...profile,
    name: account.name || profile.name || "You",
    userId: account.userId || profile.userId || randomUserId(),
    accountId: account.accountId || profile.accountId || account.userId || "",
    publicId: account.publicId || profile.publicId || account.userId || "",
  };
}
