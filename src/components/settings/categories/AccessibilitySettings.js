export function AccessibilitySettings() {
  return {
    id: "accessibility",
    label: "Accessibility",
    description: "Contrast, motion, click target sizing, focus visibility, and reading support.",
    tips: [
      "Larger click targets and stronger focus rings are the quickest way to make the app easier to operate for long sessions.",
      "Reduced motion here complements the appearance reduced motion toggle and should stay synchronized.",
    ],
    groups: [
      {
        id: "clarity",
        title: "Visual Clarity",
        settings: [
          { path: "settings.accessibility.highContrastMode", label: "High contrast mode", type: "toggle" },
          { path: "settings.accessibility.largerClickTargets", label: "Larger click targets", type: "toggle" },
          { path: "settings.accessibility.reducedMotion", label: "Reduced motion", type: "toggle" },
          { path: "settings.accessibility.focusRingIntensity", label: "Focus ring intensity", type: "range", min: 0, max: 1, step: 0.01 },
          { path: "settings.accessibility.textScaling", label: "Text scaling", type: "range", min: 0.9, max: 1.3, step: 0.01 },
        ],
      },
      {
        id: "support",
        title: "Reading & Input Support",
        settings: [
          { path: "settings.accessibility.keyboardNavigationMode", label: "Keyboard navigation mode", type: "toggle" },
          { path: "settings.accessibility.dyslexiaFriendlyFont", label: "Dyslexia friendly font", type: "toggle" },
          {
            path: "settings.accessibility.colorblindSupport",
            label: "Colorblind support",
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
