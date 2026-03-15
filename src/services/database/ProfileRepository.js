import { ENV } from "../../constants/env.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";

export async function ensureProfile(user, fallbackProfile = {}) {
  const client = getSupabaseClient();
  if (!client || !user) return null;
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
