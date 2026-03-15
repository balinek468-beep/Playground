export function ProfileSettings() {
  return {
    id: "profile",
    label: "Profile",
    description: "Identity, public profile surface, badges, project highlights, and portfolio visibility.",
    tips: [
      "Profile settings here sync with the public-facing profile and portfolio presentation.",
      "Pinned projects and block order are the fastest way to tune your portfolio for hiring or collaboration.",
    ],
    groups: [
      {
        id: "identity",
        title: "Identity",
        settings: [
          { path: "profile.name", label: "Nickname", type: "text", placeholder: "Balin" },
          { path: "settings.profile.profileUrl", label: "Profile URL", type: "text", placeholder: "forgebook.dev/your-name" },
          { path: "profile.role", label: "Role", type: "text", placeholder: "Game Designer" },
          { path: "settings.profile.headline", label: "Headline", type: "text", placeholder: "Systems-first designer for live game teams." },
          {
            path: "settings.profile.availabilityStatus",
            label: "Availability status",
            type: "select",
            options: [
              { value: "available", label: "Available" },
              { value: "open", label: "Open to offers" },
              { value: "busy", label: "Busy" },
              { value: "offline", label: "Offline" },
            ],
          },
        ],
      },
      {
        id: "presentation",
        title: "Presentation",
        settings: [
          { path: "settings.profile.visibleBadges", label: "Visible badges", type: "toggle" },
          { path: "settings.profile.customProfileAccent", label: "Custom profile accent", type: "color" },
          { path: "settings.profile.pinnedProject", label: "Pinned project", type: "text", placeholder: "Untitled RPG systems overhaul" },
          { path: "settings.profile.portfolioBlockOrder", label: "Portfolio block order", type: "tags", placeholder: "About, Skills, Projects, Tools" },
          { path: "settings.profile.publicFields", label: "Public fields", type: "tags", placeholder: "headline, role, bio, skills" },
        ],
      },
    ],
  };
}
