-- Server-only catalog importer. The production app exposes the generated catalog as a public static JSON file.
create schema if not exists private;
revoke all on schema private from public;
create extension if not exists http with schema extensions;

create or replace function private.import_outlaw_catalog(catalog_url text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  response_status integer;
  response_content text;
  payload jsonb;
begin
  if catalog_url is null or catalog_url !~ '^https://[^[:space:]]+$' then
    raise exception 'catalog_url must be https';
  end if;

  select h.status, h.content
    into response_status, response_content
  from extensions.http_get(catalog_url) as h;

  if response_status <> 200 then
    raise exception 'catalog download failed with HTTP %', response_status;
  end if;

  payload := response_content::jsonb;
  if jsonb_typeof(payload) <> 'object' or payload->>'version' is null then
    raise exception 'invalid catalog payload';
  end if;

  insert into public.entities(id,type,name,category,metadata,source)
  select e->>'id', e->>'type', e->>'name', e->>'category',
         coalesce(e->'metadata','{}'::jsonb), coalesce(e->'source','{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'entities','[]'::jsonb)) e
  on conflict (id) do update set
    type=excluded.type, name=excluded.name, category=excluded.category,
    metadata=excluded.metadata, source=excluded.source;

  insert into public.criteria(id,entity_id,key,label,criterion_type,metadata,source)
  select e->>'id', e->>'entityId', e->>'key', e->>'label',
         coalesce(e->>'criterionType','boolean'), coalesce(e->'metadata','{}'::jsonb),
         coalesce(e->'source','{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'criteria','[]'::jsonb)) e
  on conflict (id) do update set
    entity_id=excluded.entity_id, key=excluded.key, label=excluded.label,
    criterion_type=excluded.criterion_type, metadata=excluded.metadata, source=excluded.source;

  insert into public.relations(id,from_id,to_id,type,metadata)
  select e->>'id', e->>'fromId', e->>'toId', e->>'type', coalesce(e->'metadata','{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'relations','[]'::jsonb)) e
  on conflict (id) do update set
    from_id=excluded.from_id, to_id=excluded.to_id, type=excluded.type, metadata=excluded.metadata;

  insert into public.milestones(id,kind,chapter,title,sort_order,source_page,source_reference,missable_risk,availability,details,checklist,metadata)
  select e->>'id', e->>'kind', e->>'chapter', e->>'title', (e->>'order')::integer,
         (e->>'sourcePage')::integer, e->>'sourceReference', coalesce((e->>'missableRisk')::boolean,false),
         coalesce(e->'availability','{}'::jsonb), coalesce(e->>'details',''),
         coalesce(e->'checklist','[]'::jsonb), coalesce(e->'metadata','{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'milestones','[]'::jsonb)) e
  on conflict (id) do update set
    kind=excluded.kind, chapter=excluded.chapter, title=excluded.title, sort_order=excluded.sort_order,
    source_page=excluded.source_page, source_reference=excluded.source_reference,
    missable_risk=excluded.missable_risk, availability=excluded.availability,
    details=excluded.details, checklist=excluded.checklist, metadata=excluded.metadata;

  insert into public.milestone_tasks(id,milestone_id,task_type,label,sort_order,source_reference,source_page,entity_id,criterion_id,metadata)
  select e->>'id', e->>'milestoneId', e->>'taskType', e->>'label', (e->>'order')::integer,
         e->>'sourceReference', (e->>'sourcePage')::integer,
         nullif(e->>'entityId',''), nullif(e->>'criterionId',''), coalesce(e->'metadata','{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'milestoneTasks','[]'::jsonb)) e
  on conflict (id) do update set
    milestone_id=excluded.milestone_id, task_type=excluded.task_type, label=excluded.label,
    sort_order=excluded.sort_order, source_reference=excluded.source_reference,
    source_page=excluded.source_page, entity_id=excluded.entity_id,
    criterion_id=excluded.criterion_id, metadata=excluded.metadata;

  insert into public.craft_recipes(id,entity_id,source)
  select e->>'id', e->>'entityId', coalesce(e->'source','{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'recipes','[]'::jsonb)) e
  on conflict (id) do update set entity_id=excluded.entity_id, source=excluded.source;

  insert into public.craft_requirements(recipe_id,material_id,quantity,material_name,material_tier)
  select r->>'id', req->>'materialId', (req->>'quantity')::numeric,
         req->>'materialName', nullif(req->>'materialTier','')
  from jsonb_array_elements(coalesce(payload->'recipes','[]'::jsonb)) r
  cross join lateral jsonb_array_elements(coalesce(r->'requirements','[]'::jsonb)) req
  on conflict (recipe_id,material_id) do update set
    quantity=excluded.quantity, material_name=excluded.material_name, material_tier=excluded.material_tier;

  insert into public.archive_entries(id,entity_id,section,"group",subgroup,name,missable)
  select e->>'id', e->>'entityId', e->>'section', coalesce(e->>'group',''),
         coalesce(e->>'subgroup',''), e->>'name', coalesce((e->>'missable')::boolean,false)
  from jsonb_array_elements(coalesce(payload->'archiveEntries','[]'::jsonb)) e
  on conflict (id) do update set
    entity_id=excluded.entity_id, section=excluded.section, "group"=excluded."group",
    subgroup=excluded.subgroup, name=excluded.name, missable=excluded.missable;

  insert into public.source_references(id,target_type,target_id,source_kind,locator,metadata)
  select e->>'id', e->>'targetType', e->>'targetId', e->>'sourceKind', e->>'locator',
         coalesce(e->'metadata','{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'sourceReferences','[]'::jsonb)) e
  on conflict (id) do update set
    target_type=excluded.target_type, target_id=excluded.target_id,
    source_kind=excluded.source_kind, locator=excluded.locator, metadata=excluded.metadata;

  insert into public.map_markers(id,entity_id,criterion_id,name,category,latitude,longitude,legacy_x,legacy_y,coordinate_system,metadata,source)
  select e->>'id', nullif(e->>'entityId',''), nullif(e->>'criterionId',''), e->>'name', e->>'category',
         nullif(e->>'latitude','')::double precision, nullif(e->>'longitude','')::double precision,
         nullif(e->>'legacyX','')::double precision, nullif(e->>'legacyY','')::double precision,
         coalesce(e->>'coordinateSystem','rdr2-map'), coalesce(e->'metadata','{}'::jsonb),
         coalesce(e->'source','{}'::jsonb)
  from jsonb_array_elements(coalesce(payload->'mapMarkers','[]'::jsonb)) e
  on conflict (id) do update set
    entity_id=excluded.entity_id, criterion_id=excluded.criterion_id, name=excluded.name,
    category=excluded.category, latitude=excluded.latitude, longitude=excluded.longitude,
    legacy_x=excluded.legacy_x, legacy_y=excluded.legacy_y,
    coordinate_system=excluded.coordinate_system, metadata=excluded.metadata, source=excluded.source;

  insert into public.media_assets(id,entity_id,kind,public_path,source,metadata)
  select e->>'id', nullif(e->>'entityId',''), e->>'kind', e->>'publicPath',
         coalesce(e->>'source','catalog'), e - 'id' - 'entityId' - 'kind' - 'publicPath' - 'source'
  from jsonb_array_elements(coalesce(payload->'mediaAssets','[]'::jsonb)) e
  on conflict (id) do update set
    entity_id=excluded.entity_id, kind=excluded.kind, public_path=excluded.public_path,
    source=excluded.source, metadata=excluded.metadata;

  insert into public.audit_records(audit_type,source_kind,status,details)
  values ('catalog_import','xlsx+pdf+html','pass',coalesce(payload->'audit','{}'::jsonb));

  return jsonb_build_object(
    'entities', jsonb_array_length(coalesce(payload->'entities','[]'::jsonb)),
    'criteria', jsonb_array_length(coalesce(payload->'criteria','[]'::jsonb)),
    'milestones', jsonb_array_length(coalesce(payload->'milestones','[]'::jsonb)),
    'archiveEntries', jsonb_array_length(coalesce(payload->'archiveEntries','[]'::jsonb)),
    'status', 'ok'
  );
end;
$$;

revoke all on function private.import_outlaw_catalog(text) from public;
revoke all on function private.import_outlaw_catalog(text) from anon;
revoke all on function private.import_outlaw_catalog(text) from authenticated;
