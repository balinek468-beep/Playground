const DEFAULT_NAMESPACE = "forgebook.vfs";
const CHANGE_EVENT = "forgebook:browser-storage-provider-change";

function safeWindow() {
  return typeof window !== "undefined" ? window : null;
}

function normalizePath(path = "/") {
  const value = String(path || "/").replace(/\\/g, "/");
  const collapsed = value.replace(/\/+/g, "/");
  if (collapsed === "/") return "/";
  return collapsed.startsWith("/") ? collapsed.replace(/\/+$/g, "") : `/${collapsed.replace(/\/+$/g, "")}`;
}

function joinPath(...parts) {
  return normalizePath(parts.filter(Boolean).join("/"));
}

function sortUnique(values) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

export class BrowserStorageProvider {
  constructor(options = {}) {
    this.namespace = options.namespace || DEFAULT_NAMESPACE;
    this.indexKey = `${this.namespace}::index`;
    this.isSynchronous = true;
    this.kind = "browser";
  }

  normalize(path) {
    return normalizePath(path);
  }

  join(...parts) {
    return joinPath(...parts);
  }

  _entryKey(path) {
    return `${this.namespace}::entry::${this.normalize(path)}`;
  }

  _readIndex() {
    const win = safeWindow();
    if (!win?.localStorage) return [];
    try {
      const raw = win.localStorage.getItem(this.indexKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string") : [];
    } catch (error) {
      console.warn("ForgeBook browser storage index read failed", error);
      return [];
    }
  }

  _writeIndex(paths) {
    const win = safeWindow();
    if (!win?.localStorage) return { ok: false, error: new Error("localStorage unavailable") };
    try {
      win.localStorage.setItem(this.indexKey, JSON.stringify(sortUnique(paths.map((entry) => this.normalize(entry)))));
      return { ok: true };
    } catch (error) {
      console.error("ForgeBook browser storage index write failed", error);
      return { ok: false, error };
    }
  }

  _emitChange(type, path) {
    const win = safeWindow();
    win?.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { type, path: this.normalize(path) } }));
  }

  loadSync(path) {
    const win = safeWindow();
    if (!win?.localStorage) return null;
    try {
      return win.localStorage.getItem(this._entryKey(path));
    } catch (error) {
      console.error(`ForgeBook browser storage load failed for ${path}`, error);
      return null;
    }
  }

  async load(path) {
    return this.loadSync(path);
  }

  saveSync(path, value, options = {}) {
    const normalizedPath = this.normalize(path);
    const win = safeWindow();
    if (!win?.localStorage) return { ok: false, error: new Error("localStorage unavailable") };
    const payload = String(value ?? "");
    const tempPath = `${normalizedPath}.tmp.${Date.now()}`;
    try {
      if (options.atomic !== false) {
        win.localStorage.setItem(this._entryKey(tempPath), payload);
      }
      win.localStorage.setItem(this._entryKey(normalizedPath), payload);
      if (options.atomic !== false) {
        win.localStorage.removeItem(this._entryKey(tempPath));
      }
      const index = this._readIndex();
      const writeIndexResult = this._writeIndex([...index, normalizedPath]);
      if (!writeIndexResult.ok) return writeIndexResult;
      this._emitChange("save", normalizedPath);
      return { ok: true, path: normalizedPath, bytes: new Blob([payload]).size };
    } catch (error) {
      console.error(`ForgeBook browser storage save failed for ${normalizedPath}`, error);
      return { ok: false, error };
    }
  }

  async save(path, value, options = {}) {
    return this.saveSync(path, value, options);
  }

  deleteSync(path) {
    const normalizedPath = this.normalize(path);
    const win = safeWindow();
    if (!win?.localStorage) return { ok: false, error: new Error("localStorage unavailable") };
    try {
      win.localStorage.removeItem(this._entryKey(normalizedPath));
      const index = this._readIndex().filter((entry) => entry !== normalizedPath);
      const writeIndexResult = this._writeIndex(index);
      if (!writeIndexResult.ok) return writeIndexResult;
      this._emitChange("delete", normalizedPath);
      return { ok: true };
    } catch (error) {
      console.error(`ForgeBook browser storage delete failed for ${normalizedPath}`, error);
      return { ok: false, error };
    }
  }

  async delete(path) {
    return this.deleteSync(path);
  }

  listSync(prefix = "/") {
    const normalizedPrefix = this.normalize(prefix);
    return this._readIndex()
      .filter((entry) => normalizedPrefix === "/" || entry === normalizedPrefix || entry.startsWith(`${normalizedPrefix}/`))
      .map((entry) => ({ path: entry, type: "file" }));
  }

  async list(prefix = "/") {
    return this.listSync(prefix);
  }

  existsSync(path) {
    return this.loadSync(path) != null;
  }

  async exists(path) {
    return this.existsSync(path);
  }

  watch(prefix, callback) {
    const normalizedPrefix = this.normalize(prefix);
    const win = safeWindow();
    if (!win?.addEventListener) return () => {};
    const handler = (event) => {
      const changedPath = event?.detail?.path;
      if (!changedPath) return;
      if (normalizedPrefix !== "/" && changedPath !== normalizedPrefix && !changedPath.startsWith(`${normalizedPrefix}/`)) return;
      callback?.({
        type: event?.detail?.type || "change",
        path: changedPath,
        provider: this.kind,
      });
    };
    win.addEventListener(CHANGE_EVENT, handler);
    return () => win.removeEventListener(CHANGE_EVENT, handler);
  }
}

export function createBrowserStorageProvider(options = {}) {
  return new BrowserStorageProvider(options);
}
