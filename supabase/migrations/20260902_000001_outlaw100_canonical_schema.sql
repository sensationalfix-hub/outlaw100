-- OUTLAW100 canonical schema. Legacy public.outlaw_progress is intentionally untouched.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entities (
  id text primary key,
  type text not null,
  name text not null,
  category text not null,
  metadata jsonb not null default '{}'::jsonb,
  source jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists entities_type_idx on public.entities(type);
create index if not exists entities_category_idx on public.entities(category);
create index if not exists entities_name_idx on public.entities(name);

create table if not exists public.criteria (
  id text primary key,
  entity_id text not null references public.entities(id) on delete cascade,
  key text not null,
  label text not null,
  criterion_type text not null default 'boolean',
  metadata jsonb not null default '{}'::jsonb,
  source jsonb not null default '{}'::jsonb,
  unique(entity_id, key)
);
create index if not exists criteria_entity_idx on public.criteria(entity_id);

create table if not exists public.relations (
  id text primary key,
  from_id text not null references public.entities(id) on delete cascade,
  to_id text not null references public.entities(id) on delete cascade,
  type text not null,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists relations_from_idx on public.relations(from_id);
create index if not exists relations_to_idx on public.relations(to_id);
create index if not exists relations_type_idx on public.relations(type);

create table if not exists public.milestones (
  id text primary key,
  kind text not null,
  chapter text not null,
  title text not null,
  sort_order integer not null,
  source_page integer not null,
  source_reference text not null,
  missable_risk boolean not null default false,
  availability jsonb not null default '{}'::jsonb,
  details text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists milestones_chapter_order_idx on public.milestones(chapter, sort_order);
create index if not exists milestones_kind_idx on public.milestones(kind);

create table if not exists public.milestone_tasks (
  id text primary key,
  milestone_id text not null references public.milestones(id) on delete cascade,
  task_type text not null,
  label text not null,
  sort_order integer not null default 0,
  source_reference text not null,
  source_page integer not null,
  entity_id text references public.entities(id) on delete set null,
  criterion_id text references public.criteria(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists milestone_tasks_milestone_idx on public.milestone_tasks(milestone_id, sort_order);
create index if not exists milestone_tasks_entity_idx on public.milestone_tasks(entity_id) where entity_id is not null;
create index if not exists milestone_tasks_criterion_idx on public.milestone_tasks(criterion_id) where criterion_id is not null;

create table if not exists public.craft_recipes (
  id text primary key,
  entity_id text not null unique references public.entities(id) on delete cascade,
  source jsonb not null default '{}'::jsonb
);

create table if not exists public.craft_requirements (
  recipe_id text not null references public.craft_recipes(id) on delete cascade,
  material_id text not null references public.entities(id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  material_name text not null,
  material_tier text,
  primary key(recipe_id, material_id)
);
create index if not exists craft_requirements_material_idx on public.craft_requirements(material_id);

create table if not exists public.archive_entries (
  id text primary key,
  entity_id text not null references public.entities(id) on delete cascade,
  section text not null,
  "group" text not null default '',
  subgroup text not null default '',
  name text not null,
  missable boolean not null default false
);
create index if not exists archive_entries_section_idx on public.archive_entries(section);
create index if not exists archive_entries_entity_idx on public.archive_entries(entity_id);

create table if not exists public.source_references (
  id text primary key,
  target_type text not null,
  target_id text not null,
  source_kind text not null,
  locator text not null,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists source_references_target_idx on public.source_references(target_type, target_id);
create index if not exists source_references_kind_idx on public.source_references(source_kind);

create table if not exists public.map_markers (
  id text primary key,
  entity_id text references public.entities(id) on delete set null,
  criterion_id text references public.criteria(id) on delete set null,
  name text not null,
  category text not null,
  latitude double precision,
  longitude double precision,
  legacy_x double precision,
  legacy_y double precision,
  coordinate_system text not null default 'rdr2-map',
  metadata jsonb not null default '{}'::jsonb,
  source jsonb not null default '{}'::jsonb
);
create index if not exists map_markers_category_idx on public.map_markers(category);
create index if not exists map_markers_entity_idx on public.map_markers(entity_id) where entity_id is not null;

create table if not exists public.media_assets (
  id text primary key,
  entity_id text references public.entities(id) on delete set null,
  kind text not null,
  public_path text not null,
  source text not null,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists media_assets_entity_idx on public.media_assets(entity_id) where entity_id is not null;

create table if not exists public.audit_records (
  id bigint generated by default as identity primary key,
  audit_type text not null,
  source_kind text not null,
  status text not null check (status in ('pass','warn','fail')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  criterion_id text references public.criteria(id) on delete cascade,
  milestone_task_id text references public.milestone_tasks(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started','available','in_progress','prepared','completable','completed','blocked')),
  quantity numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(criterion_id, milestone_task_id) = 1)
);
create unique index if not exists progress_user_criterion_uidx on public.progress(user_id, criterion_id) where criterion_id is not null;
create unique index if not exists progress_user_task_uidx on public.progress(user_id, milestone_task_id) where milestone_task_id is not null;
create index if not exists progress_user_status_idx on public.progress(user_id, status);

create table if not exists public.inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_id text not null references public.entities(id) on delete cascade,
  quantity numeric not null default 0 check (quantity >= 0),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id, entity_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists progress_set_updated_at on public.progress;
create trigger progress_set_updated_at before update on public.progress
for each row execute function public.set_updated_at();

drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at before update on public.inventory
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(user_id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1), 'Outlaw')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.entities enable row level security;
alter table public.criteria enable row level security;
alter table public.relations enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_tasks enable row level security;
alter table public.craft_recipes enable row level security;
alter table public.craft_requirements enable row level security;
alter table public.archive_entries enable row level security;
alter table public.source_references enable row level security;
alter table public.map_markers enable row level security;
alter table public.media_assets enable row level security;
alter table public.audit_records enable row level security;
alter table public.progress enable row level security;
alter table public.inventory enable row level security;

-- Shared catalog: readable, never writable by browser roles.
create policy "entities read" on public.entities for select to anon, authenticated using (true);
create policy "criteria read" on public.criteria for select to anon, authenticated using (true);
create policy "relations read" on public.relations for select to anon, authenticated using (true);
create policy "milestones read" on public.milestones for select to anon, authenticated using (true);
create policy "milestone_tasks read" on public.milestone_tasks for select to anon, authenticated using (true);
create policy "craft_recipes read" on public.craft_recipes for select to anon, authenticated using (true);
create policy "craft_requirements read" on public.craft_requirements for select to anon, authenticated using (true);
create policy "archive_entries read" on public.archive_entries for select to anon, authenticated using (true);
create policy "source_references read" on public.source_references for select to anon, authenticated using (true);
create policy "map_markers read" on public.map_markers for select to anon, authenticated using (true);
create policy "media_assets read" on public.media_assets for select to anon, authenticated using (true);
create policy "audit_records read" on public.audit_records for select to authenticated using (true);

-- Personal data: each authenticated user owns only their rows.
create policy "profiles select own" on public.profiles for select to authenticated using (auth.uid() = user_id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "progress select own" on public.progress for select to authenticated using (auth.uid() = user_id);
create policy "progress insert own" on public.progress for insert to authenticated with check (auth.uid() = user_id);
create policy "progress update own" on public.progress for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress delete own" on public.progress for delete to authenticated using (auth.uid() = user_id);

create policy "inventory select own" on public.inventory for select to authenticated using (auth.uid() = user_id);
create policy "inventory insert own" on public.inventory for insert to authenticated with check (auth.uid() = user_id);
create policy "inventory update own" on public.inventory for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inventory delete own" on public.inventory for delete to authenticated using (auth.uid() = user_id);
