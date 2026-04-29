import { ENV } from "../../constants/env.js";
import { filterLegacyMockMarketProfiles } from "../../utils/marketProfiles.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";

function createLegacyMarketplaceSchemaError(error) {
  const next = new Error("Marketplace posting is blocked until the multi-post marketplace migration is applied.");
  next.code = "marketplace_schema_legacy_single_post";
  next.hint = "Run backend/supabase/marketplace_multi_post_migration.sql in Supabase before creating additional marketplace posts.";
  next.details = error?.details || "Legacy marketplace schema still forces post id to behave like user id.";
  next.cause = error;
  return next;
}

function isLegacySinglePostSchemaError(error) {
  const message = String(error?.message || "").toLowerCase();
  const details = String(error?.details || "").toLowerCase();
  return (
    message.includes("foreign key") ||
    details.includes("foreign key") ||
    message.includes("marketplace_profiles_id_fkey") ||
    details.includes("marketplace_profiles_id_fkey")
  );
}

export async function fetchMarketplaceProfiles() {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from(ENV.marketTable)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  const profiles = filterLegacyMockMarketProfiles(data || []);
  const userIds = [...new Set(profiles.map((entry) => entry.user_id).filter(Boolean))];
  if (!userIds.length) return profiles;
  const { data: profileRows, error: profileError } = await client
    .from(ENV.profileTable)
    .select("id, nickname, avatar_url, banner_url, profile_url, availability_status")
    .in("id", userIds);
  if (profileError) throw profileError;
  const profileMap = new Map((profileRows || []).map((entry) => [entry.id, entry]));
  return profiles.map((entry) => {
    const profile = profileMap.get(entry.user_id);
    return {
      ...entry,
      profile_url: profile?.profile_url || entry.profile_url || "",
      avatar_url: entry.avatar_url || profile?.avatar_url || "",
      banner_url: entry.banner_url || profile?.banner_url || "",
      nickname: entry.nickname || profile?.nickname || "Developer",
      availability_status: entry.availability_status || profile?.availability_status || "Open to offers",
    };
  });
}

export async function upsertMarketplaceProfile(profile) {
  const client = getSupabaseClient();
  if (!client) return null;
  const payload = {
    id: profile?.id || undefined,
    user_id: profile?.user_id,
    nickname: profile?.nickname,
    display_name: profile?.display_name,
    role: profile?.role,
    bio: profile?.bio ?? "",
    availability_status: profile?.availability_status ?? "Open to offers",
    experience_level: profile?.experience_level ?? "Mid",
    hourly_rate: profile?.hourly_rate ?? null,
    tags: Array.isArray(profile?.tags) ? profile.tags : [],
    tools: Array.isArray(profile?.tools) ? profile.tools : [],
    portfolio: Array.isArray(profile?.portfolio) ? profile.portfolio : [],
    updated_at: profile?.updated_at || new Date().toISOString(),
  };
  const { data, error } = await client
    .from(ENV.marketTable)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) {
    if (isLegacySinglePostSchemaError(error)) throw createLegacyMarketplaceSchemaError(error);
    throw error;
  }
  return data;
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
