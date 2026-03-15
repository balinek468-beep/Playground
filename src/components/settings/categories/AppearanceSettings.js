export function AppearanceSettings() {
  return {
    id: "appearance",
    label: "Appearance",
    description: "Theme, glass surfaces, density, motion, and live preview controls.",
    tips: [
      "Use density and UI scale together to tune how much information fits on screen.",
      "Reduced motion and high contrast feed directly into productivity-focused accessibility.",
    ],
    presets: [
      {
        id: "obsidian-glass",
        label: "Obsidian Glass",
        values: {
          "settings.theme": "dark",
          "settings.glowMode": "cinematic",
          "settings.appearance.themeVariant": "obsidian-glass",
          "settings.appearance.panelTransparency": 0.84,
          "settings.appearance.glassBlurStrength": 18,
        },
      },
      {
        id: "neon-focus",
        label: "Neon Focus",
        values: {
          "settings.theme": "dark",
          "settings.glowMode": "vivid",
          "settings.appearance.themeVariant": "neon",
          "settings.appearance.borderGlowStrength": 0.62,
          "settings.appearance.shadowIntensity": 0.28,
        },
      },
      {
        id: "minimal-night",
        label: "Minimal Night",
        values: {
          "settings.theme": "dark",
          "settings.glowMode": "subtle",
          "settings.appearance.themeVariant": "minimal",
          "settings.appearance.panelTransparency": 0.92,
          "settings.appearance.glassBlurStrength": 10,
        },
      },
    ],
    groups: [
      {
        id: "theme",
        title: "Theme System",
        settings: [
          {
            path: "settings.theme",
            label: "Theme variant",
            type: "select",
            options: [
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ],
            tags: ["theme", "mode", "dark", "light"],
          },
          {
            path: "settings.glowMode",
            label: "Glow profile",
            type: "select",
            options: [
              { value: "subtle", label: "Subtle" },
              { value: "cinematic", label: "Cinematic" },
              { value: "vivid", label: "Vivid" },
            ],
            tags: ["glow", "fx"],
          },
          {
            path: "settings.appearance.themeVariant",
            label: "Glass variant",
            type: "select",
            options: [
              { value: "obsidian-glass", label: "Obsidian Glass" },
              { value: "neon", label: "Neon" },
              { value: "minimal", label: "Minimal" },
            ],
          },
        ],
      },
      {
        id: "surface",
        title: "Surface Styling",
        settings: [
          { path: "settings.appearance.accentColor", label: "Accent color", type: "color" },
          { path: "settings.appearance.accentGradientFrom", label: "Accent gradient start", type: "color" },
          { path: "settings.appearance.accentGradientTo", label: "Accent gradient end", type: "color" },
          { path: "settings.appearance.panelTransparency", label: "Panel transparency", type: "range", min: 0.55, max: 1, step: 0.01 },
          { path: "settings.appearance.glassBlurStrength", label: "Glass blur strength", type: "range", min: 0, max: 32, step: 1 },
          { path: "settings.appearance.borderGlowStrength", label: "Border glow strength", type: "range", min: 0, max: 1, step: 0.01 },
          { path: "settings.appearance.shadowIntensity", label: "Shadow intensity", type: "range", min: 0, max: 1, step: 0.01 },
          { path: "settings.appearance.cornerRoundness", label: "Corner roundness", type: "range", min: 8, max: 30, step: 1 },
        ],
      },
      {
        id: "scale",
        title: "Scale & Density",
        settings: [
          { path: "settings.appearance.uiScale", label: "UI scale", type: "range", min: 0.9, max: 1.15, step: 0.01 },
          { path: "settings.appearance.fontScale", label: "Font scale", type: "range", min: 0.9, max: 1.2, step: 0.01 },
          { path: "settings.appearance.iconSize", label: "Icon size", type: "range", min: 0.85, max: 1.3, step: 0.01 },
          {
            path: "settings.appearance.layoutDensity",
            label: "Layout density",
            type: "select",
            options: [
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ],
          },
        ],
      },
      {
        id: "motion",
        title: "Motion & Clarity",
        settings: [
          { path: "settings.appearance.animationIntensity", label: "Animation intensity", type: "range", min: 0, max: 1, step: 0.01 },
          { path: "settings.appearance.reducedMotion", label: "Reduced motion", type: "toggle" },
          { path: "settings.appearance.highContrastMode", label: "High contrast mode", type: "toggle" },
          {
            path: "settings.appearance.colorblindMode",
            label: "Colorblind mode",
            type: "select",
            options: [
              { value: "off", label: "Off" },
              { value: "deuteranopia", label: "Deuteranopia" },
              { value: "protanopia", label: "Protanopia" },
              { value: "tritanopia", label: "Tritanopia" },
            ],
          },
        ],
      },
    ],
  };
}
