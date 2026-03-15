export function EditorSettings() {
  return {
    id: "editor",
    label: "Editor",
    description: "Writing width, typography, sticky tools, focus modes, and authoring productivity.",
    tips: [
      "Default editor width syncs with the 1 / 2 / 3 width controls in the writing toolbar.",
      "Typewriter, focus mode, and distraction-free mode work best together for long-form design docs.",
    ],
    presets: [
      {
        id: "writer",
        label: "Writer",
        values: {
          "settings.editor.defaultEditorWidth": 1,
          "settings.writingWidth": 1,
          "settings.editor.focusMode": true,
          "settings.editor.showOutlinePanel": true,
        },
      },
      {
        id: "review",
        label: "Review",
        values: {
          "settings.editor.defaultEditorWidth": 2,
          "settings.writingWidth": 2,
          "settings.editor.showBreadcrumbs": true,
          "settings.editor.showDocumentMinimap": true,
        },
      },
      {
        id: "focus",
        label: "Focus",
        values: {
          "settings.editor.defaultEditorWidth": 1,
          "settings.writingWidth": 1,
          "settings.editor.distractionFreeMode": true,
          "settings.editor.typewriterMode": true,
        },
      },
    ],
    groups: [
      {
        id: "layout",
        title: "Writing Space",
        settings: [
          {
            path: "settings.editor.defaultEditorWidth",
            label: "Default editor width",
            type: "select",
            options: [
              { value: 1, label: "1 - Focused" },
              { value: 2, label: "2 - Balanced" },
              { value: 3, label: "3 - Wide" },
            ],
          },
          { path: "settings.editor.textSize", label: "Text size", type: "range", min: 0.9, max: 1.3, step: 0.01 },
          { path: "settings.editor.lineHeight", label: "Line height", type: "range", min: 1.3, max: 2.1, step: 0.01 },
          { path: "settings.editor.paragraphSpacing", label: "Paragraph spacing", type: "range", min: 0.8, max: 2, step: 0.05 },
        ],
      },
      {
        id: "writing-tools",
        title: "Writing Tools",
        settings: [
          { path: "settings.editor.stickyToolbar", label: "Sticky toolbar", type: "toggle" },
          { path: "settings.editor.floatingSelectionToolbar", label: "Floating text selection toolbar", type: "toggle" },
          { path: "settings.editor.showWordCount", label: "Show word count", type: "toggle" },
          { path: "settings.editor.showReadingTime", label: "Show reading time", type: "toggle" },
          { path: "settings.editor.showBlockCount", label: "Show block count", type: "toggle" },
          { path: "settings.editor.autoSaveInterval", label: "Auto-save interval (ms)", type: "range", min: 300, max: 3000, step: 100 },
          { path: "settings.editor.autoRecovery", label: "Auto recovery", type: "toggle" },
        ],
      },
      {
        id: "productivity",
        title: "Productivity",
        settings: [
          { path: "settings.editor.markdownShortcuts", label: "Markdown shortcuts", type: "toggle" },
          { path: "settings.editor.slashCommands", label: "Slash commands", type: "toggle" },
          { path: "settings.editor.focusMode", label: "Focus mode", type: "toggle" },
          { path: "settings.editor.distractionFreeMode", label: "Distraction free mode", type: "toggle" },
          { path: "settings.editor.typewriterMode", label: "Typewriter mode", type: "toggle" },
          { path: "settings.editor.showOutlinePanel", label: "Show outline panel", type: "toggle" },
          { path: "settings.editor.showBreadcrumbs", label: "Show breadcrumbs", type: "toggle" },
          { path: "settings.editor.showDocumentMinimap", label: "Show document minimap", type: "toggle" },
        ],
      },
    ],
  };
}
