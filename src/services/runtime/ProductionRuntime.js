import { ENV, isSupabaseConfigured } from "../../constants/env.js";
import { WORKSPACE_STORAGE_KEYS } from "../../utils/constants.js";
import { debounce } from "../../utils/performance.js";
import { getAuthenticatedUser, getSession, onAuthStateChange, signInWithPassword, signOut, signUpWithPassword } from "../auth/AuthService.js";
import { fetchMarketplaceProfiles } from "../database/MarketplaceRepository.js";
import { ensureProfile } from "../database/ProfileRepository.js";
import { fetchWorkspaceSnapshot, persistWorkspaceSnapshot } from "../database/WorkspaceRepository.js";

const AUTH_RESTORE_STORAGE_KEY = "forgebook.auth.restore";
const AUTH_RESTORE_WINDOW_MS = 1000 * 60 * 60 * 24 * 14;

export async function initProductionRuntime({ createBaseStateSnapshot }) {
  let queuedSnapshot = null;
  let lastPersistedSnapshot = null;
  let isPersistingSnapshot = false;
  let activeAuthUserId = null;
  let authTransitionInFlight = false;
  let authGateTimer = null;

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

  const flushWorkspaceSnapshot = async () => {
    if (!runtime.auth.user || !isSupabaseConfigured() || !queuedSnapshot || isPersistingSnapshot) return;
    if (queuedSnapshot === lastPersistedSnapshot) {
      queuedSnapshot = null;
      return;
    }
    const snapshot = queuedSnapshot;
    queuedSnapshot = null;
    isPersistingSnapshot = true;
    try {
      await persistWorkspaceSnapshot(runtime.auth.user.id, snapshot);
      lastPersistedSnapshot = snapshot;
    } catch (error) {
      console.error("ForgeBook cloud sync failed", error);
      queuedSnapshot = snapshot;
    } finally {
      isPersistingSnapshot = false;
      if (queuedSnapshot && queuedSnapshot !== lastPersistedSnapshot) {
        scheduleWorkspaceFlush();
      }
    }
  };

  const scheduleWorkspaceFlush = debounce(() => {
    void flushWorkspaceSnapshot();
  }, ENV.workspaceSyncIntervalMs);

  const runtime = {
    mode: isSupabaseConfigured() ? "supabase" : "local",
    env: ENV,
    auth: {
      user: null,
      session: null,
      signIn: signInWithPassword,
      signUp: signUpWithPassword,
      signOut,
    },
    persistence: {
      async persistWorkspaceSnapshot(snapshot) {
        if (!runtime.auth.user || !isSupabaseConfigured()) return;
        queuedSnapshot = snapshot;
        scheduleWorkspaceFlush();
      },
      flushWorkspaceSnapshot,
    },
    data: {
      marketProfiles: [],
    },
  };

  if (!isSupabaseConfigured()) return runtime;

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
    await ensureProfile(user, createBaseStateSnapshot().profile);
    const snapshot = await fetchWorkspaceSnapshot(user.id);
    if (snapshot) hydrateWorkspaceSnapshot(snapshot);
    try {
      runtime.data.marketProfiles = await fetchMarketplaceProfiles();
    } catch (error) {
      console.error("ForgeBook market bootstrap failed", error);
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      void flushWorkspaceSnapshot();
    }
  });

  window.addEventListener("beforeunload", () => {
    void flushWorkspaceSnapshot();
  });

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
        await ensureProfile(nextSession.user, createBaseStateSnapshot().profile);
        const snapshot = await fetchWorkspaceSnapshot(nextSession.user.id);
        if (snapshot) hydrateWorkspaceSnapshot(snapshot);
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

  return runtime;
}

function hydrateWorkspaceSnapshot(snapshot) {
  WORKSPACE_STORAGE_KEYS.forEach((key) => {
    if (key === WORKSPACE_STORAGE_KEYS[0] || key === WORKSPACE_STORAGE_KEYS[2]) {
      localStorage.setItem(key, snapshot);
    }
  });
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
