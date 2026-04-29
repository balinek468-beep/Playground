import { ENV } from "../../constants/env.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";
import { extractWorkspaceSnapshotMetadata } from "../../app/storage.js";

function snapshotEnvelope(snapshotString) {
  const metadata = extractWorkspaceSnapshotMetadata(snapshotString) || {};
  return {
    snapshot: JSON.parse(snapshotString),
    metadata,
  };
}

async function upsertWorkspaceViaKeepalive({ userId, snapshotString, accessToken }) {
  const envelope = snapshotEnvelope(snapshotString);
  const response = await fetch(`${ENV.supabaseUrl}/rest/v1/${ENV.workspaceTable}?on_conflict=user_id`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      apikey: ENV.supabaseAnonKey,
      Authorization: `Bearer ${accessToken}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({
      user_id: userId,
      workspace_snapshot: envelope.snapshot,
      local_revision: Number(envelope.metadata.localRevision || 0),
      device_id: envelope.metadata.deviceId || null,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "Cloud sync failed");
    throw new Error(message || "Cloud sync failed");
  }
}

export async function fetchWorkspaceSnapshot(userId) {
  const client = getSupabaseClient();
  if (!client || !userId) return null;
  const { data, error } = await client
    .from(ENV.workspaceTable)
    .select("workspace_snapshot, updated_at, local_revision, device_id")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  if (!data?.workspace_snapshot) return null;
  const snapshotString = JSON.stringify(data.workspace_snapshot);
  const metadata = extractWorkspaceSnapshotMetadata(snapshotString) || {};
  return {
    snapshotString,
    updatedAt: data.updated_at || "",
    localRevision: Number(data.local_revision || metadata.localRevision || 0),
    deviceId: data.device_id || metadata.deviceId || "",
    metadata,
  };
}

export async function persistWorkspaceSnapshot(userId, snapshotString, options = {}) {
  const client = getSupabaseClient();
  if (!client || !userId || !snapshotString) return { ok: false, skipped: true };
  const snapshotKb = new Blob([snapshotString]).size / 1024;
  if (snapshotKb > ENV.workspaceSnapshotMaxKb) {
    const error = new Error(`Workspace snapshot exceeds ${ENV.workspaceSnapshotMaxKb}KB cloud sync limit.`);
    error.code = "workspace_snapshot_too_large";
    error.snapshotKb = snapshotKb;
    throw error;
  }
  const envelope = snapshotEnvelope(snapshotString);
  if (options.keepalive && options.accessToken) {
    await upsertWorkspaceViaKeepalive({ userId, snapshotString, accessToken: options.accessToken });
    return {
      ok: true,
      metadata: envelope.metadata,
      snapshotKb,
      updatedAt: new Date().toISOString(),
    };
  }
  const payload = {
    user_id: userId,
    workspace_snapshot: envelope.snapshot,
    local_revision: Number(envelope.metadata.localRevision || 0),
    device_id: envelope.metadata.deviceId || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from(ENV.workspaceTable).upsert(payload, { onConflict: "user_id" });
  if (error) throw error;
  return {
    ok: true,
    metadata: envelope.metadata,
    snapshotKb,
    updatedAt: payload.updated_at,
  };
}
