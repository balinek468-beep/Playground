export function CanvasSettings() {
  return {
    id: "canvas",
    label: "Canvas",
    description: "Grid, snapping, connectors, motion tuning, and node defaults for visual planning.",
    tips: [
      "A smaller grid with stronger snapping is best for systems maps; larger grids fit moodboards and world plans.",
      "Lower pan sensitivity helps when using a trackpad on large diagrams.",
    ],
    groups: [
      {
        id: "canvas-grid",
        title: "Grid & Guides",
        settings: [
          { path: "settings.canvas.gridVisibility", label: "Grid visibility", type: "toggle" },
          { path: "settings.canvas.gridSize", label: "Grid size", type: "range", min: 12, max: 64, step: 2 },
          { path: "settings.canvas.snapStrength", label: "Snap strength", type: "range", min: 0, max: 1, step: 0.01 },
          { path: "settings.canvas.autoAlignGuides", label: "Auto align guides", type: "toggle" },
          { path: "settings.canvas.smartSnapping", label: "Smart snapping", type: "toggle" },
        ],
      },
      {
        id: "canvas-interaction",
        title: "Interaction",
        settings: [
          {
            path: "settings.canvas.connectorStyle",
            label: "Connector style",
            type: "select",
            options: [
              { value: "curve", label: "Curve" },
              { value: "straight", label: "Straight" },
              { value: "orthogonal", label: "Orthogonal" },
            ],
          },
          { path: "settings.canvas.defaultNodeColor", label: "Default node color", type: "color" },
          { path: "settings.canvas.zoomSensitivity", label: "Zoom sensitivity", type: "range", min: 0.5, max: 1.8, step: 0.01 },
          { path: "settings.canvas.panSensitivity", label: "Pan sensitivity", type: "range", min: 0.5, max: 1.8, step: 0.01 },
          { path: "settings.canvas.miniMapToggle", label: "Mini map", type: "toggle" },
          { path: "settings.canvas.drawingSmoothing", label: "Drawing smoothing", type: "range", min: 0, max: 1, step: 0.01 },
        ],
      },
    ],
  };
}
