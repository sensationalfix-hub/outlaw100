-- Bulk-write one milestone in a single authenticated transaction.
create or replace function public.set_milestone_progress(
  p_milestone_id text,
  p_status text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  if p_status not in ('not_started','available','in_progress','prepared','completable','completed','blocked') then
    raise exception 'invalid progress status: %', p_status using errcode = '22023';
  end if;
  if not exists (select 1 from public.milestones where id = p_milestone_id) then
    raise exception 'unknown milestone: %', p_milestone_id using errcode = '23503';
  end if;

  insert into public.progress(user_id, criterion_id, milestone_task_id, status)
  select v_user_id, linked.criterion_id, null, p_status
  from (
    select distinct criterion_id
    from public.milestone_tasks
    where milestone_id = p_milestone_id and criterion_id is not null
  ) as linked
  on conflict (user_id, criterion_id) where criterion_id is not null
  do update set status = excluded.status;

  insert into public.progress(user_id, criterion_id, milestone_task_id, status)
  select v_user_id, null, id, p_status
  from public.milestone_tasks
  where milestone_id = p_milestone_id and criterion_id is null
  on conflict (user_id, milestone_task_id) where milestone_task_id is not null
  do update set status = excluded.status;
end;
$$;

revoke all on function public.set_milestone_progress(text, text) from public, anon;
grant execute on function public.set_milestone_progress(text, text) to authenticated;
