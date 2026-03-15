export function NotificationSettings() {
  return {
    id: "notifications",
    label: "Notifications",
    description: "High-signal only. Team, marketplace, and system events are surfaced here, while chat relies on unread badges instead.",
    tips: [
      "Chat messages do not create notifications here. Use unread badges and mention highlights in conversations instead.",
      "Quiet hours stack well with priority notifications if you still want urgent project signals overnight.",
    ],
    groups: [
      {
        id: "delivery",
        title: "Delivery Modes",
        settings: [
          { path: "settings.notifications.teamNotifications", label: "Team notifications", type: "select", options: [{ value: "in-app", label: "In-app" }, { value: "badge", label: "Badge only" }, { value: "sound", label: "Sound" }, { value: "off", label: "Off" }] },
          { path: "settings.notifications.marketplaceNotifications", label: "Marketplace notifications", type: "select", options: [{ value: "in-app", label: "In-app" }, { value: "badge", label: "Badge only" }, { value: "sound", label: "Sound" }, { value: "off", label: "Off" }] },
          { path: "settings.notifications.systemNotifications", label: "System notifications", type: "select", options: [{ value: "in-app", label: "In-app" }, { value: "badge", label: "Badge only" }, { value: "sound", label: "Sound" }, { value: "off", label: "Off" }] },
          { path: "settings.notifications.emailNotifications", label: "Email notifications", type: "toggle" },
          { path: "settings.notifications.muteMarketplaceSuggestions", label: "Mute marketplace suggestions", type: "toggle" },
        ],
      },
      {
        id: "quiet-hours",
        title: "Quiet Hours",
        settings: [
          { path: "settings.notifications.quietHoursStart", label: "Quiet hours start", type: "time" },
          { path: "settings.notifications.quietHoursEnd", label: "Quiet hours end", type: "time" },
          { path: "settings.notifications.doNotDisturb", label: "Do not disturb", type: "toggle" },
          { path: "settings.notifications.priorityNotifications", label: "Priority notifications", type: "toggle" },
          { path: "settings.notifications.autoExpireDays", label: "Auto-expire old notifications", type: "range", min: 7, max: 90, step: 1 },
        ],
      },
    ],
  };
}
