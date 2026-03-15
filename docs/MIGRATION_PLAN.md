## ForgeBook Refactor Migration Plan

### Phase 1

- Freeze current behavior behind a legacy runtime bridge.
- Keep all current runtime logic functional.
- Add modular entry points and file structure.
- Split stylesheet entry into modular imports with a legacy fallback.

### Phase 2

- Extract stable shared foundations:
  - state factories
  - router helpers
  - DOM helpers
  - constants
  - data seeds
- Keep legacy runtime importing these pieces instead of redefining them.

### Phase 3

- Extract page-level renderers:
  - library
  - workspace
  - market
  - overlays
- Keep routing and feature registration centralized.

### Phase 4

- Extract feature modules:
  - vaults
  - editor
  - sheets
  - boards
  - canvas
  - profile
  - friends
  - messages
  - notifications

### Phase 5

- Remove duplicate style rules from legacy stylesheet only after the modular replacements are verified.
- Keep a legacy style layer until every surface is covered.

### Safety Rules

- Never delete a feature during migration.
- If a feature cannot be fully extracted yet, keep it in the legacy bridge.
- Validate boot after every major move.
