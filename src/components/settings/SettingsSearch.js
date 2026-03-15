export function SettingsSearch({ search, presetOptions, draftPresetName }) {
  return `
    <header class="settings-toolbar premium-surface">
      <label class="settings-search">
        <span>Search settings</span>
        <input id="settingsSearchInput" type="search" value="${escapeAttr(search || "")}" placeholder="Search editor, blur, formulas, notifications..." />
      </label>
      <div class="settings-toolbar-group">
        <button id="settingsResetAllButton" class="secondary-button compact-action-button" type="button">Reset All</button>
        <button id="settingsExportButton" class="secondary-button compact-action-button" type="button">Export</button>
        <button id="settingsImportButton" class="secondary-button compact-action-button" type="button">Import</button>
      </div>
      <div class="settings-toolbar-group settings-preset-tools">
        <select id="settingsPresetSelect" class="modal-input">
          <option value="">Apply preset</option>
          ${presetOptions.map((preset) => `<option value="${escapeAttr(preset.id)}">${escapeHtml(preset.name)}</option>`).join("")}
        </select>
        <input id="settingsPresetNameInput" class="modal-input settings-preset-name" type="text" value="${escapeAttr(draftPresetName || "")}" placeholder="Save current as preset" />
        <button id="settingsSavePresetButton" class="primary-button compact-action-button" type="button">Save Preset</button>
      </div>
    </header>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
