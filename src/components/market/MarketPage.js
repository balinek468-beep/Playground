export function ensureMarketPage() {
  const libraryHeaderActions = document.querySelector("#libraryView .header-actions");
  if (libraryHeaderActions && !document.querySelector("#libraryMarketButton")) {
    const button = document.createElement("button");
    button.id = "libraryMarketButton";
    button.className = "secondary-button compact-action-button";
    button.type = "button";
    button.innerHTML = `<span class="button-icon">&#9671;</span><span>Market</span>`;
    const notificationsButton = document.querySelector("#libraryNotificationsButton");
    if (notificationsButton?.parentElement) notificationsButton.parentElement.insertBefore(button, notificationsButton);
    else libraryHeaderActions.appendChild(button);
  }

  const workspaceActions = document.querySelector("#workspaceView .workspace-head-right .topbar-actions");
  if (workspaceActions && !document.querySelector("#marketButton")) {
    const button = document.createElement("button");
    button.id = "marketButton";
    button.className = "secondary-button icon-button";
    button.type = "button";
    button.title = "Developer market";
    button.innerHTML = "&#9671;";
    const notificationsButton = document.querySelector("#notificationsButton");
    if (notificationsButton?.parentElement) notificationsButton.parentElement.insertBefore(button, notificationsButton);
    else workspaceActions.appendChild(button);
  }

  if (document.querySelector("#marketView")) return;

  const market = document.createElement("section");
  market.id = "marketView";
  market.className = "market-view hidden";
  market.innerHTML = `
    <header class="library-header premium-surface">
      <div class="library-brand">
        <p class="eyebrow">Developer Market</p>
        <div class="market-hero-copy">
          <h1>Find talent built for game teams</h1>
          <p>Search specialized developers, balancers, and producers without touching your vault workflow.</p>
        </div>
      </div>
      <div class="header-actions">
        <div class="library-search-wrap">
          <label class="library-search">
            <span>Search</span>
            <input id="marketSearchInput" type="search" placeholder="Search nickname, role, tags" />
          </label>
        </div>
        <div class="library-action-cluster library-action-cluster-muted">
          <button id="marketBackButton" class="secondary-button compact-action-button" type="button">Back</button>
          <button id="marketVaultsButton" class="secondary-button compact-action-button" type="button">Vaults</button>
          <button id="marketCreatePostButton" class="primary-button compact-action-button" type="button">Create Post</button>
          <button id="marketProfileButton" class="secondary-button compact-action-button" type="button">Profile</button>
          <button id="marketMessagesButton" class="secondary-button compact-action-button" type="button">Messages</button>
        </div>
      </div>
    </header>
    <section class="market-grid">
      <aside class="market-sidebar premium-surface">
        <div class="sidebar-block">
          <p class="eyebrow">Filters</p>
          <label class="profile-field">
            <span>Role</span>
            <select id="marketRoleFilter" class="modal-input">
              <option value="">All roles</option>
              <option value="Game Designer">Game Designer</option>
              <option value="Producer">Producer</option>
              <option value="Programmer">Programmer</option>
              <option value="UI Designer">UI Designer</option>
              <option value="Animator">Animator</option>
              <option value="Narrative Designer">Narrative Designer</option>
              <option value="Level Designer">Level Designer</option>
            </select>
          </label>
          <label class="profile-field">
            <span>Availability</span>
            <select id="marketAvailabilityFilter" class="modal-input">
              <option value="">Any status</option>
              <option value="Available for hire">Available for hire</option>
              <option value="Open to offers">Open to offers</option>
              <option value="Not available">Not available</option>
            </select>
          </label>
          <label class="profile-field">
            <span>Experience</span>
            <select id="marketExperienceFilter" class="modal-input">
              <option value="">Any level</option>
              <option value="Junior">Junior</option>
              <option value="Mid">Mid</option>
              <option value="Senior">Senior</option>
              <option value="Lead">Lead</option>
            </select>
          </label>
        </div>
      </aside>
      <main class="market-main">
        <section class="library-summary premium-surface">
          <div class="summary-card premium-surface"><span class="summary-label">Developers</span><strong id="marketCount"></strong></div>
          <div class="summary-card premium-surface"><span class="summary-label">Available</span><strong id="marketAvailableCount"></strong></div>
          <div class="summary-card premium-surface"><span class="summary-label">Open To Offers</span><strong id="marketOpenCount"></strong></div>
        </section>
        <section class="section-heading">
          <div>
            <p class="eyebrow">Marketplace</p>
            <h2>Developer discovery</h2>
          </div>
        </section>
        <section id="marketCards" class="market-cards"></section>
      </main>
    </section>
  `;

  const libraryView = document.querySelector("#libraryView");
  libraryView?.insertAdjacentElement("afterend", market);
}
