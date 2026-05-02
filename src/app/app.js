import { createRouter } from "./router.js";
import { createBaseStateSnapshot } from "./state.js";
import { featureRegistry } from "./featureRegistry.js";
import { APP_NAME } from "../utils/constants.js";
import { initProductionRuntime } from "../services/runtime/ProductionRuntime.js";
import { mountPublicApp } from "../public/PublicApp.js";
import { prepareLocalFirstWorkspaceBoot, resetWorkspaceBootRuntime, writeWorkspaceSnapshot } from "./storage.js";
import { initializeUpdater } from "../services/desktop/UpdaterService.js";
import { isDesktopEnvironment } from "../services/desktop/DesktopBridge.js";
import { resetStorageProvider } from "../services/storage/providers/createStorageProvider.js";
import {
  applyLocalAccountToProfile,
  normalizeLocalAccountName,
  readLocalAccount,
  resolveLocalAccountFromProfile,
  saveLocalAccount,
  shouldPromptForLocalAccount,
} from "../services/auth/LocalAccountService.js";

function normalizeRoute(pathname) {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (["/", "/login", "/signup", "/app"].includes(path)) return path;
  return "/";
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderStartupSurface({ title, body, details = "", tone = "loading" }) {
  const publicRoot = document.querySelector("#publicRoot");
  const appShell = document.querySelector(".app-shell");
  if (!publicRoot || !appShell) return;

  publicRoot.classList.remove("hidden");
  appShell.classList.add("hidden");
  document.body.dataset.appMode = "startup";
  publicRoot.innerHTML = `
    <section style="min-height:100vh;display:grid;place-items:center;padding:32px;background:radial-gradient(circle at top, rgba(52,71,115,.5), rgba(7,10,18,.96) 50%), #070a12;color:#eef3ff;font-family:system-ui,sans-serif;">
      <article style="width:min(680px,100%);padding:28px 24px;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:rgba(10,14,26,.88);box-shadow:0 24px 80px rgba(0,0,0,.35);">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:${tone === "error" ? "#ffb4b4" : "#9fb7ff"};">ForgeBook Desktop</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;">${escapeHtml(title)}</h1>
        <p style="margin:0;font-size:15px;line-height:1.6;color:rgba(238,243,255,.82);">${escapeHtml(body)}</p>
        ${details ? `<pre style="margin:18px 0 0;padding:14px 16px;overflow:auto;border-radius:14px;background:rgba(0,0,0,.28);color:#ffd7d7;font-size:12px;line-height:1.5;white-space:pre-wrap;">${escapeHtml(details)}</pre>` : ""}
      </article>
    </section>
  `;
}

function showStartupLoading(message = "Loading your workspace...") {
  renderStartupSurface({
    title: "Starting ForgeBook",
    body: message,
  });
}

function showStartupError(error, context = "ForgeBook could not finish startup.") {
  const details = error?.stack || error?.message || String(error || "Unknown startup error");
  renderStartupSurface({
    title: "Startup Failed",
    body: context,
    details,
    tone: "error",
  });
}

function localProfileMatchesAccount(profile = {}, account = null) {
  if (!account) return false;
  return (
    String(profile?.name || "") === String(account.name || "")
    && String(profile?.userId || "") === String(account.userId || "")
    && String(profile?.accountId || "") === String(account.accountId || "")
    && String(profile?.publicId || "") === String(account.publicId || "")
  );
}

function showLocalAccountSetup(account) {
  const publicRoot = document.querySelector("#publicRoot");
  const appShell = document.querySelector(".app-shell");
  if (!publicRoot || !appShell) {
    return Promise.reject(new Error("Local account setup surface is unavailable."));
  }

  const suggestedName = normalizeLocalAccountName(account?.name || "");
  const testerId = String(account?.publicId || account?.userId || "").trim();
  publicRoot.classList.remove("hidden");
  appShell.classList.add("hidden");
  document.body.dataset.appMode = "startup";
  document.title = "ForgeBook Desktop | Create Tester Profile";
  publicRoot.innerHTML = `
    <section style="min-height:100vh;display:grid;place-items:center;padding:32px;background:
      radial-gradient(circle at top, rgba(71,127,255,.32), transparent 34%),
      radial-gradient(circle at 85% 10%, rgba(29,211,176,.2), transparent 24%),
      linear-gradient(180deg, #071019 0%, #0a1420 42%, #07111a 100%);color:#eef6ff;font-family:system-ui,sans-serif;">
      <article style="width:min(720px,100%);padding:30px 26px;border:1px solid rgba(255,255,255,.12);border-radius:28px;background:rgba(8,14,24,.9);box-shadow:0 24px 80px rgba(0,0,0,.32);display:grid;gap:20px;">
        <div style="display:grid;gap:10px;">
          <p style="margin:0;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#8ec5ff;">ForgeBook Desktop Preview</p>
          <h1 style="margin:0;font-size:clamp(2rem,4vw,3rem);line-height:1.04;">Create your tester identity.</h1>
          <p style="margin:0;color:rgba(238,246,255,.78);font-size:15px;line-height:1.7;">For local testing we only need a nickname. ForgeBook will keep a stable FG ID on this device so you and your friend can recognize each other inside the app.</p>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
          <article style="padding:16px 18px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);display:grid;gap:6px;">
            <span style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(182,215,255,.78);">Tester ID</span>
            <strong style="font-size:15px;line-height:1.4;">${escapeHtml(testerId || "FG-XXXX-XXXXXX")}</strong>
          </article>
          <article style="padding:16px 18px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);display:grid;gap:6px;">
            <span style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:rgba(182,215,255,.78);">Mode</span>
            <strong style="font-size:15px;line-height:1.4;">Local desktop testing</strong>
          </article>
        </div>
        <form id="localAccountSetupForm" style="display:grid;gap:14px;">
          <label style="display:grid;gap:8px;">
            <span style="font-size:13px;color:rgba(238,246,255,.82);">Nickname</span>
            <input id="localAccountNameInput" type="text" maxlength="32" value="${escapeHtml(suggestedName)}" placeholder="Balin, Kami, Studio Lead..." style="width:100%;padding:14px 16px;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#eef6ff;font:inherit;" />
          </label>
          <p id="localAccountSetupError" style="margin:0;min-height:18px;color:#ffbdbd;font-size:13px;"></p>
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:center;">
            <button type="submit" style="padding:14px 18px;border:0;border-radius:16px;background:linear-gradient(135deg,#4f7cff,#1dd3b0);color:#04111b;font:inherit;font-weight:700;cursor:pointer;">Continue to Workspace</button>
            <span style="color:rgba(238,246,255,.62);font-size:13px;">You can change the nickname later from your profile.</span>
          </div>
        </form>
      </article>
    </section>
  `;

  return new Promise((resolve) => {
    const form = document.querySelector("#localAccountSetupForm");
    const input = document.querySelector("#localAccountNameInput");
    const errorBox = document.querySelector("#localAccountSetupError");
    window.setTimeout(() => input?.focus(), 0);

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const nextName = normalizeLocalAccountName(input?.value || "");
      if (!nextName) {
        if (errorBox) errorBox.textContent = "Pick a nickname so your tester profile is identifiable.";
        input?.focus();
        return;
      }
      resolve(saveLocalAccount({ ...account, name: nextName }));
    });
  });
}

async function ensureLocalTesterAccount(vaultBoot, runtime) {
  if (runtime.mode !== "local-only") return vaultBoot;

  const storedAccount = readLocalAccount();
  let localAccount = resolveLocalAccountFromProfile(vaultBoot?.state?.profile || {}, storedAccount);
  if (shouldPromptForLocalAccount(localAccount)) {
    localAccount = await showLocalAccountSetup(localAccount);
  } else if (!storedAccount || JSON.stringify(storedAccount) !== JSON.stringify(localAccount)) {
    localAccount = saveLocalAccount(localAccount);
  }

  const nextState = {
    ...vaultBoot.state,
    profile: applyLocalAccountToProfile(vaultBoot.state?.profile || {}, localAccount),
  };

  runtime.data.profile = {
    ...(runtime.data.profile || {}),
    id: localAccount.accountId,
    nickname: localAccount.name,
    display_name: localAccount.name,
    profile_url: localAccount.publicId,
  };

  if (!localProfileMatchesAccount(vaultBoot.state?.profile || {}, localAccount)) {
    const result = writeWorkspaceSnapshot(JSON.stringify(nextState), {
      reason: "local-account-bootstrap",
      skipDirtyBuffer: true,
    });
    if (!result?.ok) {
      console.warn("ForgeBook could not persist the local tester account snapshot", result?.error || result);
    }
  }

  vaultBoot.state = nextState;
  return vaultBoot;
}

async function bootProtectedApp() {
  showStartupLoading("Loading your desktop workspace and local vault storage...");
  let vaultBoot;
  let updater;

  try {
    [vaultBoot, updater] = await Promise.all([
      prepareLocalFirstWorkspaceBoot(),
      initializeUpdater({ currentVersion: "0.1.0" }),
    ]);
  } catch (error) {
    console.error("ForgeBook desktop vault boot failed", error);
    if (!isDesktopEnvironment()) throw error;

    window.__FORGEBOOK_DISABLE_DESKTOP_STORAGE__ = true;
    resetStorageProvider();
    resetWorkspaceBootRuntime();
    showStartupLoading("Desktop storage failed to initialize. Retrying with local browser storage...");

    [vaultBoot, updater] = await Promise.all([
      prepareLocalFirstWorkspaceBoot(),
      initializeUpdater({ currentVersion: "0.1.0" }),
    ]);
  }

  const vaultAPI = await import("../services/vault/vaultAPI.js");

  const productionRuntime = await initProductionRuntime({
    createBaseStateSnapshot,
  });

  vaultBoot = await ensureLocalTesterAccount(vaultBoot, productionRuntime);

  window.ForgeBookRuntime = productionRuntime;
  window.ForgeBookUpdater = updater;
  window.ForgeBookVaultBoot = vaultBoot;
  window.ForgeBookDesktopVaults = {
    pickVaultFolder: vaultAPI.pickVaultFolder,
    getRecentVaults: vaultAPI.getRecentVaults,
    getVaultAppPaths: vaultAPI.getVaultAppPaths,
  };
  document.querySelector("#publicRoot")?.classList.add("hidden");
  document.querySelector(".app-shell")?.classList.remove("hidden");
  document.body.dataset.appMode = "workspace";

  await import("../components/legacy/LegacyFeatureBridge.js");

  window.ForgeBookArchitecture = {
    appName: APP_NAME,
    router: createRouter(),
    baseState: createBaseStateSnapshot(),
    features: featureRegistry,
    mode: "legacy-bridge",
    runtime: productionRuntime.mode,
    storage: vaultBoot?.provider || "browser",
    updaterEnabled: Boolean(updater?.enabled),
  };
}

async function boot() {
  if (isDesktopEnvironment()) {
    await bootProtectedApp();
    return;
  }

  const route = normalizeRoute(window.location.pathname);
  if (route === "/app") {
    await bootProtectedApp();
    return;
  }

  window.ForgeBookRuntime = {
    auth: { user: null },
    mode: "public",
  };
  mountPublicApp({ route, user: null });
}

window.addEventListener("popstate", () => {
  if (isDesktopEnvironment()) return;
  const route = normalizeRoute(window.location.pathname);
  if (route === "/app") {
    window.location.assign("/app");
    return;
  }
  mountPublicApp({ route, user: null });
});

try {
  await boot();
} catch (error) {
  console.error("ForgeBook startup failed", error);
  showStartupError(error);
}
