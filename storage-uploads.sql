begin;
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('duel-images','duel-images',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
create policy "Upload Arc-V photos" on storage.objects for insert to anon,authenticated
with check (bucket_id='duel-images' and name ~ '^submissions/[0-9a-f-]{36}\.(jpg|png|webp|gif)$');
commit;
