import { APP_VIEWS } from "../utils/constants.js";

export const routeCatalog = {
  views: {
    [APP_VIEWS.LIBRARY]: {
      id: APP_VIEWS.LIBRARY,
      label: "Vault Library",
      page: "VaultPage",
      navigation: "global",
    },
    [APP_VIEWS.WORKSPACE]: {
      id: APP_VIEWS.WORKSPACE,
      label: "Workspace",
      page: "AnyOtherExistingPage",
      navigation: "contextual",
    },
    [APP_VIEWS.MARKET]: {
      id: APP_VIEWS.MARKET,
      label: "Developer Market",
      page: "MarketPage",
      navigation: "global",
    },
  },
  overlays: {
    switcher: { id: "switcher", label: "Quick Switch", page: null },
    profile: { id: "profile", label: "Profile", page: "ProfilePage" },
    friends: { id: "friends", label: "Friends", page: "FriendsPage" },
    messages: { id: "messages", label: "Messages", page: "MessagesPage" },
    notifications: { id: "notifications", label: "Notifications", page: "NotificationsPage" },
    share: { id: "share", label: "Share Vault", page: null },
    settings: { id: "settings", label: "Settings", page: "SettingsPage" },
  },
};

export function createRouter() {
  return routeCatalog;
}
