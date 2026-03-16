import { ENV } from "../../constants/env.js";
import { randomUserId } from "../../utils/helpers.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";

async function resolveStablePublicId(client, preferredId, userId) {
  const candidates = [];
  if (preferredId) candidates.push(String(preferredId).trim().toUpperCase());
  while (candidates.length < 6) candidates.push(randomUserId());

  for (const candidate of candidates) {
    if (!candidate) continue;
    const { data, error } = await client
      .from(ENV.profileTable)
      .select("id, profile_url")
      .eq("profile_url", candidate)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.id === userId) return candidate;
  }
  return randomUserId();
}

export async function ensureProfile(user, fallbackProfile = {}) {
  const client = getSupabaseClient();
  if (!client || !user) return null;
  const { data: existing } = await client
    .from(ENV.profileTable)
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const publicProfileId = await resolveStablePublicId(
    client,
    existing?.profile_url || fallbackProfile.publicId || fallbackProfile.profileUrl,
    user.id,
  );
  const payload = {
    id: user.id,
    email: user.email || null,
    nickname: fallbackProfile.name || user.user_metadata?.name || "You",
    role: fallbackProfile.role || "Creative Director",
    headline: fallbackProfile.tagline || "Design discipline beats chaos.",
    avatar_url: fallbackProfile.avatar || null,
    banner_url: fallbackProfile.banner || null,
    accent_color: fallbackProfile.accent || "#8b5cf6",
    availability_status: fallbackProfile.status || "Available for collaboration",
    profile_url: publicProfileId,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from(ENV.profileTable)
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function fetchProfileByPublicId(publicId) {
  const client = getSupabaseClient();
  if (!client || !publicId) return null;
  const normalizedId = String(publicId).trim();
  const { data, error } = await client
    .from(ENV.profileTable)
    .select("*")
    .ilike("profile_url", normalizedId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}
