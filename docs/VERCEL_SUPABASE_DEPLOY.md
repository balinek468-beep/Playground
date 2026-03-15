# ForgeBook Vercel + Supabase Deployment

This is the fastest path to get ForgeBook on a public URL today.

## 1. Create Supabase project

1. Go to Supabase and create a new project.
2. Open the SQL editor.
3. Run these files in this order:
   1. [backend/supabase/schema.sql](C:\Users\balin\Documents\Playground\backend\supabase\schema.sql)
   2. [backend/supabase/storage.sql](C:\Users\balin\Documents\Playground\backend\supabase\storage.sql)
   3. Optional: [backend/supabase/seed.sql](C:\Users\balin\Documents\Playground\backend\supabase\seed.sql)

## 2. Get Supabase values

From Supabase project settings, copy:

- Project URL
- anon public key

## 3. Create Vercel project

1. Push ForgeBook to GitHub.
2. Import the repo into Vercel.
3. Vercel should detect Vite automatically.

Recommended Vercel values:

- Build Command: `npm.cmd run build`
- Output Directory: `dist`
- Install Command: `npm.cmd install`

## 4. Add Vercel environment variables

Add these in Vercel project settings:

- `VITE_APP_URL`
  - set this to your final Vercel URL, for example `https://forgebook.vercel.app`
- `VITE_REQUIRE_AUTH`
  - `true` for real public product mode
- `VITE_SUPABASE_URL`
  - your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`
  - your Supabase anon key
- `VITE_SUPABASE_WORKSPACE_TABLE`
  - `user_workspaces`
- `VITE_SUPABASE_PROFILE_TABLE`
  - `profiles`
- `VITE_SUPABASE_MARKET_TABLE`
  - `marketplace_profiles`
- `VITE_SUPABASE_NOTIFICATION_TABLE`
  - `notifications`
- `VITE_SUPABASE_ASSET_BUCKET`
  - `forgebook-assets`

## 5. Configure Supabase auth

In Supabase Auth settings:

- add your Vercel production URL to Site URL
- add your Vercel production URL to Redirect URLs
- if you use Vercel preview deployments, add the preview domain pattern too

## 6. Deploy

Trigger the first deploy in Vercel.

## 7. Smoke test after deploy

1. Open the public URL.
2. Sign up.
3. Sign in.
4. Create or open a vault.
5. Change settings and confirm they still work.
6. Refresh to confirm workspace snapshot restores.
7. Open Market and confirm profiles load.
8. Upload profile banner/avatar if storage is configured.

## 8. If auth blocks local demo usage

Set:

- `VITE_REQUIRE_AUTH=false`

This keeps ForgeBook usable without sign-in while you finish setup, but for public release you should turn it back to `true`.
