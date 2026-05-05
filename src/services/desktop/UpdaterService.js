import { ENV } from "../../constants/env.js";
import { APP_VERSION } from "../../constants/release.js";
import { checkForUpdates, installUpdate, isDesktopEnvironment, restartApp } from "./DesktopBridge.js";

function parseVersion(value = "0.0.0") {
  const normalized = String(value || "0.0.0").trim().replace(/^v/i, "");
  const [versionPart, buildMetadata = ""] = normalized.split("+", 2);
  const [corePart, prereleasePart = ""] = versionPart.split("-", 2);
  const core = corePart
    .split(".")
    .map((part) => Number.parseInt(part || "0", 10))
    .filter((part) => Number.isFinite(part));

  while (core.length < 3) core.push(0);

  return {
    core,
    prerelease: prereleasePart
      ? prereleasePart.split(".").filter(Boolean)
      : [],
    buildMetadata,
  };
}

function comparePrereleaseIdentifier(left = "", right = "") {
  const leftIsNumeric = /^\d+$/.test(left);
  const rightIsNumeric = /^\d+$/.test(right);

  if (leftIsNumeric && rightIsNumeric) {
    return Number(left) - Number(right);
  }

  if (leftIsNumeric) return -1;
  if (rightIsNumeric) return 1;
  return String(left).localeCompare(String(right));
}

function compareVersions(left = "0.0.0", right = "0.0.0") {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  const size = Math.max(leftVersion.core.length, rightVersion.core.length);

  for (let index = 0; index < size; index += 1) {
    const delta = (leftVersion.core[index] || 0) - (rightVersion.core[index] || 0);
    if (delta !== 0) return delta;
  }

  const leftPrerelease = leftVersion.prerelease;
  const rightPrerelease = rightVersion.prerelease;
  if (!leftPrerelease.length && !rightPrerelease.length) return 0;
  if (!leftPrerelease.length) return 1;
  if (!rightPrerelease.length) return -1;

  const prereleaseSize = Math.max(leftPrerelease.length, rightPrerelease.length);
  for (let index = 0; index < prereleaseSize; index += 1) {
    const leftIdentifier = leftPrerelease[index];
    const rightIdentifier = rightPrerelease[index];
    if (leftIdentifier === undefined) return -1;
    if (rightIdentifier === undefined) return 1;

    const delta = comparePrereleaseIdentifier(leftIdentifier, rightIdentifier);
    if (delta !== 0) return delta;
  }

  return 0;
}

function resolveDownloadUrl(remote = {}) {
  const directDownloads = Array.isArray(remote?.downloads?.files) ? remote.downloads.files : [];
  const preferredDownload = directDownloads.find((file) => (
    String(file?.id || "").trim() === "windows-installer"
    && !file?.disabled
    && String(file?.url || "").trim()
  ));
  if (preferredDownload?.url) return preferredDownload.url;

  const recommendedDownload = directDownloads.find((file) => (
    Boolean(file?.recommended)
    && !file?.disabled
    && String(file?.url || "").trim()
  ));
  if (recommendedDownload?.url) return recommendedDownload.url;

  const fallbackDownload = directDownloads.find((file) => !file?.disabled && String(file?.url || "").trim());
  return fallbackDownload?.url || remote?.downloads?.windows || remote?.downloadUrl || "";
}

export async function initializeUpdater(options = {}) {
  const currentVersion = options.currentVersion || APP_VERSION;
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
        if (result.updateAvailable) {
          result.install = async () => {
            await installUpdate({ version: desktopResult.version, url: desktopResult.url || desktopResult.downloadUrl || "" });
            await restartApp();
            return { ok: true };
          };
        }
        return result;
      }
    }

    const response = await fetch(feedUrl, { cache: "no-store" });
    if (!response.ok) return result;
    const remote = await response.json();
    result.checked = true;
    result.latestVersion = remote?.version || currentVersion;
    result.updateAvailable = compareVersions(result.latestVersion, currentVersion) > 0;
    result.downloadUrl = resolveDownloadUrl(remote);
    return result;
  } catch (error) {
    console.warn("ForgeBook updater check failed", error);
    return result;
  }
}
