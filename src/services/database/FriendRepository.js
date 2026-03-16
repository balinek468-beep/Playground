import { ENV } from "../../constants/env.js";
import { getSupabaseClient } from "../auth/supabaseClient.js";

async function fetchProfilesByIds(client, userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  const { data, error } = await client
    .from(ENV.profileTable)
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return new Map((data || []).map((entry) => [entry.id, entry]));
}

export async function fetchFriendNetwork(userId) {
  const client = getSupabaseClient();
  if (!client || !userId) {
    return {
      friends: [],
      incoming: [],
      outgoing: [],
    };
  }

  const [{ data: friendships, error: friendshipsError }, { data: requests, error: requestsError }] = await Promise.all([
    client
      .from("friendships")
      .select("id, user_id, friend_id, created_at")
      .eq("user_id", userId),
    client
      .from("friend_requests")
      .select("id, sender_id, receiver_id, status, created_at, updated_at")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
  ]);

  if (friendshipsError) throw friendshipsError;
  if (requestsError) throw requestsError;

  const friendIds = (friendships || []).map((entry) => entry.friend_id);
  const requestUserIds = (requests || []).flatMap((entry) => [entry.sender_id, entry.receiver_id]);
  const profileMap = await fetchProfilesByIds(client, [...friendIds, ...requestUserIds]);

  const friends = (friendships || []).map((entry) => ({
    ...entry,
    profile: profileMap.get(entry.friend_id) || null,
  }));

  const pending = (requests || []).filter((entry) => entry.status === "pending");
  const incoming = pending
    .filter((entry) => entry.receiver_id === userId)
    .map((entry) => ({
      ...entry,
      profile: profileMap.get(entry.sender_id) || null,
    }));
  const outgoing = pending
    .filter((entry) => entry.sender_id === userId)
    .map((entry) => ({
      ...entry,
      profile: profileMap.get(entry.receiver_id) || null,
    }));

  return { friends, incoming, outgoing };
}

export async function sendFriendRequest(senderId, receiverId) {
  const client = getSupabaseClient();
  if (!client || !senderId || !receiverId || senderId === receiverId) return null;

  const { data: existing } = await client
    .from("friend_requests")
    .select("id, status")
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId)
    .maybeSingle();

  if (existing?.status === "pending") return existing;

  const payload = {
    sender_id: senderId,
    receiver_id: receiverId,
    status: "pending",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await client
    .from("friend_requests")
    .upsert(payload, { onConflict: "sender_id,receiver_id" })
    .select("id, sender_id, receiver_id, status, created_at, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function cancelFriendRequest(requestId, userId) {
  const client = getSupabaseClient();
  if (!client || !requestId || !userId) return;
  const { error } = await client
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("sender_id", userId);
  if (error) throw error;
}

export async function declineFriendRequest(requestId, userId) {
  const client = getSupabaseClient();
  if (!client || !requestId || !userId) return;
  const { error } = await client
    .from("friend_requests")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("receiver_id", userId);
  if (error) throw error;
}

export async function acceptFriendRequest(requestId, userId) {
  const client = getSupabaseClient();
  if (!client || !requestId || !userId) return null;

  const { data: request, error: requestError } = await client
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status")
    .eq("id", requestId)
    .eq("receiver_id", userId)
    .single();
  if (requestError) throw requestError;
  if (!request || request.status !== "pending") return request;

  const now = new Date().toISOString();

  const { error: updateError } = await client
    .from("friend_requests")
    .update({ status: "accepted", updated_at: now })
    .eq("id", requestId)
    .eq("receiver_id", userId);
  if (updateError) throw updateError;

  const rows = [
    { user_id: request.sender_id, friend_id: request.receiver_id, created_at: now },
    { user_id: request.receiver_id, friend_id: request.sender_id, created_at: now },
  ];

  const { error: friendshipError } = await client
    .from("friendships")
    .upsert(rows, { onConflict: "user_id,friend_id" });
  if (friendshipError) throw friendshipError;

  return request;
}
