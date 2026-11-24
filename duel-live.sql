-- Durable shared brackets. Public access matches the existing club maker.
begin;
create table if not exists public.duel_live (
  id text primary key check (id ~ '^[a-z0-9]{1,64}$'),
  meta jsonb not null,
  results jsonb not null default '{}',
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.duel_live enable row level security;
drop policy if exists duel_live_read on public.duel_live;
create policy duel_live_read on public.duel_live for select to anon, authenticated using (true);
revoke all on public.duel_live from anon, authenticated;
grant select on public.duel_live to anon, authenticated;

create or replace function public.duel_live_write(p_id text, p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare r public.duel_live; k text; v jsonb;
begin
  if p_id !~ '^[a-z0-9]{1,64}$' or octet_length(p_payload::text) > 100000 then
    raise exception 'Invalid tournament';
  end if;
  if p_action in ('create','recover') then
    if jsonb_typeof(p_payload->'meta') is distinct from 'object'
       or coalesce(length(p_payload->'meta'->>'name'),0) not between 1 and 120
       or coalesce(p_payload->'meta'->>'mode','') not in ('league','ko','custom')
       or jsonb_typeof(p_payload->'meta'->'players') is distinct from 'array'
       or jsonb_array_length(p_payload->'meta'->'players') not between 2 and 64
       or jsonb_typeof(coalesce(p_payload->'results','{}')) <> 'object' then
      raise exception 'Invalid tournament metadata';
    end if;
    insert into public.duel_live(id,meta,results)
      values(p_id,p_payload->'meta',coalesce(p_payload->'results','{}'))
      on conflict(id) do nothing;
    select * into r from public.duel_live where id=p_id;
    if p_action='create' and r.deleted then raise exception 'Tournament deleted'; end if;
  else
    select * into r from public.duel_live where id=p_id for update;
    if not found or r.deleted then raise exception 'Tournament not found'; end if;
    if p_action='results' then
      if jsonb_typeof(p_payload) <> 'object' then raise exception 'Invalid results'; end if;
      for k,v in select * from jsonb_each(p_payload) loop
        if k !~ '^([0-9]+-[0-9]+|[bc][0-9]+-[0-9]+)$' then raise exception 'Invalid match key'; end if;
        if v='null'::jsonb then r.results=r.results-k;
        else r.results=jsonb_set(r.results,array[k],v); end if;
      end loop;
      update public.duel_live set results=r.results,updated_at=clock_timestamp() where id=p_id returning * into r;
    elsif p_action='delete' then
      -- Tombstone: old local copies cannot resurrect deleted tournaments.
      update public.duel_live set deleted=true,updated_at=clock_timestamp() where id=p_id returning * into r;
    else raise exception 'Invalid action'; end if;
  end if;
  return to_jsonb(r);
end;
$$;
revoke all on function public.duel_live_write(text,text,jsonb) from public;
grant execute on function public.duel_live_write(text,text,jsonb) to anon, authenticated;
commit;

