export function SheetsSettings() {
  return {
    id: "sheets",
    label: "Sheets",
    description: "Balancing sheet density, formulas, keyboard navigation, and balancing profiles.",
    tips: [
      "Use balancing profiles to flip the sheet workspace between economy, combat, loot, and progression presets.",
      "Referenced column highlighting is the safest way to audit large formulas while balancing live systems.",
    ],
    presets: [
      {
        id: "economy",
        label: "Economy",
        values: {
          "settings.sheets.activeProfile": "economy",
          "settings.sheets.decimalPrecision": 2,
          "settings.sheets.zebraRows": true,
        },
      },
      {
        id: "combat",
        label: "Combat",
        values: {
          "settings.sheets.activeProfile": "combat",
          "settings.sheets.decimalPrecision": 1,
          "settings.sheets.highlightReferencedColumns": true,
        },
      },
      {
        id: "loot",
        label: "Loot",
        values: {
          "settings.sheets.activeProfile": "loot",
          "settings.sheets.decimalPrecision": 0,
          "settings.sheets.autoFormatNumbers": true,
        },
      },
      {
        id: "progression",
        label: "Progression",
        values: {
          "settings.sheets.activeProfile": "progression",
          "settings.sheets.formulaSuggestions": true,
          "settings.sheets.showRowNumbers": true,
        },
      },
    ],
    groups: [
      {
        id: "sheet-display",
        title: "Display",
        settings: [
          {
            path: "settings.sheets.tableDensity",
            label: "Table density",
            type: "select",
            options: [
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ],
          },
          { path: "settings.sheets.stickyHeaders", label: "Sticky headers", type: "toggle" },
          { path: "settings.sheets.formulaBarAlwaysVisible", label: "Formula bar always visible", type: "toggle" },
          { path: "settings.sheets.formulaSuggestions", label: "Formula suggestions", type: "toggle" },
          { path: "settings.sheets.highlightReferencedColumns", label: "Highlight referenced columns", type: "toggle" },
          { path: "settings.sheets.showRowNumbers", label: "Show row numbers", type: "toggle" },
          { path: "settings.sheets.showColumnLabels", label: "Show column labels", type: "toggle" },
          { path: "settings.sheets.zebraRows", label: "Zebra rows", type: "toggle" },
        ],
      },
      {
        id: "sheet-formatting",
        title: "Formatting & Input",
        settings: [
          { path: "settings.sheets.decimalPrecision", label: "Decimal precision", type: "range", min: 0, max: 6, step: 1 },
          { path: "settings.sheets.autoFormatNumbers", label: "Auto format numbers", type: "toggle" },
          { path: "settings.sheets.keyboardNavigation", label: "Keyboard navigation", type: "toggle" },
          {
            path: "settings.sheets.enterBehavior",
            label: "Enter behavior",
            type: "select",
            options: [
              { value: "move-down", label: "Move down" },
              { value: "stay", label: "Stay in cell" },
              { value: "move-right", label: "Move right" },
            ],
          },
          {
            path: "settings.sheets.tabBehavior",
            label: "Tab behavior",
            type: "select",
            options: [
              { value: "move-right", label: "Move right" },
              { value: "move-down", label: "Move down" },
              { value: "indent", label: "Indent selection" },
            ],
          },
          { path: "settings.sheets.duplicateRowShortcut", label: "Duplicate row shortcut", type: "text", placeholder: "Ctrl+D" },
        ],
      },
    ],
  };
}
