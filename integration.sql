begin;
alter table public.tournaments add column if not exists source_id text
 check (source_id is null or source_id ~ '^[a-z0-9]{1,80}$');
alter table public.tournaments add column if not exists source_url text
 check (source_url is null or (char_length(source_url)<=2048 and source_url ~ '^https://'));
alter table public.tournaments add column if not exists source_snapshot jsonb
 check (source_snapshot is null or (jsonb_typeof(source_snapshot)='object' and octet_length(source_snapshot::text)<=65536));
create unique index if not exists tournaments_source_id on public.tournaments(source_id) where source_id is not null;
grant insert(source_id,source_url,source_snapshot) on public.tournaments to anon,authenticated;
commit;
