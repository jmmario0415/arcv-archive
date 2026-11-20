begin;
create table if not exists public.club_members (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(trim(name)) between 1 and 12),
 name_key text generated always as (lower(regexp_replace(name,'[[:space:]]','','g'))) stored unique,
 thumbnail text not null default '' check (char_length(thumbnail)<=2048 and (thumbnail='' or thumbnail ~ '^https://')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.club_members enable row level security;
revoke all on public.club_members from anon,authenticated;
grant select on public.club_members to anon,authenticated;
grant insert(name,thumbnail) on public.club_members to anon,authenticated;
grant update(thumbnail) on public.club_members to anon,authenticated;
create policy "Read Arc-V members" on public.club_members for select to anon,authenticated using(true);
create policy "Add Arc-V members" on public.club_members for insert to anon,authenticated with check(true);
create policy "Update Arc-V member photo" on public.club_members for update to anon,authenticated using(true) with check(true);
insert into public.club_members(name,thumbnail) values
('영진','https://jmmario0415.github.io/arcv-archive/duel/img/yeongjin.jpg'),
('성훈','https://jmmario0415.github.io/arcv-archive/duel/img/seonghun.jpg'),
('준민','https://jmmario0415.github.io/arcv-archive/duel/img/junmin.jpg'),
('현서','https://jmmario0415.github.io/arcv-archive/duel/img/hyunseo.jpg'),
('규현','https://jmmario0415.github.io/arcv-archive/duel/img/gyuhyun.jpg'),
('인우','https://jmmario0415.github.io/arcv-archive/duel/img/inwoo.jpg'),
('석진','https://jmmario0415.github.io/arcv-archive/duel/img/seokjin.jpg'),
('연우','https://jmmario0415.github.io/arcv-archive/duel/img/yeonwoo.jpg')
on conflict(name_key) do nothing;
create or replace function public.update_member_photo(p_id uuid,p_thumbnail text,p_expected text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare member public.club_members%rowtype;
begin
 select * into member from public.club_members where id=p_id for update;
 if not found then raise exception 'Member not found'; end if;
 if member.thumbnail is distinct from p_expected then raise exception 'Member changed. Reload before editing.'; end if;
 update public.club_members set thumbnail=p_thumbnail where id=p_id returning * into member;
 return to_jsonb(member);
end $$;
revoke all on function public.update_member_photo(uuid,text,text) from public;
grant execute on function public.update_member_photo(uuid,text,text) to anon,authenticated;
commit;
