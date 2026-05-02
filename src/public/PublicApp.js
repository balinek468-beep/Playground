const DEFAULT_RELEASE = {
  version: "0.1.0",
  channel: "desktop preview",
  releaseDate: "",
  notes: [
    "Desktop vaults and local workspace boot are active.",
    "Tester profiles now use a simple nickname plus a stable FG ID.",
    "Public web routes now point people to the desktop download flow.",
  ],
  downloads: {
    windows: "",
  },
};

let cachedRelease = null;
let releasePromise = null;

function navigate(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  mountPublicApp({ route: path, user: null });
}

function normalizeRelease(raw = {}) {
  return {
    version: String(raw?.version || DEFAULT_RELEASE.version),
    channel: String(raw?.channel || DEFAULT_RELEASE.channel),
    releaseDate: String(raw?.releaseDate || DEFAULT_RELEASE.releaseDate),
    notes: Array.isArray(raw?.notes) && raw.notes.length ? raw.notes : DEFAULT_RELEASE.notes,
    downloads: {
      windows: String(raw?.downloads?.windows || raw?.downloadUrl || DEFAULT_RELEASE.downloads.windows),
    },
  };
}

function isPlaceholderDownloadUrl(url = "") {
  return /your-org\/forgebook/i.test(String(url));
}

function resolveWindowsDownloadUrl(release) {
  const candidate = String(release?.downloads?.windows || "").trim();
  if (!candidate || isPlaceholderDownloadUrl(candidate)) return "";
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
    ["Download the build", "Grab the latest Windows preview from this page and launch the desktop app."],
    ["Choose a nickname", "ForgeBook creates your tester profile locally with a stable FG ID for friend testing."],
    ["Share your FG ID", "Open your profile in the app and copy your ID so your friend can find you quickly."],
    ["Test together", "Use friends, DMs, vault workflows, and the rest of the desktop app without full account auth yet."],
  ];
}

function routeNotice(route) {
  if (route === "/signup") {
    return "Account creation now starts inside the desktop app with a nickname.";
  }
  if (route === "/login") {
    return "The public site is now the desktop download page. Existing testing happens in the app.";
  }
  return "";
}

function publicNavigation(release) {
  const downloadUrl = resolveWindowsDownloadUrl(release);
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
        <a href="/#download" data-public-anchor="download">Download</a>
        <a href="/#desktop" data-public-anchor="desktop">Why Desktop</a>
        <a href="/#release-notes" data-public-anchor="release-notes">Release Notes</a>
        ${downloadUrl
          ? `<a href="${downloadUrl}" class="primary-button compact-action-button" target="_blank" rel="noreferrer">Download for Windows</a>`
          : `<span class="primary-button compact-action-button button-disabled">Windows Link Pending</span>`}
      </nav>
    </header>
  `;
}

function heroPreview(release) {
  return `
    <div class="public-preview premium-surface" id="download">
      <div class="public-preview-stage">
        <div class="public-preview-canvas public-download-canvas">
          <span class="public-download-badge">Desktop Preview</span>
          <div class="preview-node preview-node-feature">Pick Nickname</div>
          <div class="preview-node preview-node-sticky">FG Tester ID</div>
          <div class="preview-node preview-node-card">Local Vault</div>
          <div class="preview-link preview-link-a"></div>
          <div class="preview-link preview-link-b"></div>
        </div>
        <div class="public-preview-stack">
          <article class="public-preview-panel">
            <p class="eyebrow">Latest build</p>
            <strong>v${release.version}</strong>
            <span>${formatReleaseDate(release.releaseDate)} | ${release.channel}</span>
          </article>
          <article class="public-preview-panel">
            <p class="eyebrow">Tester identity</p>
            <strong>Nickname first</strong>
            <span>Accounts are lightweight for testing, but each device still gets a stable FG profile ID.</span>
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

function renderDownloadButton(release, extraClass = "") {
  const downloadUrl = resolveWindowsDownloadUrl(release);
  const className = `primary-button compact-action-button${extraClass ? ` ${extraClass}` : ""}`;
  if (downloadUrl) {
    return `<a href="${downloadUrl}" class="${className}" target="_blank" rel="noreferrer">Download for Windows</a>`;
  }
  return `<span class="${className} button-disabled">Windows Link Pending</span>`;
}

function renderLanding(route, release) {
  const notice = routeNotice(route);
  const downloadUrl = resolveWindowsDownloadUrl(release);
  return `
    <section class="public-shell">
      ${publicNavigation(release)}
      <main class="public-main">
        ${notice ? `
          <section class="public-route-notice premium-surface">
            <p>${notice}</p>
          </section>
        ` : ""}

        <section class="public-hero">
          <div class="public-hero-copy">
            <p class="eyebrow">ForgeBook has moved into the desktop app</p>
            <h1>Download the desktop build, choose a nickname, and start testing with your friend.</h1>
            <p class="public-lead">The public website now points to the app itself. ForgeBook boots into a local-first desktop workspace, creates a lightweight tester identity with just a nickname, and gives each tester a stable FG ID for social testing.</p>
            <div class="public-hero-actions">
              ${renderDownloadButton(release)}
              <a href="#release-notes" class="secondary-button compact-action-button" data-public-anchor="release-notes">See Release Notes</a>
            </div>
            <div class="public-proof-strip">
              <span>Desktop vaults</span>
              <span>Nickname-based testing</span>
              <span>Stable FG IDs</span>
              <span>Friend messages and social flows</span>
            </div>
            <div class="public-release-strip">
              <span class="public-release-chip">Version ${release.version}</span>
              <span class="public-release-chip">${release.channel}</span>
              <span class="public-release-chip">${formatReleaseDate(release.releaseDate)}</span>
            </div>
            <p class="public-download-small">${downloadUrl ? "Latest Windows build is available now." : "The page is ready for downloads. Add your real Windows release URL in version.json to activate the button."}</p>
          </div>
          ${heroPreview(release)}
        </section>

        <section class="public-section" id="desktop">
          <div class="public-section-copy">
            <p class="eyebrow">Why the switch</p>
            <h2>The site is now a launcher page. The real experience is the desktop workspace.</h2>
            <p>Instead of signing up on the website first, testers download the app, set a nickname locally, and start using the actual desktop workflow you are shipping. That keeps feedback focused on the app instead of the old web auth shell.</p>
          </div>
          <div class="public-feature-grid">
            ${featureCards().map(([title, body]) => `
              <article class="public-feature-card premium-surface">
                <h3>${title}</h3>
                <p>${body}</p>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="public-section public-two-column">
          <div class="public-section-copy">
            <p class="eyebrow">Testing flow</p>
            <h2>How your friend gets in.</h2>
            <div class="public-step-grid">
              ${launchSteps().map(([title, body]) => `
                <article class="public-step-card premium-surface">
                  <strong>${title}</strong>
                  <p>${body}</p>
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
                  <p>Primary Tauri target for the current testing cycle.</p>
                </div>
                <span class="public-status-badge is-live">Ready</span>
              </article>
              <article class="public-platform-row premium-surface">
                <div>
                  <strong>Browser Preview</strong>
                  <p>Still useful for local experiments, but the public site now focuses on the real desktop app.</p>
                </div>
                <span class="public-status-badge is-limited">Limited</span>
              </article>
              <article class="public-platform-row premium-surface">
                <div>
                  <strong>macOS / Linux</strong>
                  <p>Not part of this testing push yet.</p>
                </div>
                <span class="public-status-badge is-planned">Later</span>
              </article>
            </div>
          </div>
        </section>

        <section class="public-section" id="release-notes">
          <div class="public-section-copy">
            <p class="eyebrow">Release notes</p>
            <h2>What is in this desktop build.</h2>
            <ul class="public-note-list">
              ${release.notes.map((note) => `<li>${note}</li>`).join("")}
            </ul>
          </div>
        </section>

        <section class="public-cta premium-surface">
          <div>
            <p class="eyebrow">Ready to test</p>
            <h2>Download ForgeBook, pick your nickname, and test the desktop app directly.</h2>
          </div>
          <div class="public-hero-actions">
            ${renderDownloadButton(release, "public-cta-button")}
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
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderPublicRoute(route, release) {
  const publicRoot = document.querySelector("#publicRoot");
  const appShell = document.querySelector(".app-shell");
  if (!publicRoot || !appShell) return;
  publicRoot.classList.remove("hidden");
  appShell.classList.add("hidden");
  document.body.dataset.appMode = "public";
  document.title = "ForgeBook Desktop | Download";
  publicRoot.innerHTML = renderLanding(route, release);
  bindPublicEvents();
}

export function mountPublicApp({ route = "/", user = null } = {}) {
  void user;
  renderPublicRoute(route, cachedRelease || normalizeRelease(DEFAULT_RELEASE));
  void loadRelease().then((release) => {
    if (document.body.dataset.appMode !== "public") return;
    renderPublicRoute(route, release);
  });
}
