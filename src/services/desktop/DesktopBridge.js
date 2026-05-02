function getDesktopApi() {
  if (typeof window === "undefined") return null;
  return window.__FORGEBOOK_DESKTOP__ || null;
}

function getGlobalTauriInvoke() {
  if (typeof window === "undefined") return null;
  return window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke || null;
}

function getGlobalTauriListen() {
  if (typeof window === "undefined") return null;
  return window.__TAURI__?.event?.listen || null;
}

async function invokeTauri(command, payload = {}) {
  const invoke = getGlobalTauriInvoke();
  if (!invoke) return null;
  return invoke(command, payload);
}

export const isDesktop = typeof window !== "undefined" && Boolean(getDesktopApi() || getGlobalTauriInvoke());

export function isDesktopEnvironment() {
  return typeof window !== "undefined" && Boolean(getDesktopApi() || getGlobalTauriInvoke());
}

export async function desktopCall(method, payload = {}) {
  const desktopApi = getDesktopApi();
  if (desktopApi && typeof desktopApi[method] === "function") {
    return desktopApi[method](payload);
  }
  const tauriCommandMap = {
    getAppPaths: "forgebook_get_app_paths",
    selectVaultFolder: "forgebook_select_vault_folder",
    listRecentVaults: "forgebook_list_recent_vaults",
    createVault: "forgebook_create_vault",
    loadVault: "forgebook_load_vault",
    readTextFile: "forgebook_read_file",
    writeTextFile: "forgebook_write_file",
    deletePath: "forgebook_delete_file",
    listPaths: "forgebook_list_directory",
    createDirectory: "forgebook_create_directory",
    movePath: "forgebook_move_file",
    copyPath: "forgebook_copy_file",
    watchPath: "forgebook_watch_path",
    unwatchPath: "forgebook_unwatch_path",
    checkForUpdates: "forgebook_check_for_updates",
    installUpdate: "forgebook_install_update",
    restartApp: "forgebook_restart_app",
  };
  const command = tauriCommandMap[method];
  if (!command) throw new Error(`Unsupported desktop method: ${method}`);
  const result = await invokeTauri(command, payload);
  if (result == null) {
    if (method === "selectVaultFolder" || method === "readTextFile") return null;
    throw new Error(`Desktop bridge unavailable for ${method}`);
  }
  return result;
}

export async function getAppPaths() {
  return desktopCall("getAppPaths").catch(() => ({ rootDir: "", forgebookDir: "", vaultsDir: "", appConfigDir: "", recentVaults: [] }));
}

export async function selectVaultFolder() {
  return desktopCall("selectVaultFolder");
}

export async function listRecentVaults() {
  return desktopCall("listRecentVaults").catch(() => []);
}

export async function createVault(path) {
  return desktopCall("createVault", { path });
}

export async function loadVault(path) {
  return desktopCall("loadVault", { path });
}

export async function readTextFile(path) {
  return desktopCall("readTextFile", { path });
}

export async function writeTextFile(path, contents, options = {}) {
  return desktopCall("writeTextFile", { path, contents, ...options });
}

export async function deletePath(path, options = {}) {
  return desktopCall("deletePath", { path, ...options });
}

export async function listPaths(path, options = {}) {
  return desktopCall("listPaths", { path, ...options });
}

export async function createDirectory(path, options = {}) {
  return desktopCall("createDirectory", { path, ...options });
}

export async function movePath(from, to, options = {}) {
  return desktopCall("movePath", { from, to, ...options });
}

export async function copyPath(from, to, options = {}) {
  return desktopCall("copyPath", { from, to, ...options });
}

export async function watchPath(path, options = {}, onEvent) {
  const desktopApi = getDesktopApi();
  if (desktopApi && typeof desktopApi.watchPath === "function") {
    return desktopApi.watchPath({ path, ...options }, onEvent);
  }
  const listen = getGlobalTauriListen();
  const watcher = await desktopCall("watchPath", { path, ...options }).catch(() => null);
  if (!watcher || typeof onEvent !== "function") return () => {};

  let unlisten = () => {};
  if (listen) {
    unlisten = await listen("forgebook://vault-watch", (event) => {
      if (!event?.payload || event.payload.watcherId !== watcher.watcherId) return;
      onEvent({
        watcherId: event.payload.watcherId,
        type: event.payload.event || "file_changed",
        kind: event.payload.kind || "modify",
        path: event.payload.eventPath || event.payload.event_path || event.payload.path || path,
        rootPath: event.payload.path || path,
        timestamp: event.payload.timestamp || "",
      });
    });
  }

  return async () => {
    try {
      unlisten?.();
    } catch {}
    try {
      await desktopCall("unwatchPath", { watcherId: watcher.watcherId });
    } catch {}
  };
}

export async function checkForUpdates(payload = {}) {
  return desktopCall("checkForUpdates", payload);
}

export async function installUpdate(payload = {}) {
  return desktopCall("installUpdate", payload);
}

export async function restartApp(payload = {}) {
  return desktopCall("restartApp", payload);
}
