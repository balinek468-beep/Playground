import { ENV } from "../../constants/env.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";

export async function fetchWorkspaceSnapshot(userId) {
  const client = getSupabaseClient();
  if (!client || !userId) return null;
  const { data, error } = await client
    .from(ENV.workspaceTable)
    .select("workspace_snapshot, updated_at")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data?.workspace_snapshot ? JSON.stringify(data.workspace_snapshot) : null;
}

export async function persistWorkspaceSnapshot(userId, snapshotString) {
  const client = getSupabaseClient();
  if (!client || !userId || !snapshotString) return;
  const snapshotKb = new Blob([snapshotString]).size / 1024;
  if (snapshotKb > ENV.workspaceSnapshotMaxKb) {
    throw new Error(`Workspace snapshot exceeds ${ENV.workspaceSnapshotMaxKb}KB cloud sync limit.`);
  }
  const payload = {
    user_id: userId,
    workspace_snapshot: JSON.parse(snapshotString),
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from(ENV.workspaceTable).upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
}
