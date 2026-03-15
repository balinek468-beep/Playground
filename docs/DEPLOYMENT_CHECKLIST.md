# ForgeBook Deployment Checklist

## Supabase

- Create a Supabase project
- Enable email/password auth
- Run `backend/supabase/schema.sql`
- Run `backend/supabase/storage.sql`
- Optionally run `backend/supabase/seed.sql`
- Create public site URL and add it to Supabase auth redirect settings
- Important: rerun the latest `backend/supabase/schema.sql` before launch because it now includes:
  - `storage` document type support
  - storage system tables
  - production indexes for market, messages, notifications, vaults, boards, and storage

## Environment

- Copy `.env.example` to `.env`
- Fill in:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_APP_URL`
  - `VITE_REQUIRE_AUTH`
  - `VITE_WORKSPACE_SYNC_INTERVAL_MS`
  - `VITE_WORKSPACE_SNAPSHOT_MAX_KB`

## Local verification

- `npm.cmd install`
- `npm.cmd run build`
- `npm.cmd run dev`

## Deploy

- Preferred host: Vercel
- Import the repo into Vercel
- Add the same environment variables in the hosting dashboard
- Set build command to `npm.cmd run build`
- Set output directory to `dist`
- Set your production domain in Supabase auth redirect URLs
- Follow the full guide in [docs/VERCEL_SUPABASE_DEPLOY.md](C:\Users\balin\Documents\Playground\docs\VERCEL_SUPABASE_DEPLOY.md)

## Post-deploy checks

- Sign up
- Sign in
- Create/update workspace content
- Refresh and verify cloud-restored workspace state
- Open canvas, board, market, messages, and storage with multiple items and verify no major lag spikes
- Open Settings and export/import a profile
- Upload avatar/banner if storage is configured
- Open Market and verify listings load

## Public launch hardening

- Enable Supabase point-in-time backups if your plan supports it
- Confirm auth email templates and allowed redirect URLs
- Confirm storage bucket rules match your intended privacy model
- Watch Supabase dashboard for:
  - database CPU
  - row reads/writes
  - auth rate
  - storage bandwidth
- If workspace snapshots grow too large, reduce image-heavy local state or move more payloads into asset storage instead of snapshot JSON
