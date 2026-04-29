insert into storage.buckets (id, name, public)
values ('forgebook-assets', 'forgebook-assets', true)
on conflict (id) do nothing;

create policy "public read forgebook assets"
on storage.objects
for select
using (bucket_id = 'forgebook-assets');

create policy "authenticated upload forgebook assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'forgebook-assets'
  and (storage.foldername(name))[1] in ('profiles', 'market', 'attachments', 'storage')
);

create policy "owner update forgebook assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'forgebook-assets' and owner = auth.uid())
with check (bucket_id = 'forgebook-assets' and owner = auth.uid());

create policy "owner delete forgebook assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'forgebook-assets' and owner = auth.uid());
