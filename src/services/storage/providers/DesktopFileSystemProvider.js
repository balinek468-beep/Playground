import { getAppPaths, isDesktopEnvironment, listPaths, readTextFile, watchPath, writeTextFile, deletePath } from "../../desktop/DesktopBridge.js";

function normalizePath(path = "/") {
  const value = String(path || "/").replace(/\\/g, "/");
  const collapsed = value.replace(/\/+/g, "/");
  if (collapsed === "/") return "/";
  return collapsed.startsWith("/") ? collapsed.replace(/\/+$/g, "") : `/${collapsed.replace(/\/+$/g, "")}`;
}

export class DesktopFileSystemProvider {
  constructor(options = {}) {
    this.kind = "desktop";
    this.isSynchronous = false;
    this.rootDir = options.rootDir || "";
  }

  normalize(path) {
    return normalizePath(path);
  }

  join(...parts) {
    return this.normalize(parts.filter(Boolean).join("/"));
  }

  async resolveRootDir() {
    if (this.rootDir) return this.rootDir;
    const paths = await getAppPaths();
    this.rootDir = String(paths?.rootDir || "").replace(/\\/g, "/");
    return this.rootDir;
  }

  async resolvePath(path) {
    const rootDir = await this.resolveRootDir();
    const normalized = this.normalize(path);
    if (!rootDir) return normalized;
    return `${rootDir}${normalized}`.replace(/\\/g, "/");
  }

  async toRelativePath(absolutePath) {
    const rootDir = await this.resolveRootDir();
    const normalizedAbsolute = String(absolutePath || "").replace(/\\/g, "/");
    if (!rootDir || !normalizedAbsolute.startsWith(rootDir)) return this.normalize(normalizedAbsolute || "/");
    const relative = normalizedAbsolute.slice(rootDir.length) || "/";
    return this.normalize(relative);
  }

  async load(path) {
    const resolvedPath = await this.resolvePath(path);
    return readTextFile(resolvedPath);
  }

  async save(path, value, options = {}) {
    const resolvedPath = await this.resolvePath(path);
    return writeTextFile(resolvedPath, String(value ?? ""), { atomic: options.atomic !== false });
  }

  async delete(path) {
    const resolvedPath = await this.resolvePath(path);
    return deletePath(resolvedPath, { recursive: false });
  }

  async list(prefix = "/") {
    const resolvedPath = await this.resolvePath(prefix);
    const entries = await listPaths(resolvedPath, { recursive: true }).catch(() => []);
    const results = [];
    for (const entry of Array.isArray(entries) ? entries : []) {
      const absolutePath = typeof entry === "string" ? entry : entry.path;
      const type = typeof entry === "string" ? "file" : entry.type || "file";
      results.push({
        path: await this.toRelativePath(absolutePath),
        type,
      });
    }
    return results;
  }

  watch(prefix, callback) {
    const setup = async () => {
      const resolvedPath = await this.resolvePath(prefix);
      return watchPath(resolvedPath, { recursive: true }, async (event) => {
        callback?.({
          type: event?.type || "change",
          path: await this.toRelativePath(event?.path || prefix),
          provider: this.kind,
        });
      });
    };
    let unsubscribe = () => {};
    setup().then((stop) => {
      if (typeof stop === "function") unsubscribe = stop;
    }).catch((error) => {
      console.warn("ForgeBook desktop watcher setup failed", error);
    });
    return () => unsubscribe();
  }
}

export function createDesktopFileSystemProvider(options = {}) {
  if (!isDesktopEnvironment()) return null;
  return new DesktopFileSystemProvider(options);
}
