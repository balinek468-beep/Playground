import { getSupabaseClient } from "../auth/supabaseClient.js";

async function fetchProfilesByIds(client, userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return [];
  const { data, error } = await client
    .from("profiles")
    .select("id, nickname, role, headline, avatar_url, banner_url, availability_status, profile_url")
    .in("id", ids);
  if (error) throw error;
  return data || [];
}

export async function fetchConversationNetwork(userId) {
  const client = getSupabaseClient();
  if (!client || !userId) {
    return {
      conversations: [],
      profiles: [],
    };
  }

  const { data: memberships, error: membershipError } = await client
    .from("conversation_members")
    .select("conversation_id, user_id, role, joined_at")
    .eq("user_id", userId);
  if (membershipError) throw membershipError;

  const conversationIds = [...new Set((memberships || []).map((entry) => entry.conversation_id).filter(Boolean))];
  if (!conversationIds.length) {
    return {
      conversations: [],
      profiles: [],
    };
  }

  const [
    { data: conversations, error: conversationError },
    { data: allMembers, error: membersError },
    { data: messages, error: messagesError },
  ] = await Promise.all([
    client
      .from("conversations")
      .select("id, type, name, created_by, created_at, updated_at")
      .in("id", conversationIds)
      .order("updated_at", { ascending: false }),
    client
      .from("conversation_members")
      .select("conversation_id, user_id, role, joined_at")
      .in("conversation_id", conversationIds),
    client
      .from("messages")
      .select("id, conversation_id, author_id, content, attachments, reactions, created_at, updated_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true }),
  ]);

  if (conversationError) throw conversationError;
  if (membersError) throw membersError;
  if (messagesError) throw messagesError;

  const userIds = [...new Set((allMembers || []).map((entry) => entry.user_id).filter(Boolean))];
  const profiles = await fetchProfilesByIds(client, userIds);
  const profileMap = new Map(profiles.map((entry) => [entry.id, entry]));

  const memberMap = new Map();
  (allMembers || []).forEach((entry) => {
    const bucket = memberMap.get(entry.conversation_id) || [];
    bucket.push(entry);
    memberMap.set(entry.conversation_id, bucket);
  });

  const messageMap = new Map();
  (messages || []).forEach((entry) => {
    const bucket = messageMap.get(entry.conversation_id) || [];
    bucket.push(entry);
    messageMap.set(entry.conversation_id, bucket);
  });

  return {
    profiles,
    conversations: (conversations || []).map((conversation) => {
      const members = memberMap.get(conversation.id) || [];
      const memberIds = members.map((entry) => entry.user_id);
      const directCounterpartId =
        conversation.type === "direct"
          ? memberIds.find((memberId) => memberId !== userId) || userId
          : null;
      const directCounterpart = directCounterpartId ? profileMap.get(directCounterpartId) : null;
      return {
        ...conversation,
        name:
          conversation.type === "direct"
            ? directCounterpart?.nickname || conversation.name || "Direct message"
            : conversation.name || "Team chat",
        memberIds,
        members,
        messages: messageMap.get(conversation.id) || [],
      };
    }),
  };
}

export async function ensureDirectConversationRecord({ userId, friendId, fallbackName = "Direct message" }) {
  const client = getSupabaseClient();
  if (!client || !userId || !friendId || userId === friendId) return null;

  const { data: sharedMembers, error: sharedMembersError } = await client
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("user_id", [userId, friendId]);
  if (sharedMembersError) throw sharedMembersError;

  const countsByConversation = new Map();
  (sharedMembers || []).forEach((entry) => {
    const existing = countsByConversation.get(entry.conversation_id) || new Set();
    existing.add(entry.user_id);
    countsByConversation.set(entry.conversation_id, existing);
  });
  const sharedConversationIds = [...countsByConversation.entries()]
    .filter(([, members]) => members.has(userId) && members.has(friendId))
    .map(([conversationId]) => conversationId);

  if (sharedConversationIds.length) {
    const { data: existingConversation, error: existingConversationError } = await client
      .from("conversations")
      .select("id, type, name, created_by, created_at, updated_at")
      .in("id", sharedConversationIds)
      .eq("type", "direct")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existingConversationError) throw existingConversationError;
    if (existingConversation) return existingConversation;
  }

  const now = new Date().toISOString();
  const { data: createdConversation, error: createConversationError } = await client
    .from("conversations")
    .insert({
      type: "direct",
      name: fallbackName,
      created_by: userId,
      updated_at: now,
    })
    .select("id, type, name, created_by, created_at, updated_at")
    .single();
  if (createConversationError) throw createConversationError;

  const { error: memberInsertError } = await client
    .from("conversation_members")
    .upsert(
      [
        { conversation_id: createdConversation.id, user_id: userId, role: "owner" },
        { conversation_id: createdConversation.id, user_id: friendId, role: "member" },
      ],
      { onConflict: "conversation_id,user_id" },
    );
  if (memberInsertError) throw memberInsertError;

  return createdConversation;
}

export async function createGroupConversationRecord({ userId, name, memberIds = [] }) {
  const client = getSupabaseClient();
  if (!client || !userId || !name) return null;
  const now = new Date().toISOString();
  const uniqueMemberIds = [...new Set([userId, ...memberIds].filter(Boolean))];
  const { data: createdConversation, error: createConversationError } = await client
    .from("conversations")
    .insert({
      type: "group",
      name,
      created_by: userId,
      updated_at: now,
    })
    .select("id, type, name, created_by, created_at, updated_at")
    .single();
  if (createConversationError) throw createConversationError;

  const { error: memberInsertError } = await client
    .from("conversation_members")
    .upsert(
      uniqueMemberIds.map((memberId) => ({
        conversation_id: createdConversation.id,
        user_id: memberId,
        role: memberId === userId ? "owner" : "member",
      })),
      { onConflict: "conversation_id,user_id" },
    );
  if (memberInsertError) throw memberInsertError;

  return createdConversation;
}

export async function appendConversationMessage({ conversationId, authorId, content, attachments = [] }) {
  const client = getSupabaseClient();
  if (!client || !conversationId || !authorId || !content?.trim()) return null;
  const now = new Date().toISOString();
  const { data, error } = await client
    .from("messages")
    .insert({
      conversation_id: conversationId,
      author_id: authorId,
      content: content.trim(),
      attachments,
      updated_at: now,
    })
    .select("id, conversation_id, author_id, content, attachments, reactions, created_at, updated_at")
    .single();
  if (error) throw error;

  const { error: conversationUpdateError } = await client
    .from("conversations")
    .update({ updated_at: now })
    .eq("id", conversationId);
  if (conversationUpdateError) throw conversationUpdateError;

  return data;
}
