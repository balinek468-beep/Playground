export function AdvancedSettings() {
  return {
    id: "advanced",
    label: "Advanced",
    description: "Performance, cache, workspace recovery, developer mode, and experimental controls.",
    tips: [
      "Use performance mode on lower-powered machines before disabling whole features.",
      "Resetting workspace state should be a last resort; settings export is safer for preserving your setup.",
    ],
    groups: [
      {
        id: "advanced-runtime",
        title: "Runtime",
        settings: [
          { path: "settings.advanced.performanceMode", label: "Performance mode", type: "toggle" },
          { path: "settings.advanced.disableAnimations", label: "Disable animations", type: "toggle" },
          { path: "settings.advanced.developerMode", label: "Developer mode", type: "toggle" },
          { path: "settings.advanced.experimentalFeatures", label: "Experimental features", type: "toggle" },
        ],
      },
      {
        id: "advanced-actions",
        title: "Maintenance",
        settings: [
          { path: "settings.advanced.clearCacheAction", label: "Clear cache action", type: "text", placeholder: "Use Reset All or future cache tools" },
          { path: "settings.advanced.resetWorkspaceAction", label: "Reset workspace state", type: "text", placeholder: "Use workspace recovery tools" },
        ],
      },
    ],
  };
}
