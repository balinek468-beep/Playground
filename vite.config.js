import { readFileSync, realpathSync } from "node:fs";
import { defineConfig } from "vite";

const workspaceRoot = realpathSync(process.cwd());
const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const appVersion = String(packageJson.version || "0.0.0").trim();
const releaseChannel = appVersion.includes("-") ? appVersion.split("-").slice(1).join("-").split(".")[0] : "stable";
const releaseTag = `v${appVersion}`;

export default defineConfig({
  root: workspaceRoot,
  define: {
    __FORGEBOOK_VERSION__: JSON.stringify(appVersion),
    __FORGEBOOK_RELEASE_CHANNEL__: JSON.stringify(releaseChannel),
    __FORGEBOOK_RELEASE_TAG__: JSON.stringify(releaseTag),
  },
});
