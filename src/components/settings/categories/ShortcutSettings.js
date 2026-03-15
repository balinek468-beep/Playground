export function ShortcutSettings() {
  return {
    id: "shortcuts",
    label: "Shortcuts",
    description: "Keyboard shortcuts, quick actions, topbar actions, and toolbar visibility.",
    tips: [
      "This is the safest place to centralize shortcuts instead of scattering them across feature pages.",
      "Quick actions shape what appears in launch flows like quick switch and future command palette expansions.",
    ],
    groups: [
      {
        id: "shortcuts-core",
        title: "Core Shortcuts",
        settings: [
          { path: "settings.shortcuts.newFile", label: "New file", type: "text", placeholder: "Ctrl+N" },
          { path: "settings.shortcuts.openFile", label: "Open file", type: "text", placeholder: "Ctrl+P" },
          { path: "settings.shortcuts.commandPalette", label: "Command palette", type: "text", placeholder: "Ctrl+K" },
          { path: "settings.shortcuts.insertBlock", label: "Insert block", type: "text", placeholder: "Ctrl+/" },
        ],
      },
      {
        id: "shortcut-surface",
        title: "Action Surfaces",
        settings: [
          { path: "settings.shortcuts.quickActions", label: "Quick actions", type: "tags", placeholder: "New Note, New Sheet, New Board" },
          { path: "settings.shortcuts.topbarActions", label: "Topbar actions", type: "tags", placeholder: "Search, Messages, Notifications" },
          { path: "settings.shortcuts.toolbarButtons", label: "Toolbar buttons", type: "tags", placeholder: "Bold, Italic, Heading" },
        ],
      },
    ],
  };
}
