-- Authenticated write helpers for the canonical OUTLAW100 progress table.
-- These functions run as SECURITY INVOKER so existing RLS remains authoritative.

create or replace function public.set_criterion_progress(
  p_criterion_id text,
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

  update public.progress
     set status = p_status
   where user_id = v_user_id
     and criterion_id = p_criterion_id;

  if not found then
    insert into public.progress(user_id, criterion_id, milestone_task_id, status)
    values (v_user_id, p_criterion_id, null, p_status);
  end if;
end;
$$;

create or replace function public.set_milestone_task_progress(
  p_task_id text,
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

  update public.progress
     set status = p_status
   where user_id = v_user_id
     and milestone_task_id = p_task_id;

  if not found then
    insert into public.progress(user_id, criterion_id, milestone_task_id, status)
    values (v_user_id, null, p_task_id, p_status);
  end if;
end;
$$;

revoke all on function public.set_criterion_progress(text, text) from public, anon;
revoke all on function public.set_milestone_task_progress(text, text) from public, anon;
grant execute on function public.set_criterion_progress(text, text) to authenticated;
grant execute on function public.set_milestone_task_progress(text, text) to authenticated;
