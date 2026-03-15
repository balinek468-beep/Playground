import { getSupabaseClient } from "../auth/supabaseClient.js";

export function subscribeToChannel({ channel, event = "*", schema = "public", table, filter, onMessage }) {
  const client = getSupabaseClient();
  if (!client) return () => {};
  const subscription = client
    .channel(channel)
    .on("postgres_changes", { event, schema, table, filter }, (payload) => onMessage(payload))
    .subscribe();
  return () => client.removeChannel(subscription);
}
