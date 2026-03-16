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
  const { data, error } = await client
    .from(ENV.marketTable)
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
