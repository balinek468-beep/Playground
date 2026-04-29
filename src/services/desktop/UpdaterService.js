import { ENV } from "../../constants/env.js";
import { checkForUpdates, installUpdate, isDesktopEnvironment, restartApp } from "./DesktopBridge.js";

function compareVersions(left = "0.0.0", right = "0.0.0") {
  const leftParts = String(left).split(".").map((part) => Number(part || 0));
  const rightParts = String(right).split(".").map((part) => Number(part || 0));
  const size = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < size; index += 1) {
    const delta = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

export async function initializeUpdater(options = {}) {
  const currentVersion = options.currentVersion || "0.1.0";
  const feedUrl = options.feedUrl || `${ENV.appUrl.replace(/\/$/, "")}/version.json`;
  const result = {
    enabled: isDesktopEnvironment(),
    checked: false,
    updateAvailable: false,
    currentVersion,
    latestVersion: currentVersion,
    feedUrl,
    install: async () => ({ ok: false, skipped: true }),
  };

  try {
    if (isDesktopEnvironment()) {
      const desktopResult = await checkForUpdates({ currentVersion, feedUrl }).catch(() => null);
      if (desktopResult?.version) {
        result.checked = true;
        result.latestVersion = desktopResult.version;
        result.updateAvailable = compareVersions(desktopResult.version, currentVersion) > 0;
        result.install = async () => {
          await installUpdate({ version: desktopResult.version, url: desktopResult.url || desktopResult.downloadUrl || "" });
          await restartApp();
          return { ok: true };
        };
        return result;
      }
    }

    const response = await fetch(feedUrl, { cache: "no-store" });
    if (!response.ok) return result;
    const remote = await response.json();
    result.checked = true;
    result.latestVersion = remote?.version || currentVersion;
    result.updateAvailable = compareVersions(result.latestVersion, currentVersion) > 0;
    result.downloadUrl = remote?.downloads?.windows || remote?.downloadUrl || "";
    return result;
  } catch (error) {
    console.warn("ForgeBook updater check failed", error);
    return result;
  }
}
