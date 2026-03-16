update public.profiles
set profile_url = upper(profile_url)
where profile_url is not null;

update public.profiles p
set profile_url = concat(
  'FG-',
  lpad((1000 + floor(random() * 9000))::text, 4, '0'),
  '-',
  lpad((100000 + floor(random() * 900000))::text, 6, '0')
)
where coalesce(trim(profile_url), '') = '';

create unique index if not exists idx_profiles_profile_url_unique
  on public.profiles(profile_url)
  where profile_url is not null;
