const HOME_ROUTE = "/";
const DOWNLOAD_ROUTE = "/download";
const DEFAULT_RELEASE_NOTES_URL = "https://github.com/balinek468-beep/Playground/releases";

const DEFAULT_RELEASE = {
  version: "0.1.0",
  channel: "Alpha",
  releaseDate: "2026-05-02T00:00:00Z",
  notes: [
    "Desktop vault boot is more stable and ready for broader hands-on testing.",
    "Tester profiles now start with a simple nickname while preserving a stable FG ID.",
    "The public website now keeps the install flow inside ForgeBook with a dedicated download page.",
  ],
  downloads: {
    windows: "",
    releaseNotes: DEFAULT_RELEASE_NOTES_URL,
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

function normalizeRelease(raw = {}) {
  return {
    version: String(raw?.version || DEFAULT_RELEASE.version),
    channel: String(raw?.channel || DEFAULT_RELEASE.channel),
    releaseDate: String(raw?.releaseDate || DEFAULT_RELEASE.releaseDate),
    notes: Array.isArray(raw?.notes) && raw.notes.length ? raw.notes : DEFAULT_RELEASE.notes,
    downloads: {
      windows: String(raw?.downloads?.windows || raw?.downloadUrl || DEFAULT_RELEASE.downloads.windows),
      releaseNotes: String(
        raw?.downloads?.releaseNotes
          || raw?.releaseNotesUrl
          || raw?.releasePageUrl
          || DEFAULT_RELEASE.downloads.releaseNotes
      ),
    },
  };
}

function isPlaceholderUrl(url = "") {
  return /your-org\/forgebook|PASTE_DIRECT_INSTALLER_LINK_HERE/i.test(String(url));
}

function resolveWindowsDownloadUrl(release) {
  const candidate = String(release?.downloads?.windows || "").trim();
  if (!candidate || isPlaceholderUrl(candidate)) return "";
  return candidate;
}

function resolveReleaseNotesUrl(release) {
  const candidate = String(release?.downloads?.releaseNotes || "").trim();
  if (!candidate || isPlaceholderUrl(candidate)) return DEFAULT_RELEASE_NOTES_URL;
  return candidate;
}

async function loadRelease() {
  if (cachedRelease) return cachedRelease;
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
  const version = String(release?.version || DEFAULT_RELEASE.version).trim();
  const channel = String(release?.channel || "").trim();
  return `v${version}${channel ? ` ${channel}` : ""}`;
}

function inferDownloadFilename(release, downloadUrl) {
  try {
    const pathname = new URL(downloadUrl).pathname;
    const candidate = pathname.split("/").pop();
    if (candidate) return candidate;
  } catch {
    // Fall through to the default filename if URL parsing fails.
  }
  return `ForgeBook_${String(release?.version || DEFAULT_RELEASE.version).trim()}_x64-setup.exe`;
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
    ["Download the installer", "Grab the Windows build directly from the dedicated download card and launch the desktop app."],
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
    ["Developer marketplace direction", "A foundation for ForgeBook’s longer-term marketplace and ecosystem vision."],
  ];
}

function routeNotice(route) {
  if (route === "/signup") {
    return "Account creation now starts inside the desktop app with a nickname.";
  }
  if (route === "/login") {
    return "Existing testing now begins from ForgeBook’s desktop install flow.";
  }
  return "";
}

function renderRouteButton(path, label, className = "primary-button compact-action-button") {
  return `<a href="${escapeHtml(path)}" data-public-route="${escapeHtml(path)}" class="${escapeHtml(className)}">${escapeHtml(label)}</a>`;
}

function renderReleaseNotesLink(release, className = "public-download-support-link") {
  return `<a href="${escapeHtml(resolveReleaseNotesUrl(release))}" class="${escapeHtml(className)}" target="_blank" rel="noreferrer">Having issues? View release notes.</a>`;
}

function renderDirectDownloadButton(release, extraClass = "") {
  const downloadUrl = resolveWindowsDownloadUrl(release);
  const className = `primary-button compact-action-button${extraClass ? ` ${extraClass}` : ""}`;
  if (downloadUrl) {
    return `<a href="${escapeHtml(downloadUrl)}" class="${escapeHtml(className)}" download="${escapeHtml(inferDownloadFilename(release, downloadUrl))}" rel="noreferrer">Download for Windows</a>`;
  }
  return `<span class="${escapeHtml(className)} button-disabled">Windows Installer Pending</span>`;
}

function publicNavigation(route, release) {
  const routeLinks = route === DOWNLOAD_ROUTE
    ? `
        <a href="/" data-public-route="/">Home</a>
        <a href="#requirements" data-public-anchor="requirements">Requirements</a>
        <a href="#included" data-public-anchor="included">Included</a>
        <a href="#release-notes" data-public-anchor="release-notes">Release Notes</a>
      `
    : `
        <a href="/download" data-public-route="/download">Download</a>
        <a href="#desktop" data-public-anchor="desktop">Why Desktop</a>
        <a href="#release-notes" data-public-anchor="release-notes">Release Notes</a>
      `;

  const action = route === DOWNLOAD_ROUTE
    ? renderDirectDownloadButton(release)
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
  return `
    <div class="public-preview premium-surface" id="download">
      <div class="public-preview-stage">
        <div class="public-preview-canvas public-download-canvas">
          <span class="public-download-badge">Windows ${escapeHtml(String(release?.channel || DEFAULT_RELEASE.channel).trim() || "Alpha")}</span>
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
            <span>${escapeHtml(formatReleaseDate(release.releaseDate))} | Windows desktop installer</span>
          </article>
          <article class="public-preview-panel">
            <p class="eyebrow">Installer flow</p>
            <strong>Website to app</strong>
            <span>Homepage install actions now stay inside ForgeBook and lead into a dedicated download page.</span>
          </article>
          <article class="public-preview-panel">
            <p class="eyebrow">Shared flow</p>
            <strong>Friend testing ready</strong>
            <span>Download, pick a name, swap IDs, and jump into messages and collaboration flows faster.</span>
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
            <p class="public-lead">The public website stays focused on the product story while the install flow moves through a dedicated download page. From there, testers grab the Windows installer directly, boot into a local-first workspace, choose a nickname, and start using the real desktop experience.</p>
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
            <p class="public-download-small">Open the ForgeBook download page for the latest Windows installer and release notes.</p>
          </div>
          ${heroPreview(release)}
        </section>

        <section class="public-section" id="desktop">
          <div class="public-section-copy">
            <p class="eyebrow">Why the switch</p>
            <h2>The site now leads into the real app instead of sending people to a repository page.</h2>
            <p>Instead of pushing visitors into GitHub navigation, ForgeBook keeps the public website as the product front door and hands off the actual install step through a polished internal download route. That keeps the story clean and the install experience professional while the app continues to ship as a Windows desktop build.</p>
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
                  <p>Primary Tauri target and the main download flow on the public website.</p>
                </div>
                <span class="public-status-badge is-live">Ready</span>
              </article>
              <article class="public-platform-row premium-surface">
                <div>
                  <strong>Browser Preview</strong>
                  <p>Still useful for local experiments, but the public site now promotes the desktop install path.</p>
                </div>
                <span class="public-status-badge is-limited">Limited</span>
              </article>
              <article class="public-platform-row premium-surface">
                <div>
                  <strong>macOS / Linux</strong>
                  <p>Not part of the current installer release yet.</p>
                </div>
                <span class="public-status-badge is-planned">Later</span>
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
            <h2>Open the ForgeBook download page and pull the Windows installer directly from the site flow.</h2>
          </div>
          <div class="public-hero-actions">
            ${renderRouteButton(DOWNLOAD_ROUTE, "Download for Windows", "primary-button compact-action-button public-cta-button")}
          </div>
        </section>
      </main>
    </section>
  `;
}

function renderDownloadPage(release) {
  const downloadUrl = resolveWindowsDownloadUrl(release);
  const alphaNotice = "ForgeBook is currently in Alpha. Features, layouts, and workflows may change as the product improves.";

  return `
    <section class="public-shell">
      ${publicNavigation(DOWNLOAD_ROUTE, release)}
      <main class="public-main">
        <section class="public-download-hero">
          <div class="public-section-copy">
            <p class="eyebrow">Windows download</p>
            <h1>Download ForgeBook</h1>
            <p class="public-lead">The production workspace for game designers, project managers, balancers, and developers.</p>
            <div class="public-release-strip">
              <span class="public-release-chip">${escapeHtml(getReleaseLabel(release))}</span>
              <span class="public-release-chip">Windows 10+</span>
              <span class="public-release-chip">Installer</span>
            </div>
          </div>

          <article class="public-download-card premium-surface" id="requirements">
            <div class="public-download-card-head">
              <div>
                <p class="eyebrow">Desktop release</p>
                <h2>ForgeBook for Windows</h2>
              </div>
              <span class="public-status-badge is-live">Alpha</span>
            </div>
            <p class="public-download-card-copy">Install the current ForgeBook desktop build directly from this page flow and launch into the local-first workspace experience.</p>
            <div class="public-download-detail-grid">
              <article class="public-download-detail">
                <span>Version</span>
                <strong>${escapeHtml(getReleaseLabel(release))}</strong>
              </article>
              <article class="public-download-detail">
                <span>Platform</span>
                <strong>Windows 10+</strong>
              </article>
              <article class="public-download-detail">
                <span>File type</span>
                <strong>Installer</strong>
              </article>
              <article class="public-download-detail">
                <span>Published</span>
                <strong>${escapeHtml(formatReleaseDate(release.releaseDate))}</strong>
              </article>
            </div>
            <div class="public-download-actions">
              ${renderDirectDownloadButton(release, "public-download-primary")}
              ${renderReleaseNotesLink(release)}
              <p class="public-download-small">${downloadUrl ? "The primary button points straight to the installer asset instead of a repository page." : "Add the real installer asset URL in version.json to activate the primary download button."}</p>
            </div>
          </article>
        </section>

        <section class="public-section public-two-column">
          <article class="public-info-card premium-surface">
            <p class="eyebrow">Requirements</p>
            <h2>Before you install</h2>
            <ul class="public-value-list">
              <li>Windows 10 or newer</li>
              <li>Internet connection required for login, teams, marketplace, and social features</li>
              <li>Local workspace features are intended to run through the desktop app</li>
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
            <p>The current alpha installer focuses on the workflows people need to evaluate the product as a real production tool, not just a marketing preview.</p>
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
            <p class="eyebrow">Release notes</p>
            <h2>What is in this installer.</h2>
            <ul class="public-note-list">
              ${release.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}
            </ul>
          </div>
        </section>

        <section class="public-cta premium-surface">
          <div>
            <p class="eyebrow">Install now</p>
            <h2>Download ForgeBook for Windows and move straight into the desktop workspace.</h2>
          </div>
          <div class="public-download-cta-actions">
            ${renderDirectDownloadButton(release, "public-cta-button")}
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
