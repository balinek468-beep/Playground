insert into public.marketplace_profiles (
  id,
  user_id,
  nickname,
  display_name,
  role,
  bio,
  availability_status,
  experience_level,
  hourly_rate,
  tags,
  tools,
  featured_skills
) values
(
  gen_random_uuid(),
  gen_random_uuid(),
  'Kami',
  'Kami',
  'Game Designer',
  'Systems-first designer building progression, monetization, and player-facing loops.',
  'Open to offers',
  'Senior',
  45,
  array['Game Designer','Systems','Roblox'],
  array['ForgeBook','Figma','Google Sheets'],
  array['Economy Tuning','Progression','Documentation']
),
(
  gen_random_uuid(),
  gen_random_uuid(),
  'Ranger',
  'Ranger',
  'Producer',
  'Production manager focused on roadmaps, sprint planning, and live game execution.',
  'Available for hire',
  'Lead',
  55,
  array['Producer','Live Ops','Planning'],
  array['ForgeBook','Linear','Jira'],
  array['Production Boards','Milestones','Stakeholder Sync']
)
on conflict do nothing;
