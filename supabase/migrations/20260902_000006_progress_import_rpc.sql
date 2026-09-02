-- Atomically replace one authenticated user's complete OUTLAW100 save.
-- SECURITY INVOKER keeps RLS authoritative and the whole RPC is one Postgres transaction.
create or replace function public.replace_user_progress(p_snapshot jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_key text;
  v_value jsonb;
  v_status text;
  v_quantity numeric;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_snapshot) <> 'object' or p_snapshot->>'version' <> '1' then
    raise exception 'unsupported progress snapshot version' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_snapshot->'criteria', '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_snapshot->'tasks', '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_snapshot->'inventory', '{}'::jsonb)) <> 'object' then
    raise exception 'progress snapshot sections must be objects' using errcode = '22023';
  end if;

  -- Deleting first is safe because any later validation/FK failure aborts the transaction.
  delete from public.progress where user_id = v_user_id;
  delete from public.inventory where user_id = v_user_id;

  for v_key, v_status in
    select key, value from jsonb_each_text(coalesce(p_snapshot->'criteria', '{}'::jsonb))
  loop
    if v_status not in ('not_started','available','in_progress','prepared','completable','completed','blocked') then
      raise exception 'invalid progress status: %', v_status using errcode = '22023';
    end if;
    insert into public.progress(user_id, criterion_id, milestone_task_id, status)
    values (v_user_id, v_key, null, v_status);
  end loop;

  for v_key, v_status in
    select key, value from jsonb_each_text(coalesce(p_snapshot->'tasks', '{}'::jsonb))
  loop
    if v_status not in ('not_started','available','in_progress','prepared','completable','completed','blocked') then
      raise exception 'invalid progress status: %', v_status using errcode = '22023';
    end if;
    insert into public.progress(user_id, criterion_id, milestone_task_id, status)
    values (v_user_id, null, v_key, v_status);
  end loop;

  for v_key, v_value in
    select key, value from jsonb_each(coalesce(p_snapshot->'inventory', '{}'::jsonb))
  loop
    if jsonb_typeof(v_value) <> 'number' then
      raise exception 'inventory quantity must be numeric for %', v_key using errcode = '22023';
    end if;
    v_quantity := (v_value #>> '{}')::numeric;
    if v_quantity < 0 then
      raise exception 'inventory quantity < 0 for %', v_key using errcode = '22023';
    end if;
    insert into public.inventory(user_id, entity_id, quantity)
    values (v_user_id, v_key, v_quantity);
  end loop;
end;
$$;

revoke all on function public.replace_user_progress(jsonb) from public, anon;
grant execute on function public.replace_user_progress(jsonb) to authenticated;
