import { ENV, isSupabaseConfigured } from "../../constants/env.js";
import { getAuthenticatedUser, getSession, onAuthStateChange, signInWithPassword, signOut, signUpWithPassword } from "../auth/AuthService.js";
import { fetchMarketplaceProfiles } from "../database/MarketplaceRepository.js";
import { ensureProfile } from "../database/ProfileRepository.js";
import { clearWorkspaceConflict } from "../../app/storage.js";

const AUTH_RESTORE_STORAGE_KEY = "forgebook.auth.restore";
const AUTH_RESTORE_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;

function createPersistenceStatus() {
  return {
    saved_local: false,
    saving_local: false,
    local_save_failed: false,
    pending_cloud_sync: false,
    cloud_synced: false,
    cloud_sync_failed: false,
    conflict: false,
    oversized_cloud_snapshot: false,
    offline: !navigator.onLine,
    message: "",
    localRevision: 0,
    cloudRevision: 0,
    lastLocalSaveAt: "",
    lastCloudSyncAt: "",
    cloudSnapshotUpdatedAt: "",
    deviceId: "",
  };
}

export async function initProductionRuntime({ createBaseStateSnapshot }) {
  let activeAuthUserId = null;
  let authTransitionInFlight = false;
  let authGateTimer = null;
  const persistenceStatus = createPersistenceStatus();

  const publishPersistenceStatus = () => {
    window.dispatchEvent(new CustomEvent("forgebook:persistence-status", { detail: { ...persistenceStatus } }));
  };

  const setPersistenceStatus = (patch) => {
    Object.assign(persistenceStatus, patch);
    publishPersistenceStatus();
  };

  const rememberAuthUser = (userId) => {
    if (!userId) return;
    try {
      localStorage.setItem(
        AUTH_RESTORE_STORAGE_KEY,
        JSON.stringify({
          userId,
          timestamp: Date.now(),
        }),
      );
    } catch {}
  };

  const clearRememberedAuthUser = () => {
    try {
      localStorage.removeItem(AUTH_RESTORE_STORAGE_KEY);
    } catch {}
  };

  const hasRecentRememberedAuthUser = () => {
    try {
      const raw = localStorage.getItem(AUTH_RESTORE_STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed?.userId || !parsed?.timestamp) return false;
      return Date.now() - Number(parsed.timestamp) < AUTH_RESTORE_WINDOW_MS;
    } catch {
      return false;
    }
  };

  const clearAuthGateTimer = () => {
    if (!authGateTimer) return;
    window.clearTimeout(authGateTimer);
    authGateTimer = null;
  };

  const scheduleAuthGateMount = (runtime) => {
    clearAuthGateTimer();
    authGateTimer = window.setTimeout(async () => {
      const deadline = Date.now() + (hasRecentRememberedAuthUser() ? 4500 : 1200);
      while (Date.now() < deadline) {
        const { session: recoveredSession, user: recoveredUser } = await getSession();
        runtime.auth.session = recoveredSession;
        runtime.auth.user = recoveredUser;
        if (recoveredUser) {
          activeAuthUserId = recoveredUser.id;
          rememberAuthUser(recoveredUser.id);
          unmountAuthGate();
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
      if (hasRecentRememberedAuthUser()) {
        try {
          const recoveredUser = await getAuthenticatedUser();
          if (recoveredUser) {
            runtime.auth.user = recoveredUser;
            activeAuthUserId = recoveredUser.id;
            rememberAuthUser(recoveredUser.id);
            unmountAuthGate();
            return;
          }
        } catch (error) {
          console.error("ForgeBook auth restore fallback failed", error);
        }
      }
      mountAuthGate(runtime);
    }, 900);
  };

  const runtime = {
    mode: isSupabaseConfigured() ? "supabase-social" : "local-only",
    env: ENV,
    auth: {
      user: null,
      session: null,
      signIn: signInWithPassword,
      signUp: signUpWithPassword,
      signOut,
    },
    persistence: {
      status: persistenceStatus,
      setLocalWriteResult(result, snapshot) {
        let metadata = null;
        try {
          metadata = snapshot ? JSON.parse(snapshot)?.persistence || null : null;
        } catch {}
        setPersistenceStatus({
          saving_local: false,
          saved_local: Boolean(result?.ok),
          local_save_failed: !result?.ok,
          pending_cloud_sync: false,
          cloud_synced: false,
          cloud_sync_failed: false,
          oversized_cloud_snapshot: false,
          lastLocalSaveAt: metadata?.lastLocalSaveAt || new Date().toISOString(),
          localRevision: Number(metadata?.localRevision || persistenceStatus.localRevision || 0),
          deviceId: metadata?.deviceId || persistenceStatus.deviceId || "",
          message: result?.ok ? "Saved locally to vault" : "Local save failed - export backup now.",
        });
      },
      markSavingLocal(snapshot) {
        let metadata = null;
        try {
          metadata = snapshot ? JSON.parse(snapshot)?.persistence || null : null;
        } catch {}
        setPersistenceStatus({
          saving_local: true,
          saved_local: false,
          local_save_failed: false,
          pending_cloud_sync: false,
          cloud_synced: false,
          cloud_sync_failed: false,
          localRevision: Number(metadata?.localRevision || persistenceStatus.localRevision || 0),
          deviceId: metadata?.deviceId || persistenceStatus.deviceId || "",
          message: "Saving locally...",
        });
      },
      markConflict(reason) {
        setPersistenceStatus({ conflict: true, message: reason || "Workspace conflict detected" });
      },
      clearConflict() {
        clearWorkspaceConflict();
        setPersistenceStatus({ conflict: false });
      },
      async persistWorkspaceSnapshot() {
        return { ok: true, skipped: true, localFirst: true };
      },
      async flushWorkspaceSnapshot() {
        return { ok: true, skipped: true, localFirst: true };
      },
    },
    data: {
      marketProfiles: [],
      profile: null,
    },
  };

  if (!isSupabaseConfigured()) {
    setPersistenceStatus({ message: "Local-first mode active" });
    publishPersistenceStatus();
    return runtime;
  }

  let { session, user } = await getSession();
  if (!user && hasRecentRememberedAuthUser()) {
    try {
      user = await getAuthenticatedUser();
    } catch (error) {
      console.error("ForgeBook auth bootstrap fallback failed", error);
    }
  }
  runtime.auth.session = session;
  runtime.auth.user = user;
  activeAuthUserId = user?.id || null;
  if (user?.id) rememberAuthUser(user.id);

  if (user) {
    runtime.data.profile = await ensureProfile(user, createBaseStateSnapshot().profile);
    try {
      runtime.data.marketProfiles = await fetchMarketplaceProfiles();
    } catch (error) {
      console.error("ForgeBook market bootstrap failed", error);
    }
  }

  window.addEventListener("online", () => setPersistenceStatus({ offline: false, message: persistenceStatus.saved_local ? "Back online - social sync available" : "Back online" }));
  window.addEventListener("offline", () => setPersistenceStatus({ offline: true, message: "Offline - vault stays local, social is unavailable" }));

  if (ENV.requireAuth && !user) {
    scheduleAuthGateMount(runtime);
  }

  runtime.unsubscribeAuth = onAuthStateChange(async (event, nextSession) => {
    runtime.auth.session = nextSession;
    runtime.auth.user = nextSession?.user || null;
    const nextUserId = nextSession?.user?.id || null;
    if (authTransitionInFlight) return;
    if (ENV.requireAuth && nextSession?.user) {
      clearAuthGateTimer();
      rememberAuthUser(nextUserId);
      if (activeAuthUserId === nextUserId) {
        unmountAuthGate();
        return;
      }
      authTransitionInFlight = true;
      unmountAuthGate();
      try {
        runtime.data.profile = await ensureProfile(nextSession.user, createBaseStateSnapshot().profile);
        try {
          runtime.data.marketProfiles = await fetchMarketplaceProfiles();
        } catch (error) {
          console.error("ForgeBook market refresh failed", error);
        }
        activeAuthUserId = nextUserId;
      } finally {
        authTransitionInFlight = false;
      }
      return;
    }
    if (ENV.requireAuth && !nextSession?.user) {
      activeAuthUserId = null;
      if (event === "SIGNED_OUT") {
        clearRememberedAuthUser();
      }
      scheduleAuthGateMount(runtime);
    }
  });

  setPersistenceStatus({ message: "Local-first vault mode active" });
  publishPersistenceStatus();
  return runtime;
}

function mountAuthGate(runtime) {
  if (document.querySelector("#forgebookAuthGate")) return;
  const gate = document.createElement("section");
  gate.id = "forgebookAuthGate";
  gate.className = "auth-gate";
  gate.innerHTML = `
    <div class="auth-gate-backdrop"></div>
    <div class="auth-gate-card premium-surface">
      <p class="eyebrow">ForgeBook Access</p>
      <h1>Sign in to your workspace</h1>
      <p class="auth-gate-copy">Authentication is enabled for this deployment. Sign in to load your ForgeBook workspace, settings, messages, and market profile.</p>
      <div class="auth-gate-tabs">
        <button type="button" class="secondary-button active" data-auth-mode="signin">Sign In</button>
        <button type="button" class="secondary-button" data-auth-mode="signup">Create Account</button>
      </div>
      <form id="forgebookAuthForm" class="auth-gate-form">
        <input id="authEmailInput" class="modal-input" type="email" placeholder="Email" required />
        <input id="authPasswordInput" class="modal-input" type="password" placeholder="Password" required />
        <input id="authNameInput" class="modal-input hidden" type="text" placeholder="Display name" />
        <button id="authSubmitButton" class="primary-button" type="submit">Sign In</button>
      </form>
      <p id="authErrorText" class="auth-gate-error hidden"></p>
      ${ENV.requireAuth ? "" : `<button id="authDemoButton" class="secondary-button compact-action-button" type="button">Continue in demo mode</button>`}
    </div>
  `;
  document.body.appendChild(gate);

  let mode = "signin";
  const setMode = (nextMode) => {
    mode = nextMode;
    gate.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("active", button.dataset.authMode === mode));
    gate.querySelector("#authSubmitButton").textContent = mode === "signin" ? "Sign In" : "Create Account";
    gate.querySelector("#authNameInput")?.classList.toggle("hidden", mode !== "signup");
  };

  gate.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.authMode)));
  gate.querySelector("#forgebookAuthForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = gate.querySelector("#authEmailInput")?.value || "";
    const password = gate.querySelector("#authPasswordInput")?.value || "";
    const name = gate.querySelector("#authNameInput")?.value || "";
    const errorText = gate.querySelector("#authErrorText");
    if (errorText) {
      errorText.textContent = "";
      errorText.classList.add("hidden");
    }
    try {
      if (mode === "signin") await runtime.auth.signIn({ email, password });
      else await runtime.auth.signUp({ email, password, metadata: { name } });
    } catch (error) {
      if (errorText) {
        errorText.textContent = error.message || "Authentication failed.";
        errorText.classList.remove("hidden");
      }
    }
  });
  gate.querySelector("#authDemoButton")?.addEventListener("click", () => unmountAuthGate());
}

function unmountAuthGate() {
  document.querySelector("#forgebookAuthGate")?.remove();
}
