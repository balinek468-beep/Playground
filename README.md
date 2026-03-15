# ForgeBook

ForgeBook is a professional workspace for game designers, balancers, producers, and developers. It combines writing, balancing sheets, boards, canvas workspaces, social collaboration, profiles, and a developer marketplace.

## Production stack

- Frontend: Vite
- Runtime UI: modular ES modules with legacy bridge preservation
- Backend/Auth/DB/Storage: Supabase
- Database: PostgreSQL via Supabase
- Storage: Supabase Storage

## Current product surfaces

- Vault dashboard and library
- Vault explorer and file system
- Note editor with toolbar, templates, floating images, and writing width controls
- Balancing sheets with formulas and multi-table workspace
- Manager boards with cards, checklists, and details
- Canvas workspace
- Profiles, friends, messages, notifications
- Developer marketplace
- Settings control center

## Local development

1. Install dependencies

   ```powershell
   npm.cmd install
   ```

2. Copy environment file

   ```powershell
   Copy-Item .env.example .env
   ```

3. Fill Supabase values if you want production-backed auth and persistence

4. Start dev server

   ```powershell
   npm.cmd run dev
   ```

5. Build for production

   ```powershell
   npm.cmd run build
   ```

## Environment variables

See [.env.example](C:\Users\balin\Documents\Playground\.env.example).

Main variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_REQUIRE_AUTH`
- `VITE_APP_URL`

If Supabase env vars are missing, ForgeBook falls back to local-only mode so no existing feature disappears during migration.

## Database / backend setup

Run these in Supabase SQL editor:

1. [backend/supabase/schema.sql](C:\Users\balin\Documents\Playground\backend\supabase\schema.sql)
2. [backend/supabase/storage.sql](C:\Users\balin\Documents\Playground\backend\supabase\storage.sql)
3. Optional: [backend/supabase/seed.sql](C:\Users\balin\Documents\Playground\backend\supabase\seed.sql)

## Deployment

Recommended host:

- Vercel

Deployment flow:

1. Push repository
2. Add environment variables from `.env.example`
3. Set build command: `npm.cmd run build`
4. Set output directory: `dist`
5. Add your production domain to Supabase Auth redirect URLs

Full fast-path deploy guide:

- [docs/VERCEL_SUPABASE_DEPLOY.md](C:\Users\balin\Documents\Playground\docs\VERCEL_SUPABASE_DEPLOY.md)

## Architecture notes

- Current UI behavior is preserved through the legacy bridge in [src/components/legacy/LegacyFeatureBridge.js](C:\Users\balin\Documents\Playground\src\components\legacy\LegacyFeatureBridge.js)
- Production services live under [src/services](C:\Users\balin\Documents\Playground\src\services)
- Workspace snapshots are synced to cloud for authenticated users while local cache remains as fallback
- Normalized database tables are defined now, even where the UI is still using snapshot-based persistence to avoid feature loss

## Important docs

- Audit: [docs/PRODUCTION_AUDIT.md](C:\Users\balin\Documents\Playground\docs\PRODUCTION_AUDIT.md)
- Deployment checklist: [docs/DEPLOYMENT_CHECKLIST.md](C:\Users\balin\Documents\Playground\docs\DEPLOYMENT_CHECKLIST.md)
- Feature inventory: [docs/FEATURE_INVENTORY.md](C:\Users\balin\Documents\Playground\docs\FEATURE_INVENTORY.md)
- Migration plan: [docs/MIGRATION_PLAN.md](C:\Users\balin\Documents\Playground\docs\MIGRATION_PLAN.md)
