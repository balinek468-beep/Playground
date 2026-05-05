import { APP_RELEASE_CHANNEL, APP_VERSION, getReleaseChannelLabel } from "../constants/release.js";

const HOME_ROUTE = "/";
const DOWNLOAD_ROUTE = "/download";
const REPOSITORY_OWNER = "balinek468-beep";
const REPOSITORY_NAME = "Playground";
const DEFAULT_RELEASE_NOTES_URL = `https://github.com/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/releases`;

const DEFAULT_RELEASE = {
  version: APP_VERSION,
  channel: getReleaseChannelLabel(APP_RELEASE_CHANNEL),
  releaseDate: "2026-05-05T00:00:00Z",
  notes: [
    "Desktop workspace boot is smoother and more stable.",
    "Tester profiles now support nickname-based local account creation.",
    "The public website now keeps the install flow inside ForgeBook with a dedicated download page.",
  ],
  downloads: {
    releaseNotes: DEFAULT_RELEASE_NOTES_URL,
    files: [],
  },
};

let cachedRelease = null;
let releasePromise = null;
let publicRenderToken = 0;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createSlug(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "download";
}

function scrollToPublicAnchor(targetId = "") {
  const normalizedTarget = String(targetId || "").replace(/^#/, "");
  if (!normalizedTarget) return;

  window.requestAnimationFrame(() => {
    document.getElementById(normalizedTarget)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function navigate(path, options = {}) {
  const anchor = String(options?.anchor || "").replace(/^#/, "");
  const hash = anchor ? `#${anchor}` : "";
  const nextUrl = `${path}${hash}`;

  if (window.location.pathname === path && window.location.hash === hash) {
    if (anchor) scrollToPublicAnchor(anchor);
    return;
  }

  window.history.pushState({}, "", nextUrl);
  mountPublicApp({ route: path, anchor, user: null });
}

function formatReleaseDate(value) {
  const timestamp = Date.parse(value || "");
  if (!Number.isFinite(timestamp)) return "Testing build";
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getReleaseLabel(release) {
  const rawVersion = String(release?.version || DEFAULT_RELEASE.version || APP_VERSION).trim().replace(/^v/i, "");
  const [coreVersion, ...prereleaseParts] = rawVersion.split("-");
  const inferredChannel = prereleaseParts.length ? prereleaseParts.join("-").split(".")[0] : "";
  const explicitChannel = String(release?.channel || "").trim();
  const channelLabel = getReleaseChannelLabel(explicitChannel || inferredChannel || "");
  return `v${coreVersion || rawVersion}${channelLabel ? ` ${channelLabel}` : ""}`;
}

function buildSourceArchiveUrl(format, branch = "main") {
  return `https://codeload.github.com/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/${format}/refs/heads/${branch}`;
}

function buildDefaultDownloadFiles(release) {
  const versionLabel = getReleaseLabel(release);
  const assetVersion = `v${String(release?.version || APP_VERSION).trim().replace(/^v/i, "")}`;
  return [
    {
      id: "windows-installer",
      title: "ForgeBook Windows Installer",
      version: versionLabel,
      platform: "Windows 10+",
      fileType: "Installer",
      fileName: `ForgeBook-Setup-${assetVersion}.exe`,
      downloadName: `ForgeBook-Setup-${assetVersion}.exe`,
      buttonLabel: "Download Windows Installer",
      description: "Install ForgeBook with the full desktop setup flow when the signed installer asset is published.",
      note: "Recommended download for most Windows users.",
      url: "",
      recommended: true,
      disabled: true,
    },
    {
      id: "portable-zip",
      title: "ForgeBook Portable Build",
      version: versionLabel,
      platform: "Windows 10+",
      fileType: "Portable ZIP",
      fileName: `ForgeBook-Portable-${assetVersion}.zip`,
      downloadName: `ForgeBook-Portable-${assetVersion}.zip`,
      buttonLabel: "Download Portable ZIP",
      description: "Use a portable build when that package is published for download without the full installer flow.",
      note: "Useful for testing or manual extraction workflows.",
      url: "",
      recommended: false,
      disabled: true,
    },
    {
      id: "source-zip",
      title: "ForgeBook Source Package ZIP",
      version: versionLabel,
      platform: "Source",
      fileType: "ZIP",
      fileName: "Source code ZIP",
      downloadName: "ForgeBook-source.zip",
      buttonLabel: "Download Source ZIP",
      description: "Download the current ForgeBook source snapshot directly as a ZIP archive.",
      note: "Current repository snapshot from the main branch until a tagged release archive is published.",
      url: buildSourceArchiveUrl("zip"),
      recommended: false,
      disabled: false,
    },
    {
      id: "source-tar-gz",
      title: "ForgeBook Source Package TAR.GZ",
      version: versionLabel,
      platform: "Source",
      fileType: "TAR.GZ",
      fileName: "Source code TAR.GZ",
      downloadName: "ForgeBook-source.tar.gz",
      buttonLabel: "Download Source TAR.GZ",
      description: "Download the current ForgeBook source snapshot directly as a TAR.GZ archive.",
      note: "Current repository snapshot from the main branch until a tagged release archive is published.",
      url: buildSourceArchiveUrl("tar.gz"),
      recommended: false,
      disabled: false,
    },
  ];
}

function normalizeDownloadFile(rawFile = {}, release) {
  const fallbackTitle = String(rawFile?.title || rawFile?.name || "ForgeBook Download").trim();
  const fallbackFileName = String(rawFile?.fileName || rawFile?.filename || rawFile?.downloadName || "Download").trim();

  return {
    id: String(rawFile?.id || createSlug(fallbackTitle || fallbackFileName)).trim(),
    title: fallbackTitle,
    version: String(rawFile?.version || getReleaseLabel(release)).trim(),
    platform: String(rawFile?.platform || "").trim(),
    fileType: String(rawFile?.fileType || rawFile?.type || "").trim(),
    fileName: fallbackFileName,
    downloadName: String(rawFile?.downloadName || rawFile?.download || fallbackFileName).trim(),
    buttonLabel: String(rawFile?.buttonLabel || rawFile?.cta || "Download").trim(),
    description: String(rawFile?.description || "").trim(),
    note: String(rawFile?.note || "").trim(),
    url: String(rawFile?.url || "").trim(),
    recommended: Boolean(rawFile?.recommended),
    disabled: Boolean(rawFile?.disabled),
  };
}

function normalizeDownloadFiles(rawDownloads = {}, release) {
  const defaultFiles = buildDefaultDownloadFiles(release);
  const defaultIds = new Set(defaultFiles.map((file) => file.id));
  const overrideMap = new Map();
  const rawFiles = Array.isArray(rawDownloads?.files) ? rawDownloads.files : [];

  rawFiles.forEach((file) => {
    if (!file || typeof file !== "object") return;
    const id = String(file.id || createSlug(file.title || file.fileName || file.downloadName || "")).trim();
    if (!id) return;
    overrideMap.set(id, file);
  });

  const legacyOverrides = [
    { id: "windows-installer", url: rawDownloads?.windows || rawDownloads?.downloadUrl || "" },
    { id: "portable-zip", url: rawDownloads?.portable || rawDownloads?.portableZip || "" },
    { id: "source-zip", url: rawDownloads?.sourceZip || "" },
    { id: "source-tar-gz", url: rawDownloads?.sourceTarGz || rawDownloads?.sourceTarGzUrl || "" },
  ];

  legacyOverrides.forEach(({ id, url }) => {
    if (!String(url || "").trim()) return;
    const previous = overrideMap.get(id) || {};
    overrideMap.set(id, { ...previous, id, url });
  });

  const normalizedDefaults = defaultFiles.map((defaultFile) => (
    normalizeDownloadFile(
      { ...defaultFile, ...(overrideMap.get(defaultFile.id) || {}) },
      release
    )
  ));

  const extraFiles = Array.from(overrideMap.entries())
    .filter(([id]) => !defaultIds.has(id))
    .map(([, file]) => normalizeDownloadFile(file, release));

  return [...normalizedDefaults, ...extraFiles];
}

function normalizeRelease(raw = {}) {
  const baseRelease = {
    version: String(raw?.version || DEFAULT_RELEASE.version),
    channel: String(raw?.channel || DEFAULT_RELEASE.channel),
    releaseDate: String(raw?.releaseDate || DEFAULT_RELEASE.releaseDate),
    notes: Array.isArray(raw?.notes) && raw.notes.length ? raw.notes : DEFAULT_RELEASE.notes,
  };

  const rawDownloads = raw?.downloads || {};

  return {
    ...baseRelease,
    downloads: {
      releaseNotes: String(
        rawDownloads?.releaseNotes
          || raw?.releaseNotesUrl
          || raw?.releasePageUrl
          || DEFAULT_RELEASE.downloads.releaseNotes
      ).trim(),
      files: normalizeDownloadFiles(rawDownloads, baseRelease),
    },
  };
}

function isPlaceholderUrl(url = "") {
  return /your-org\/forgebook|paste_.*_here|placeholder/i.test(String(url));
}

function isRepositoryPageUrl(url = "") {
  try {
    const parsed = new URL(String(url).trim());
    if (parsed.hostname !== "github.com") return false;

    const path = parsed.pathname.replace(/\/+$/, "");
    if (path === `/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`) return true;
    if (path === `/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/releases`) return true;
    if (path === `/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/releases/latest`) return true;
    return false;
  } catch {
    return false;
  }
}

function isDirectDownloadUrl(url = "") {
  const candidate = String(url || "").trim();
  if (!candidate || isPlaceholderUrl(candidate) || isRepositoryPageUrl(candidate)) return false;

  try {
    const parsed = new URL(candidate);
    const pathname = parsed.pathname;

    if (parsed.hostname === "codeload.github.com") return true;

    if (parsed.hostname === "github.com") {
      if (pathname.includes("/releases/download/")) return true;
      if (/\/archive\/refs\/.+\.(zip|tar\.gz)$/i.test(pathname)) return true;
      return false;
    }

    return /\.(exe|msi|zip|tar\.gz|tgz|gz|7z|dmg|appimage)$/i.test(pathname);
  } catch {
    return false;
  }
}

function isDownloadAvailable(file) {
  return !file?.disabled && isDirectDownloadUrl(file?.url);
}

function resolveReleaseNotesUrl(release) {
  const candidate = String(release?.downloads?.releaseNotes || "").trim();
  if (!candidate || isPlaceholderUrl(candidate)) return DEFAULT_RELEASE_NOTES_URL;
  return candidate;
}

function getDownloadFiles(release) {
  return Array.isArray(release?.downloads?.files) ? release.downloads.files : [];
}

function getRecommendedDownload(release) {
  return getDownloadFiles(release).find((file) => file.recommended) || getDownloadFiles(release)[0] || null;
}

function getAdditionalDownloads(release) {
  const recommendedDownload = getRecommendedDownload(release);
  return getDownloadFiles(release).filter((file) => file && file.id !== recommendedDownload?.id);
}

function countAvailableDownloads(release) {
  return getDownloadFiles(release).filter((file) => isDownloadAvailable(file)).length;
}

function loadRelease() {
  if (cachedRelease) return Promise.resolve(cachedRelease);
  if (!releasePromise) {
    releasePromise = fetch("/version.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        cachedRelease = normalizeRelease(payload || DEFAULT_RELEASE);
        return cachedRelease;
      })
      .catch(() => {
        cachedRelease = normalizeRelease(DEFAULT_RELEASE);
        return cachedRelease;
      });
  }
  return releasePromise;
}

function featureCards() {
  return [
    ["Local-First Vaults", "Keep notes, boards, sheets, and files inside the desktop workspace instead of scattering test data across browser storage."],
    ["Nickname-Based Testing", "Create a lightweight tester identity with only a nickname while the social layer stays easy to test with friends."],
    ["Stable FG Profile IDs", "Each tester gets a persistent ForgeBook ID you can copy, share, and use to find each other in-app."],
    ["Desktop Workflow", "Launch into the workspace faster, keep file watching active, and test the actual app experience instead of a web shell."],
  ];
}

function launchSteps() {
  return [
    ["Open the download page", "Use the ForgeBook website install flow instead of hunting through repository pages."],
    ["Pick the package", "Download the Windows installer when it is published, or pull one of the available source packages directly."],
    ["Choose a nickname", "ForgeBook creates your tester profile locally with a stable FG ID for friend testing."],
    ["Test together", "Use friends, DMs, vault workflows, and the rest of the desktop app without full account auth yet."],
  ];
}

function includedFeatures() {
  return [
    ["Balancing sheets", "Multi-table balancing workspaces for weapons, enemies, economies, progression, and loot."],
    ["Visual planning canvas", "Map flows, feature ideas, and production thinking inside the desktop workspace."],
    ["Project documentation workspace", "Write and structure design notes, specs, briefs, and playtest reviews in one place."],
    ["File storage workspace", "Keep reference files, exports, and supporting assets alongside the rest of the project."],
    ["Team and social systems", "Profiles, friends, messages, and collaborative testing flows stay inside the app."],
    ["Developer marketplace direction", "A foundation for ForgeBook's longer-term marketplace and ecosystem vision."],
  ];
}

function routeNotice(route) {
  if (route === "/signup") {
    return "Account creation now starts inside the desktop app with a nickname.";
  }
  if (route === "/login") {
    return "Existing testing now begins from ForgeBook's desktop install flow.";
  }
  return "";
}

function renderRouteButton(path, label, className = "primary-button compact-action-button") {
  return `<a href="${escapeHtml(path)}" data-public-route="${escapeHtml(path)}" class="${escapeHtml(className)}">${escapeHtml(label)}</a>`;
}

function renderReleaseNotesLink(release, className = "public-download-support-link") {
  return `<a href="${escapeHtml(resolveReleaseNotesUrl(release))}" class="${escapeHtml(className)}" target="_blank" rel="noopener noreferrer">Having issues? View release notes.</a>`;
}

function renderDownloadFileButton(file, className = "primary-button compact-action-button") {
  if (isDownloadAvailable(file)) {
    return `<a href="${escapeHtml(file.url)}" class="${escapeHtml(className)}" download="${escapeHtml(file.downloadName || file.fileName || "download")}">${escapeHtml(file.buttonLabel)}</a>`;
  }

  return `<span class="${escapeHtml(className)} button-disabled">${escapeHtml(file.buttonLabel)}</span>`;
}

function renderAvailabilityState(file) {
  return isDownloadAvailable(file)
    ? `<p class="public-download-state is-live">Available now</p>`
    : `<p class="public-download-state is-soon">Coming soon</p>`;
}

function renderDownloadMeta(file, extraClass = "public-download-detail-grid") {
  return `
    <div class="${escapeHtml(extraClass)}">
      <article class="public-download-detail">
        <span>Version</span>
        <strong>${escapeHtml(file.version || getReleaseLabel(DEFAULT_RELEASE))}</strong>
      </article>
      <article class="public-download-detail">
        <span>Platform</span>
        <strong>${escapeHtml(file.platform || "Desktop")}</strong>
      </article>
      <article class="public-download-detail">
        <span>File type</span>
        <strong>${escapeHtml(file.fileType || "Download")}</strong>
      </article>
      <article class="public-download-detail">
        <span>File</span>
        <strong>${escapeHtml(file.fileName || file.downloadName || "Download")}</strong>
      </article>
    </div>
  `;
}

function renderFeaturedDownloadCard(release) {
  const recommendedDownload = getRecommendedDownload(release);
  const availableCount = countAvailableDownloads(release);

  if (!recommendedDownload) return "";

  let helperCopy = "The recommended Windows installer button points straight to the installer asset instead of a repository page.";
  if (!isDownloadAvailable(recommendedDownload)) {
    helperCopy = availableCount > 0
      ? "Coming soon. The Windows installer is not published yet, but the currently available source packages are listed below."
      : "Coming soon. Publish the Windows installer asset to activate this download.";
  }

  return `
    <article class="public-download-card public-download-card-featured premium-surface" id="downloads">
      <div class="public-download-card-head">
        <div>
          <p class="eyebrow">Recommended download</p>
          <h2>${escapeHtml(recommendedDownload.title)}</h2>
        </div>
        <span class="public-status-badge ${isDownloadAvailable(recommendedDownload) ? "is-live" : "is-soon"}">${isDownloadAvailable(recommendedDownload) ? "Recommended" : "Coming soon"}</span>
      </div>
      <p class="public-download-card-copy">${escapeHtml(recommendedDownload.description)}</p>
      ${renderDownloadMeta(recommendedDownload)}
      <div class="public-download-actions">
        ${renderDownloadFileButton(recommendedDownload, "primary-button compact-action-button public-download-primary")}
        ${renderAvailabilityState(recommendedDownload)}
        <p class="public-download-small">${escapeHtml(helperCopy)}</p>
        <div class="public-download-support-row">
          ${renderReleaseNotesLink(release)}
        </div>
      </div>
    </article>
  `;
}

function renderAdditionalDownloadCard(file) {
  return `
    <article class="public-download-option-card premium-surface">
      <div class="public-download-option-head">
        <div>
          <p class="eyebrow">${escapeHtml(file.fileType || "Download")}</p>
          <h3>${escapeHtml(file.title)}</h3>
        </div>
        <span class="public-status-badge ${isDownloadAvailable(file) ? "is-live" : "is-soon"}">${isDownloadAvailable(file) ? "Available" : "Coming soon"}</span>
      </div>
      <p class="public-download-option-copy">${escapeHtml(file.description)}</p>
      ${renderDownloadMeta(file, "public-download-option-meta")}
      ${file.note ? `<p class="public-download-card-note">${escapeHtml(file.note)}</p>` : ""}
      <div class="public-download-option-actions">
        ${renderDownloadFileButton(file, "secondary-button compact-action-button")}
        ${renderAvailabilityState(file)}
      </div>
    </article>
  `;
}

function publicNavigation(route, release) {
  const recommendedDownload = getRecommendedDownload(release);

  const routeLinks = route === DOWNLOAD_ROUTE
    ? `
        <a href="/" data-public-route="/">Home</a>
        <a href="#downloads" data-public-anchor="downloads">Downloads</a>
        <a href="#requirements" data-public-anchor="requirements">Requirements</a>
        <a href="#release-notes" data-public-anchor="release-notes">Release Notes</a>
      `
    : `
        <a href="/download" data-public-route="/download">Download</a>
        <a href="#desktop" data-public-anchor="desktop">Why Desktop</a>
        <a href="#release-notes" data-public-anchor="release-notes">Release Notes</a>
      `;

  const action = route === DOWNLOAD_ROUTE && recommendedDownload
    ? renderDownloadFileButton(recommendedDownload)
    : renderRouteButton(DOWNLOAD_ROUTE, "Download for Windows");

  return `
    <header class="public-nav premium-surface">
      <a class="public-brand" href="/" data-public-route="/">
        <span class="public-brand-mark">F</span>
        <div>
          <strong>ForgeBook</strong>
          <span>Desktop workspace for game teams</span>
        </div>
      </a>
      <nav class="public-nav-links">
        ${routeLinks}
        ${action}
      </nav>
    </header>
  `;
}

function heroPreview(release) {
  const recommendedDownload = getRecommendedDownload(release);
  const availableCount = countAvailableDownloads(release);

  return `
    <div class="public-preview premium-surface" id="download">
      <div class="public-preview-stage">
        <div class="public-preview-canvas public-download-canvas">
          <span class="public-download-badge">${escapeHtml(recommendedDownload?.platform || "Desktop")} ${escapeHtml(String(release?.channel || DEFAULT_RELEASE.channel).trim() || "Alpha")}</span>
          <div class="preview-node preview-node-feature">Pick Nickname</div>
          <div class="preview-node preview-node-sticky">FG Tester ID</div>
          <div class="preview-node preview-node-card">Local Vault</div>
          <div class="preview-link preview-link-a"></div>
          <div class="preview-link preview-link-b"></div>
        </div>
        <div class="public-preview-stack">
          <article class="public-preview-panel">
            <p class="eyebrow">Latest build</p>
            <strong>${escapeHtml(getReleaseLabel(release))}</strong>
            <span>${escapeHtml(formatReleaseDate(release.releaseDate))} | Download catalog ready for direct file links.</span>
          </article>
          <article class="public-preview-panel">
            <p class="eyebrow">Downloads</p>
            <strong>${availableCount} package${availableCount === 1 ? "" : "s"} available</strong>
            <span>${availableCount ? "Every active button points to a direct file response." : "Binary packages will light up automatically when direct asset links are added."}</span>
          </article>
          <article class="public-preview-panel">
            <p class="eyebrow">Shared flow</p>
            <strong>Website to app</strong>
            <span>Homepage install actions stay inside ForgeBook and lead into a dedicated multi-file download page.</span>
          </article>
        </div>
      </div>
    </div>
  `;
}

function renderLanding(route, release) {
  const notice = routeNotice(route);

  return `
    <section class="public-shell">
      ${publicNavigation(route, release)}
      <main class="public-main">
        ${notice ? `
          <section class="public-route-notice premium-surface">
            <p>${escapeHtml(notice)}</p>
          </section>
        ` : ""}

        <section class="public-hero">
          <div class="public-hero-copy">
            <p class="eyebrow">ForgeBook runs through the desktop app</p>
            <h1>ForgeBook gives game teams one workspace for planning, balancing, writing, storage, and social testing.</h1>
            <p class="public-lead">The public website stays focused on the product story while the install flow moves through a dedicated download page. From there, teams can grab direct-file downloads instead of being pushed into repository browsing.</p>
            <div class="public-hero-actions">
              ${renderRouteButton(DOWNLOAD_ROUTE, "Download for Windows")}
              <a href="#release-notes" class="secondary-button compact-action-button" data-public-anchor="release-notes">See Release Notes</a>
            </div>
            <div class="public-proof-strip">
              <span>Desktop vaults</span>
              <span>Balancing sheets</span>
              <span>Visual planning canvas</span>
              <span>Team and social systems</span>
            </div>
            <div class="public-release-strip">
              <span class="public-release-chip">${escapeHtml(getReleaseLabel(release))}</span>
              <span class="public-release-chip">Windows 10+</span>
              <span class="public-release-chip">${escapeHtml(formatReleaseDate(release.releaseDate))}</span>
            </div>
            <p class="public-download-small">Open the ForgeBook download page for the latest installer status, direct source packages, and release notes.</p>
          </div>
          ${heroPreview(release)}
        </section>

        <section class="public-section" id="desktop">
          <div class="public-section-copy">
            <p class="eyebrow">Why the switch</p>
            <h2>The site now leads into the real app instead of sending people to a repository page.</h2>
            <p>Instead of pushing visitors into GitHub navigation, ForgeBook keeps the public website as the product front door and hands off the actual install step through a polished internal download route. That keeps the story clean and the install experience professional while the app continues to ship as a desktop product.</p>
          </div>
          <div class="public-feature-grid">
            ${featureCards().map(([title, body]) => `
              <article class="public-feature-card premium-surface">
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(body)}</p>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="public-section public-two-column">
          <div class="public-section-copy">
            <p class="eyebrow">Testing flow</p>
            <h2>How people get into ForgeBook now.</h2>
            <div class="public-step-grid">
              ${launchSteps().map(([title, body]) => `
                <article class="public-step-card premium-surface">
                  <strong>${escapeHtml(title)}</strong>
                  <p>${escapeHtml(body)}</p>
                </article>
              `).join("")}
            </div>
          </div>
          <div class="public-section-copy">
            <p class="eyebrow">Platform status</p>
            <h2>Current release target.</h2>
            <div class="public-platform-list">
              <article class="public-platform-row premium-surface">
                <div>
                  <strong>Windows Desktop</strong>
                  <p>Primary Tauri target and the main recommended path on the download page.</p>
                </div>
                <span class="public-status-badge is-live">Primary</span>
              </article>
              <article class="public-platform-row premium-surface">
                <div>
                  <strong>Source Packages</strong>
                  <p>Direct ZIP and TAR.GZ source downloads stay available from the website experience.</p>
                </div>
                <span class="public-status-badge is-limited">Available</span>
              </article>
              <article class="public-platform-row premium-surface">
                <div>
                  <strong>Portable Build</strong>
                  <p>Shown on the download page now and ready to activate as soon as the package is published.</p>
                </div>
                <span class="public-status-badge is-planned">Soon</span>
              </article>
            </div>
          </div>
        </section>

        <section class="public-section" id="release-notes">
          <div class="public-section-copy">
            <p class="eyebrow">Release notes</p>
            <h2>What is in this alpha build.</h2>
            <ul class="public-note-list">
              ${release.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
            </ul>
          </div>
        </section>

        <section class="public-cta premium-surface">
          <div>
            <p class="eyebrow">Ready to install</p>
            <h2>Open the ForgeBook download page and choose the package that matches your workflow.</h2>
          </div>
          <div class="public-hero-actions">
            ${renderRouteButton(DOWNLOAD_ROUTE, "Open Downloads", "primary-button compact-action-button public-cta-button")}
          </div>
        </section>
      </main>
    </section>
  `;
}

function renderDownloadPage(release) {
  const recommendedDownload = getRecommendedDownload(release);
  const additionalDownloads = getAdditionalDownloads(release);
  const alphaNotice = "ForgeBook is currently in Alpha. Features, layouts, and workflows may change as development continues.";

  return `
    <section class="public-shell">
      ${publicNavigation(DOWNLOAD_ROUTE, release)}
      <main class="public-main">
        <section class="public-download-hero">
          <div class="public-section-copy">
            <p class="eyebrow">Desktop downloads</p>
            <h1>Download ForgeBook</h1>
            <p class="public-lead">Install the ForgeBook desktop app or download available release packages.</p>
            <div class="public-release-strip">
              <span class="public-release-chip">${escapeHtml(getReleaseLabel(release))}</span>
              <span class="public-release-chip">${escapeHtml(recommendedDownload?.platform || "Desktop")}</span>
              <span class="public-release-chip">Direct file downloads</span>
            </div>
          </div>
          ${renderFeaturedDownloadCard(release)}
        </section>

        <section class="public-section" aria-labelledby="downloadsSectionTitle">
          <div class="public-download-section-head">
            <div class="public-section-copy">
              <p class="eyebrow">Downloads</p>
              <h2 id="downloadsSectionTitle">Available release files</h2>
              <p>Every active download button below points directly to a file asset or archive response. Unpublished packages stay visible and clearly marked.</p>
            </div>
          </div>
          <div class="public-downloads-grid">
            ${additionalDownloads.map((file) => renderAdditionalDownloadCard(file)).join("")}
          </div>
        </section>

        <section class="public-section public-two-column">
          <article class="public-info-card premium-surface" id="requirements">
            <p class="eyebrow">Requirements</p>
            <h2>Before you install</h2>
            <ul class="public-value-list">
              <li>Windows 10 or newer</li>
              <li>Internet connection required for login, teams, marketplace, and social features</li>
              <li>Local workspace features run through the desktop app</li>
            </ul>
          </article>

          <article class="public-info-card premium-surface">
            <p class="eyebrow">Alpha notice</p>
            <h2>Built for active iteration</h2>
            <p>${escapeHtml(alphaNotice)}</p>
          </article>
        </section>

        <section class="public-section" id="included">
          <div class="public-section-copy">
            <p class="eyebrow">What is included</p>
            <h2>ForgeBook ships with the core desktop workspace already in view.</h2>
            <p>The current alpha package set focuses on the workflows people need to evaluate the product as a real production tool, not just a marketing preview.</p>
          </div>
          <div class="public-feature-grid">
            ${includedFeatures().map(([title, body]) => `
              <article class="public-feature-card premium-surface">
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(body)}</p>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="public-section" id="release-notes">
          <div class="public-section-copy">
            <p class="eyebrow">Troubleshooting</p>
            <h2>Release notes and status</h2>
            <ul class="public-note-list">
              ${release.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
            </ul>
            <div class="public-download-support-row">
              ${renderReleaseNotesLink(release)}
            </div>
          </div>
        </section>

        <section class="public-cta premium-surface">
          <div>
            <p class="eyebrow">Install now</p>
            <h2>Download ForgeBook for Windows when the installer is published, or grab the currently available source packages today.</h2>
          </div>
          <div class="public-download-cta-actions">
            ${recommendedDownload ? renderDownloadFileButton(recommendedDownload, "primary-button compact-action-button public-cta-button") : ""}
            ${recommendedDownload ? renderAvailabilityState(recommendedDownload) : ""}
            ${renderReleaseNotesLink(release, "public-download-support-link public-download-support-link-cta")}
          </div>
        </section>
      </main>
    </section>
  `;
}

function bindPublicEvents() {
  document.querySelectorAll("[data-public-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = link.getAttribute("data-public-route");
      if (!target) return;
      event.preventDefault();
      navigate(target);
    });
  });

  document.querySelectorAll("[data-public-anchor]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const targetId = link.getAttribute("data-public-anchor");
      if (!targetId) return;
      window.history.replaceState({}, "", `${window.location.pathname}#${targetId}`);
      scrollToPublicAnchor(targetId);
    });
  });
}

function renderPublicRoute(route, release, options = {}) {
  const publicRoot = document.querySelector("#publicRoot");
  const appShell = document.querySelector(".app-shell");
  if (!publicRoot || !appShell) return;

  const anchor = String(options?.anchor || "").replace(/^#/, "");
  const isDownloadRoute = route === DOWNLOAD_ROUTE;

  publicRoot.classList.remove("hidden");
  appShell.classList.add("hidden");
  document.body.dataset.appMode = "public";
  document.body.dataset.publicRoute = isDownloadRoute ? "download" : "home";
  document.title = isDownloadRoute ? "Download ForgeBook" : "ForgeBook | Desktop Workspace";
  publicRoot.innerHTML = isDownloadRoute ? renderDownloadPage(release) : renderLanding(route, release);
  bindPublicEvents();

  if (anchor) scrollToPublicAnchor(anchor);
}

export function mountPublicApp({ route = HOME_ROUTE, anchor = "", user = null } = {}) {
  void user;
  const token = ++publicRenderToken;
  renderPublicRoute(route, cachedRelease || normalizeRelease(DEFAULT_RELEASE), { anchor });
  void loadRelease().then((release) => {
    if (document.body.dataset.appMode !== "public" || token !== publicRenderToken) return;
    renderPublicRoute(route, release, { anchor });
  });
}
