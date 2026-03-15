export function BoardsSettings() {
  return {
    id: "boards",
    label: "Boards",
    description: "Production board density, column width, task metadata, and automation defaults.",
    tips: [
      "Wider columns scan better on production boards; dense cards are best only when triaging.",
      "Archive completed items carefully if you rely on boards for postmortem history.",
    ],
    groups: [
      {
        id: "board-layout",
        title: "Board Layout",
        settings: [
          {
            path: "settings.boards.cardDensity",
            label: "Card density",
            type: "select",
            options: [
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ],
          },
          { path: "settings.boards.columnWidth", label: "Column width", type: "range", min: 320, max: 460, step: 10 },
          {
            path: "settings.boards.metadataVisibility",
            label: "Metadata visibility",
            type: "select",
            options: [
              { value: "minimal", label: "Minimal" },
              { value: "standard", label: "Standard" },
              { value: "full", label: "Full" },
            ],
          },
          { path: "settings.boards.dueDateVisibility", label: "Due date visibility", type: "toggle" },
          { path: "settings.boards.ownerVisibility", label: "Owner visibility", type: "toggle" },
          { path: "settings.boards.checklistPreview", label: "Checklist preview", type: "toggle" },
        ],
      },
      {
        id: "board-behavior",
        title: "Board Behavior",
        settings: [
          {
            path: "settings.boards.defaultBoardPreset",
            label: "Default board preset",
            type: "select",
            options: [
              { value: "production", label: "Production" },
              { value: "sprint", label: "Sprint" },
              { value: "review", label: "Review" },
            ],
          },
          { path: "settings.boards.quickAddCardOnEnter", label: "Quick add card on Enter", type: "toggle" },
          { path: "settings.boards.archiveCompletedItems", label: "Archive completed items", type: "toggle" },
          { path: "settings.boards.workloadCounters", label: "Workload counters", type: "toggle" },
          { path: "settings.boards.highlightOverdueTasks", label: "Highlight overdue tasks", type: "toggle" },
        ],
      },
    ],
  };
}
