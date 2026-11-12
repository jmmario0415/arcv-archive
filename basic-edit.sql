-- 공개 기본 정보 수정. 지정된 열만 바꾸며 회차 변경 시 덱리 연결도 이동합니다.
create or replace function public.edit_tournament(p_id uuid,p_expected jsonb,p_values jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare old_row public.tournaments%rowtype; saved public.tournaments%rowtype; snapshot jsonb;
begin
 select * into old_row from public.tournaments where id=p_id and approved=true for update;
 if not found then raise exception 'Tournament not found'; end if;
 snapshot=jsonb_build_object('edition',old_row.edition,'date',old_row.date,'platform',old_row.platform,'players',old_row.players,'format',old_row.format,'winner',old_row.winner,'deck',old_row.deck,'notes',old_row.notes);
 if snapshot is distinct from p_expected then raise exception 'Record changed. Reload before editing.'; end if;
 update public.tournaments set edition=(p_values->>'edition')::integer,date=(p_values->>'date')::date,platform=p_values->>'platform',players=(p_values->>'players')::integer,format=p_values->>'format',winner=trim(p_values->>'winner'),deck=trim(p_values->>'deck'),notes=coalesce(p_values->>'notes','')
 where id=p_id returning * into saved;
 if old_row.edition<>saved.edition then update public.tournament_media set edition=saved.edition where edition=old_row.edition; end if;
 return jsonb_build_object('id',saved.id,'edition',saved.edition,'date',saved.date,'platform',saved.platform,'players',saved.players,'format',saved.format,'winner',saved.winner,'deck',saved.deck,'notes',saved.notes);
end $$;
revoke all on function public.edit_tournament(uuid,jsonb,jsonb) from public;
grant execute on function public.edit_tournament(uuid,jsonb,jsonb) to anon,authenticated;
