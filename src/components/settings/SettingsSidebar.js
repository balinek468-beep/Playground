export function SettingsSidebar({ categories, activeCategory, search, favorites, recent }) {
  const filtered = categories.filter((category) => !search || category.visibleCount > 0);
  return `
    <aside class="settings-sidebar">
      <div class="settings-sidebar-section">
        <p class="eyebrow">Categories</p>
        <div class="settings-category-list">
          ${filtered.map((category) => `
            <button class="settings-category-button ${category.id === activeCategory ? "active" : ""}" type="button" data-settings-category="${category.id}">
              <span class="settings-category-copy">
                <strong>${category.label}</strong>
                <span>${category.visibleCount} controls</span>
              </span>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="settings-sidebar-section">
        <p class="eyebrow">Pinned</p>
        <div class="settings-chip-list">
          ${(favorites || []).length
            ? favorites.slice(0, 6).map((path) => `<span class="settings-chip">${path.path.split(".").slice(-1)[0]}</span>`).join("")
            : `<span class="settings-sidebar-muted">Star settings to pin them here.</span>`}
        </div>
      </div>
      <div class="settings-sidebar-section">
        <p class="eyebrow">Recent</p>
        <div class="settings-recent-list">
          ${(recent || []).length
            ? recent.slice(0, 5).map((entry) => `<button type="button" class="settings-recent-item" data-settings-jump="${entry.path}">${entry.label}</button>`).join("")
            : `<span class="settings-sidebar-muted">Recently changed settings show up here.</span>`}
        </div>
      </div>
    </aside>
  `;
}
