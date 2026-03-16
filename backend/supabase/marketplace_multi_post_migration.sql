alter table public.marketplace_profiles drop constraint if exists marketplace_profiles_pkey;

alter table public.marketplace_profiles
  alter column id drop default;

alter table public.marketplace_profiles
  drop constraint if exists marketplace_profiles_id_fkey;

alter table public.marketplace_profiles
  alter column id type uuid using gen_random_uuid();

alter table public.marketplace_profiles
  alter column id set default gen_random_uuid();

update public.marketplace_profiles
set id = gen_random_uuid()
where id = user_id;

alter table public.marketplace_profiles
  add primary key (id);

drop index if exists idx_marketplace_owner_unique;

create index if not exists idx_marketplace_user_updated
  on public.marketplace_profiles(user_id, updated_at desc);
