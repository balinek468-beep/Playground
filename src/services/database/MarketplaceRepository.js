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
  const attemptUpsert = async (payload) => {
    const { data, error } = await client
      .from(ENV.marketTable)
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  };
  try {
    return await attemptUpsert(profile);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    const details = String(error?.details || "").toLowerCase();
    const looksLikeLegacySinglePostSchema =
      message.includes("foreign key") ||
      details.includes("foreign key") ||
      message.includes("marketplace_profiles_id_fkey");
    if (!looksLikeLegacySinglePostSchema || !profile?.user_id) throw error;
    const legacyPayload = {
      ...profile,
      id: profile.user_id,
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
