create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  nickname text not null default 'You',
  role text not null default 'Creative Director',
  headline text not null default 'Design discipline beats chaos.',
  bio text not null default '',
  avatar_url text,
  banner_url text,
  accent_color text not null default '#8b5cf6',
  availability_status text not null default 'Available for collaboration',
  profile_url text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.vaults (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cover_image_url text,
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid not null references public.vaults(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete set null,
  author_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null,
  name text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents drop constraint if exists documents_doc_type_check;
alter table public.documents
  add constraint documents_doc_type_check
  check (doc_type in ('text','sheet','board','canvas','graph','storage'));

create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents(id) on delete cascade,
  preset text not null default 'production',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.board_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.board_columns(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  assignee_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text not null default '',
  due_date date,
  checklist jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.canvas_items (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  item_type text not null,
  data jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sender_id, receiver_id)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, friend_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('direct','group')),
  name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  attachments jsonb not null default '[]'::jsonb,
  reactions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  display_name text not null,
  role text not null,
  bio text not null default '',
  availability_status text not null default 'Open to offers',
  experience_level text not null default 'Mid',
  hourly_rate numeric(10,2),
  tags text[] not null default '{}',
  tools text[] not null default '{}',
  portfolio jsonb not null default '[]'::jsonb,
  featured_skills text[] not null default '{}',
  collaboration_preferences text,
  compensation_preference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.uploaded_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  path text not null,
  public_url text,
  kind text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.storage_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references auth.users(id) on delete cascade,
  parent_id uuid references public.storage_folders(id) on delete cascade,
  name text not null,
  kind text not null default 'folder',
  is_archived boolean not null default false,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storage_categories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storage_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.storage_folders(id) on delete set null,
  category_id uuid references public.storage_categories(id) on delete set null,
  asset_id uuid references public.uploaded_assets(id) on delete set null,
  name text not null,
  mime_type text,
  file_ext text,
  size_bytes bigint,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  is_favorite boolean not null default false,
  is_pinned boolean not null default false,
  is_archived boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.storage_links (
  id uuid primary key default gen_random_uuid(),
  storage_item_id uuid not null references public.storage_items(id) on delete cascade,
  link_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.storage_permissions (
  id uuid primary key default gen_random_uuid(),
  storage_item_id uuid not null references public.storage_items(id) on delete cascade,
  grantee_id uuid not null references auth.users(id) on delete cascade,
  permission text not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (storage_item_id, grantee_id)
);

create table if not exists public.storage_versions (
  id uuid primary key default gen_random_uuid(),
  storage_item_id uuid not null references public.storage_items(id) on delete cascade,
  asset_id uuid references public.uploaded_assets(id) on delete set null,
  version_number integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.storage_activity (
  id uuid primary key default gen_random_uuid(),
  storage_item_id uuid not null references public.storage_items(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.storage_views (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  sort_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_workspaces enable row level security;
alter table public.vaults enable row level security;
alter table public.folders enable row level security;
alter table public.documents enable row level security;
alter table public.sheets enable row level security;
alter table public.boards enable row level security;
alter table public.board_columns enable row level security;
alter table public.board_cards enable row level security;
alter table public.canvas_items enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.marketplace_profiles enable row level security;
alter table public.uploaded_assets enable row level security;
alter table public.storage_folders enable row level security;
alter table public.storage_categories enable row level security;
alter table public.storage_items enable row level security;
alter table public.storage_links enable row level security;
alter table public.storage_permissions enable row level security;
alter table public.storage_versions enable row level security;
alter table public.storage_activity enable row level security;
alter table public.storage_views enable row level security;

create policy "profiles readable by everyone" on public.profiles for select using (true);
create policy "profiles writable by owner" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "settings owner only" on public.user_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "workspace owner only" on public.user_workspaces for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "vault owner only" on public.vaults for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "folders via owned vaults" on public.folders for all using (
  exists (select 1 from public.vaults v where v.id = folders.vault_id and v.owner_id = auth.uid())
) with check (
  exists (select 1 from public.vaults v where v.id = folders.vault_id and v.owner_id = auth.uid())
);

create policy "documents via owned vaults" on public.documents for all using (
  exists (select 1 from public.vaults v where v.id = documents.vault_id and v.owner_id = auth.uid())
) with check (
  exists (select 1 from public.vaults v where v.id = documents.vault_id and v.owner_id = auth.uid())
);

create policy "sheets via document ownership" on public.sheets for all using (
  exists (select 1 from public.documents d join public.vaults v on v.id = d.vault_id where d.id = sheets.document_id and v.owner_id = auth.uid())
) with check (
  exists (select 1 from public.documents d join public.vaults v on v.id = d.vault_id where d.id = sheets.document_id and v.owner_id = auth.uid())
);

create policy "boards via document ownership" on public.boards for all using (
  exists (select 1 from public.documents d join public.vaults v on v.id = d.vault_id where d.id = boards.document_id and v.owner_id = auth.uid())
) with check (
  exists (select 1 from public.documents d join public.vaults v on v.id = d.vault_id where d.id = boards.document_id and v.owner_id = auth.uid())
);

create policy "board columns via board ownership" on public.board_columns for all using (
  exists (
    select 1 from public.boards b
    join public.documents d on d.id = b.document_id
    join public.vaults v on v.id = d.vault_id
    where b.id = board_columns.board_id and v.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.boards b
    join public.documents d on d.id = b.document_id
    join public.vaults v on v.id = d.vault_id
    where b.id = board_columns.board_id and v.owner_id = auth.uid()
  )
);

create policy "board cards via board ownership" on public.board_cards for all using (
  exists (
    select 1 from public.board_columns bc
    join public.boards b on b.id = bc.board_id
    join public.documents d on d.id = b.document_id
    join public.vaults v on v.id = d.vault_id
    where bc.id = board_cards.column_id and v.owner_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.board_columns bc
    join public.boards b on b.id = bc.board_id
    join public.documents d on d.id = b.document_id
    join public.vaults v on v.id = d.vault_id
    where bc.id = board_cards.column_id and v.owner_id = auth.uid()
  )
);

create policy "canvas items via document ownership" on public.canvas_items for all using (
  exists (select 1 from public.documents d join public.vaults v on v.id = d.vault_id where d.id = canvas_items.document_id and v.owner_id = auth.uid())
) with check (
  exists (select 1 from public.documents d join public.vaults v on v.id = d.vault_id where d.id = canvas_items.document_id and v.owner_id = auth.uid())
);

create policy "friend requests participants" on public.friend_requests for all using (auth.uid() in (sender_id, receiver_id)) with check (auth.uid() in (sender_id, receiver_id));
create policy "friendships participants" on public.friendships for all using (auth.uid() in (user_id, friend_id)) with check (auth.uid() in (user_id, friend_id));
create policy "conversations members" on public.conversations for select using (
  exists (select 1 from public.conversation_members cm where cm.conversation_id = conversations.id and cm.user_id = auth.uid())
);
create policy "conversation creators manage" on public.conversations for all using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "conversation members readable" on public.conversation_members for select using (auth.uid() = user_id or exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_members.conversation_id and cm.user_id = auth.uid()));
create policy "conversation creator writes members" on public.conversation_members for all using (
  exists (select 1 from public.conversations c where c.id = conversation_members.conversation_id and c.created_by = auth.uid())
) with check (
  exists (select 1 from public.conversations c where c.id = conversation_members.conversation_id and c.created_by = auth.uid())
);
create policy "messages conversation members" on public.messages for all using (
  exists (select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())
) with check (
  exists (select 1 from public.conversation_members cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid())
);

create policy "notifications owner only" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "marketplace public read" on public.marketplace_profiles for select using (true);
create policy "marketplace owner write" on public.marketplace_profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "assets owner only" on public.uploaded_assets for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "storage folders owner only" on public.storage_folders for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "storage categories owner only" on public.storage_categories for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "storage items owner only" on public.storage_items for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "storage links owner only" on public.storage_links for all using (
  exists (select 1 from public.storage_items si where si.id = storage_links.storage_item_id and si.owner_id = auth.uid())
) with check (
  exists (select 1 from public.storage_items si where si.id = storage_links.storage_item_id and si.owner_id = auth.uid())
);
create policy "storage permissions owner only" on public.storage_permissions for all using (
  exists (select 1 from public.storage_items si where si.id = storage_permissions.storage_item_id and si.owner_id = auth.uid())
) with check (
  exists (select 1 from public.storage_items si where si.id = storage_permissions.storage_item_id and si.owner_id = auth.uid())
);
create policy "storage versions owner only" on public.storage_versions for all using (
  exists (select 1 from public.storage_items si where si.id = storage_versions.storage_item_id and si.owner_id = auth.uid())
) with check (
  exists (select 1 from public.storage_items si where si.id = storage_versions.storage_item_id and si.owner_id = auth.uid())
);
create policy "storage activity owner only" on public.storage_activity for all using (
  exists (select 1 from public.storage_items si where si.id = storage_activity.storage_item_id and si.owner_id = auth.uid())
) with check (
  exists (select 1 from public.storage_items si where si.id = storage_activity.storage_item_id and si.owner_id = auth.uid())
);
create policy "storage views owner only" on public.storage_views for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists idx_vaults_owner_updated on public.vaults(owner_id, updated_at desc);
create index if not exists idx_folders_vault_parent on public.folders(vault_id, parent_id);
create index if not exists idx_documents_vault_folder_updated on public.documents(vault_id, folder_id, updated_at desc);
create index if not exists idx_documents_author_type on public.documents(author_id, doc_type);
create index if not exists idx_board_columns_board_position on public.board_columns(board_id, position);
create index if not exists idx_board_cards_column_position on public.board_cards(column_id, position);
create index if not exists idx_board_cards_assignee_due on public.board_cards(assignee_id, due_date);
create index if not exists idx_canvas_items_document_position on public.canvas_items(document_id, position);
create index if not exists idx_friend_requests_receiver_status on public.friend_requests(receiver_id, status, created_at desc);
create index if not exists idx_friend_requests_sender_status on public.friend_requests(sender_id, status, created_at desc);
create index if not exists idx_friendships_user_friend on public.friendships(user_id, friend_id);
create index if not exists idx_conversation_members_user on public.conversation_members(user_id, conversation_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at desc);
create index if not exists idx_notifications_user_type_created on public.notifications(user_id, type, created_at desc);
create index if not exists idx_notifications_user_unread on public.notifications(user_id, read_at, created_at desc);
create index if not exists idx_marketplace_role_availability on public.marketplace_profiles(role, availability_status, updated_at desc);
create index if not exists idx_marketplace_experience on public.marketplace_profiles(experience_level, updated_at desc);
create index if not exists idx_marketplace_tags_gin on public.marketplace_profiles using gin(tags);
create index if not exists idx_marketplace_tools_gin on public.marketplace_profiles using gin(tools);
create index if not exists idx_uploaded_assets_owner_created on public.uploaded_assets(owner_id, created_at desc);
create index if not exists idx_storage_folders_owner_parent on public.storage_folders(owner_id, parent_id, updated_at desc);
create index if not exists idx_storage_items_owner_folder on public.storage_items(owner_id, folder_id, updated_at desc);
create index if not exists idx_storage_items_category on public.storage_items(category_id, updated_at desc);
create index if not exists idx_storage_items_deleted on public.storage_items(owner_id, deleted_at, updated_at desc);
create index if not exists idx_storage_items_tags_gin on public.storage_items using gin(tags);
create index if not exists idx_storage_links_item on public.storage_links(storage_item_id, link_type);
create index if not exists idx_storage_versions_item_version on public.storage_versions(storage_item_id, version_number desc);
create index if not exists idx_storage_activity_item_created on public.storage_activity(storage_item_id, created_at desc);
create index if not exists idx_storage_views_owner_updated on public.storage_views(owner_id, updated_at desc);
