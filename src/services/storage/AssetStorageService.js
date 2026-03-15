import { ENV } from "../../constants/env.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";

export async function uploadAsset({ userId, file, folder = "profiles" }) {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const extension = file.name.split(".").pop() || "bin";
  const path = `${folder}/${userId}/${Date.now()}.${extension}`;
  const { error } = await client.storage.from(ENV.assetBucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  const { data } = client.storage.from(ENV.assetBucket).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
