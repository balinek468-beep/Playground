export const ENV = {
  appUrl: import.meta.env.VITE_APP_URL || "http://127.0.0.1:5173",
  requireAuth: String(import.meta.env.VITE_REQUIRE_AUTH || "false").toLowerCase() === "true",
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
  workspaceTable: import.meta.env.VITE_SUPABASE_WORKSPACE_TABLE || "user_workspaces",
  profileTable: import.meta.env.VITE_SUPABASE_PROFILE_TABLE || "profiles",
  marketTable: import.meta.env.VITE_SUPABASE_MARKET_TABLE || "marketplace_profiles",
  notificationTable: import.meta.env.VITE_SUPABASE_NOTIFICATION_TABLE || "notifications",
  assetBucket: import.meta.env.VITE_SUPABASE_ASSET_BUCKET || "forgebook-assets",
  workspaceSyncIntervalMs: Number(import.meta.env.VITE_WORKSPACE_SYNC_INTERVAL_MS || 1800),
  workspaceSnapshotMaxKb: Number(import.meta.env.VITE_WORKSPACE_SNAPSHOT_MAX_KB || 5120),
};

export function isSupabaseConfigured() {
  return Boolean(ENV.supabaseUrl && ENV.supabaseAnonKey);
}
