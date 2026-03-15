export function SettingsPreviewPanel({ category, favorites, recent, state, selectedPath }) {
  const accent = state.settings?.appearance?.accentColor || "#8b5cf6";
  const gradientFrom = state.settings?.appearance?.accentGradientFrom || accent;
  const gradientTo = state.settings?.appearance?.accentGradientTo || "#38bdf8";
  const title = category?.label || "Settings";
  const help = category?.tips || [];
  return `
    <aside class="settings-preview-panel">
      <section class="settings-preview-card premium-surface">
        <p class="eyebrow">Live Preview</p>
        <div class="settings-preview-chrome" style="--settings-accent:${accent};--settings-gradient-from:${gradientFrom};--settings-gradient-to:${gradientTo};">
          <div class="settings-preview-topbar">
            <span class="settings-preview-pill"></span>
            <span class="settings-preview-pill large"></span>
            <span class="settings-preview-avatar"></span>
          </div>
          <div class="settings-preview-body">
            <div class="settings-preview-sidebar">
              <span></span><span></span><span class="active"></span>
            </div>
            <div class="settings-preview-content">
              <div class="settings-preview-cardline title"></div>
              <div class="settings-preview-cardline"></div>
              <div class="settings-preview-cardline short"></div>
            </div>
          </div>
        </div>
        <strong class="settings-preview-title">${title}</strong>
        <p class="settings-preview-text">${selectedPath ? `Editing ${selectedPath}` : category?.description || "Select a setting to preview live."}</p>
      </section>
      <section class="settings-help-card premium-surface">
        <p class="eyebrow">Contextual Help</p>
        <div class="settings-help-list">
          ${help.length ? help.map((tip) => `<p>${tip}</p>`).join("") : `<p>Choose a category to see guidance.</p>`}
        </div>
      </section>
      <section class="settings-help-card premium-surface">
        <p class="eyebrow">Favorites</p>
        <div class="settings-chip-list">
          ${(favorites || []).length
            ? favorites.slice(0, 8).map((path) => `<span class="settings-chip">${path.path.split(".").slice(-1)[0]}</span>`).join("")
            : `<span class="settings-sidebar-muted">Favorite controls show up here.</span>`}
        </div>
      </section>
      <section class="settings-help-card premium-surface">
        <p class="eyebrow">Recently Changed</p>
        <div class="settings-preview-recent">
          ${(recent || []).length
            ? recent.slice(0, 5).map((entry) => `<div><strong>${entry.label}</strong><span>${entry.group}</span></div>`).join("")
            : `<p>No recent changes yet.</p>`}
        </div>
      </section>
    </aside>
  `;
}
