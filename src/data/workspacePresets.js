export const DOCUMENT_TEMPLATE_LIBRARY = [
  { id: "gdd", name: "GDD", role: "Design", summary: "Full game design doc with pillars, loops, systems, and scope." },
  { id: "one-pager", name: "One-Pager", role: "Pitch", summary: "Short high-concept overview for alignment." },
  { id: "feature-spec", name: "Feature Spec", role: "Design", summary: "Feature goals, UX, risks, and implementation notes." },
  { id: "system-design", name: "System Design", role: "Design", summary: "Rules, dependencies, edge cases, and tuning hooks." },
  { id: "economy-design", name: "Economy Design", role: "Balance", summary: "Sources, sinks, progression pacing, and pressure points." },
  { id: "progression-design", name: "Progression Design", role: "Balance", summary: "Leveling, unlocks, and reward structure." },
  { id: "balancing-brief", name: "Balancing Brief", role: "Balance", summary: "Current tuning goals, deltas, and review targets." },
  { id: "quest-design", name: "Quest Design", role: "Narrative", summary: "Objectives, dependencies, beats, rewards, and fail states." },
  { id: "narrative-structure", name: "Narrative Structure", role: "Narrative", summary: "Story arc, character intent, and key beats." },
  { id: "level-design", name: "Level Design", role: "Level", summary: "Flow, combat spaces, rewards, and pacing." },
  { id: "live-ops-planning", name: "Live Ops Planning", role: "Live Ops", summary: "Event beats, cadence, rewards, and monitoring." },
  { id: "sprint-plan", name: "Sprint Plan", role: "Manager", summary: "Goals, owners, blockers, and checkpoints." },
  { id: "meeting-notes", name: "Meeting Notes", role: "Manager", summary: "Agenda, decisions, action items, and owners." },
  { id: "retrospective", name: "Retrospective", role: "Manager", summary: "Wins, pain points, and follow-up improvements." },
  { id: "roadmap", name: "Roadmap", role: "Manager", summary: "Milestones, dependencies, owners, and release windows." },
  { id: "patch-notes", name: "Patch Notes", role: "Release", summary: "Highlights, player-facing changes, and known issues." },
  { id: "pitch-deck", name: "Pitch Deck", role: "Pitch", summary: "Audience-ready structure for the project vision." },
  { id: "onboarding-doc", name: "Onboarding Doc", role: "Team", summary: "Starter context, links, glossary, and expectations." },
  { id: "qa-test-plan", name: "QA Test Plan", role: "QA", summary: "Scope, cases, risks, and verification steps." },
  { id: "bug-triage", name: "Bug Triage Notes", role: "QA", summary: "Severity, ownership, repro, and release impact." },
  { id: "task-breakdown", name: "Task Breakdown", role: "Manager", summary: "Deliverables, dependencies, owners, and dates." },
  { id: "team-brief", name: "Team Brief", role: "Team", summary: "Context, priorities, owner map, and delivery notes." },
];

export const WRITING_SECTION_PRESETS = [
  { id: "callout", name: "Callout", html: `<div class="callout-block"><strong>Callout</strong><p>Add key production or design note here.</p></div>` },
  { id: "decision-log", name: "Decision Log", html: `<h2>Decision Log</h2><table><tr><th>Date</th><th>Decision</th><th>Owner</th></tr><tr><td></td><td></td><td></td></tr></table>` },
  { id: "risks", name: "Risks & Assumptions", html: `<h2>Risks & Assumptions</h2><ul><li><strong>Risk:</strong> </li><li><strong>Assumption:</strong> </li></ul>` },
  { id: "timeline", name: "Timeline", html: `<h2>Timeline</h2><ol><li>Phase 1</li><li>Phase 2</li><li>Phase 3</li></ol>` },
  { id: "tasks", name: "Task List", html: `<h2>Task List</h2><ul><li><input type="checkbox" /> Task</li></ul>` },
  { id: "references", name: "References", html: `<h2>References & Resources</h2><ul><li>Link</li><li>Spec</li></ul>` },
  { id: "version-history", name: "Version History", html: `<h2>Version History</h2><table><tr><th>Version</th><th>Date</th><th>Changes</th></tr><tr><td>v1</td><td></td><td></td></tr></table>` },
  { id: "approval", name: "Approval Status", html: `<h2>Approval Status</h2><p><strong>Status:</strong> In review</p><p><strong>Approvers:</strong> </p>` },
];

export const BOARD_SIZE_PRESETS = [
  { id: 1, label: "1", name: "Compact" },
  { id: 2, label: "2", name: "Standard" },
  { id: 3, label: "3", name: "Expanded" },
];

export const BOARD_PRESET_LIBRARY = [
  { id: "production", name: "Production Board", columns: ["Backlog", "In Progress", "Review", "Done"] },
  { id: "sprint", name: "Sprint Board", columns: ["Sprint Backlog", "Doing", "QA", "Done"] },
  { id: "review", name: "Review Board", columns: ["Needs Review", "Client Feedback", "Approved"] },
  { id: "task", name: "Task Board", columns: ["To Do", "Doing", "Done"] },
  { id: "bug", name: "Bug Board", columns: ["Reported", "Triaged", "Fixing", "Verified"] },
  { id: "milestone", name: "Milestone Board", columns: ["Upcoming", "Current", "At Risk", "Complete"] },
  { id: "feature-pipeline", name: "Feature Pipeline", columns: ["Discovery", "Prototype", "Production", "Ship"] },
  { id: "content-production", name: "Content Production", columns: ["Brief", "Creation", "Review", "Ready"] },
  { id: "qa", name: "QA Board", columns: ["Planned", "Testing", "Blocked", "Passed"] },
  { id: "hiring", name: "Hiring Board", columns: ["Sourced", "Interview", "Trial", "Offer"] },
  { id: "launch-readiness", name: "Launch Readiness", columns: ["Pending", "Critical", "Verified", "Done"] },
  { id: "balancing-review", name: "Balancing Review", columns: ["Investigate", "Tune", "Playtest", "Approved"] },
  { id: "live-ops", name: "Live Ops Board", columns: ["Plan", "Build", "Schedule", "Live"] },
  { id: "approval", name: "Approval Pipeline", columns: ["Submitted", "Reviewing", "Changes Requested", "Approved"] },
  { id: "roadmap", name: "Roadmap Board", columns: ["Now", "Next", "Later"] },
  { id: "team-management", name: "Team Management", columns: ["Assigned", "Active", "Blocked", "Complete"] },
];

export const CANVAS_NODE_TEMPLATES = [
  { id: "text", name: "Text Note", type: "text", color: "#8b5cf6" },
  { id: "sticky", name: "Sticky Note", type: "sticky", color: "#f59e0b" },
  { id: "checklist", name: "Checklist", type: "checklist", color: "#22c55e" },
  { id: "feature", name: "Feature Card", type: "feature", color: "#38bdf8" },
  { id: "mechanic", name: "Mechanic Card", type: "mechanic", color: "#ec4899" },
  { id: "milestone", name: "Milestone", type: "milestone", color: "#14b8a6" },
  { id: "section", name: "Section Header", type: "section", color: "#a78bfa" },
  { id: "risk", name: "Risk Marker", type: "risk", color: "#ef4444" },
];

export const CANVAS_TEMPLATE_LIBRARY = [
  { id: "production-flow", name: "Production Flow", summary: "Map handoffs, reviews, and blockers." },
  { id: "economy-loop", name: "Economy Loop", summary: "Sources, sinks, and progression pressure." },
  { id: "org-chart", name: "Org Chart", summary: "Roles, ownership, and escalation paths." },
  { id: "roadmap-map", name: "Roadmap Map", summary: "Milestones, dependencies, and release phases." },
  { id: "milestone-map", name: "Milestone Map", summary: "Visualize delivery beats and risk clusters." },
  { id: "feature-dependencies", name: "Feature Dependencies", summary: "Trace blockers between systems." },
  { id: "risk-map", name: "Risk Mapping", summary: "Identify impact and mitigation owners." },
  { id: "scope-breakdown", name: "Scope Breakdown", summary: "Break a feature into production slices." },
];

export const FILE_SMART_VIEWS = [
  { id: "recent", name: "Recent" },
  { id: "favorites", name: "Favorites" },
  { id: "shared", name: "Shared" },
  { id: "archived", name: "Archived" },
  { id: "images", name: "Images" },
  { id: "documents", name: "Documents" },
];

export const STORAGE_STRUCTURE_PRESETS = [
  { id: "game-project", name: "Game Project Storage", folders: ["Design Docs", "Source Files", "Builds", "Exports", "References"] },
  { id: "art-assets", name: "Art / Visual Assets", folders: ["Concept", "UI", "Marketing", "Renders", "Archive"] },
  { id: "audio", name: "Audio", folders: ["Music", "SFX", "VO", "Mixes", "Exports"] },
  { id: "design-docs", name: "Design Docs", folders: ["Core Systems", "Economy", "Levels", "Narrative", "Reviews"] },
  { id: "builds", name: "Builds / Exports", folders: ["Internal", "QA", "Release Candidates", "Live", "Patch History"] },
  { id: "source-files", name: "Source Files", folders: ["Code", "Configs", "Tools", "Pipelines", "Archive"] },
  { id: "marketing", name: "Marketing Files", folders: ["Trailers", "Screenshots", "Store Art", "Copy", "Campaigns"] },
  { id: "qa-evidence", name: "QA Evidence", folders: ["Videos", "Screenshots", "Logs", "Reports", "Retests"] },
  { id: "references", name: "References", folders: ["Competitor Research", "Moodboards", "Docs", "Benchmarks", "Links"] },
  { id: "archive", name: "Archive / Old Versions", folders: ["Deprecated", "Milestone Cuts", "Backups", "Vendor Drops", "Legacy"] },
];
