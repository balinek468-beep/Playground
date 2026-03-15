export function FriendsSettings() {
  return {
    id: "friends-messages",
    label: "Friends & Messages",
    description: "Privacy, visibility, typing signals, and chat ergonomics.",
    tips: [
      "Message permissions are friend-network aware; collaborators and vault teammates can still be allowed separately.",
      "The chat sidebars can already be resized live from messages, and these settings set the defaults.",
    ],
    groups: [
      {
        id: "privacy",
        title: "Privacy",
        settings: [
          {
            path: "settings.friendsMessages.whoCanMessageYou",
            label: "Who can message you",
            type: "select",
            options: [
              { value: "everyone", label: "Everyone" },
              { value: "friends-and-collaborators", label: "Friends & collaborators" },
              { value: "friends-only", label: "Friends only" },
            ],
          },
          {
            path: "settings.friendsMessages.whoCanSendFriendRequests",
            label: "Who can send friend requests",
            type: "select",
            options: [
              { value: "everyone", label: "Everyone" },
              { value: "mutuals", label: "Mutual collaborators only" },
              { value: "nobody", label: "Nobody" },
            ],
          },
          {
            path: "settings.friendsMessages.onlineStatusVisibility",
            label: "Online status visibility",
            type: "select",
            options: [
              { value: "everyone", label: "Everyone" },
              { value: "friends", label: "Friends" },
              { value: "nobody", label: "Nobody" },
            ],
          },
          {
            path: "settings.friendsMessages.activityVisibility",
            label: "Activity visibility",
            type: "select",
            options: [
              { value: "everyone", label: "Everyone" },
              { value: "friends", label: "Friends" },
              { value: "nobody", label: "Nobody" },
            ],
          },
        ],
      },
      {
        id: "chat",
        title: "Chat Experience",
        settings: [
          { path: "settings.friendsMessages.typingIndicators", label: "Typing indicators", type: "toggle" },
          { path: "settings.friendsMessages.readReceipts", label: "Read receipts", type: "toggle" },
          { path: "settings.friendsMessages.messagePreviewInNotifications", label: "Show message preview in chat previews", type: "toggle" },
          { path: "settings.friendsMessages.compactChatMode", label: "Compact chat mode", type: "toggle" },
          { path: "settings.chatSidebarWidth", label: "Conversation list width", type: "range", min: 240, max: 420, step: 4 },
          { path: "settings.chatMembersWidth", label: "Members panel width", type: "range", min: 220, max: 380, step: 4 },
        ],
      },
    ],
  };
}
