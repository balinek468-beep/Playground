# ForgeBook Production Audit

## 1. Current stack

- Frontend: Vite + plain ES modules
- Runtime UI: large legacy bridge in `src/components/legacy/LegacyFeatureBridge.js`
- Styling: modular CSS index, but major runtime styles still centralized in `src/styles/components/legacy.css`
- Routing: client-side view switching, not URL-driven application routing
- Persistence: localStorage workspace snapshots and local in-memory state
- Build: `vite build`

## 2. Missing for production readiness

- Real authentication
- Real database persistence
- Real file storage for avatars, banners, attachments
- Shared user data for friends, messages, marketplace, notifications
- Environment variable contract
- Deployment documentation
- Backend/service abstractions around local-only state

## 3. Main deployment blockers before this phase

- No backend provider configured
- No auth/session flow
- No deploy-time env files
- No database schema
- No upload/storage layer
- All state persisted only in localStorage

## 4. Fake or local-only systems before this phase

- workspace/vault/doc persistence
- settings persistence
- profile persistence
- messages
- friends / requests
- notifications
- marketplace listings
- uploaded media

## 5. What should be preserved as-is

- existing Vite app shell
- all current pages/views/overlays
- legacy bridge runtime behavior
- existing UX surfaces and workflows
- local cache behavior as offline fallback

## 6. Recommended production stack

- Frontend: Vite
- Backend/Auth/DB/Storage: Supabase
- Database: Postgres via Supabase
- Auth: Supabase Auth
- Storage: Supabase Storage
- Realtime-ready path: Supabase Realtime subscriptions

## 7. Production migration strategy

- Keep local cache for zero-loss behavior
- Hydrate user workspace snapshot from cloud at boot when authenticated
- Sync snapshots back to cloud in background on save
- Add normalized database schema in parallel for gradual migration away from snapshot-only persistence
- Preserve every existing feature while progressively replacing mock/local systems with real services
