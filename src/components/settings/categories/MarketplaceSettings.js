export function MarketplaceSettings() {
  return {
    id: "marketplace",
    label: "Marketplace",
    description: "Availability, visible roles, featured skills, and collaboration preferences for developer discovery.",
    tips: [
      "Marketplace settings shape how your developer card appears and how studios discover you.",
      "Featured skills and role tags are the strongest signals in the feed; keep them current.",
    ],
    groups: [
      {
        id: "market-profile",
        title: "Profile Visibility",
        settings: [
          {
            path: "settings.marketplace.availabilityStatus",
            label: "Availability status",
            type: "select",
            options: [
              { value: "available-for-hire", label: "Available for hire" },
              { value: "open-to-offers", label: "Open to offers" },
              { value: "not-available", label: "Not available" },
            ],
          },
          { path: "settings.marketplace.rateVisibility", label: "Rate visibility", type: "select", options: [{ value: "public", label: "Public" }, { value: "contacts", label: "Contacts only" }, { value: "hidden", label: "Hidden" }] },
          { path: "settings.marketplace.showProfilePreview", label: "Show market profile preview", type: "toggle" },
        ],
      },
      {
        id: "market-preferences",
        title: "Collaboration Preferences",
        settings: [
          { path: "settings.marketplace.collaborationPreferences", label: "Collaboration preferences", type: "text", placeholder: "Remote, async, design-heavy..." },
          { path: "settings.marketplace.compensationPreference", label: "Compensation preference", type: "select", options: [{ value: "paid", label: "Paid" }, { value: "revshare", label: "Revshare" }, { value: "unpaid", label: "Unpaid" }, { value: "mixed", label: "Mixed" }] },
          { path: "settings.marketplace.visibleRoleTags", label: "Visible role tags", type: "tags", placeholder: "Game Designer, Producer" },
          { path: "settings.marketplace.featuredSkills", label: "Featured skills", type: "tags", placeholder: "Systems Design, Economy" },
          { path: "settings.marketplace.projectTypePreferences", label: "Project type preferences", type: "tags", placeholder: "Roblox, mobile, indie" },
        ],
      },
    ],
  };
}
