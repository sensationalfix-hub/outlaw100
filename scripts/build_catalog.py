#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def slug(value: str) -> str:
    text = unicodedata.normalize('NFKD', str(value)).encode('ascii', 'ignore').decode().lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text or 'item'


def norm(value: str) -> str:
    text = unicodedata.normalize('NFKD', str(value)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', text).strip()


def short_hash(value: str) -> str:
    return hashlib.sha1(value.encode('utf-8')).hexdigest()[:8]


SECTION_TYPE = {
    'Stranger Missions': ('stranger_mission', 'stranger'),
    'Bounties': ('bounty', 'bounty'),
    'Camp Upgrades': ('camp_upgrade', 'camp_upgrade'),
    'Clothing Items (WIP)': ('clothing', 'clothing'),
    'Documents': ('document', 'document'),
    'Gang Hideouts': ('gang_hideout', 'gang_hideout'),
    'Horse Tack & Equipment': ('horse_equipment', 'horse_equipment'),
    'Outfits': ('outfit', 'outfit'),
    'Points of Interest': ('point_of_interest', 'point_of_interest'),
    'Random Encounters (WIP)': ('encounter', 'encounter'),
    'Robberies': ('robbery', 'robbery'),
    'Satchel Upgrades': ('equipment', 'satchel'),
    'Shacks': ('shack', 'shack'),
    'Valuables': ('valuable', 'valuable'),
    '100% Completion Checklist': ('completion_requirement', 'completion_requirement'),
}

SECTION_PREFERRED_TYPES = {
    'Camp Upgrades': {'camp_upgrade'},
    'Clothing Items (WIP)': {'clothing'},
    'Horse Tack & Equipment': {'saddle', 'equipment'},
    'Outfits': {'outfit', 'outfit_item'},
    'Satchel Upgrades': {'equipment'},
}


def choose_existing(candidates: list[dict[str, Any]], section: str) -> dict[str, Any] | None:
    if not candidates:
        return None
    preferred = SECTION_PREFERRED_TYPES.get(section, set())
    typed = [e for e in candidates if e.get('type') in preferred or e.get('category') in preferred]
    if len(typed) == 1:
        return typed[0]
    if len(candidates) == 1:
        return candidates[0]
    return None


CHAPTER_LABEL_TO_KEY = {
    'Capítulo 1 · Colter': 'chapter-1',
    'Capítulo 2 · Mirador de la Herradura': 'chapter-2',
    'Capítulo 3 · Clemens Point': 'chapter-3',
    'Capítulo 4 · Shady Belle': 'chapter-4',
    'Capítulo 5 · Guarma': 'chapter-5',
    'Capítulo 6 · Beaver Hollow': 'chapter-6',
    'Epílogo I · Pronghorn Ranch': 'epilogue-1',
    'Epílogo II · Beecher’s Hope': 'epilogue-2',
}
EDITORIAL_CHAPTERS = ['chapter-1','chapter-2','chapter-3','chapter-4','chapter-5','chapter-6','epilogue-1','epilogue-2']


def editorial_chapter(milestone: dict[str, Any]) -> str:
    chapter = milestone['chapter']
    if chapter == 'chapters-2-3-4':
        return 'chapter-2'
    if chapter == 'epilogue':
        return 'epilogue-1'
    return chapter


def interleave_editorial_route(milestones: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Interleave chapter-available side content without inventing unsupported unlocks.

    Exact post-mission requirements from the PDF are honored. Everything else is
    distributed inside the chapter availability window; source chapter and details
    remain untouched in the milestone itself.
    """
    ordered: list[dict[str, Any]] = []
    consumed: set[str] = set()
    for chapter in EDITORIAL_CHAPTERS:
        story = sorted(
            [m for m in milestones if m['kind'] == 'story' and m['chapter'] == chapter],
            key=lambda m: m['order'],
        )
        secondary = sorted(
            [m for m in milestones if m['kind'] != 'story' and editorial_chapter(m) == chapter],
            key=lambda m: (0 if m.get('missableRisk') else 1, m['order']),
        )
        if not story:
            for row in secondary:
                row.setdefault('metadata', {})['editorialChapter'] = chapter
                ordered.append(row); consumed.add(row['id'])
            continue
        slots: list[list[dict[str, Any]]] = [[] for _ in range(len(story) + 1)]
        sheep_index = next((i for i,m in enumerate(story) if m['title'] == 'The Sheep and the Goats'), len(story) - 1)
        for index, row in enumerate(secondary):
            row.setdefault('metadata', {})['editorialChapter'] = chapter
            requirement = str((row.get('availability') or {}).get('requirement') or '')
            requirement = re.sub(r'^complete\s+', '', requirement, flags=re.I).strip()
            required_index = next((i for i,m in enumerate(story) if norm(m['title']) == norm(requirement)), None) if requirement else None
            if required_index is not None:
                slot = min(len(story), required_index + 1)
            elif row['kind'] == 'chapter_sweep':
                slot = min(len(story), 4 if chapter == 'chapter-1' else 2)
            else:
                low = 1 if len(story) < 5 else 2
                high = max(low, len(story) - 2)
                if row['kind'] == 'companion_activity' and chapter == 'chapter-2':
                    high = min(high, sheep_index)
                if row['kind'] == 'item_request':
                    high = min(high, max(low, len(story) // 2 + 1))
                span = max(1, high - low + 1)
                slot = low + (index % span)
            slots[max(0, min(len(story), slot))].append(row)
        ordered.extend(slots[0])
        for index, story_row in enumerate(story):
            story_row.setdefault('metadata', {})['editorialChapter'] = chapter
            ordered.append(story_row); consumed.add(story_row['id'])
            for row in slots[index + 1]:
                ordered.append(row); consumed.add(row['id'])
    for row in sorted((m for m in milestones if m['id'] not in consumed), key=lambda m:m['order']):
        row.setdefault('metadata', {})['editorialChapter'] = editorial_chapter(row)
        ordered.append(row)
    for index, row in enumerate(ordered, start=1):
        row['order'] = index * 10
    return ordered




def chapter_intel_kind(title: str, description: str) -> str:
    text = norm(f"{title} {description}")
    if 'caza templada' in text:
        return 'hunting'
    if any(token in text for token in ['fauna ', 'fauna de', 'fauna exclusiva', 'revisar fauna']):
        return 'compendium'
    if any(token in text for token in ['huesos', 'colecciones', 'cigarette cards', 'exoticos']):
        return 'collectibles'
    if any(token in text for token in ['new austin', 'loot rapido', 'side content']):
        return 'exploration'
    if any(token in text for token in ['campamento', 'actividades de companeros']):
        return 'camp_activity'
    if 'forasteros' in text:
        return 'stranger_sweep'
    if '100' in text:
        return 'completion'
    return 'preparation'


def criteria_for_entities(criteria: list[dict[str, Any]], entity_ids: set[str], keys: set[str] | None = None) -> list[str]:
    return [
        row['id'] for row in criteria
        if row['entityId'] in entity_ids and (keys is None or row['key'] in keys)
    ]


def source_backed_intel_links(title: str, entities: list[dict[str, Any]], criteria: list[dict[str, Any]]) -> list[str]:
    by_name = {norm(row['name']): row for row in entities}
    if title == 'Caza templada':
        names = ['American Bison', 'Whitetail Deer', 'North American Beaver', 'American Red Fox']
        ids = {by_name[norm(name)]['id'] for name in names if norm(name) in by_name}
        return criteria_for_entities(criteria, ids)
    if title == 'Fauna de Bayou Nwa':
        ids = {
            row['id'] for row in entities
            if row.get('category') == 'animal' and not row.get('metadata', {}).get('legendary')
            and any(token in row['name'].lower() for token in ['heron', 'egret', 'spoonbill', 'alligator'])
        }
        return criteria_for_entities(criteria, ids)
    if title == 'Fauna exclusiva':
        ids = {
            row['id'] for row in entities
            if row.get('category') == 'animal' and 'GUARMA' in str(row.get('metadata', {}).get('location', '')).upper()
        }
        return criteria_for_entities(criteria, ids)
    if title == 'Cigarette cards urbanas':
        ids = {row['id'] for row in entities if row.get('category') == 'cigarette_card' and 'Saint Denis' in str(row.get('metadata', {}))}
        return criteria_for_entities(criteria, ids)
    if title == 'Huesos, grabados y atrapasueños':
        names = ['Complete "A Test of Faith"', 'Complete "Geology for Beginners"', 'Find all 20 Dreamcatchers']
        ids = {by_name[norm(name)]['id'] for name in names if norm(name) in by_name}
        return criteria_for_entities(criteria, ids)
    if title == 'Limpieza de 100%':
        ids = {row['id'] for row in entities if row.get('category') == 'completion_requirement'}
        return criteria_for_entities(criteria, ids)
    return []


def append_editorial_source_milestones(milestones: list[dict[str, Any]], entities: list[dict[str, Any]], criteria: list[dict[str, Any]]) -> None:
    satchel_ids = {row['id'] for row in entities if row.get('category') == 'satchel' and row.get('source', {}).get('kind') == 'xlsx'}
    satchel_criteria = criteria_for_entities(criteria, satchel_ids, {'crafted'})
    milestones.append({
        'id': 'milestone:crafting:chapter-2:satchels-and-camp',
        'kind': 'crafting',
        'chapter': 'chapter-2',
        'title': 'Sesión de zurrones y mejoras',
        'order': 90500,
        'sourcePage': 12,
        'sourceReference': 'PDF p.12 + HTML chapterIntel:Capítulo 2 · Mirador de la Herradura',
        'missableRisk': False,
        'availability': {'chapter': 'chapter-2', 'editorialInference': True},
        'details': 'El PDF reúne aquí zurrones, mejoras y requisitos de caza. La colocación en capítulo 2 es editorial y se apoya en el barrido temprano descrito por el HTML.',
        'checklist': [],
        'metadata': {'editorialInference': True, 'linkCriterionIds': satchel_criteria, 'whyNow': 'Convertir la caza temprana en mejoras útiles sin confundir materiales conseguidos con objetos fabricados.'},
    })

    challenge_ids = {row['id'] for row in entities if row.get('category') == 'challenge'}
    first_ranks = [row['id'] for row in criteria if row['entityId'] in challenge_ids and row['key'] == 'rank-1']
    milestones.append({
        'id': 'milestone:challenge:chapter-2:first-pass',
        'kind': 'challenge',
        'chapter': 'chapter-2',
        'title': 'Desafíos · primera pasada',
        'order': 90600,
        'sourcePage': 49,
        'sourceReference': 'PDF pp.49-51',
        'missableRisk': False,
        'availability': {'chapter': 'chapter-2', 'editorialInference': True},
        'details': 'Primera sesión editorial sobre los nueve bloques de desafíos listados por la fuente. El capítulo concreto es una recomendación editorial, no una ventana declarada por el PDF.',
        'checklist': [],
        'metadata': {'editorialInference': True, 'linkCriterionIds': first_ranks, 'whyNow': 'Empezar los desafíos pronto evita concentrar sus 90 rangos al final.'},
    })



def pdf_page_text(pdf: dict[str, Any], page_number: int) -> str:
    page = next((row for row in pdf.get('pages', []) if row.get('page') == page_number), None)
    return str((page or {}).get('text') or '')


def append_pdf_reference_milestones(milestones: list[dict[str, Any]], pdf: dict[str, Any]) -> None:
    """Promote explicit checklist/reference sections into source-backed route sessions.

    These are editorial placements only. The checklist text itself comes directly from
    the supplied PDF pages, and special availability statements from the source are
    preserved rather than guessed away.
    """
    def add(
        kind: str,
        chapter: str,
        title: str,
        page: int,
        checklist: list[str],
        why_now: str,
        details: str,
        *,
        source_reference: str | None = None,
        missable: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not checklist:
            return
        milestones.append({
            'id': f"milestone:{kind}:{chapter}:{slug(title)}",
            'kind': kind,
            'chapter': chapter,
            'title': title,
            'order': 90800 + len(milestones),
            'sourcePage': page,
            'sourceReference': source_reference or f"PDF p.{page}",
            'missableRisk': missable,
            'availability': {'chapter': chapter, 'editorialInference': True},
            'details': details,
            'checklist': checklist,
            'metadata': {
                'editorialInference': True,
                'whyNow': why_now,
                'pdfReferenceSection': True,
                **(metadata or {}),
            },
        })

    grave_text = pdf_page_text(pdf, 10)
    graves: list[str] = []
    for line in grave_text.splitlines():
        match = re.match(r'^\s*([^:]{3,80}):\s*(.+?)\s*$', line)
        if match and match.group(1).strip() not in {'Page 346', 'Graves'}:
            graves.append(f"{match.group(1).strip()} — {match.group(2).strip()}")
    add('graves', 'epilogue-2', 'Tumbas · memoria de la banda', 10, graves,
        'Haz el recorrido de tumbas cuando todas existen y puedes cerrar la memoria de la banda en una sola ruta coherente.',
        'Las nueve tumbas y sus localizaciones están listadas explícitamente en la página 10 del PDF.')

    treasure_text = pdf_page_text(pdf, 11)
    treasure_names = []
    for name in [
        'High Stakes Treasure', 'Poisonous Trail Treasure', 'Jack Hall Gang Treasure',
        'Landmark of Riches Treasure', 'The Mended Map Treasure', 'Sketched Map Treasure',
        'The Elemental Trail Treasure',
    ]:
        if name in treasure_text:
            treasure_names.append(name)
    early_treasures = [name for name in treasure_names if name != 'The Elemental Trail Treasure']
    add('treasure', 'chapter-2', 'Tesoros y mapas · rutas disponibles', 11, early_treasures,
        'Abrir varias cadenas de tesoro pronto convierte exploración y encuentros en dinero útil durante la partida, no después.',
        'La página 11 lista estas cadenas y cómo obtener su primer mapa. La ubicación en capítulo 2 es editorial.')
    if 'The Elemental Trail Treasure' in treasure_names:
        add('treasure', 'epilogue-2', 'Tesoro · The Elemental Trail', 11, ['The Elemental Trail Treasure'],
            'La propia fuente indica que este mapa sólo está disponible al final de los epílogos.',
            'El PDF especifica que The Elemental Trail Treasure sólo está disponible al final de los epílogos.')

    pamphlet_text = pdf_page_text(pdf, 13) + '\n' + pdf_page_text(pdf, 14)
    pamphlets: list[str] = []
    for line in pamphlet_text.splitlines():
        match = re.match(r'^\s*([A-Z][^:\n]{2,70}):\s*(.+?)\s*$', line)
        if not match:
            continue
        name, recipe = match.group(1).strip(), match.group(2).strip()
        if name.lower().startswith('pamphlets'):
            continue
        pamphlets.append(f"{name} — {recipe}")
    add('pamphlets', 'chapter-4', 'Panfletos · recetas y hallazgos', 13, pamphlets,
        'A estas alturas ya hay perista, exploración amplia y materiales suficientes para auditar recetas sin frenar el prólogo.',
        'Las páginas 13-14 distinguen panfletos encontrados o comprables de los adquiridos automáticamente y conservan sus recetas/localizaciones.',
        source_reference='PDF pp.13-14', metadata={'pdfReferenceRange': '13-14'})


def append_pdf_deep_route_milestones(
    milestones: list[dict[str, Any]],
    entities: list[dict[str, Any]],
    criteria: list[dict[str, Any]],
    pdf: dict[str, Any],
) -> None:
    """Promote late PDF reference sections without cloning canonical entity state."""
    criteria_by_entity: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for criterion in criteria:
        criteria_by_entity[criterion['entityId']].append(criterion)

    def links_for(category: str, *, keys: set[str] = {'complete'}, predicate=lambda e: True) -> list[str]:
        result: list[str] = []
        for entity in sorted((e for e in entities if e.get('category') == category and predicate(e)), key=lambda e: norm(e['name'])):
            for criterion in criteria_by_entity.get(entity['id'], []):
                if criterion['key'] in keys:
                    result.append(criterion['id'])
        return result

    def add_links(
        kind: str,
        chapter: str,
        title: str,
        source_page: int,
        source_reference: str,
        links: list[str],
        why_now: str,
        details: str,
        *,
        range_label: str,
        missable: bool = False,
        checklist: list[str] | None = None,
    ) -> None:
        if not links and not checklist:
            return
        milestones.append({
            'id': f"milestone:{kind}:{chapter}:{slug(title)}",
            'kind': kind,
            'chapter': chapter,
            'title': title,
            'order': 90900 + len(milestones),
            'sourcePage': source_page,
            'sourceReference': source_reference,
            'missableRisk': missable,
            'availability': {'chapter': chapter, 'editorialInference': True},
            'details': details,
            'checklist': checklist or [],
            'metadata': {
                'editorialInference': True,
                'linkCriterionIds': links,
                'whyNow': why_now,
                'pdfReferenceSection': True,
                'pdfReferenceRange': range_label,
            },
        })

    legendary_items = links_for('outfit_item', keys={'crafted'}, predicate=lambda e: bool(e.get('metadata', {}).get('legendary')))
    regular_items = links_for('outfit_item', keys={'crafted'}, predicate=lambda e: not bool(e.get('metadata', {}).get('legendary')))
    trapper_clothing = links_for('clothing', keys={'crafted'})
    add_links('crafting', 'chapter-3', 'Trampero · conjuntos legendarios', 15, 'PDF pp.15-17 + XLSX Outfits (Legendary)', legendary_items,
        'Convierte la caza legendaria y las pieles perfectas en prendas durante la partida, no como limpieza posterior.',
        'Conjuntos del trampero de las páginas 15-17, enlazados a los criterios fabricado del Excel.', range_label='15-19')
    add_links('crafting', 'chapter-4', 'Trampero · conjuntos de caza', 16, 'PDF pp.16-18 + XLSX Outfits (Normal)', regular_items,
        'El centro y sur del mapa ya permiten reunir buena parte de las pieles de los conjuntos no legendarios.',
        'Conjuntos no legendarios del trampero, con materiales conservados desde el Excel.', range_label='15-19')
    add_links('crafting', 'chapter-4', 'Trampero · sombreros, accesorios y prendas', 18, 'PDF pp.18-19 + XLSX Clothing', trapper_clothing,
        'Agrupar estas piezas junto a los viajes de Saint Denis y Lemoyne evita dejar docenas de prendas para el final.',
        'Sombreros, accesorios, chalecos, chaparreras y botas del trampero de las páginas 18-19.', range_label='15-19')

    stagecoach = [
        'North Scarlett Meadows — hablar con Alden en Rhodes',
        'South Scarlett Meadows — hablar con Alden en Rhodes',
        'Coach Convoy — hablar con Alden en Rhodes',
        'Fort Riggs — hablar con Hector en Strawberry',
        'Appleseed Timber — hablar con Hector en Strawberry',
        'Owanjila — hablar con Hector en Strawberry',
    ]
    add_links('exploration', 'chapter-3', 'Consejos de robo de diligencias · ventana temporal', 21, 'PDF p.21', [],
        'La fuente advierte que, una vez leída la nota, la diligencia puede desaparecer si no llegas a tiempo.',
        'Los seis consejos de robo de diligencias aparecen en la página 21 y están marcados como sensibles al tiempo.',
        range_label='21', missable=True, checklist=stagecoach)

    robberies = links_for('robbery')
    add_links('exploration', 'chapter-4', 'Robos · negocios y hogares', 21, 'PDF p.21 + HTML Robberies', robberies,
        'Los negocios clandestinos y hogares se pueden cerrar mientras la ruta ya atraviesa Rhodes, Strawberry y Saint Denis.',
        'La página 21 lista cuatro negocios traseros y seis robos de hogares; se reutilizan los checks canónicos del Archivo.', range_label='21')

    dreamcatcher = links_for('completion_requirement', predicate=lambda e: '20 dreamcatchers' in norm(e['name']))
    add_links('collectibles', 'chapter-3', 'Atrapasueños · cadena completa', 21, 'PDF p.21 + HTML 100% Completion Checklist', dreamcatcher,
        'Empezarlos antes del tramo final permite integrarlos en exploración normal.',
        'La fuente pide encontrar 20 dreamcatchers y señala que conducen a un arma secreta.', range_label='21')

    p22 = pdf_page_text(pdf, 22)
    special_chars = [
        'Agnes Dowd', 'Anders Helgerson', 'Armadillo Town Crier', 'Blind Man Cassidy', 'Cave Hermit',
        'Chelonian Master', 'Captain Russell', 'Constipated Man', 'Dorothea', 'Dr Macintosh', 'Eugenics Proponent',
        'Gavin’s Friend', 'Giant', 'Hermit', 'Homeless Vet Mickey', 'Joe Butler', 'Jon', 'Lillian Powell',
        'Mad Preacher', 'Nicholas Timmins', 'Poor Joe', 'Reverend', 'Robot', 'Sonny', 'Soothsayer',
        'Sun Worshipper', 'Thomas Downes', 'Timothy Donahue', 'Tumbleweed Sheriff',
    ]
    add_links('exploration', 'chapter-6', 'Personajes especiales · encuentros del mundo', 22, 'PDF p.22', [],
        'Revisarlos antes del epílogo reduce encuentros pendientes y conserva las apariciones ligadas a Arthur.',
        'La página 22 enumera personajes especiales del mundo.', range_label='22', checklist=special_chars)

    p22_norm = norm(p22)
    valuable_links = links_for('valuable', predicate=lambda e: len(norm(e['name'])) > 3 and norm(e['name']) in p22_norm)
    add_links('collectibles', 'chapter-6', 'Objetos únicos y valiosos · auditoría', 22, 'PDF p.22 + HTML Valuables', valuable_links,
        'Auditar estos objetos antes del cierre evita descubrir tarde piezas únicas que ya pasaron por la historia.',
        'Objetos de valor y coleccionables únicos listados en la página 22 que tienen ficha canónica en el Archivo.', range_label='22')

    requirement_needles = [
        'reach level 10 health stamina and dead eye', 'achieve level 4 bonding', 'take a bath',
        'have 25 chance encounters', 'survive a gang ambush', 'watch a show', 'watch a live show',
        'investigate any 5 shacks', 'play each table game', 'home robbery a shop robbery a coach robbery and a train robbery',
    ]
    supplemental_links = links_for('completion_requirement', predicate=lambda e: any(needle in norm(e['name']) for needle in requirement_needles))
    add_links('completion', 'epilogue-2', '100% · requisitos adicionales', 23, 'PDF p.23 + HTML 100% Completion Checklist', supplemental_links,
        'Haz esta auditoría antes de American Venom para que el porcentaje final no dependa de pequeñas acciones olvidadas.',
        'La página 23 reúne requisitos adicionales de 100% no desarrollados en el resto del documento.',
        range_label='23', checklist=['Get bushwhacked / sufrir una emboscada de camino'])
    add_links('exploration', 'chapter-4', 'Áreas de evento · revisitas antes del epílogo', 23, 'PDF p.23', [],
        'La fuente indica que estas zonas cambian con la historia y recomienda visitarlas a menudo antes de los epílogos.',
        'Áreas de evento con varias etapas que evolucionan durante la historia.', range_label='23', missable=True,
        checklist=['Appleseed Timber Co.', 'Castor’s Ridge', 'Central Union Railroad Camp'])

    found_clothing = links_for('clothing', keys={'complete'})
    add_links('collectibles', 'chapter-4', 'Ropa especial y sombreros únicos', 24, 'PDF p.24 + HTML Clothing Items', found_clothing,
        'A estas alturas ya recorres las tiendas y sastres principales, así que conviene registrar prendas únicas cuando aparecen.',
        'La página 24 distingue sombreros propios, robados y encontrados y describe dónde se vende ropa especial.', range_label='24')

    doc_groups = [
        ('chapter-2', 'Documentos · cartas, invitaciones y recortes', {'Letters', 'Invitations', 'Newspaper Scraps'}),
        ('chapter-4', 'Documentos · periódicos, notas y folletos', {'Newspapers', 'Notes', 'Handbills'}),
        ('epilogue-2', 'Documentos · libros, mapas y archivo final', {'Books', 'Maps', 'Photographs', 'Business Cards', 'Drawings', 'Bounty Posters'}),
    ]
    for chapter, title, groups in doc_groups:
        doc_links = links_for('document', predicate=lambda e, groups=groups: e.get('metadata', {}).get('group') in groups)
        add_links('collectibles', chapter, title, 25, 'PDF pp.25-26 + HTML Documents', doc_links,
            'Recoger documentos por bloques durante la ruta evita convertir las fichas del Archivo en una búsqueda final sin contexto.',
            'Cartas, invitaciones, recortes, periódicos, notas, folletos, libros, mapas y otros documentos listados en las páginas 25-26.',
            range_label='25-26')


def append_pdf_catalog_source_refs(
    source_refs: list[dict[str, Any]],
    entities: list[dict[str, Any]],
    criteria: list[dict[str, Any]],
    pdf: dict[str, Any],
) -> None:
    """Attach late-PDF provenance to existing canonical rows."""
    seen = {row['id'] for row in source_refs}

    def add_ref(target_type: str, target_id: str, page: int, section: str) -> None:
        ref_id = f"source:pdf:p{page}:{slug(target_type)}:{slug(target_id)}"
        if ref_id in seen:
            return
        seen.add(ref_id)
        source_refs.append({
            'id': ref_id,
            'targetType': target_type,
            'targetId': target_id,
            'sourceKind': 'pdf',
            'locator': f'PDF p.{page}',
            'metadata': {'section': section},
        })

    page_categories = {
        15: {'outfit_item', 'outfit'}, 16: {'outfit_item', 'outfit'}, 17: {'outfit_item', 'outfit'},
        18: {'outfit_item', 'outfit', 'clothing'}, 19: {'clothing', 'saddle'}, 20: {'talisman_trinket'},
        22: {'valuable'}, 24: {'clothing'}, 25: {'document'}, 26: {'document'},
        28: {'animal', 'fish'}, 29: {'animal'},
        30: {'equipment', 'talisman_trinket', 'reinforced_equipment', 'satchel', 'weapon_equipment'},
        31: {'fish', 'gang'}, 32: {'plant'}, 33: {'horse', 'horse_coat'}, 34: {'horse', 'horse_coat'},
        35: {'horse', 'horse_coat'}, 36: {'weapon'},
    }
    for page, categories in page_categories.items():
        page_norm = norm(pdf_page_text(pdf, page))
        for entity in entities:
            if entity.get('category') not in categories:
                continue
            entity_norm = norm(entity['name'])
            if len(entity_norm) >= 4 and entity_norm in page_norm:
                add_ref('entity', entity['id'], page, 'Reference Catalogue')

    card_pages = {
        'Famous Gunslingers': 37, 'Stars of the Stage': 38, 'Americans': 39, 'Fauna of America': 40,
        'Flora of America': 41, 'Gems of Beauty': 42, 'World Champions': 43, 'Vistas of America': 44,
        'Artists, Writers, & Poets': 45, 'Amazing Inventions': 46, 'Marvels of Travel': 47, 'Breeds of Horses': 48,
    }
    for entity in entities:
        if entity.get('category') != 'cigarette_card':
            continue
        page = card_pages.get(str(entity.get('metadata', {}).get('set') or ''))
        if page:
            add_ref('entity', entity['id'], page, 'Cigarette Cards')

    challenge_pages = {
        'bandit': 49, 'explorer': 49, 'herbalist': 49,
        'gambler': 50, 'horseman': 50, 'master hunter': 50,
        'sharpshooter': 51, 'survivalist': 51, 'weapons expert': 51,
    }
    entity_lookup = {e['id']: e for e in entities}
    for criterion in criteria:
        entity = entity_lookup.get(criterion['entityId'])
        if not entity or entity.get('category') != 'challenge':
            continue
        page = challenge_pages.get(norm(entity['name']))
        if page:
            add_ref('criterion', criterion['id'], page, 'Challenges')


def append_distributed_completion_milestones(
    milestones: list[dict[str, Any]],
    entities: list[dict[str, Any]],
    criteria: list[dict[str, Any]],
) -> None:
    """Turn the checklist/reference pages into chapter-distributed operational sessions.

    The source owns the catalog and checks. Chapter placement is explicitly marked as
    editorial inference whenever the checklist does not state an exact unlock window.
    A criterion is assigned to at most one generated session so progress never has a
    second semantic owner just because the route references it again.
    """
    used: set[str] = {
        criterion_id
        for milestone in milestones
        for criterion_id in (milestone.get('metadata') or {}).get('linkCriterionIds', [])
    }
    criteria_by_entity: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for criterion in criteria:
        criteria_by_entity[criterion['entityId']].append(criterion)

    def pick(
        category: str,
        *,
        predicate=lambda entity: True,
        keys: set[str] | None = None,
        limit: int | None = None,
    ) -> list[str]:
        selected: list[str] = []
        for entity in sorted((e for e in entities if e.get('category') == category and predicate(e)), key=lambda e: norm(e['name'])):
            for criterion in sorted(criteria_by_entity.get(entity['id'], []), key=lambda c: c['key']):
                if keys is not None and criterion['key'] not in keys:
                    continue
                if criterion['id'] in used:
                    continue
                selected.append(criterion['id'])
                if limit is not None and len(selected) >= limit:
                    return selected
        return selected

    def add(
        kind: str,
        chapter: str,
        title: str,
        page: int,
        links: list[str],
        why_now: str,
        details: str,
        source_extra: str,
        *,
        missable: bool = False,
    ) -> None:
        unique = [criterion_id for criterion_id in links if criterion_id not in used]
        if not unique:
            return
        used.update(unique)
        milestones.append({
            'id': f"milestone:{kind}:{chapter}:{slug(title)}",
            'kind': kind,
            'chapter': chapter,
            'title': title,
            'order': 91000 + len(milestones),
            'sourcePage': page,
            'sourceReference': f"PDF p.{page} + {source_extra}",
            'missableRisk': missable,
            'availability': {'chapter': chapter, 'editorialInference': True},
            'details': details,
            'checklist': [],
            'metadata': {
                'editorialInference': True,
                'linkCriterionIds': unique,
                'whyNow': why_now,
                'distributedCompletion': True,
            },
        })

    # Fishing. The locations and bait come from the Excel; the PDF provides the fish
    # compendium and legendary-fish checklist. Chapter placement is editorial.
    add('fishing', 'chapter-2', 'Pesca temprana · ríos y lagos', 31,
        pick('fish', predicate=lambda e: not e.get('metadata', {}).get('legendary') and any(t in str(e.get('metadata', {}).get('location', '')).lower() for t in ['map-wide', 'dakota', "o'creagh", 'northern']), keys={'caught'}, limit=7),
        'Aprovecha el acceso temprano a caña, ríos y lagos para quitar especies comunes antes de que la ruta se vuelva más urbana.',
        'Primera expedición de pesca sobre especies comunes del compendio.', 'XLSX Fish')
    add('fishing', 'chapter-3', 'Pesca de Lemoyne', 31,
        pick('fish', predicate=lambda e: not e.get('metadata', {}).get('legendary') and any(t in str(e.get('metadata', {}).get('location', '')).lower() for t in ['lemoyne', 'swamp', 'southern', "clemen"]), keys={'caught'}, limit=7),
        'Clemens Point y los pantanos colocan varias especies del sur en la ruta natural del capítulo.',
        'Barrido de peces del sur y pantano, manteniendo cebo y clima del Excel.', 'XLSX Fish')
    add('fishing', 'chapter-6', 'Peces legendarios · norte y este', 31,
        pick('fish', predicate=lambda e: e.get('metadata', {}).get('legendary') and 'new austin' not in str(e.get('metadata', {}).get('location', '')).lower(), keys={'caught'}, limit=8),
        'Antes del cierre de Arthur conviene reducir el bloque legendario que ya está accesible fuera de New Austin.',
        'Expedición editorial de peces legendarios fuera de New Austin.', 'XLSX Fish')
    add('fishing', 'epilogue-2', 'Pesca final · New Austin', 31,
        pick('fish', predicate=lambda e: e.get('metadata', {}).get('legendary') and 'new austin' in str(e.get('metadata', {}).get('location', '')).lower(), keys={'caught'}),
        'El epílogo abre el barrido occidental que no debe quedar enterrado después de American Venom.',
        'Peces legendarios cuya localización del Excel está en New Austin.', 'XLSX Fish')

    # Hunting sessions use independent animal criteria. Materials still live in inventory;
    # these checks only represent the actual compendium actions from the workbook.
    add('hunting', 'chapter-3', 'Caza de Lemoyne · pieles y estudio', 29,
        pick('animal', predicate=lambda e: not e.get('metadata', {}).get('legendary') and 'LEMOYNE' in str(e.get('metadata', {}).get('location', '')).upper(), keys={'killed', 'skinned'}, limit=24),
        'El traslado a Clemens Point convierte Lemoyne en una zona eficiente para caza, campamento y futuras recetas.',
        'Sesión regional de caza basada en localizaciones y criterios específicos del Excel.', 'XLSX Animals')
    add('hunting', 'chapter-6', 'Caza legendaria · cierre de Arthur', 28,
        pick('animal', predicate=lambda e: e.get('metadata', {}).get('legendary') and 'new austin' not in str(e.get('metadata', {}).get('location', '')).lower(), keys={'killed', 'skinned'}, limit=20),
        'Cerrar legendarios accesibles ahora reduce el trabajo de compendio y desbloquea materiales de trampero y perista.',
        'Barrido de animales legendarios listados por la sección de compendio.', 'XLSX Animals')
    add('hunting', 'epilogue-2', 'Caza de New Austin', 29,
        pick('animal', predicate=lambda e: 'NEW AUSTIN' in str(e.get('metadata', {}).get('location', '')).upper(), keys={'killed', 'skinned'}, limit=28),
        'La zona occidental concentra fauna que el resto de la partida no permite limpiar de forma natural.',
        'Expedición final de fauna localizada por el Excel en New Austin.', 'XLSX Animals')

    # Crafting passes. Crafted/obtained remain criteria; ingredient quantities remain inventory.
    add('crafting', 'chapter-3', 'Mejoras de campamento · segunda sesión', 12,
        pick('camp_upgrade', keys={'crafted'}, limit=12),
        'Usa las pieles acumuladas para convertir caza en mejoras reales antes del siguiente traslado.',
        'Mejoras fabricables del campamento, separadas del inventario de materiales.', 'XLSX Camp')
    add('crafting', 'chapter-4', 'Sillas del trampero', 19,
        pick('saddle', keys={'crafted'}),
        'Con más fauna estudiada y despellejada ya puedes transformar materiales en equipo de caballo útil.',
        'Sesión de fabricación de sillas del trampero.', 'PDF p.19 + XLSX Saddles')
    add('crafting', 'chapter-6', 'Talismanes y abalorios del perista', 20,
        pick('talisman_trinket', keys={'obtained'}, limit=16),
        'Los materiales legendarios tienen valor cuando se convierten en mejoras permanentes, no cuando envejecen en el inventario.',
        'Bloque de talismanes y abalorios del perista.', 'XLSX Equipment')

    # Challenge passes distribute all remaining ranks. Rank 1 is already an early pass.
    for chapter, title, ranks in [
        ('chapter-3', 'Desafíos · rangos 2 a 3', {'rank-2', 'rank-3'}),
        ('chapter-4', 'Desafíos · rangos 4 a 5', {'rank-4', 'rank-5'}),
        ('chapter-6', 'Desafíos · rangos 6 a 8', {'rank-6', 'rank-7', 'rank-8'}),
        ('epilogue-2', 'Desafíos · rangos 9 y 10', {'rank-9', 'rank-10'}),
    ]:
        add('challenge', chapter, title, 49,
            pick('challenge', keys=ranks),
            'Repartir los 90 rangos durante la partida evita convertir el postgame en una lista de deberes.',
            'Pase editorial sobre rangos explícitos de los nueve desafíos de las páginas 49-51.', 'PDF pp.49-51 + HTML auditedChallenges')

    # Compendium passes deliberately use different criteria from hunting so no criterion has
    # two route owners.
    add('compendium', 'chapter-2', 'Compendio · New Hanover y Ambarino', 29,
        pick('animal', predicate=lambda e: any(t in str(e.get('metadata', {}).get('location', '')).upper() for t in ['NEW HANOVER', 'AMBARINO']), keys={'studied', 'tracked'}, limit=28),
        'Estudiar y rastrear mientras viajas por el noreste evita volver exclusivamente por el compendio.',
        'Barrido temprano de fauna regional.', 'XLSX Animals')
    add('compendium', 'chapter-3', 'Herbario · primera pasada', 32,
        pick('plant', keys={'picked'}, limit=15),
        'Recolectar una primera tanda al desplazarte mantiene Herbalist y recetas avanzando con la historia.',
        'Primera tanda de plantas del compendio.', 'XLSX Plants')
    add('compendium', 'chapter-4', 'Caballos · estudio y pelajes', 33,
        pick('horse', keys={'studied'}, limit=12),
        'La red de establos y desplazamientos del centro del mapa permite avanzar razas sin montar una sesión final artificial.',
        'Pase de estudio de razas de caballo.', 'XLSX Horses')
    add('compendium', 'chapter-6', 'Arsenal · adquisiciones pendientes', 36,
        pick('weapon', keys={'obtained'}, limit=18),
        'Antes del cierre conviene revisar armas disponibles y únicas en vez de descubrir huecos después.',
        'Pase de armas del compendio y Archivo.', 'XLSX Weapons')
    add('compendium', 'epilogue-2', 'Compendio · fauna occidental', 29,
        pick('animal', predicate=lambda e: 'NEW AUSTIN' in str(e.get('metadata', {}).get('location', '')).upper(), keys={'studied', 'tracked'}, limit=24),
        'New Austin es el último gran bloque geográfico; limpiarlo aquí evita un postgame dedicado solo a estudiar animales.',
        'Estudio y rastreo de fauna occidental.', 'XLSX Animals')

    # Points of interest and cigarette cards are ideal regional sweeps because the source
    # already groups/locates them geographically.
    poi_chapters = {
        'New Hanover': 'chapter-2', 'Ambarino': 'chapter-2', 'Lemoyne': 'chapter-3',
        'West Elizabeth': 'epilogue-1', 'New Austin': 'epilogue-2',
    }
    for region, chapter in poi_chapters.items():
        add('collectibles', chapter, f'Puntos de interés · {region}', 8,
            pick('point_of_interest', predicate=lambda e, region=region: e.get('metadata', {}).get('group') == region, keys={'complete'}),
            f'Aprovecha los trayectos por {region} para registrar puntos de interés sin crear una excursión final gigantesca.',
            f'Barrido regional de puntos de interés de {region}.', 'HTML Points of Interest')

    card_chapters = {
        'New Hanover': 'chapter-2', 'Lemoyne': 'chapter-3', 'West Elizabeth': 'epilogue-1', 'New Austin': 'epilogue-2',
    }
    for region, chapter in card_chapters.items():
        add('collectibles', chapter, f'Cromos · {region}', 37,
            pick('cigarette_card', predicate=lambda e, region=region: e.get('metadata', {}).get('state') == region, keys={'obtained'}, limit=24),
            f'Los cromos de {region} se integran en los viajes del capítulo en vez de reservarse para una limpieza posterior.',
            f'Ruta regional de cromos con las localizaciones detalladas del Excel.', 'PDF pp.37-48 + XLSX Cigarette Cards')

    # Bounties are explicitly grouped by town in PDF p.9. John-only restrictions remain in
    # the source data; chapter placement below is the practical route grouping.
    bounty_groups = [
        ('chapter-2', 'Recompensas · Valentine y Strawberry', {'Valentine', 'Strawberry'}),
        ('chapter-3', 'Recompensas · Rhodes', {'Rhodes'}),
        ('chapter-4', 'Recompensas · Saint Denis', {'Saint Denis'}),
        ('epilogue-2', 'Recompensas · Blackwater y Tumbleweed', {'Blackwater', 'Tumbleweed'}),
    ]
    for chapter, title, groups in bounty_groups:
        add('bounty', chapter, title, 9,
            pick('bounty', predicate=lambda e, groups=groups: e.get('metadata', {}).get('group') in groups, keys={'complete'}),
            'Agrupar recompensas por la ciudad que ya atraviesa la ruta reduce viajes redundantes.',
            'Cazarrecompensas por localidad según la lista del PDF.', 'HTML Bounties')

    # Chance encounters. The PDF requires 25 for 100%; the HTML catalog is more exhaustive,
    # so the route exposes every regional record without pretending that all are mandatory 100%.
    encounter_groups = [
        ('chapter-2', 'Encuentros · cualquier lugar', 'Any Location'),
        ('chapter-2', 'Encuentros · New Hanover', 'New Hanover'),
        ('chapter-2', 'Encuentros · Ambarino', 'Ambarino'),
        ('chapter-3', 'Encuentros · Lemoyne', 'Lemoyne'),
        ('chapter-5', 'Encuentros · Guarma', 'Guarma'),
        ('epilogue-1', 'Encuentros · West Elizabeth', 'West Elizabeth'),
        ('epilogue-2', 'Encuentros · New Austin', 'New Austin'),
    ]
    for chapter, title, group in encounter_groups:
        add('exploration', chapter, title, 23,
            pick('encounter', predicate=lambda e, group=group: e.get('metadata', {}).get('group') == group, keys={'complete'}),
            'Registrar encuentros mientras aparecen conserva el ritmo y evita perseguir 25 eventos al final.',
            f'Barrido regional del Archivo para {group}.', 'HTML Random Encounters')

    add('exploration', 'chapter-3', 'Robos y negocios clandestinos', 21,
        pick('robbery', keys={'complete'}),
        'Combina robos con desplazamientos de historia para que no se conviertan en viajes aislados.',
        'Robos de casas y negocios del Archivo.', 'HTML Robberies')
    add('exploration', 'epilogue-2', 'Guaridas de bandas · limpieza final', 31,
        pick('gang_hideout', keys={'complete'}),
        'Las guaridas restantes encajan en el barrido territorial del epílogo.',
        'Guaridas de bandas catalogadas por OUTLAW100.', 'HTML Gang Hideouts')

def link_compendium_media(entities: list[dict[str, Any]], html: dict[str, Any]) -> list[dict[str, Any]]:
    assets = [dict(asset) for asset in html.get('mediaAssets', [])]
    image_map = html.get('compendiumImages', {}) or {}
    translations = html.get('translations', {}) or {}
    preferred = {'animal': 0, 'fish': 1, 'horse': 2, 'plant': 3, 'horse_coat': 4}
    assigned: set[str] = set()
    for alias, public_path in image_map.items():
        alias_norm = norm(alias)
        candidates = [
            entity for entity in entities
            if norm(entity.get('name', '')) == alias_norm
            or norm(translations.get(entity.get('name', ''), '')) == alias_norm
        ]
        candidates.sort(key=lambda entity: (preferred.get(str(entity.get('category')), 99), entity['id']))
        if not candidates:
            continue
        entity = candidates[0]
        if entity['id'] in assigned:
            continue
        assigned.add(entity['id'])
        assets.append({
            'id': f"entity-media:{slug(entity['id'])}:{short_hash(str(public_path))}",
            'entityId': entity['id'],
            'kind': 'image',
            'source': 'html-realCompendiumImages',
            'publicPath': str(public_path),
            'metadata': {'legacyAlias': alias},
        })
    return assets


def append_media_source_refs(source_refs: list[dict[str, Any]], media_assets: list[dict[str, Any]]) -> None:
    seen = {row['id'] for row in source_refs}
    for asset in media_assets:
        if asset.get('source') != 'html-realCompendiumImages':
            continue
        alias = str(asset.get('metadata', {}).get('legacyAlias') or asset.get('id'))
        ref_id = f"source:html:real-compendium-image:{short_hash(asset['id'])}"
        if ref_id in seen:
            continue
        seen.add(ref_id)
        source_refs.append({
            'id': ref_id,
            'targetType': 'media_asset',
            'targetId': asset['id'],
            'sourceKind': 'html',
            'locator': f'realCompendiumImages:{alias}',
            'metadata': {'section': 'realCompendiumImages', 'legacyAlias': alias},
        })


def build(xlsx: dict[str, Any], pdf: dict[str, Any], html: dict[str, Any]) -> dict[str, Any]:
    entities = [dict(e) for e in xlsx['entities']]
    criteria = [dict(c) for c in xlsx['criteria']]
    relations = [dict(r) for r in xlsx['relations']]
    recipes = [dict(r) for r in xlsx['recipes']]
    source_refs = [dict(r) for r in xlsx['sourceReferences']]

    by_name: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for entity in entities:
        by_name[norm(entity['name'])].append(entity)

    archive_entries: list[dict[str, Any]] = []
    archive_created: dict[tuple[str, str], dict[str, Any]] = {}
    for row in html['sourceArchive']:
        section = row.get('section') or 'Archive'
        name = row.get('name') or row['id']
        existing = choose_existing(by_name.get(norm(name), []), section)
        if existing is None:
            key = (section, norm(name))
            existing = archive_created.get(key)
            if existing is None:
                etype, category = SECTION_TYPE.get(section, ('archive_item', 'archive'))
                entity_id = f"{etype}:{slug(name)}:{short_hash(section + '|' + name)}"
                existing = {
                    'id': entity_id,
                    'type': etype,
                    'name': name,
                    'category': category,
                    'metadata': {
                        'archiveSection': section,
                        'group': row.get('group') or '',
                        'subgroup': row.get('subgroup') or '',
                        'missable': bool(row.get('missable')),
                    },
                    'source': {'kind': 'html', 'archiveId': row['id']},
                }
                entities.append(existing)
                archive_created[key] = existing
                by_name[norm(name)].append(existing)
                criterion_id = f"criterion:{slug(entity_id)}-complete"
                criteria.append({
                    'id': criterion_id,
                    'entityId': entity_id,
                    'key': 'complete',
                    'label': 'Completado',
                    'criterionType': 'boolean',
                    'source': {'kind': 'html', 'archiveId': row['id']},
                })
        archive_entries.append({
            'id': row['id'],
            'entityId': existing['id'],
            'section': section,
            'group': row.get('group') or '',
            'subgroup': row.get('subgroup') or '',
            'name': name,
            'missable': bool(row.get('missable')),
        })
        source_refs.append({
            'id': f"source:html:{row['id']}",
            'targetType': 'entity',
            'targetId': existing['id'],
            'sourceKind': 'html',
            'locator': f"sourceArchive:{row['id']}",
        })

    # Legacy story nodes preserve the Spanish mission names, hints, givers and real gold objectives
    # that already power the mature dashboard. These coexist with the PDF route milestones, whose
    # ordering remains authoritative. We deliberately do not guess English/Spanish title matches.
    legacy_story_entities: dict[str, str] = {}
    for chapter, groups in html['story'].items():
        for group_index, group in enumerate(groups):
            for mission_index, mission_name in enumerate(group):
                entity_id = f"story-legacy:{slug(mission_name)}"
                legacy_story_entities[mission_name] = entity_id
                gold_rows = html.get('missionGoldObjectives', {}).get(mission_name, [])
                giver = html.get('missionGivers', {}).get(mission_name)
                entities.append({
                    'id': entity_id,
                    'type': 'story_mission',
                    'name': mission_name,
                    'category': 'story_mission_legacy',
                    'metadata': {
                        'chapterLabel': chapter,
                        'groupIndex': group_index,
                        'missionIndex': mission_index,
                        'hint': html.get('missionHints', {}).get(mission_name, ''),
                        'giver': giver,
                        'goldObjectiveCount': len(gold_rows),
                    },
                    'source': {'kind': 'html', 'section': 'story'},
                })
                complete_id = f"criterion:{slug(entity_id)}-complete"
                criteria.append({
                    'id': complete_id,
                    'entityId': entity_id,
                    'key': 'complete',
                    'label': 'Misión completada',
                    'criterionType': 'boolean',
                    'metadata': {},
                    'source': {'kind': 'html', 'section': 'story'},
                })
                source_refs.append({
                    'id': f"source:html:story:{slug(mission_name)}",
                    'targetType': 'entity',
                    'targetId': entity_id,
                    'sourceKind': 'html',
                    'locator': f"story:{chapter}:{mission_name}",
                })
                for objective_index, objective in enumerate(gold_rows, start=1):
                    criterion_id = f"criterion:{slug(entity_id)}-gold-{objective_index}"
                    criteria.append({
                        'id': criterion_id,
                        'entityId': entity_id,
                        'key': f'gold-{objective_index}',
                        'label': objective,
                        'criterionType': 'boolean',
                        'metadata': {'medal': 'gold', 'objectiveIndex': objective_index},
                        'source': {'kind': 'html', 'section': 'missionGoldObjectives'},
                    })
                    source_refs.append({
                        'id': f"source:html:gold:{slug(mission_name)}:{objective_index}",
                        'targetType': 'criterion',
                        'targetId': criterion_id,
                        'sourceKind': 'html',
                        'locator': f"missionGoldObjectives:{mission_name}:{objective_index}",
                    })

    # Nine official challenge strands, each with ten independent completion criteria.
    for challenge_name, ranks in html['auditedChallenges'].items():
        entity_id = f"challenge:{slug(challenge_name)}"
        entity = {
            'id': entity_id,
            'type': 'challenge',
            'name': challenge_name.replace('_', ' ').title(),
            'category': 'challenge',
            'metadata': {'rankCount': len(ranks)},
            'source': {'kind': 'html', 'section': 'auditedChallenges'},
        }
        entities.append(entity)
        for index, rank in enumerate(ranks, start=1):
            criterion_id = f"criterion:{slug(entity_id)}-rank-{index}"
            criteria.append({
                'id': criterion_id,
                'entityId': entity_id,
                'key': f'rank-{index}',
                'label': rank[1],
                'criterionType': 'boolean',
                'metadata': {'rankLabel': rank[0], 'hint': rank[2] if len(rank) > 2 else ''},
                'source': {'kind': 'html', 'section': 'auditedChallenges'},
            })
            source_refs.append({
                'id': f"source:html:{slug(challenge_name)}:rank-{index}",
                'targetType': 'criterion',
                'targetId': criterion_id,
                'sourceKind': 'html',
                'locator': f"auditedChallenges:{challenge_name}:{index}",
            })

    milestones = [dict(m) for m in pdf['milestones']]
    for chapter_label, intel in html.get('chapterIntel', {}).items():
        chapter_key = CHAPTER_LABEL_TO_KEY.get(chapter_label)
        if not chapter_key:
            continue
        milestones.append({
            'id': f"milestone:chapter_sweep:{chapter_key}",
            'kind': 'chapter_sweep',
            'chapter': chapter_key,
            'title': intel['title'].capitalize(),
            'order': 90000 + len(milestones),
            'sourcePage': 0,
            'sourceReference': f"HTML chapterIntel:{chapter_label}",
            'missableRisk': bool(intel.get('watch')),
            'availability': {'chapter': chapter_key},
            'details': intel.get('summary', ''),
            'checklist': [],
            'metadata': {'intel': intel, 'sourceChapterLabel': chapter_label},
        })
        for now_index, now_row in enumerate(intel.get('now', []), start=1):
            title, description = now_row[0], now_row[1]
            linked = source_backed_intel_links(title, entities, criteria)
            milestones.append({
                'id': f"milestone:intel:{chapter_key}:{slug(title)}",
                'kind': chapter_intel_kind(title, description),
                'chapter': chapter_key,
                'title': title,
                'order': 90200 + len(milestones),
                'sourcePage': 0,
                'sourceReference': f"HTML chapterIntel:{chapter_label}",
                'missableRisk': False,
                'availability': {'chapter': chapter_key},
                'details': description,
                'checklist': [],
                'metadata': {
                    'promotedChapterIntel': True,
                    'sourceChapterLabel': chapter_label,
                    'sourceNowIndex': now_index,
                    'linkCriterionIds': linked,
                    'whyNow': intel.get('summary', ''),
                },
            })
    append_editorial_source_milestones(milestones, entities, criteria)
    append_pdf_reference_milestones(milestones, pdf)
    append_pdf_deep_route_milestones(milestones, entities, criteria, pdf)
    append_distributed_completion_milestones(milestones, entities, criteria)
    milestones = interleave_editorial_route(milestones)
    milestone_tasks: list[dict[str, Any]] = []
    for milestone in milestones:
        linked_criteria = list((milestone.get('metadata') or {}).get('linkCriterionIds') or [])
        if linked_criteria:
            criterion_lookup = {row['id']: row for row in criteria}
            entity_lookup = {row['id']: row for row in entities}
            for linked_index, criterion_id in enumerate(linked_criteria, start=1):
                criterion = criterion_lookup.get(criterion_id)
                if not criterion:
                    continue
                entity = entity_lookup.get(criterion['entityId'])
                milestone_tasks.append({
                    'id': f"task:{slug(milestone['id'])}:criterion-{linked_index}",
                    'milestoneId': milestone['id'],
                    'taskType': 'criterion',
                    'label': f"{entity['name'] if entity else criterion['entityId']} · {criterion['label']}",
                    'order': linked_index,
                    'sourceReference': milestone['sourceReference'],
                    'sourcePage': milestone['sourcePage'],
                    'entityId': criterion['entityId'],
                    'criterionId': criterion_id,
                    'metadata': {'kind': milestone['kind'], 'canonicalCriterion': True},
                })
        elif not (milestone.get('checklist') or []):
            base_id = f"task:{slug(milestone['id'])}:complete"
            milestone_tasks.append({
                'id': base_id,
                'milestoneId': milestone['id'],
                'taskType': 'editorial',
                'label': f"Completar: {milestone['title']}",
                'order': 0,
                'sourceReference': milestone['sourceReference'],
                'sourcePage': milestone['sourcePage'],
                'entityId': None,
                'criterionId': None,
                'metadata': {'kind': milestone['kind']},
            })
        for index, item in enumerate(milestone.get('checklist') or [], start=1):
            label = item if isinstance(item, str) else item.get('label') or item.get('text') or json.dumps(item, ensure_ascii=False)
            milestone_tasks.append({
                'id': f"task:{slug(milestone['id'])}:check-{index}",
                'milestoneId': milestone['id'],
                'taskType': 'editorial',
                'label': label,
                'order': index,
                'sourceReference': milestone['sourceReference'],
                'sourcePage': milestone['sourcePage'],
                'entityId': None,
                'criterionId': None,
                'metadata': {'sourceChecklist': True},
            })
        source_refs.append({
            'id': f"source:pdf:{slug(milestone['id'])}",
            'targetType': 'milestone',
            'targetId': milestone['id'],
            'sourceKind': 'pdf',
            'locator': milestone['sourceReference'],
        })

    map_markers: list[dict[str, Any]] = []
    for hotspot in html['mapHotspots']:
        map_markers.append({
            'id': f"marker:hotspot:{hotspot['id']}",
            'entityId': None,
            'name': hotspot['title'],
            'category': hotspot.get('type', 'hotspot'),
            'latitude': None,
            'longitude': None,
            'legacyX': hotspot.get('x'),
            'legacyY': hotspot.get('y'),
            'coordinateSystem': 'legacy-image',
            'metadata': {k: v for k, v in hotspot.items() if k not in {'id', 'title', 'x', 'y', 'type'}},
            'source': {'kind': 'html', 'section': 'mapHotspots'},
        })
    for chain in html['secretChains']:
        secret_entity_id = f"secret:{slug(chain['id'])}"
        if not any(e['id'] == secret_entity_id for e in entities):
            entities.append({
                'id': secret_entity_id,
                'type': 'secret',
                'name': chain['name'],
                'category': 'secret',
                'metadata': {
                    'original': chain.get('original'),
                    'subtitle': chain.get('subtitle'),
                    'availableFrom': chain.get('availableFrom'),
                    'official100': chain.get('official100'),
                    'description': chain.get('description'),
                },
                'source': {'kind': 'html', 'section': 'secretChains'},
            })
        for index, step in enumerate(chain.get('steps') or [], start=1):
            criterion_id = f"criterion:{slug(secret_entity_id)}:{slug(step['id'])}"
            criteria.append({
                'id': criterion_id,
                'entityId': secret_entity_id,
                'key': step['id'],
                'label': step['label'],
                'criterionType': 'derived' if step.get('auto') else 'boolean',
                'metadata': {'description': step.get('desc', ''), 'kind': step.get('kind', '')},
                'source': {'kind': 'html', 'section': 'secretChains'},
            })
            if step.get('map'):
                map_markers.append({
                    'id': f"marker:secret:{slug(chain['id'])}:{slug(step['id'])}",
                    'entityId': secret_entity_id,
                    'criterionId': criterion_id,
                    'name': step['label'],
                    'category': 'secret',
                    'latitude': step['map'].get('lat'),
                    'longitude': step['map'].get('lng'),
                    'legacyX': None,
                    'legacyY': None,
                    'coordinateSystem': 'rdr2-map',
                    'metadata': {'description': step.get('desc', '')},
                    'source': {'kind': 'html', 'section': 'secretChains'},
                })

    append_pdf_catalog_source_refs(source_refs, entities, criteria, pdf)
    media_assets = link_compendium_media(entities, html)
    append_media_source_refs(source_refs, media_assets)

    entity_ids = [e['id'] for e in entities]
    criterion_ids = [c['id'] for c in criteria]
    entity_set = set(entity_ids)
    criterion_set = set(criterion_ids)
    orphan_criteria = [c for c in criteria if c['entityId'] not in entity_set]
    orphan_relations = [r for r in relations if r['fromId'] not in entity_set or r['toId'] not in entity_set]
    invalid_recipe_entities = [r for r in recipes if r['entityId'] not in entity_set]
    invalid_recipe_materials = [
        req for recipe in recipes for req in recipe.get('requirements', []) if req['materialId'] not in entity_set
    ]
    challenge_entity_ids = {e['id'] for e in entities if e.get('category') == 'challenge'}
    challenge_criteria = sum(1 for c in criteria if c['entityId'] in challenge_entity_ids)

    pdf_referenced_pages: set[int] = set()
    for source_ref in source_refs:
        if source_ref.get('sourceKind') != 'pdf':
            continue
        for match in re.finditer(r'PDF pp?\.(\d+)(?:-(\d+))?', str(source_ref.get('locator') or '')):
            start_page = int(match.group(1))
            end_page = int(match.group(2) or start_page)
            pdf_referenced_pages.update(range(start_page, end_page + 1))

    story = [m for m in milestones if m['kind'] == 'story']
    audit = {
        'xlsxSheets': xlsx['audit']['visitedSheets'],
        'xlsxMissingSheets': xlsx['audit']['missingSheets'],
        'pdfPages': pdf['audit']['pagesConsumed'],
        'pdfReferencedContentPages': sorted(pdf_referenced_pages),
        'htmlBuild': html['audit']['sourceBuild'],
        'entityCount': len(entities),
        'criterionCount': len(criteria),
        'relationCount': len(relations),
        'recipeCount': len(recipes),
        'milestoneCount': len(milestones),
        'pdfMilestoneCount': len(pdf['milestones']),
        'milestoneTaskCount': len(milestone_tasks),
        'archiveEntriesMapped': len(archive_entries),
        'mapMarkerCount': len(map_markers),
        'mediaAssetCount': len(media_assets),
        'entityImageCount': len({asset.get('entityId') for asset in media_assets if asset.get('entityId')}),
        'duplicateEntityIds': len(entity_ids) - len(entity_set),
        'duplicateCriterionIds': len(criterion_ids) - len(criterion_set),
        'orphanCriteria': len(orphan_criteria),
        'orphanRelations': len(orphan_relations),
        'invalidRecipeEntities': len(invalid_recipe_entities),
        'invalidRecipeMaterials': len(invalid_recipe_materials),
        'challengeCriteria': challenge_criteria,
        'legacyStoryMissionCount': len(legacy_story_entities),
        'legacyGoldMissionCount': len(html.get('missionGoldObjectives', {})),
        'legacyGoldObjectiveCount': sum(len(rows) for rows in html.get('missionGoldObjectives', {}).values()),
        'chapterSweepCount': sum(1 for m in milestones if m['kind'] == 'chapter_sweep'),
        'hasColter': any(m['chapter'] == 'chapter-1' for m in story),
        'hasAmericanVenom': any(m['title'] == 'American Venom' for m in story),
        'milestoneKinds': dict(Counter(m['kind'] for m in milestones)),
        'archiveSections': dict(Counter(row['section'] for row in archive_entries)),
    }

    return {
        'version': 1,
        'entities': entities,
        'criteria': criteria,
        'relations': relations,
        'recipes': recipes,
        'milestones': milestones,
        'milestoneTasks': milestone_tasks,
        'archiveEntries': archive_entries,
        'mapMarkers': map_markers,
        'mediaAssets': media_assets,
        'sourceReferences': source_refs,
        'translations': html['translations'],
        'mapCanonicalAliases': html['mapCanonicalAliases'],
        'mapSources': html['mapSources'],
        'designTokens': html['designTokens'],
        'fontAsset': html['fontAsset'],
        'audit': audit,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--xlsx', required=True, type=Path)
    parser.add_argument('--pdf', required=True, type=Path)
    parser.add_argument('--html', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    xlsx = json.loads(args.xlsx.read_text())
    pdf = json.loads(args.pdf.read_text())
    html = json.loads(args.html.read_text())
    catalog = build(xlsx, pdf, html)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(catalog['audit'], ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
