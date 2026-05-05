# ForgeBook Release Guide

## 1. Install dependencies

Run these commands from `C:\Users\balin\Documents\Playground`:

```powershell
npm.cmd install
npm.cmd exec tauri info
```

`tauri info` is optional, but it is the fastest way to confirm Rust, WebView2, and the Tauri toolchain are available on the Windows release machine.

## 2. Build the web frontend locally

```powershell
npm.cmd run build
```

This writes the website/app frontend to `C:\Users\balin\Documents\Playground\dist`.

## 3. Run desktop dev mode

```powershell
npm.cmd run desktop:dev
```

This launches the ForgeBook desktop shell in Tauri dev mode and points it at the Vite dev server on `http://127.0.0.1:5173`.

## 4. Build the desktop app locally

```powershell
npm.cmd run desktop:build
```

This runs the Tauri production build and generates the raw Windows bundle output under `C:\Users\balin\Documents\Playground\src-tauri\target\release`.

## 5. Build the Windows release assets

```powershell
npm.cmd run release:windows
```

This does three things:

1. Runs the Tauri production build with the NSIS Windows installer target.
2. Copies the generated installer into `C:\Users\balin\Documents\Playground\release-assets`.
3. Creates a portable ZIP from the built ForgeBook executable and writes a `release-manifest.json` file beside it.

Expected output files:

- `C:\Users\balin\Documents\Playground\release-assets\ForgeBook-Setup-v0.1.0-alpha.exe`
- `C:\Users\balin\Documents\Playground\release-assets\ForgeBook-Portable-v0.1.0-alpha.zip`
- `C:\Users\balin\Documents\Playground\release-assets\release-manifest.json`

The underlying Tauri installer bundle is also left in `C:\Users\balin\Documents\Playground\src-tauri\target\release\bundle\nsis`.

## 6. Create the Git tag for a release

Make sure `package.json`, `src-tauri\tauri.conf.json`, `src-tauri\Cargo.toml`, and `public\version.json` all reflect the release version first.

For the current alpha:

```powershell
git tag v0.1.0-alpha
git push origin v0.1.0-alpha
```

## 7. Trigger the GitHub Actions release workflow

Pushing a version tag like `v0.1.0-alpha` triggers `.github/workflows/release.yml`.

The workflow:

1. Installs Node dependencies with `npm ci`
2. Validates the pushed tag matches `package.json`
3. Runs `npm run release:windows`
4. Publishes the installer and portable ZIP as GitHub Release assets

No paid services are required. The workflow uses the default GitHub `GITHUB_TOKEN`.

## 8. Upload release assets manually if needed

If you need to create the GitHub Release manually:

1. Run `npm.cmd run release:windows`
2. Open the repository Releases page
3. Create a release for tag `v0.1.0-alpha`
4. Upload:
   - `release-assets\ForgeBook-Setup-v0.1.0-alpha.exe`
   - `release-assets\ForgeBook-Portable-v0.1.0-alpha.zip`

After upload, the direct asset URLs follow this pattern:

- `https://github.com/balinek468-beep/Playground/releases/download/v0.1.0-alpha/ForgeBook-Setup-v0.1.0-alpha.exe`
- `https://github.com/balinek468-beep/Playground/releases/download/v0.1.0-alpha/ForgeBook-Portable-v0.1.0-alpha.zip`

Tagged source archives are provided automatically by GitHub:

- `https://github.com/balinek468-beep/Playground/archive/refs/tags/v0.1.0-alpha.zip`
- `https://github.com/balinek468-beep/Playground/archive/refs/tags/v0.1.0-alpha.tar.gz`

## 9. Update `public/version.json`

`public/version.json` controls what the ForgeBook website shows on `/download`.

For a live release:

1. Set `version` to the release version, for example `0.1.0-alpha`
2. Set `releaseDate`
3. Set `releaseNotesUrl` to the tag page, for example `https://github.com/balinek468-beep/Playground/releases/tag/v0.1.0-alpha`
4. For `windows-installer`:
   - set `url` to the direct `.exe` asset URL
   - set `disabled` to `false`
5. For `portable-zip`:
   - set `url` to the direct `.zip` asset URL
   - set `disabled` to `false`
6. If a package is not uploaded yet:
   - leave `url` empty
   - keep `disabled` set to `true`

Source ZIP and TAR.GZ can stay on the live `codeload` links, or you can switch them to tag-based archive URLs after the tag is published.

## 10. Verify `/download`

Run:

```powershell
npm.cmd run build
npm.cmd run preview
```

Then open:

- `http://127.0.0.1:4173/`
- `http://127.0.0.1:4173/download`

Checks:

- Homepage install/download CTAs route to `/download`
- Active buttons point to direct file URLs
- Unpublished files stay visible and show `Coming soon`
- The primary download button does not point to the GitHub repository page

## 11. Prepare the next release

For the next version:

1. Update version numbers in:
   - `package.json`
   - `package-lock.json` via `npm.cmd install`
   - `src-tauri\Cargo.toml`
   - `src-tauri\tauri.conf.json`
   - `public\version.json`
2. Run:

```powershell
npm.cmd install
npm.cmd run release:windows
```

3. Upload the new files or push the matching Git tag.
4. Update `public/version.json` direct asset URLs and flip `disabled` to `false` for any published packages.
