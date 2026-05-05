import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const workspaceRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(resolve(workspaceRoot, "package.json"), "utf8"));
const packageVersion = String(packageJson.version || "0.0.0").trim();
const releaseTag = `v${packageVersion}`;
const owner = "balinek468-beep";
const repo = "Playground";
const releaseAssetsDir = resolve(workspaceRoot, "release-assets");
const tauriReleaseDir = resolve(workspaceRoot, "src-tauri", "target", "release");
const bundleDir = resolve(tauriReleaseDir, "bundle");
const installerOutputName = `ForgeBook-Setup-${releaseTag}.exe`;
const portableOutputName = `ForgeBook-Portable-${releaseTag}.zip`;
const portableStageDir = resolve(releaseAssetsDir, "portable");
const portableAppDir = resolve(portableStageDir, "ForgeBook");
const shouldSkipBuild = process.argv.includes("--skip-build");

function run(command, args, options = {}) {
  const shouldUseShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(command);
  execFileSync(command, args, {
    cwd: workspaceRoot,
    stdio: "inherit",
    shell: shouldUseShell,
    ...options,
  });
}

function runNpm(args) {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath) {
    run(process.execPath, [npmExecPath, ...args]);
    return;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  run(npmCommand, args);
}

function findNewestFile(directory, predicate) {
  if (!existsSync(directory)) return null;

  return readdirSync(directory)
    .map((entry) => join(directory, entry))
    .filter((entry) => statSync(entry).isFile() && predicate(entry))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs)[0] || null;
}

function findPortableExecutable() {
  const directCandidates = [
    join(tauriReleaseDir, "forgebook.exe"),
    join(tauriReleaseDir, "app.exe"),
  ];

  const directMatch = directCandidates.find((candidate) => existsSync(candidate));
  if (directMatch) return directMatch;

  return findNewestFile(tauriReleaseDir, (entry) => (
    entry.toLowerCase().endsWith(".exe")
    && !entry.toLowerCase().endsWith(".pdb")
    && !entry.toLowerCase().includes("uninstall")
  ));
}

function ensureDirectory(directory) {
  mkdirSync(directory, { recursive: true });
}

function createPortableZip(sourceExecutable) {
  rmSync(portableStageDir, { force: true, recursive: true });
  ensureDirectory(portableAppDir);
  cpSync(sourceExecutable, join(portableAppDir, "ForgeBook.exe"));

  if (process.platform === "win32") {
    run("powershell.exe", [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path '${portableAppDir}' -DestinationPath '${join(releaseAssetsDir, portableOutputName)}' -Force`,
    ]);
  } else {
    run("tar", ["-a", "-c", "-f", join(releaseAssetsDir, portableOutputName), "-C", portableStageDir, "."]);
  }

  rmSync(portableStageDir, { force: true, recursive: true });
}

function buildReleaseAssets() {
  ensureDirectory(releaseAssetsDir);
  rmSync(join(releaseAssetsDir, installerOutputName), { force: true });
  rmSync(join(releaseAssetsDir, portableOutputName), { force: true });

  if (!shouldSkipBuild) {
    runNpm(["run", "desktop:build", "--", "--bundles", "nsis"]);
  }

  const installerSource = findNewestFile(resolve(bundleDir, "nsis"), (entry) => entry.toLowerCase().endsWith(".exe"));
  if (!installerSource) {
    throw new Error("ForgeBook installer was not found in src-tauri/target/release/bundle/nsis.");
  }

  const portableExecutable = findPortableExecutable();
  if (!portableExecutable) {
    throw new Error("ForgeBook desktop executable was not found in src-tauri/target/release.");
  }

  cpSync(installerSource, join(releaseAssetsDir, installerOutputName));
  createPortableZip(portableExecutable);

  const manifest = {
    version: packageVersion,
    tag: releaseTag,
    generatedAt: new Date().toISOString(),
    assets: {
      windowsInstaller: {
        fileName: installerOutputName,
        path: join(releaseAssetsDir, installerOutputName),
        releaseUrl: `https://github.com/${owner}/${repo}/releases/download/${releaseTag}/${installerOutputName}`,
      },
      portableZip: {
        fileName: portableOutputName,
        path: join(releaseAssetsDir, portableOutputName),
        releaseUrl: `https://github.com/${owner}/${repo}/releases/download/${releaseTag}/${portableOutputName}`,
      },
      sourceZip: {
        fileName: "Source code ZIP",
        releaseUrl: `https://github.com/${owner}/${repo}/archive/refs/tags/${releaseTag}.zip`,
      },
      sourceTarGz: {
        fileName: "Source code TAR.GZ",
        releaseUrl: `https://github.com/${owner}/${repo}/archive/refs/tags/${releaseTag}.tar.gz`,
      },
    },
  };

  writeFileSync(join(releaseAssetsDir, "release-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`ForgeBook release assets are ready in ${releaseAssetsDir}`);
}

buildReleaseAssets();
