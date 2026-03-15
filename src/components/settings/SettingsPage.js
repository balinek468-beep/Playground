import { AppearanceSettings } from "./categories/AppearanceSettings.js";
import { WorkspaceSettings } from "./categories/WorkspaceSettings.js";
import { EditorSettings } from "./categories/EditorSettings.js";
import { SheetsSettings } from "./categories/SheetsSettings.js";
import { BoardsSettings } from "./categories/BoardsSettings.js";
import { CanvasSettings } from "./categories/CanvasSettings.js";
import { NotificationSettings } from "./categories/NotificationSettings.js";
import { FriendsSettings } from "./categories/FriendsSettings.js";
import { MarketplaceSettings } from "./categories/MarketplaceSettings.js";
import { ProfileSettings } from "./categories/ProfileSettings.js";
import { AccessibilitySettings } from "./categories/AccessibilitySettings.js";
import { ShortcutSettings } from "./categories/ShortcutSettings.js";
import { AdvancedSettings } from "./categories/AdvancedSettings.js";
import { SettingsSidebar } from "./SettingsSidebar.js";
import { SettingsSearch } from "./SettingsSearch.js";
import { SettingsPreviewPanel } from "./SettingsPreviewPanel.js";

const CATEGORY_BUILDERS = [
  AppearanceSettings,
  WorkspaceSettings,
  EditorSettings,
  SheetsSettings,
  BoardsSettings,
  CanvasSettings,
  NotificationSettings,
  FriendsSettings,
  MarketplaceSettings,
  ProfileSettings,
  AccessibilitySettings,
  ShortcutSettings,
  AdvancedSettings,
];

export function renderSettingsPage(context) {
  const categories = CATEGORY_BUILDERS.map((build) => build());
  ensureMeta(context.state);

  const search = String(context.state.settingsMeta.search || "").trim().toLowerCase();
  const preparedCategories = categories.map((category) => {
    const visibleGroups = category.groups
      .map((group) => ({
        ...group,
        settings: group.settings.filter((setting) => matchesSearch(setting, group, category, search)),
      }))
      .filter((group) => group.settings.length);
    return {
      ...category,
      visibleGroups: search ? visibleGroups : category.groups,
      visibleCount: (search ? visibleGroups : category.groups).reduce((sum, group) => sum + group.settings.length, 0),
    };
  });

  const activeCategoryId = selectActiveCategory(context.state, preparedCategories, search);
  const activeCategory = preparedCategories.find((category) => category.id === activeCategoryId) || preparedCategories[0];
  const favorites = favoriteSettingEntries(preparedCategories, context.state.settingsMeta.favorites || []);
  const recent = recentSettingEntries(preparedCategories, context.state.settingsMeta.recent || []);
  const selectedPath = context.state.settingsMeta.selectedSettingPath || "";

  return {
    eyebrow: "Settings",
    title: "ForgeBook Control Center",
    cardClass: "overlay-card-settings",
    html: `
      <section class="settings-shell">
        ${SettingsSearch({
          search: context.state.settingsMeta.search || "",
          presetOptions: context.state.settingsMeta.presets || [],
          draftPresetName: context.state.settingsMeta.draftPresetName || "",
        })}
        <div class="settings-layout">
          ${SettingsSidebar({
            categories: preparedCategories,
            activeCategory: activeCategoryId,
            search,
            favorites,
            recent,
          })}
          <main class="settings-content">
            ${renderCategoryPanel(activeCategory, context.state, favorites)}
          </main>
          ${SettingsPreviewPanel({
            category: activeCategory,
            favorites,
            recent,
            state: context.state,
            selectedPath,
          })}
        </div>
      </section>
    `,
    bind(root) {
      bindSettingsPage(root, context, preparedCategories);
    },
  };
}

function bindSettingsPage(root, context, categories) {
  root.querySelectorAll("[data-settings-category]").forEach((button) => {
    button.addEventListener("click", () => {
      context.state.settingsMeta.activeCategory = button.dataset.settingsCategory;
      context.rerender();
    });
  });

  root.querySelectorAll("[data-settings-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      const path = button.dataset.settingsJump;
      const category = findCategoryByPath(categories, path);
      if (category) context.state.settingsMeta.activeCategory = category.id;
      context.state.settingsMeta.selectedSettingPath = path;
      context.rerender();
    });
  });

  root.querySelector("#settingsSearchInput")?.addEventListener("input", (event) => {
    context.state.settingsMeta.search = event.target.value || "";
    context.rerender();
  });

  root.querySelector("#settingsPresetNameInput")?.addEventListener("input", (event) => {
    context.state.settingsMeta.draftPresetName = event.target.value || "";
  });

  root.querySelector("#settingsPresetSelect")?.addEventListener("change", (event) => {
    const presetId = event.target.value;
    const preset = (context.state.settingsMeta.presets || []).find((entry) => entry.id === presetId);
    if (!preset) return;
    context.replaceSettings(preset.settings);
    context.notify("Settings preset applied", preset.name);
    context.rerender();
  });

  root.querySelector("#settingsSavePresetButton")?.addEventListener("click", () => {
    const name = String(context.state.settingsMeta.draftPresetName || "").trim();
    if (!name) return;
    const preset = { id: slugify(name), name, settings: deepClone(context.state.settings) };
    context.state.settingsMeta.presets = [
      ...(context.state.settingsMeta.presets || []).filter((entry) => entry.id !== preset.id),
      preset,
    ];
    context.state.settingsMeta.draftPresetName = "";
    context.save();
    context.notify("Preset saved", name);
    context.rerender();
  });

  root.querySelector("#settingsResetAllButton")?.addEventListener("click", () => {
    context.replaceSettings(context.createDefaultSettings());
    context.notify("Settings reset", "All settings returned to defaults.");
    context.rerender();
  });

  root.querySelector("#settingsExportButton")?.addEventListener("click", () => exportSettingsProfile(context));
  root.querySelector("#settingsImportButton")?.addEventListener("click", () => importSettingsProfile(context));

  root.querySelectorAll("[data-settings-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const category = categories.find((entry) => entry.id === button.dataset.categoryId);
      const preset = category?.presets?.find((entry) => entry.id === button.dataset.settingsPreset);
      if (!preset) return;
      Object.entries(preset.values || {}).forEach(([path, value]) => context.setSetting(path, deepClone(value), false));
      context.save();
      context.refreshUI();
      context.notify("Section preset applied", preset.label);
      context.rerender();
    });
  });

  root.querySelectorAll("[data-settings-reset-category]").forEach((button) => {
    button.addEventListener("click", () => {
      context.resetCategory(button.dataset.settingsResetCategory);
      context.notify("Category reset", "Section returned to defaults.");
      context.rerender();
    });
  });

  root.querySelectorAll("[data-setting-path]").forEach((element) => {
    const path = element.dataset.settingPath;
    const type = element.dataset.settingType;
    const handler = () => {
      const value = readInputValue(element, type);
      context.setSetting(path, value);
      context.state.settingsMeta.selectedSettingPath = path;
      context.markRecent(path, findSettingMeta(categories, path));
      context.refreshUI();
      context.rerender();
    };
    if (type === "range" || type === "color") element.addEventListener("input", handler);
    else element.addEventListener("change", handler);
  });

  root.querySelectorAll("[data-settings-favorite]").forEach((button) => {
    button.addEventListener("click", () => {
      context.toggleFavorite(button.dataset.settingsFavorite);
      context.rerender();
    });
  });
}

function renderCategoryPanel(category, state, favorites) {
  if (!category) return `<section class="settings-category-panel premium-surface"><p>No settings found.</p></section>`;
  return `
    <section class="settings-category-panel premium-surface">
      <div class="settings-category-header">
        <div>
          <p class="eyebrow">${escapeHtml(category.label)}</p>
          <h3>${escapeHtml(category.description)}</h3>
        </div>
        <button class="secondary-button compact-action-button" type="button" data-settings-reset-category="${category.id}">Reset Section</button>
      </div>
      ${Array.isArray(category.presets) && category.presets.length ? `
        <div class="settings-category-presets">
          ${category.presets.map((preset) => `<button class="secondary-button compact-action-button" type="button" data-category-id="${category.id}" data-settings-preset="${preset.id}">${escapeHtml(preset.label)}</button>`).join("")}
        </div>
      ` : ""}
      <div class="settings-group-stack">
        ${category.visibleGroups.map((group) => `
          <section class="settings-group">
            <div class="settings-group-header">
              <h4>${escapeHtml(group.title)}</h4>
              <span>${group.settings.length} controls</span>
            </div>
            <div class="settings-field-grid">
              ${group.settings.map((setting) => renderSettingField(setting, state, favorites)).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSettingField(setting, state, favorites) {
  const value = resolvePath(state, setting.path);
  const isFavorite = (favorites || []).some((entry) => entry.path === setting.path);
  return `
    <label class="settings-field-card">
      <div class="settings-field-top">
        <div class="settings-field-copy">
          <strong>${escapeHtml(setting.label)}</strong>
          ${setting.description ? `<span>${escapeHtml(setting.description)}</span>` : ""}
        </div>
        <button class="settings-favorite-button ${isFavorite ? "active" : ""}" type="button" data-settings-favorite="${setting.path}" title="Favorite setting">★</button>
      </div>
      ${renderInput(setting, value)}
    </label>
  `;
}

function renderInput(setting, value) {
  const common = `data-setting-path="${setting.path}" data-setting-type="${setting.type}"`;
  if (setting.type === "toggle") {
    return `<span class="settings-toggle"><input ${common} type="checkbox" ${value ? "checked" : ""} /><span class="settings-toggle-track"></span></span>`;
  }
  if (setting.type === "select") {
    return `<select ${common} class="modal-input">${(setting.options || []).map((option) => `<option value="${escapeAttr(option.value)}" ${String(option.value) === String(value) ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select>`;
  }
  if (setting.type === "color") {
    return `<input ${common} class="settings-color-input" type="color" value="${escapeAttr(value || "#8b5cf6")}" />`;
  }
  if (setting.type === "range") {
    return `<div class="settings-range-field"><input ${common} type="range" min="${setting.min}" max="${setting.max}" step="${setting.step || 1}" value="${escapeAttr(value)}" /><span>${formatDisplayValue(value)}</span></div>`;
  }
  if (setting.type === "time") {
    return `<input ${common} class="modal-input" type="time" value="${escapeAttr(value || "")}" />`;
  }
  if (setting.type === "tags") {
    return `<input ${common} class="modal-input" type="text" value="${escapeAttr(Array.isArray(value) ? value.join(", ") : value || "")}" placeholder="${escapeAttr(setting.placeholder || "")}" />`;
  }
  return `<input ${common} class="modal-input" type="text" value="${escapeAttr(value || "")}" placeholder="${escapeAttr(setting.placeholder || "")}" />`;
}

function readInputValue(element, type) {
  if (type === "toggle") return Boolean(element.checked);
  if (type === "range") return Number(element.value);
  if (type === "select") {
    const raw = element.value;
    return /^\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw;
  }
  if (type === "tags") {
    return String(element.value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return element.value;
}

function matchesSearch(setting, group, category, query) {
  if (!query) return true;
  const haystack = [
    category.label,
    category.description,
    group.title,
    setting.label,
    setting.description,
    ...(setting.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function favoriteSettingEntries(categories, favoritePaths) {
  return (favoritePaths || [])
    .map((path) => {
      const meta = findSettingMeta(categories, path);
      return meta ? { path, label: meta.setting.label, group: meta.group.title } : null;
    })
    .filter(Boolean);
}

function recentSettingEntries(categories, recentEntries) {
  return (recentEntries || [])
    .map((entry) => {
      const meta = findSettingMeta(categories, entry.path);
      return meta ? { ...entry, label: meta.setting.label, group: meta.group.title } : null;
    })
    .filter(Boolean)
    .sort((a, b) => Number(b.at || 0) - Number(a.at || 0));
}

function findSettingMeta(categories, path) {
  for (const category of categories) {
    for (const group of category.groups) {
      for (const setting of group.settings) {
        if (setting.path === path) return { category, group, setting };
      }
    }
  }
  return null;
}

function findCategoryByPath(categories, path) {
  return categories.find((category) => category.groups.some((group) => group.settings.some((setting) => setting.path === path))) || null;
}

function selectActiveCategory(state, categories, search) {
  const visible = categories.filter((category) => !search || category.visibleCount > 0);
  if (visible.some((category) => category.id === state.settingsMeta.activeCategory)) return state.settingsMeta.activeCategory;
  state.settingsMeta.activeCategory = visible[0]?.id || categories[0]?.id || "appearance";
  return state.settingsMeta.activeCategory;
}

function ensureMeta(state) {
  if (!state.settingsMeta || typeof state.settingsMeta !== "object") {
    state.settingsMeta = { favorites: [], recent: [], presets: [], activeCategory: "appearance", search: "", draftPresetName: "" };
  }
  if (!Array.isArray(state.settingsMeta.favorites)) state.settingsMeta.favorites = [];
  if (!Array.isArray(state.settingsMeta.recent)) state.settingsMeta.recent = [];
  if (!Array.isArray(state.settingsMeta.presets)) state.settingsMeta.presets = [];
  if (!state.settingsMeta.activeCategory) state.settingsMeta.activeCategory = "appearance";
  if (typeof state.settingsMeta.search !== "string") state.settingsMeta.search = "";
  if (typeof state.settingsMeta.draftPresetName !== "string") state.settingsMeta.draftPresetName = "";
}

function exportSettingsProfile(context) {
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: context.state.settings,
    settingsMeta: context.state.settingsMeta,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "forgebook-settings.json";
  anchor.click();
  URL.revokeObjectURL(url);
  context.notify("Settings exported", "Your settings profile was downloaded.");
}

function importSettingsProfile(context) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (payload.settings && typeof payload.settings === "object") context.replaceSettings(payload.settings);
      if (payload.settingsMeta && typeof payload.settingsMeta === "object") {
        context.state.settingsMeta = { ...context.state.settingsMeta, ...payload.settingsMeta };
      }
      context.notify("Settings imported", file.name);
      context.rerender();
    } catch {
      context.notify("Import failed", "The settings file could not be read.");
    }
  });
  input.click();
}

function resolvePath(root, path) {
  return String(path)
    .split(".")
    .reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), root);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `preset-${Date.now()}`;
}

function formatDisplayValue(value) {
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }
  return String(value ?? "");
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
