import { createRouter } from "./router.js";
import { createBaseStateSnapshot } from "./state.js";
import { featureRegistry } from "./featureRegistry.js";
import { APP_NAME } from "../utils/constants.js";
import { initProductionRuntime } from "../services/runtime/ProductionRuntime.js";

const productionRuntime = await initProductionRuntime({
  createBaseStateSnapshot,
});

window.ForgeBookRuntime = productionRuntime;

await import("../components/legacy/LegacyFeatureBridge.js");

window.ForgeBookArchitecture = {
  appName: APP_NAME,
  router: createRouter(),
  baseState: createBaseStateSnapshot(),
  features: featureRegistry,
  mode: "legacy-bridge",
  runtime: productionRuntime.mode,
};
