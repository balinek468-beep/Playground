export function WorkspaceSettings() {
  return {
    id: "workspace",
    label: "Workspace",
    description: "Navigation, explorer behavior, saved layouts, and vault workspace defaults.",
    tips: [
      "Workspace layouts let different disciplines jump into the software with the right chrome visible.",
      "Restoring tabs and remembering sidebar state are the fastest way to keep momentum between sessions.",
    ],
    presets: [
      {
        id: "writer-layout",
        label: "Writer Layout",
        values: {
          "settings.workspace.activeLayout": "writer",
          "settings.workspace.rightPanelDefaultOpen": true,
          "settings.workspace.sidebarWidth": 260,
          "settings.workspace.topbarDensity": "comfortable",
        },
      },
      {
        id: "balancer-layout",
        label: "Balancer Layout",
        values: {
          "settings.workspace.activeLayout": "balancer",
          "settings.workspace.sidebarWidth": 300,
          "settings.workspace.rightPanelDefaultOpen": false,
        },
      },
      {
        id: "manager-layout",
        label: "Manager Layout",
        values: {
          "settings.workspace.activeLayout": "manager",
          "settings.workspace.sidebarWidth": 280,
          "settings.workspace.openItemsBehavior": "tab",
        },
      },
      {
        id: "minimal-layout",
        label: "Minimal Layout",
        values: {
          "settings.workspace.activeLayout": "minimal",
          "settings.workspace.sidebarCollapsedByDefault": true,
          "settings.workspace.showIconLabels": false,
        },
      },
    ],
    groups: [
      {
        id: "layout",
        title: "Workspace Layout",
        settings: [
          { path: "settings.workspace.sidebarWidth", label: "Sidebar width", type: "range", min: 220, max: 360, step: 4 },
          { path: "settings.workspace.sidebarCollapsedByDefault", label: "Sidebar collapsed by default", type: "toggle" },
          { path: "settings.workspace.rememberSidebarState", label: "Remember sidebar state", type: "toggle" },
          { path: "settings.workspace.rightPanelDefaultOpen", label: "Right panel open by default", type: "toggle" },
          {
            path: "settings.workspace.topbarDensity",
            label: "Topbar density",
            type: "select",
            options: [
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ],
          },
          { path: "settings.workspace.showIconLabels", label: "Show icon labels", type: "toggle" },
        ],
      },
      {
        id: "navigation",
        title: "Navigation",
        settings: [
          { path: "settings.workspace.tabNavigation", label: "Tab navigation", type: "toggle" },
          { path: "settings.workspace.restorePreviousTabs", label: "Restore previous tabs", type: "toggle" },
          { path: "settings.workspace.recentFilesCount", label: "Recent files count", type: "range", min: 4, max: 20, step: 1 },
          {
            path: "settings.workspace.defaultLandingPage",
            label: "Default landing page",
            type: "select",
            options: [
              { value: "library", label: "Vault dashboard" },
              { value: "workspace", label: "Last workspace" },
              { value: "market", label: "Developer market" },
            ],
          },
          {
            path: "settings.workspace.openItemsBehavior",
            label: "Open items in",
            type: "select",
            options: [
              { value: "tab", label: "New tab" },
              { value: "same", label: "Same view" },
            ],
          },
        ],
      },
      {
        id: "explorer",
        title: "Explorer",
        settings: [
          {
            path: "settings.workspace.vaultDashboardLayout",
            label: "Vault dashboard layout",
            type: "select",
            options: [
              { value: "grid", label: "Grid" },
              { value: "dense-grid", label: "Dense Grid" },
              { value: "list", label: "List" },
            ],
          },
          {
            path: "settings.workspace.explorerSorting",
            label: "Explorer sorting",
            type: "select",
            options: [
              { value: "manual", label: "Manual" },
              { value: "name", label: "By name" },
              { value: "updated", label: "By last updated" },
              { value: "type", label: "By file type" },
            ],
          },
          {
            path: "settings.workspace.explorerIconStyle",
            label: "Explorer icon style",
            type: "select",
            options: [
              { value: "glyph", label: "Glyph" },
              { value: "outline", label: "Outline" },
              { value: "minimal", label: "Minimal" },
            ],
          },
        ],
      },
    ],
  };
}
