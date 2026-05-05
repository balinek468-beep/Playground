function normalizeReleaseChannel(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "stable";
  return normalized.split(".")[0];
}

function deriveReleaseChannel(version = "0.0.0") {
  const normalized = String(version || "").trim();
  if (!normalized.includes("-")) return "stable";
  return normalizeReleaseChannel(normalized.split("-").slice(1).join("-"));
}

export const APP_VERSION = typeof __FORGEBOOK_VERSION__ !== "undefined" ? __FORGEBOOK_VERSION__ : "0.1.0-alpha";
export const APP_RELEASE_CHANNEL = typeof __FORGEBOOK_RELEASE_CHANNEL__ !== "undefined"
  ? normalizeReleaseChannel(__FORGEBOOK_RELEASE_CHANNEL__)
  : deriveReleaseChannel(APP_VERSION);
export const APP_RELEASE_TAG = typeof __FORGEBOOK_RELEASE_TAG__ !== "undefined" ? __FORGEBOOK_RELEASE_TAG__ : `v${APP_VERSION}`;

export function getReleaseChannelLabel(channel = APP_RELEASE_CHANNEL) {
  const normalized = normalizeReleaseChannel(channel);
  if (!normalized || normalized === "stable") return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
