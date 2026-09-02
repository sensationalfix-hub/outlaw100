-- OUTLAW100 canonical performance hardening.
-- Cover foreign keys used by progress/map joins and avoid per-row auth.uid() calls in RLS.

create index if not exists inventory_entity_idx on public.inventory(entity_id);
create index if not exists progress_criterion_idx on public.progress(criterion_id) where criterion_id is not null;
create index if not exists progress_task_idx on public.progress(milestone_task_id) where milestone_task_id is not null;
create index if not exists map_markers_criterion_idx on public.map_markers(criterion_id) where criterion_id is not null;

-- Profiles
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles select own" on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles update own" on public.profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Progress
drop policy if exists "progress select own" on public.progress;
drop policy if exists "progress insert own" on public.progress;
drop policy if exists "progress update own" on public.progress;
drop policy if exists "progress delete own" on public.progress;
create policy "progress select own" on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress insert own" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress update own" on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress delete own" on public.progress for delete to authenticated using ((select auth.uid()) = user_id);

-- Inventory
drop policy if exists "inventory select own" on public.inventory;
drop policy if exists "inventory insert own" on public.inventory;
drop policy if exists "inventory update own" on public.inventory;
drop policy if exists "inventory delete own" on public.inventory;
create policy "inventory select own" on public.inventory for select to authenticated using ((select auth.uid()) = user_id);
create policy "inventory insert own" on public.inventory for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "inventory update own" on public.inventory for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "inventory delete own" on public.inventory for delete to authenticated using ((select auth.uid()) = user_id);
