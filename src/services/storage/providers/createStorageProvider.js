import { createBrowserStorageProvider } from "./BrowserStorageProvider.js";
import { createDesktopFileSystemProvider } from "./DesktopFileSystemProvider.js";

let cachedProvider = null;

export function createStorageProvider(options = {}) {
  if (cachedProvider && !options.forceNew) return cachedProvider;
  const desktopProvider = createDesktopFileSystemProvider(options);
  cachedProvider = desktopProvider || createBrowserStorageProvider(options);
  return cachedProvider;
}

export function getStorageProvider() {
  return cachedProvider || createStorageProvider();
}

export function resetStorageProvider() {
  cachedProvider = null;
}
