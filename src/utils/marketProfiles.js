const LEGACY_MOCK_MARKET_NICKNAMES = new Set(["EchoLoop", "FrameWarden", "RuneSpline", "GridForge"]);
const LEGACY_MOCK_MARKET_DISPLAY_NAMES = new Set(["Marta S", "Alex R", "Kaja N", "Damian T"]);

export function isLegacyMockMarketProfile(profile) {
  if (!profile || typeof profile !== "object") return false;
  const nickname = String(profile.nickname || "").trim();
  const displayName = String(profile.displayName || profile.display_name || "").trim();
  return LEGACY_MOCK_MARKET_NICKNAMES.has(nickname) || LEGACY_MOCK_MARKET_DISPLAY_NAMES.has(displayName);
}

export function filterLegacyMockMarketProfiles(profiles) {
  if (!Array.isArray(profiles)) return [];
  return profiles.filter((profile) => !isLegacyMockMarketProfile(profile));
}
