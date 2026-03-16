import { ENV } from "../../constants/env.js";
import { filterLegacyMockMarketProfiles } from "../../utils/marketProfiles.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";

export async function fetchMarketplaceProfiles() {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from(ENV.marketTable)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return filterLegacyMockMarketProfiles(data || []);
}

export async function upsertMarketplaceProfile(profile) {
  const client = getSupabaseClient();
  if (!client) return null;
  const sanitizePayload = (payload) => ({
    id: payload.id,
    user_id: payload.user_id,
    nickname: payload.nickname,
    display_name: payload.display_name,
    role: payload.role,
    bio: payload.bio ?? "",
    availability_status: payload.availability_status ?? "Open to offers",
    experience_level: payload.experience_level ?? "Mid",
    hourly_rate: payload.hourly_rate ?? null,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    tools: Array.isArray(payload.tools) ? payload.tools : [],
    portfolio: Array.isArray(payload.portfolio) ? payload.portfolio : [],
    updated_at: payload.updated_at || new Date().toISOString(),
  });
  const attemptUpsert = async (payload) => {
    const { data, error } = await client
      .from(ENV.marketTable)
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  };
  const basePayload = sanitizePayload(profile);
  try {
    return await attemptUpsert(basePayload);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const details = String(error?.details || "").toLowerCase();
    const looksLikeLegacySinglePostSchema =
      message.includes("foreign key") ||
      details.includes("foreign key") ||
      message.includes("marketplace_profiles_id_fkey");
    if (!looksLikeLegacySinglePostSchema || !basePayload?.user_id) throw error;
    const legacyPayload = {
      ...basePayload,
      id: basePayload.user_id,
    };
    return await attemptUpsert(legacyPayload);
  }
}

export async function deleteMarketplaceProfile(profileId, userId) {
  const client = getSupabaseClient();
  if (!client || !profileId || !userId) return;
  const { error } = await client
    .from(ENV.marketTable)
    .delete()
    .eq("id", profileId)
    .eq("user_id", userId);
  if (error) throw error;
}
