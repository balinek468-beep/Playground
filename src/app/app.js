import { createRouter } from "./router.js";
import { createBaseStateSnapshot } from "./state.js";
import { featureRegistry } from "./featureRegistry.js";
import { APP_NAME } from "../utils/constants.js";
import { getSession } from "../services/auth/AuthService.js";
import { initProductionRuntime } from "../services/runtime/ProductionRuntime.js";
import { mountPublicApp } from "../public/PublicApp.js";

function normalizeRoute(pathname) {
  const path = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (["/", "/login", "/signup", "/app"].includes(path)) return path;
  return "/";
}

async function bootProtectedApp() {
  const productionRuntime = await initProductionRuntime({
    createBaseStateSnapshot,
  });

  window.ForgeBookRuntime = productionRuntime;
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
  };
}

async function boot() {
  const route = normalizeRoute(window.location.pathname);
  const { user } = await getSession().catch(() => ({ user: null }));

  if (user && (route === "/login" || route === "/signup")) {
    window.history.replaceState({}, "", "/app");
    await bootProtectedApp();
    return;
  }

  if (route === "/app") {
    await bootProtectedApp();
    return;
  }

  window.ForgeBookRuntime = {
    auth: { user },
    mode: "public",
  };
  mountPublicApp({ route, user });
}

window.addEventListener("popstate", () => {
  const route = normalizeRoute(window.location.pathname);
  if (route === "/app") {
    window.location.assign("/app");
    return;
  }
  mountPublicApp({ route, user: window.ForgeBookRuntime?.auth?.user || null });
});

await boot();


