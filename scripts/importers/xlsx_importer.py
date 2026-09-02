from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

EXPECTED_SHEETS = [
    'Hunting','Outfits (Legendary)','Outfits (Normal)','Clothing','Saddles','Satchels','Camp','PROGRESS',
    'Animals','Fish','Plants','Horses','Weapons','Equipment','Cigarette Cards'
]

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
      'pr': 'http://schemas.openxmlformats.org/package/2006/relationships'}


def slug(value: str) -> str:
    text = unicodedata.normalize('NFKD', str(value)).encode('ascii', 'ignore').decode('ascii').lower()
    text = re.sub(r"[^a-z0-9]+", '-', text).strip('-')
    return text or 'item'


def stable_id(kind: str, name: str, discriminator: str = '') -> str:
    base = f'{kind}:{slug(name)}'
    if discriminator:
        digest = hashlib.sha1(discriminator.encode('utf-8')).hexdigest()[:8]
        base += f':{digest}'
    return base


def _cell_col(ref: str) -> int:
    letters = ''.join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n - 1


def read_xlsx_values(path: str | Path) -> dict[str, list[list[object]]]:
    path = Path(path)
    with zipfile.ZipFile(path) as zf:
        shared = []
        if 'xl/sharedStrings.xml' in zf.namelist():
            root = ET.fromstring(zf.read('xl/sharedStrings.xml'))
            for si in root.findall('m:si', NS):
                shared.append(''.join((t.text or '') for t in si.iterfind('.//m:t', NS)))

        wb = ET.fromstring(zf.read('xl/workbook.xml'))
        rels = ET.fromstring(zf.read('xl/_rels/workbook.xml.rels'))
        rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels.findall('pr:Relationship', NS)}
        out: dict[str, list[list[object]]] = {}
        for sh in wb.find('m:sheets', NS):
            name = sh.attrib['name']
            rid = sh.attrib[f'{{{NS["r"]}}}id']
            target = rel_map[rid]
            xml_path = target if target.startswith('xl/') else 'xl/' + target.lstrip('/')
            root = ET.fromstring(zf.read(xml_path))
            rows: list[list[object]] = []
            for row in root.findall('.//m:sheetData/m:row', NS):
                row_num = int(row.attrib.get('r', len(rows) + 1))
                while len(rows) < row_num:
                    rows.append([])
                values: list[object] = []
                for c in row.findall('m:c', NS):
                    col = _cell_col(c.attrib.get('r', 'A1'))
                    while len(values) <= col:
                        values.append(None)
                    typ = c.attrib.get('t')
                    v = c.find('m:v', NS)
                    val: object = None
                    if typ == 'inlineStr':
                        isel = c.find('m:is', NS)
                        val = ''.join((t.text or '') for t in isel.iterfind('.//m:t', NS)) if isel is not None else ''
                    elif v is not None and v.text is not None:
                        raw = v.text
                        if typ == 's':
                            idx = int(raw)
                            val = shared[idx] if 0 <= idx < len(shared) else raw
                        elif typ == 'b':
                            val = raw == '1'
                        elif typ in ('str', 'e'):
                            val = raw
                        else:
                            try:
                                num = float(raw)
                                val = int(num) if num.is_integer() else num
                            except ValueError:
                                val = raw
                    values[col] = val
                rows[row_num - 1] = values
            while rows and not any(v is not None for v in rows[-1]):
                rows.pop()
            out[name] = rows
        return out


def cell(row: list[object], idx: int):
    return row[idx] if idx < len(row) else None


def text(v) -> str:
    return str(v).strip() if v is not None else ''


def applicable(v) -> bool:
    return text(v) != '-'


def propagated(values: list[object], start: int) -> list[str]:
    out: list[str] = []
    current = ''
    for i, v in enumerate(values):
        if i < start:
            out.append('')
            continue
        if text(v):
            current = text(v)
        out.append(current)
    return out


def parse_catalog_from_sheets(sheets: dict[str, list[list[object]]]) -> dict:
    entities: list[dict] = []
    criteria: list[dict] = []
    relations: list[dict] = []
    recipes: list[dict] = []
    source_refs: list[dict] = []
    seen_entity: set[str] = set()

    def add_entity(kind: str, name: str, sheet: str, row: int, *, category: str | None = None,
                   metadata: dict | None = None, discriminator: str = '') -> dict:
        eid = stable_id(kind, name, discriminator)
        item = {
            'id': eid, 'type': kind, 'name': name, 'category': category or kind,
            'metadata': metadata or {}, 'source': {'kind': 'xlsx', 'sheet': sheet, 'row': row}
        }
        if eid not in seen_entity:
            entities.append(item); seen_entity.add(eid)
        else:
            existing = next(e for e in entities if e['id'] == eid)
            if category and existing.get('category') in {kind, 'equipment'}:
                existing['category'] = category
            for k, v in (metadata or {}).items():
                if v not in (None, '', [], {}):
                    existing.setdefault('metadata', {})[k] = v
        sid = stable_id('source', eid, f'{sheet}:{row}')
        if not any(ref['id'] == sid for ref in source_refs):
            source_refs.append({'id': sid, 'targetType': 'entity', 'targetId': eid,
                                'sourceKind': 'xlsx', 'locator': f'{sheet}!row:{row}'})
        return next(e for e in entities if e['id'] == eid)

    def add_criterion(entity: dict, key: str, label: str, sheet: str, row: int, *, criterion_type='boolean'):
        cid = stable_id('criterion', f"{entity['id']}:{key}")
        if any(c['id'] == cid for c in criteria):
            return
        criteria.append({'id': cid, 'entityId': entity['id'], 'key': key, 'label': label,
                         'criterionType': criterion_type, 'source': {'kind':'xlsx','sheet':sheet,'row':row}})
        source_refs.append({'id': stable_id('source', cid, f'{sheet}:{row}'), 'targetType':'criterion','targetId':cid,
                            'sourceKind':'xlsx','locator':f'{sheet}!row:{row}'})

    material_cache: dict[tuple[str,str], dict] = {}
    def material_entity(material_name: str, tier: str, sheet: str, row: int) -> dict:
        key = (tier, material_name)
        if key in material_cache: return material_cache[key]
        display = f'{tier.title()} {material_name}'.strip() if tier else material_name
        e = add_entity('material', display, sheet, row, category='material',
                       metadata={'baseName': material_name, 'tier': tier}, discriminator=f'{tier}:{material_name}')
        material_cache[key] = e
        return e

    def parse_craft_matrix(sheet_name: str, *, start_col: int, name_col: int, kind: str,
                           group_col: int | None = None, suffix: str = '', legendary=False,
                           create_outfit_groups=False, category: str | None = None,
                           identity_discriminator: bool = True):
        rows = sheets.get(sheet_name, [])
        if len(rows) < 2: return
        tiers = propagated(rows[0], start_col)
        materials = rows[1]
        current_group = ''
        parent = None
        for rix, row in enumerate(rows[2:], start=3):
            group = text(cell(row, group_col)) if group_col is not None else ''
            name = text(cell(row, name_col))
            if group:
                current_group = group
                if create_outfit_groups:
                    parent = add_entity('outfit', current_group, sheet_name, rix,
                                        category='outfit', metadata={'legendary': legendary})
            if not name or name.upper().startswith('TOTAL') or name.upper().startswith('REFERENCE'):
                continue
            display = f'{name}{suffix}' if suffix and not name.lower().endswith(suffix.lower()) else name
            meta = {'group': current_group, 'legendary': legendary} if current_group or legendary else {}
            ent = add_entity(kind, display, sheet_name, rix, category=category or kind, metadata=meta,
                             discriminator=(f'{sheet_name}:{current_group}:{name}' if identity_discriminator else ''))
            add_criterion(ent, 'crafted', 'Fabricado', sheet_name, rix)
            if parent:
                relations.append({'id': stable_id('relation', f"{parent['id']}:{ent['id']}:contains"), 'fromId': parent['id'], 'toId': ent['id'], 'type':'contains'})
            reqs = []
            for cix in range(start_col, max(len(materials), len(row))):
                qty = cell(row, cix)
                if not isinstance(qty, (int,float)) or qty <= 0: continue
                mname = text(cell(materials, cix))
                if not mname: continue
                tier = tiers[cix] if cix < len(tiers) else ''
                mat = material_entity(mname, tier, sheet_name, rix)
                req = {'materialId':mat['id'],'materialName':mname,'materialTier':tier,'quantity':qty}
                reqs.append(req)
                relations.append({'id': stable_id('relation', f"{ent['id']}:{mat['id']}:requires"), 'fromId':ent['id'],'toId':mat['id'],'type':'requires_material','quantity':qty})
            recipes.append({'id':stable_id('recipe', ent['id']), 'entityId':ent['id'], 'requirements':reqs,
                            'source':{'kind':'xlsx','sheet':sheet_name,'row':rix}})

    # Animals
    rows = sheets.get('Animals', [])
    criterion_cols = [(3,'tracked','Rastreado'),(4,'killed','Abatido'),(5,'skinned','Despellejado'),(6,'studied','Estudiado')]
    current_animal_group = ''
    for rix,row in enumerate(rows[3:], start=4):
        third = text(cell(row,2)); second = text(cell(row,1)); first = text(cell(row,0))
        if third:
            if second and second.upper() not in {'TOTAL','COMPLETE','INCOMPLETE','COMPLETE %'}:
                current_animal_group = second
            if first.upper() == 'LEGENDARIES':
                current_animal_group = 'LEGENDARIES'
            name = third
        else:
            name = second
            if first.upper() == 'LEGENDARIES':
                current_animal_group = 'LEGENDARIES'
        if not name or name.upper() in {'TOTAL','COMPLETE','INCOMPLETE','COMPLETE %','LEGENDARIES'}: continue
        ent = add_entity('animal', name, 'Animals', rix, category='animal', metadata={'location': text(cell(row,8)), 'group': current_animal_group, 'legendary': current_animal_group == 'LEGENDARIES'})
        for cix,key,label in criterion_cols:
            if applicable(cell(row,cix)): add_criterion(ent,key,label,'Animals',rix)

    # Fish
    rows = sheets.get('Fish', [])
    fish_group = ''
    for rix,row in enumerate(rows[3:], start=4):
        first=text(cell(row,0)); second=text(cell(row,1))
        if first.upper() == 'LEGENDARIES': fish_group='LEGENDARIES'
        name = second or first
        if not name or name.upper() in {'TOTAL','COMPLETE','INCOMPLETE','COMPLETE %','LEGENDARIES'}: continue
        ent = add_entity('fish', name, 'Fish', rix, category='fish', metadata={'bait':text(cell(row,6)),'location':text(cell(row,7)),'weather':text(cell(row,8)),'legendary':fish_group=='LEGENDARIES'})
        for cix,key,label in [(2,'caught','Pescado'),(3,'baited','Cebo usado'),(4,'survivalist_10','Superviviente 10')]:
            if applicable(cell(row,cix)): add_criterion(ent,key,label,'Fish',rix)

    # Plants
    rows = sheets.get('Plants', [])
    plant_group = ''
    for rix,row in enumerate(rows[3:], start=4):
        first=text(cell(row,0)); second=text(cell(row,1))
        if first.upper() == 'ORCHIDS': plant_group='ORCHIDS'
        name = second or first
        if not name or name.upper() in {'TOTAL','COMPLETE','INCOMPLETE','COMPLETE %','ORCHIDS'}: continue
        ent = add_entity('plant', name, 'Plants', rix, category='plant', metadata={'group':plant_group})
        for cix,key,label in [(2,'picked','Recogida'),(3,'tasted','Probada'),(4,'recipe','Usada en receta'),(5,'cig_card','Cromo relacionado'),(6,'herbalist_9','Herborista 9')]:
            if applicable(cell(row,cix)): add_criterion(ent,key,label,'Plants',rix)

    # Horses + coats
    rows = sheets.get('Horses', [])
    for rix,row in enumerate(rows[5:], start=6):
        name=text(cell(row,0))
        if not name: continue
        breed=add_entity('horse',name,'Horses',rix,category='horse',metadata={'quest':text(cell(row,28)),'stable':text(cell(row,29)),'steal':text(cell(row,30)),'wild':text(cell(row,31))})
        for cix,key,label in [(1,'ridden_uncommon','Pelaje raro montado'),(2,'ridden_common','Pelaje común montado'),(3,'bonded','Vínculo máximo'),(4,'studied','Estudiado'),(5,'horseman_10','Jinete 10')]:
            if applicable(cell(row,cix)): add_criterion(breed,key,label,'Horses',rix)
        for base in (7,10,13,16,19,22,25):
            coat=text(cell(row,base+2))
            if not coat or coat == '-': continue
            uncommon = text(cell(row,base)) == 'X'
            coat_ent=add_entity('horse_coat',f'{name} · {coat}','Horses',rix,category='horse_coat',metadata={'breed':name,'coat':coat,'uncommon':uncommon},discriminator=f'{name}:{coat}')
            add_criterion(coat_ent,'ridden','Montado','Horses',rix)
            relations.append({'id':stable_id('relation',f"{breed['id']}:{coat_ent['id']}:coat"),'fromId':breed['id'],'toId':coat_ent['id'],'type':'has_coat'})

    # Weapons
    rows=sheets.get('Weapons',[]); current_group=''
    for rix,row in enumerate(rows[3:],start=4):
        if text(cell(row,0)): current_group=text(cell(row,0))
        name=text(cell(row,1))
        if not name: continue
        ent=add_entity('weapon',name,'Weapons',rix,category='weapon',metadata={'group':current_group,'location':text(cell(row,4))})
        add_criterion(ent,'obtained','Obtenida','Weapons',rix)

    # Equipment
    rows=sheets.get('Equipment',[]); current_group=''
    for rix,row in enumerate(rows[3:],start=4):
        if text(cell(row,0)): current_group=text(cell(row,0))
        name=text(cell(row,1))
        if not name: continue
        group_category = {'SATCHELS':'satchel','TALISMANS / TRINKETS':'talisman_trinket','REINFORCED EQUIPMENT':'reinforced_equipment','GUN EQUIP':'weapon_equipment','KIT':'equipment'}.get(current_group,'equipment')
        ent=add_entity('equipment',name,'Equipment',rix,category=group_category,metadata={'group':current_group,'effects':text(cell(row,4)),'locationOrIngredients':text(cell(row,7))})
        add_criterion(ent,'obtained','Obtenido','Equipment',rix)

    # Cigarette cards
    rows=sheets.get('Cigarette Cards',[])
    for rix,row in enumerate(rows[2:],start=3):
        name=text(cell(row,2))
        if not name: continue
        ent=add_entity('cigarette_card',name,'Cigarette Cards',rix,category='cigarette_card',metadata={'set':text(cell(row,0)),'number':cell(row,1),'state':text(cell(row,3)),'location':text(cell(row,4)),'description':text(cell(row,5))},discriminator=f'{text(cell(row,0))}:{cell(row,1)}')
        add_criterion(ent,'obtained','Conseguido','Cigarette Cards',rix)

    parse_craft_matrix('Satchels',start_col=2,name_col=0,kind='equipment',suffix=' Satchel',category='satchel',identity_discriminator=False)
    parse_craft_matrix('Saddles',start_col=2,name_col=0,kind='saddle',suffix=' Saddle')
    parse_craft_matrix('Camp',start_col=3,name_col=1,kind='camp_upgrade',group_col=0)
    parse_craft_matrix('Outfits (Legendary)',start_col=3,name_col=1,kind='outfit_item',group_col=0,legendary=True,create_outfit_groups=True)
    parse_craft_matrix('Outfits (Normal)',start_col=3,name_col=1,kind='outfit_item',group_col=0,create_outfit_groups=True)
    parse_craft_matrix('Clothing',start_col=3,name_col=1,kind='clothing',group_col=0)

    # Hunting aggregate rows, preserved as material metadata rather than user progress.
    rows=sheets.get('Hunting',[])
    if len(rows)>=2:
        tiers=propagated(rows[0],2); names=rows[1]
        aggregates={}
        section=''
        for rix,row in enumerate(rows[2:],start=3):
            if text(cell(row,0)): section=text(cell(row,0)).lower()
            metric=text(cell(row,1)).lower()
            if metric not in {'required','needed'} and section!='hunt': continue
            for cix in range(2,max(len(names),len(row))):
                qty=cell(row,cix)
                if not isinstance(qty,(int,float)): continue
                mname=text(cell(names,cix)); tier=tiers[cix] if cix<len(tiers) else ''
                if not mname: continue
                mat=material_entity(mname,tier,'Hunting',rix)
                aggregates.setdefault(mat['id'],{})[f'{section}_{metric or "total"}'.strip('_')]=qty
        for e in entities:
            if e['id'] in aggregates:
                e['metadata'].setdefault('huntingTotals',{}).update(aggregates[e['id']])

    return {
        'version': 1,
        'entities': entities,
        'criteria': criteria,
        'relations': relations,
        'recipes': recipes,
        'sourceReferences': source_refs,
        'audit': {
            'visitedSheets': [name for name in EXPECTED_SHEETS if name in sheets],
            'missingSheets': [name for name in EXPECTED_SHEETS if name not in sheets],
            'entityCount': len(entities), 'criterionCount': len(criteria), 'recipeCount': len(recipes), 'relationCount': len(relations)
        }
    }


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('xlsx')
    parser.add_argument('--out',required=True)
    args=parser.parse_args()
    sheets=read_xlsx_values(args.xlsx)
    catalog=parse_catalog_from_sheets(sheets)
    Path(args.out).parent.mkdir(parents=True,exist_ok=True)
    Path(args.out).write_text(json.dumps(catalog,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(catalog['audit'],ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()
