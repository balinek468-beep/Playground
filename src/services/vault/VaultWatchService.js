import { isDesktopEnvironment } from "../desktop/DesktopBridge.js";
import { vaultRootPath } from "./VaultPaths.js";

export function createVaultWatchService({ provider, vaultManager } = {}) {
  let stopWatching = null;

  return {
    start(vaultId, handlers = {}) {
      if (!provider?.watch || !vaultId) return () => {};
      if (stopWatching) stopWatching();
      stopWatching = provider.watch(vaultRootPath(vaultId), async (event) => {
        if (typeof handlers.onExternalChange === "function") {
          handlers.onExternalChange(event);
        }
        if (typeof handlers.onConflict === "function" && handlers.isDirty?.()) {
          const externalContents = await provider.load(event.path).catch(() => null);
          if (externalContents != null) {
            await vaultManager?.createConflictCopy?.(event.path, externalContents).catch(() => null);
            handlers.onConflict({ ...event, conflictCopyCreated: true });
          }
        }
      });
      return stopWatching;
    },
    stop() {
      if (stopWatching) stopWatching();
      stopWatching = null;
    },
    isSupported() {
      return Boolean(isDesktopEnvironment() && provider?.watch);
    },
  };
}
