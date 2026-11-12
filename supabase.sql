-- Supabase SQL Editor에서 실행하세요. 재실행 시 기존 기록은 덮어쓰지 않습니다.
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  edition integer not null check (edition between 1 and 9999),
  date date not null,
  platform text not null check (platform in ('마듀','오메가','오프라인')),
  players integer not null check (players between 2 and 9999),
  format text not null check (format in ('단판 리그','매치 토너먼트','단판 토너먼트','매치 리그','스위스 라운드')),
  winner text not null check (char_length(trim(winner)) between 1 and 50),
  deck text not null check (char_length(trim(deck)) between 1 and 100),
  image text not null default '' check (char_length(image) <= 2048 and (image = '' or image ~ '^https://')),
  link text not null default '' check (char_length(link) <= 2048 and (link = '' or link ~ '^https://')),
  decklist text not null default '' check (char_length(decklist) <= 20000),
  notes text not null default '' check (char_length(notes) <= 2000),
  approved boolean not null default true
);
-- 기존 테이블에도 실행 가능한 썸네일 필드 추가
alter table public.tournaments add column if not exists thumbnail text not null default ''
  check (char_length(thumbnail) <= 2048 and (thumbnail = '' or thumbnail ~ '^https://'));
create unique index if not exists tournaments_approved_edition on public.tournaments(edition) where approved;
alter table public.tournaments enable row level security;
revoke all on public.tournaments from anon, authenticated;
grant select on public.tournaments to anon, authenticated;
-- 기록 본문 열만 INSERT 가능합니다. approved, id, created_at은 DB 기본값을 사용합니다.
grant insert (edition,date,platform,players,format,winner,deck,thumbnail,image,link,decklist,notes) on public.tournaments to anon, authenticated;
drop policy if exists "Read approved records" on public.tournaments;
create policy "Read approved records" on public.tournaments for select to anon, authenticated using (approved = true);
drop policy if exists "Submit pending records" on public.tournaments;
create policy "Submit pending records" on public.tournaments for insert to anon, authenticated with check (approved = true);
-- 공개 API의 UPDATE/DELETE는 허용하지 않습니다. 승인과 정정은 대시보드에서 합니다.
insert into public.tournaments (edition,date,platform,players,format,winner,deck,approved)
values
 (1,'2026-10-19','마듀',6,'단판 리그','성훈','아르토메기아',true),
 (2,'2026-10-28','오메가',6,'단판 리그','석진','시간의흑마술사',true),
 (3,'2026-11-02','마듀',6,'단판 리그','연우','야미',true),
 (4,'2026-11-11','오메가',8,'매치 토너먼트','준민','빛둠 섀도르',true)
on conflict (edition) where approved do nothing;


-- 기존 대회의 썸네일/덱리 등록 요청. 가장 최근 등록이 표시됩니다.
create table if not exists public.tournament_media (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  edition integer not null check (edition between 1 and 9999),
  thumbnail text not null default '' check (char_length(thumbnail) <= 2048 and (thumbnail = '' or thumbnail ~ '^https://')),
  image text not null default '' check (char_length(image) <= 2048 and (image = '' or image ~ '^https://')),
  link text not null default '' check (char_length(link) <= 2048 and (link = '' or link ~ '^https://')),
  decklist text not null default '' check (char_length(decklist) <= 20000),
  approved boolean not null default true
);
alter table public.tournament_media enable row level security;
revoke all on public.tournament_media from anon, authenticated;
grant select on public.tournament_media to anon, authenticated;
grant insert (edition,thumbnail,image,link,decklist) on public.tournament_media to anon, authenticated;
drop policy if exists "Read approved media" on public.tournament_media;
create policy "Read approved media" on public.tournament_media for select to anon, authenticated using (approved = true);
drop policy if exists "Submit pending media" on public.tournament_media;
create policy "Submit pending media" on public.tournament_media for insert to anon, authenticated
with check (approved = true and exists (
  select 1 from public.tournaments t where t.edition = tournament_media.edition and t.approved = true
));
create index if not exists tournament_media_lookup on public.tournament_media(edition,created_at) where approved;

-- 이전 승인 대기 방식에서 즉시 공개 방식으로 전환
alter table public.tournaments alter column approved set default true;
alter table public.tournament_media alter column approved set default true;
alter policy "Submit pending records" on public.tournaments with check (approved=true);
alter policy "Submit pending media" on public.tournament_media with check (approved=true and exists(select 1 from public.tournaments t where t.edition=tournament_media.edition and t.approved=true));
