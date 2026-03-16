import { signInWithPassword, signUpWithPassword } from "../services/auth/AuthService.js";

function navigate(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  mountPublicApp({ route: path, user: window.ForgeBookRuntime?.auth?.user || null });
}

function redirectToApp() {
  window.location.assign("/app");
}

function featureCards() {
  return [
    ["Canvas Planning", "Map gameplay systems, loops, flows, milestones, and dependencies visually."],
    ["Design Documentation", "Build GDDs, feature specs, production notes, and structured design docs."],
    ["Balancing Sheets", "Tune progression, economy, combat values, and live balancing data in one place."],
    ["Project Management", "Track milestones, boards, tasks, approvals, and production health."],
    ["Developer Marketplace", "Publish roles, discover collaborators, and connect with specialists."],
    ["Storage Hub", "Keep game files, exports, references, and assets organized inside the workspace."],
    ["Social Layer", "Use friends, DMs, collaboration spaces, and team communication without leaving ForgeBook."],
  ];
}

function audiencePills() {
  return [
    "Game Designers",
    "Creative Directors",
    "Project Managers",
    "Balancers",
    "Development Teams",
    "Indie Studios",
    "Solo Developers",
  ];
}

function publicNavigation(user) {
  return `
    <header class="public-nav premium-surface">
      <a class="public-brand" href="/" data-public-route="/">
        <span class="public-brand-mark">F</span>
        <div>
          <strong>ForgeBook</strong>
          <span>Game production workspace</span>
        </div>
      </a>
      <nav class="public-nav-links">
        <a href="/#features" data-public-anchor="features">Features</a>
        <a href="/#about" data-public-anchor="about">About</a>
        <a href="${user ? "/app" : "/login"}" data-public-route="${user ? "/app" : "/login"}">${user ? "Open Workspace" : "Login"}</a>
        <a href="${user ? "/app" : "/signup"}" class="primary-button compact-action-button" data-public-route="${user ? "/app" : "/signup"}">${user ? "Enter App" : "Get Started"}</a>
      </nav>
    </header>
  `;
}

function heroPreview() {
  return `
    <div class="public-preview premium-surface" id="product-preview">
      <div class="public-preview-stage">
        <div class="public-preview-canvas">
          <div class="preview-node preview-node-feature">Combat Loop</div>
          <div class="preview-node preview-node-sticky">Economy Risk</div>
          <div class="preview-node preview-node-card">Milestone Roadmap</div>
          <div class="preview-link preview-link-a"></div>
          <div class="preview-link preview-link-b"></div>
        </div>
        <div class="public-preview-stack">
          <article class="public-preview-panel">
            <p class="eyebrow">Board</p>
            <strong>Production Tracking</strong>
            <span>Milestones, blockers, and approvals</span>
          </article>
          <article class="public-preview-panel">
            <p class="eyebrow">Sheet</p>
            <strong>Balancing Workspace</strong>
            <span>Economy values, tuning, and comparisons</span>
          </article>
          <article class="public-preview-panel">
            <p class="eyebrow">Market</p>
            <strong>Developer Discovery</strong>
            <span>Roles, availability, and collaboration</span>
          </article>
        </div>
      </div>
    </div>
  `;
}

function renderLanding(user) {
  return `
    <section class="public-shell">
      ${publicNavigation(user)}
      <main class="public-main">
        <section class="public-hero">
          <div class="public-hero-copy">
            <p class="eyebrow">Built for serious game teams</p>
            <h1>The workspace built for game designers, project managers, and development teams.</h1>
            <p class="public-lead">Plan systems. Balance gameplay. Organize production. Recruit developers. Keep everything in one workspace designed for game production instead of generic office work.</p>
            <div class="public-hero-actions">
              <a href="/signup" class="primary-button compact-action-button" data-public-route="/signup">Get Started</a>
              <a href="#product-preview" class="secondary-button compact-action-button" data-public-anchor="product-preview">View Demo</a>
              <a href="/login" class="secondary-button compact-action-button" data-public-route="/login">Login</a>
            </div>
            <div class="public-proof-strip">
              <span>Canvas planning</span>
              <span>Balancing sheets</span>
              <span>Boards and docs</span>
              <span>Marketplace and social</span>
            </div>
          </div>
          ${heroPreview()}
        </section>

        <section class="public-section" id="about">
          <div class="public-section-copy">
            <p class="eyebrow">What is ForgeBook</p>
            <h2>One production environment for game planning, execution, and collaboration.</h2>
            <p>ForgeBook is a professional workspace designed specifically for game development teams. Instead of splitting work across whiteboards, docs, boards, spreadsheets, storage tools, recruitment sites, and chat apps, ForgeBook brings those workflows into one environment built around game production.</p>
          </div>
        </section>

        <section class="public-section" id="features">
          <div class="public-section-copy">
            <p class="eyebrow">Core tools</p>
            <h2>Everything the team needs, connected in one system.</h2>
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
            <p class="eyebrow">Who it is for</p>
            <h2>Built for roles that need structure and speed.</h2>
            <div class="public-pill-grid">
              ${audiencePills().map((label) => `<span class="public-pill">${label}</span>`).join("")}
            </div>
          </div>
          <div class="public-section-copy">
            <p class="eyebrow">Why ForgeBook</p>
            <h2>Better than stitching generic tools together.</h2>
            <ul class="public-value-list">
              <li>Built specifically for game development workflows</li>
              <li>Combines planning, documentation, management, storage, social, and recruitment</li>
              <li>Reduces tool fragmentation and context switching</li>
              <li>Keeps production logic, files, and collaboration in one place</li>
            </ul>
          </div>
        </section>

        <section class="public-cta premium-surface">
          <div>
            <p class="eyebrow">Start using ForgeBook</p>
            <h2>Understand the product first. Enter the workspace when you are ready.</h2>
          </div>
          <div class="public-hero-actions">
            <a href="/signup" class="primary-button compact-action-button" data-public-route="/signup">Create Account</a>
            <a href="/login" class="secondary-button compact-action-button" data-public-route="/login">Login</a>
          </div>
        </section>
      </main>
    </section>
  `;
}

function renderAuth(route, user) {
  const mode = route === "/signup" ? "signup" : "login";
  return `
    <section class="public-shell public-shell-auth">
      ${publicNavigation(user)}
      <main class="public-auth-main">
        <section class="public-auth-copy">
          <p class="eyebrow">${mode === "signup" ? "Create your workspace" : "Welcome back"}</p>
          <h1>${mode === "signup" ? "Start using ForgeBook." : "Sign in to ForgeBook."}</h1>
          <p>${mode === "signup"
            ? "Create your account to open the ForgeBook workspace, manage projects, publish to the market, and collaborate with your team."
            : "Sign in to access your vaults, documents, boards, messages, storage, and market profile."}</p>
          <div class="public-auth-points">
            <span>Protected workspace access</span>
            <span>Persistent profile identity</span>
            <span>Cross-device collaboration</span>
          </div>
        </section>
        <section class="public-auth-card premium-surface">
          <p class="eyebrow">${mode === "signup" ? "Get started" : "Workspace access"}</p>
          <h2>${mode === "signup" ? "Create Account" : "Login"}</h2>
          <form id="publicAuthForm" class="public-auth-form">
            <input id="publicAuthEmail" class="modal-input" type="email" placeholder="Email" required />
            <input id="publicAuthPassword" class="modal-input" type="password" placeholder="Password" required />
            <input id="publicAuthName" class="modal-input ${mode === "signup" ? "" : "hidden"}" type="text" placeholder="Display name" ${mode === "signup" ? "required" : ""} />
            <button id="publicAuthSubmit" class="primary-button" type="submit">${mode === "signup" ? "Create Account" : "Login"}</button>
          </form>
          <p id="publicAuthError" class="auth-gate-error hidden"></p>
          <div class="public-auth-switch">
            <span>${mode === "signup" ? "Already have an account?" : "New to ForgeBook?"}</span>
            <a href="${mode === "signup" ? "/login" : "/signup"}" data-public-route="${mode === "signup" ? "/login" : "/signup"}">${mode === "signup" ? "Login" : "Create Account"}</a>
          </div>
        </section>
      </main>
    </section>
  `;
}

function bindPublicEvents(route) {
  document.querySelectorAll("[data-public-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const target = link.getAttribute("data-public-route");
      if (!target) return;
      if (target === "/app") return;
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

  const form = document.querySelector("#publicAuthForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorBox = document.querySelector("#publicAuthError");
    const email = document.querySelector("#publicAuthEmail")?.value || "";
    const password = document.querySelector("#publicAuthPassword")?.value || "";
    const name = document.querySelector("#publicAuthName")?.value || "";
    if (errorBox) {
      errorBox.textContent = "";
      errorBox.classList.add("hidden");
    }
    try {
      if (route === "/signup") {
        await signUpWithPassword({ email, password, metadata: { name } });
      } else {
        await signInWithPassword({ email, password });
      }
      redirectToApp();
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = error?.message || "Authentication failed.";
        errorBox.classList.remove("hidden");
      }
    }
  });
}

export function mountPublicApp({ route = "/", user = null } = {}) {
  const publicRoot = document.querySelector("#publicRoot");
  const appShell = document.querySelector(".app-shell");
  if (!publicRoot || !appShell) return;
  publicRoot.classList.remove("hidden");
  appShell.classList.add("hidden");
  document.body.dataset.appMode = "public";
  publicRoot.innerHTML = route === "/login" || route === "/signup" ? renderAuth(route, user) : renderLanding(user);
  bindPublicEvents(route);
}
