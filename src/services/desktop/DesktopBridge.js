function getDesktopApi() {
  if (typeof window === "undefined") return null;
  return window.__FORGEBOOK_DESKTOP__ || null;
}

async function invokeTauri(command, payload = {}) {
  if (typeof window === "undefined") return null;
  const invoke = window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke;
  if (!invoke) return null;
  return invoke(command, payload);
}

export function isDesktopEnvironment() {
  return Boolean(getDesktopApi() || (typeof window !== "undefined" && (window.__TAURI__?.core?.invoke || window.__TAURI_INTERNALS__?.invoke)));
}

export async function desktopCall(method, payload = {}) {
  const desktopApi = getDesktopApi();
  if (desktopApi && typeof desktopApi[method] === "function") {
    return desktopApi[method](payload);
  }
  const tauriCommandMap = {
    getAppPaths: "forgebook_get_app_paths",
    readTextFile: "forgebook_read_text_file",
    writeTextFile: "forgebook_write_text_file",
    deletePath: "forgebook_delete_path",
    listPaths: "forgebook_list_paths",
    watchPath: "forgebook_watch_path",
    checkForUpdates: "forgebook_check_for_updates",
    installUpdate: "forgebook_install_update",
    restartApp: "forgebook_restart_app",
  };
  const command = tauriCommandMap[method];
  if (!command) throw new Error(`Unsupported desktop method: ${method}`);
  const result = await invokeTauri(command, payload);
  if (result == null) {
    throw new Error(`Desktop bridge unavailable for ${method}`);
  }
  return result;
}

export async function getAppPaths() {
  return desktopCall("getAppPaths").catch(() => ({ rootDir: "", vaultsDir: "", appConfigDir: "" }));
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

export async function watchPath(path, options = {}, onEvent) {
  const desktopApi = getDesktopApi();
  if (desktopApi && typeof desktopApi.watchPath === "function") {
    return desktopApi.watchPath({ path, ...options }, onEvent);
  }
  const watcher = await desktopCall("watchPath", { path, ...options }).catch(() => null);
  if (!watcher || typeof onEvent !== "function") return () => {};
  return () => {
    try {
      if (typeof watcher.unsubscribe === "function") watcher.unsubscribe();
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
