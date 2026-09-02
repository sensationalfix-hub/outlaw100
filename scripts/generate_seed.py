#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any, Iterable


def q(value: Any) -> str:
    if value is None:
        return 'null'
    if isinstance(value, bool):
        return 'true' if value else 'false'
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def j(value: Any) -> str:
    return q(json.dumps(value if value is not None else {}, ensure_ascii=False, separators=(',', ':'))) + '::jsonb'


def batches(rows: list[Any], size: int) -> Iterable[list[Any]]:
    for start in range(0, len(rows), size):
        yield rows[start:start + size]


def insert_sql(table: str, columns: list[str], rows: list[list[str]], conflict: str) -> str:
    values = ',\n'.join('(' + ','.join(row) + ')' for row in rows)
    return f"insert into public.{table} ({','.join(columns)}) values\n{values}\n{conflict};"


def build_chunks(c: dict[str, Any], batch_size: int) -> tuple[list[dict[str, str]], dict[str, int]]:
    chunks: list[dict[str, str]] = []

    def add(table: str, columns: list[str], source_rows: list[Any], mapper, conflict: str) -> None:
        for idx, group in enumerate(batches(source_rows, batch_size), start=1):
            chunks.append({'table': table, 'batch': idx, 'sql': insert_sql(table, columns, [mapper(x) for x in group], conflict)})

    add('entities', ['id','type','name','category','metadata','source'], c['entities'], lambda x: [q(x['id']),q(x['type']),q(x['name']),q(x['category']),j(x.get('metadata',{})),j(x.get('source',{}))],
        'on conflict (id) do update set type=excluded.type,name=excluded.name,category=excluded.category,metadata=excluded.metadata,source=excluded.source')
    add('criteria', ['id','entity_id','key','label','criterion_type','metadata','source'], c['criteria'], lambda x: [q(x['id']),q(x['entityId']),q(x['key']),q(x['label']),q(x.get('criterionType','boolean')),j(x.get('metadata',{})),j(x.get('source',{}))],
        'on conflict (id) do update set entity_id=excluded.entity_id,key=excluded.key,label=excluded.label,criterion_type=excluded.criterion_type,metadata=excluded.metadata,source=excluded.source')
    add('relations', ['id','from_id','to_id','type','metadata'], c['relations'], lambda x: [q(x['id']),q(x['fromId']),q(x['toId']),q(x['type']),j(x.get('metadata',{}))],
        'on conflict (id) do update set from_id=excluded.from_id,to_id=excluded.to_id,type=excluded.type,metadata=excluded.metadata')
    add('milestones', ['id','kind','chapter','title','sort_order','source_page','source_reference','missable_risk','availability','details','checklist','metadata'], c['milestones'], lambda x: [q(x['id']),q(x['kind']),q(x['chapter']),q(x['title']),q(x['order']),q(x['sourcePage']),q(x['sourceReference']),q(x.get('missableRisk',False)),j(x.get('availability',{})),q(x.get('details','')),j(x.get('checklist',[])),j(x.get('metadata',{}))],
        'on conflict (id) do update set kind=excluded.kind,chapter=excluded.chapter,title=excluded.title,sort_order=excluded.sort_order,source_page=excluded.source_page,source_reference=excluded.source_reference,missable_risk=excluded.missable_risk,availability=excluded.availability,details=excluded.details,checklist=excluded.checklist,metadata=excluded.metadata')
    add('milestone_tasks', ['id','milestone_id','task_type','label','sort_order','source_reference','source_page','entity_id','criterion_id','metadata'], c['milestoneTasks'], lambda x: [q(x['id']),q(x['milestoneId']),q(x['taskType']),q(x['label']),q(x['order']),q(x['sourceReference']),q(x['sourcePage']),q(x.get('entityId')),q(x.get('criterionId')),j(x.get('metadata',{}))],
        'on conflict (id) do update set milestone_id=excluded.milestone_id,task_type=excluded.task_type,label=excluded.label,sort_order=excluded.sort_order,source_reference=excluded.source_reference,source_page=excluded.source_page,entity_id=excluded.entity_id,criterion_id=excluded.criterion_id,metadata=excluded.metadata')
    add('craft_recipes', ['id','entity_id','source'], c['recipes'], lambda x: [q(x['id']),q(x['entityId']),j(x.get('source',{}))],
        'on conflict (id) do update set entity_id=excluded.entity_id,source=excluded.source')
    reqs = []
    for recipe in c['recipes']:
        for req in recipe.get('requirements', []):
            reqs.append({'recipeId':recipe['id'], **req})
    add('craft_requirements', ['recipe_id','material_id','quantity','material_name','material_tier'], reqs, lambda x: [q(x['recipeId']),q(x['materialId']),q(x['quantity']),q(x['materialName']),q(x.get('materialTier'))],
        'on conflict (recipe_id,material_id) do update set quantity=excluded.quantity,material_name=excluded.material_name,material_tier=excluded.material_tier')
    add('archive_entries', ['id','entity_id','section','"group"','subgroup','name','missable'], c['archiveEntries'], lambda x: [q(x['id']),q(x['entityId']),q(x['section']),q(x.get('group','')),q(x.get('subgroup','')),q(x['name']),q(x.get('missable',False))],
        'on conflict (id) do update set entity_id=excluded.entity_id,section=excluded.section,"group"=excluded."group",subgroup=excluded.subgroup,name=excluded.name,missable=excluded.missable')
    add('source_references', ['id','target_type','target_id','source_kind','locator','metadata'], c['sourceReferences'], lambda x: [q(x['id']),q(x['targetType']),q(x['targetId']),q(x['sourceKind']),q(x['locator']),j(x.get('metadata',{}))],
        'on conflict (id) do update set target_type=excluded.target_type,target_id=excluded.target_id,source_kind=excluded.source_kind,locator=excluded.locator,metadata=excluded.metadata')
    add('map_markers', ['id','entity_id','criterion_id','name','category','latitude','longitude','legacy_x','legacy_y','coordinate_system','metadata','source'], c['mapMarkers'], lambda x: [q(x['id']),q(x.get('entityId')),q(x.get('criterionId')),q(x['name']),q(x['category']),q(x.get('latitude')),q(x.get('longitude')),q(x.get('legacyX')),q(x.get('legacyY')),q(x.get('coordinateSystem','rdr2-map')),j(x.get('metadata',{})),j(x.get('source',{}))],
        'on conflict (id) do update set entity_id=excluded.entity_id,criterion_id=excluded.criterion_id,name=excluded.name,category=excluded.category,latitude=excluded.latitude,longitude=excluded.longitude,legacy_x=excluded.legacy_x,legacy_y=excluded.legacy_y,coordinate_system=excluded.coordinate_system,metadata=excluded.metadata,source=excluded.source')
    add('media_assets', ['id','entity_id','kind','public_path','source','metadata'], c['mediaAssets'], lambda x: [q(x['id']),q(x.get('entityId')),q(x['kind']),q(x['publicPath']),q(x.get('source','catalog')),j({k:v for k,v in x.items() if k not in {'id','entityId','kind','publicPath','source'}})],
        'on conflict (id) do update set entity_id=excluded.entity_id,kind=excluded.kind,public_path=excluded.public_path,source=excluded.source,metadata=excluded.metadata')

    audit_sql = insert_sql('audit_records', ['audit_type','source_kind','status','details'], [[q('catalog_import'),q('xlsx+pdf+html'),q('pass'),j(c['audit'])]], '')
    chunks.append({'table':'audit_records','batch':1,'sql':audit_sql})

    counts = {
        'entities': len(c['entities']),
        'criteria': len(c['criteria']),
        'relations': len(c['relations']),
        'milestones': len(c['milestones']),
        'milestone_tasks': len(c['milestoneTasks']),
        'craft_recipes': len(c['recipes']),
        'archive_entries': len(c['archiveEntries']),
        'source_references': len(c['sourceReferences']),
        'map_markers': len(c['mapMarkers']),
        'media_assets': len(c['mediaAssets']),
    }
    return chunks, counts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--catalog', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--chunks-output', required=True, type=Path)
    parser.add_argument('--batch-size', type=int, default=400)
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text())
    chunks, counts = build_chunks(catalog, args.batch_size)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text('-- Generated from data/generated/catalog.json. Do not hand-edit.\n\n' + '\n\n'.join(c['sql'] for c in chunks) + '\n', encoding='utf-8')
    args.chunks_output.parent.mkdir(parents=True, exist_ok=True)
    args.chunks_output.write_text(json.dumps({'counts': counts, 'chunks': chunks}, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'counts': counts, 'chunkCount': len(chunks)}, ensure_ascii=False))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
