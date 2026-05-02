import { realpathSync } from "node:fs";
import { defineConfig } from "vite";

const workspaceRoot = realpathSync(process.cwd());

export default defineConfig({
  root: workspaceRoot,
});
