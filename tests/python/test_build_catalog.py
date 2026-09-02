import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BUILDER = ROOT / 'scripts' / 'build_catalog.py'


class CatalogBuilderTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.output = Path(cls.temp.name) / 'catalog.json'
        proc = subprocess.run([
            'python3', str(BUILDER),
            '--xlsx', str(ROOT / 'data/generated/xlsx-catalog.json'),
            '--pdf', str(ROOT / 'data/generated/pdf-route.json'),
            '--html', str(ROOT / 'data/generated/html-metadata.json'),
            '--output', str(cls.output),
        ], cwd=ROOT, text=True, capture_output=True)
        if proc.returncode != 0:
            raise AssertionError(proc.stderr)
        cls.catalog = json.loads(cls.output.read_text())

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_preserves_xlsx_catalog_and_has_no_orphans_or_duplicate_ids(self):
        c = self.catalog
        x = json.loads((ROOT / 'data/generated/xlsx-catalog.json').read_text())
        self.assertTrue({e['id'] for e in x['entities']} <= {e['id'] for e in c['entities']})
        entity_ids = [e['id'] for e in c['entities']]
        criterion_ids = [x['id'] for x in c['criteria']]
        self.assertEqual(len(entity_ids), len(set(entity_ids)))
        self.assertEqual(len(criterion_ids), len(set(criterion_ids)))
        valid_entities = set(entity_ids)
        self.assertFalse([x for x in c['criteria'] if x['entityId'] not in valid_entities])
        self.assertEqual(c['audit']['orphanCriteria'], 0)
        self.assertEqual(c['audit']['orphanRelations'], 0)

    def test_compendium_images_are_linked_to_canonical_entities_as_media_assets(self):
        c = self.catalog
        by_entity = {asset.get('entityId'): asset for asset in c['mediaAssets'] if asset.get('entityId')}
        alligator = next(e for e in c['entities'] if e['name'] == 'American Alligator')
        tobacco = next(e for e in c['entities'] if e['name'] == 'Indian Tobacco')
        self.assertIn(alligator['id'], by_entity)
        self.assertTrue(by_entity[alligator['id']]['publicPath'].startswith('https://www.gtabase.com/'))
        self.assertIn(tobacco['id'], by_entity)
        self.assertTrue(by_entity[tobacco['id']]['publicPath'].startswith('/media/'))
        self.assertGreaterEqual(c['audit']['entityImageCount'], 13)

    def test_every_html_archive_record_maps_to_one_canonical_entity(self):
        c = self.catalog
        html = json.loads((ROOT / 'data/generated/html-metadata.json').read_text())
        self.assertEqual(len(c['archiveEntries']), len(html['sourceArchive']))
        ids = {e['id'] for e in c['entities']}
        self.assertTrue(all(row['entityId'] in ids for row in c['archiveEntries']))
        self.assertEqual(c['audit']['archiveEntriesMapped'], len(html['sourceArchive']))

    def test_challenges_are_canonical_entities_with_ninety_rank_criteria(self):
        c = self.catalog
        challenge_entities = [e for e in c['entities'] if e.get('category') == 'challenge']
        challenge_ids = {e['id'] for e in challenge_entities}
        rank_criteria = [x for x in c['criteria'] if x['entityId'] in challenge_ids]
        self.assertEqual(len(challenge_entities), 9)
        self.assertEqual(len(rank_criteria), 90)
        self.assertTrue(all(x['key'].startswith('rank-') for x in rank_criteria))

    def test_pdf_route_is_preserved_and_each_milestone_has_trackable_tasks_and_source(self):
        c = self.catalog
        self.assertEqual(c['audit']['pdfMilestoneCount'], 184)
        self.assertGreaterEqual(len(c['milestones']), 184 + 8 + 19 + 2)
        self.assertEqual(c['milestones'][0]['title'], 'Outlaws from the West')
        pdf_ids = {m['id'] for m in json.loads((ROOT / 'data/generated/pdf-route.json').read_text())['milestones']}
        self.assertTrue(pdf_ids <= {m['id'] for m in c['milestones']})
        milestone_ids = {m['id'] for m in c['milestones']}
        tasks = c['milestoneTasks']
        self.assertTrue(tasks)
        self.assertTrue(all(t['milestoneId'] in milestone_ids for t in tasks))
        self.assertTrue(all(t['sourceReference'].startswith('PDF p') or t['sourceReference'].startswith('HTML chapterIntel:') for t in tasks))
        html = json.loads((ROOT / 'data/generated/html-metadata.json').read_text())
        expected_intel_tasks = len(html['chapterIntel']) + sum(len(intel.get('now', [])) for intel in html['chapterIntel'].values())
        self.assertGreaterEqual(sum(1 for t in tasks if t['sourceReference'].startswith('HTML chapterIntel:')), expected_intel_tasks)
        story = [m for m in c['milestones'] if m['kind'] == 'story']
        self.assertEqual(story[-1]['title'], 'American Venom')

    def test_legacy_story_missions_and_gold_objectives_become_canonical_entities_and_criteria(self):
        c = self.catalog
        story_entities = [e for e in c['entities'] if e.get('category') == 'story_mission_legacy']
        story_ids = {e['id'] for e in story_entities}
        gold = [x for x in c['criteria'] if x['entityId'] in story_ids and x['key'].startswith('gold-')]
        self.assertEqual(len(story_entities), 109)
        self.assertGreater(len(gold), 250)
        outlaw = next(e for e in story_entities if e['name'] == 'Forajidos del Oeste')
        outlaw_gold = [x['label'] for x in gold if x['entityId'] == outlaw['id']]
        self.assertEqual(outlaw_gold[0], 'No recibas daño durante el tiroteo')
        self.assertIn('Termina con al menos un 80% de precisión', outlaw_gold)
        self.assertEqual(c['audit']['legacyGoldMissionCount'], 103)

    def test_editorial_route_interleaves_source_backed_completion_work_across_the_story(self):
        c = self.catalog
        milestones = sorted(c['milestones'], key=lambda row: row['order'])
        sweeps = [m for m in milestones if m['kind'] == 'chapter_sweep']
        self.assertEqual(len(sweeps), 8)
        self.assertEqual(sweeps[0]['metadata']['intel']['title'], 'limpia lo mínimo crítico')
        sheep = next(m for m in milestones if m['title'] == 'The Sheep and the Goats')
        chapter_two_companions = [m for m in milestones if m['kind'] == 'companion_activity' and m['chapter'] == 'chapter-2']
        self.assertTrue(chapter_two_companions)
        self.assertTrue(all(m['order'] < sheep['order'] for m in chapter_two_companions))
        first_ch2_secondary = next(m for m in milestones if m['metadata'].get('editorialChapter') == 'chapter-2' and m['kind'] != 'story')
        american_venom = next(m for m in milestones if m['title'] == 'American Venom')
        self.assertLess(first_ch2_secondary['order'], american_venom['order'])
        self.assertEqual(c['audit']['chapterSweepCount'], 8)

    def test_chapter_intel_actions_are_promoted_to_equal_priority_operational_milestones(self):
        c = self.catalog
        html = json.loads((ROOT / 'data/generated/html-metadata.json').read_text())
        expected = sum(len(intel.get('now', [])) for intel in html['chapterIntel'].values())
        promoted = [m for m in c['milestones'] if m.get('metadata', {}).get('promotedChapterIntel')]
        self.assertEqual(len(promoted), expected)
        kinds = {m['kind'] for m in promoted}
        self.assertTrue({'hunting', 'compendium', 'collectibles', 'exploration'} <= kinds)
        all_kinds = {m['kind'] for m in c['milestones']}
        self.assertTrue({'crafting', 'challenge'} <= all_kinds)
        self.assertTrue(all(m['sourceReference'].startswith('HTML chapterIntel:') for m in promoted))

    def test_source_backed_operational_milestones_link_to_canonical_criteria_when_entities_are_explicit(self):
        c = self.catalog
        criteria_by_id = {row['id']: row for row in c['criteria']}
        entities_by_id = {row['id']: row for row in c['entities']}
        tasks = c['milestoneTasks']

        guarma = next(m for m in c['milestones'] if m['title'] == 'Fauna exclusiva')
        guarma_tasks = [t for t in tasks if t['milestoneId'] == guarma['id'] and t.get('criterionId')]
        self.assertGreaterEqual(len(guarma_tasks), 20)
        self.assertTrue(all('GUARMA' in str(entities_by_id[criteria_by_id[t['criterionId']]['entityId']].get('metadata', {}).get('location', '')).upper() for t in guarma_tasks))

        hunting = next(m for m in c['milestones'] if m['title'] == 'Caza templada')
        hunting_tasks = [t for t in tasks if t['milestoneId'] == hunting['id'] and t.get('criterionId')]
        linked_names = {entities_by_id[criteria_by_id[t['criterionId']]['entityId']]['name'] for t in hunting_tasks}
        self.assertTrue({'American Bison', 'Whitetail Deer', 'North American Beaver', 'American Red Fox'} <= linked_names)

    def test_promoted_operational_milestones_do_not_depend_on_a_second_generic_completion_state(self):
        c = self.catalog
        promoted_ids = {m['id'] for m in c['milestones'] if m.get('metadata', {}).get('promotedChapterIntel')}
        for milestone_id in promoted_ids:
            tasks = [t for t in c['milestoneTasks'] if t['milestoneId'] == milestone_id]
            linked = [t for t in tasks if t.get('criterionId')]
            if linked:
                self.assertFalse(any(t['id'].endswith(':complete') for t in tasks), milestone_id)

    def test_route_distributes_fishing_hunting_crafting_collectibles_challenges_and_compendium_beyond_single_token_nodes(self):
        c = self.catalog
        kinds = c['audit']['milestoneKinds']
        self.assertGreaterEqual(kinds.get('fishing', 0), 3)
        self.assertGreaterEqual(kinds.get('hunting', 0), 4)
        self.assertGreaterEqual(kinds.get('crafting', 0), 4)
        self.assertGreaterEqual(kinds.get('challenge', 0), 4)
        self.assertGreaterEqual(kinds.get('collectibles', 0), 12)
        self.assertGreaterEqual(kinds.get('compendium', 0), 8)
        editorial = [m for m in c['milestones'] if m.get('metadata', {}).get('editorialInference')]
        self.assertTrue(editorial)
        self.assertTrue(all(m['sourcePage'] >= 0 and m['sourceReference'] for m in editorial))
        # The late-game route must still contain completion work before American Venom.
        venom = next(m for m in c['milestones'] if m['title'] == 'American Venom')
        late_side = [m for m in c['milestones'] if m.get('metadata', {}).get('editorialChapter') == 'epilogue-2' and m['kind'] != 'story']
        self.assertTrue(any(m['order'] < venom['order'] for m in late_side))

    def test_pdf_reference_sections_become_operational_editorial_milestones_with_source_checklists(self):
        c = self.catalog
        by_title = {m['title']: m for m in c['milestones']}
        expected = {
            'Tumbas · memoria de la banda': ('graves', 10, 9),
            'Tesoros y mapas · rutas disponibles': ('treasure', 11, 6),
            'Tesoro · The Elemental Trail': ('treasure', 11, 1),
            'Panfletos · recetas y hallazgos': ('pamphlets', 13, 10),
        }
        for title, (kind, page, minimum_tasks) in expected.items():
            self.assertIn(title, by_title)
            milestone = by_title[title]
            self.assertEqual(milestone['kind'], kind)
            self.assertEqual(milestone['sourcePage'], page)
            tasks = [t for t in c['milestoneTasks'] if t['milestoneId'] == milestone['id']]
            self.assertGreaterEqual(len(tasks), minimum_tasks)
            self.assertTrue(all(t['sourcePage'] == page for t in tasks))
            self.assertFalse(any(t['id'].endswith(':complete') for t in tasks))

    def test_source_checklist_milestones_do_not_add_redundant_generic_completion_task(self):
        c = self.catalog
        for milestone in [m for m in c['milestones'] if m.get('checklist')]:
            tasks = [t for t in c['milestoneTasks'] if t['milestoneId'] == milestone['id']]
            self.assertFalse(any(t['id'].endswith(':complete') for t in tasks), milestone['title'])

    def test_late_pdf_reference_pages_are_structured_not_merely_read(self):
        c = self.catalog
        by_title = {m['title']: m for m in c['milestones']}

        pamphlets = by_title['Panfletos · recetas y hallazgos']
        self.assertIn('pp.13-14', pamphlets['sourceReference'])
        pamphlet_tasks = [t for t in c['milestoneTasks'] if t['milestoneId'] == pamphlets['id']]
        self.assertGreaterEqual(len(pamphlet_tasks), 30)

        self.assertIn('Robos · negocios y hogares', by_title)
        self.assertEqual(by_title['Robos · negocios y hogares']['sourcePage'], 21)
        self.assertTrue(by_title['Robos · negocios y hogares']['metadata']['linkCriterionIds'])

        self.assertIn('Áreas de evento · revisitas antes del epílogo', by_title)
        self.assertTrue(by_title['Áreas de evento · revisitas antes del epílogo']['missableRisk'])

        supplemental = by_title['100% · requisitos adicionales']
        self.assertEqual(supplemental['sourcePage'], 23)
        self.assertGreaterEqual(len(supplemental['metadata']['linkCriterionIds']), 7)

    def test_trapper_documents_cards_and_challenges_gain_pdf_provenance_across_their_full_reference_ranges(self):
        c = self.catalog
        refs = c['sourceReferences']

        def pages_for_target(target_id):
            pages = set()
            for row in refs:
                if row.get('targetId') != target_id or row.get('sourceKind') != 'pdf':
                    continue
                locator = row.get('locator', '')
                for token in __import__('re').findall(r'PDF p\.([0-9]+)', locator):
                    pages.add(int(token))
            return pages

        legendary_outfit = next(e for e in c['entities'] if e.get('category') == 'outfit_item')
        self.assertTrue(pages_for_target(legendary_outfit['id']) & set(range(15, 20)))

        document = next(e for e in c['entities'] if e.get('category') == 'document' and pages_for_target(e['id']))
        self.assertTrue(pages_for_target(document['id']) <= {25, 26})

        card_page_refs = {
            int(row['locator'].split('PDF p.')[1])
            for row in refs
            if row.get('sourceKind') == 'pdf' and row.get('targetType') == 'entity' and row.get('locator', '').startswith('PDF p.')
            and row.get('metadata', {}).get('section') == 'Cigarette Cards'
        }
        self.assertEqual(card_page_refs, set(range(37, 49)))

        challenge_page_refs = {
            int(row['locator'].split('PDF p.')[1])
            for row in refs
            if row.get('sourceKind') == 'pdf' and row.get('targetType') == 'criterion'
            and row.get('metadata', {}).get('section') == 'Challenges'
        }
        self.assertEqual(challenge_page_refs, {49, 50, 51})

    def test_documents_and_trapper_crafting_are_distributed_as_operational_route_work(self):
        c = self.catalog
        kinds = c['audit']['milestoneKinds']
        trapper = [m for m in c['milestones'] if m.get('metadata', {}).get('pdfReferenceRange') == '15-19']
        docs = [m for m in c['milestones'] if m.get('metadata', {}).get('pdfReferenceRange') == '25-26']
        self.assertGreaterEqual(len(trapper), 2)
        self.assertGreaterEqual(len(docs), 3)
        self.assertTrue(all(m.get('metadata', {}).get('linkCriterionIds') for m in trapper + docs))
        self.assertGreaterEqual(kinds.get('crafting', 0), 6)
        self.assertGreaterEqual(kinds.get('collectibles', 0), 15)

    def test_map_and_media_metadata_survive_without_rdo_sources(self):
        c = self.catalog
        self.assertGreaterEqual(len(c['mapMarkers']), 13)
        embedded = [m for m in c['mediaAssets'] if m.get('source') == 'html-embedded']
        compendium = [m for m in c['mediaAssets'] if m.get('source') == 'html-realCompendiumImages']
        self.assertEqual(len(embedded), 5)
        self.assertEqual(len(compendium), 14)
        self.assertTrue(any(m.get('latitude') is not None for m in c['mapMarkers']))
        serialized = json.dumps(c)
        self.assertNotIn('RDOMap', serialized)

    def test_compendium_media_assets_have_explicit_html_source_references(self):
        c = self.catalog
        media_ids = {
            asset['id'] for asset in c['mediaAssets']
            if asset.get('source') == 'html-realCompendiumImages'
        }
        referenced = {
            row['targetId'] for row in c['sourceReferences']
            if row.get('targetType') == 'media_asset'
            and row.get('sourceKind') == 'html'
            and row.get('metadata', {}).get('section') == 'realCompendiumImages'
        }
        self.assertEqual(referenced, media_ids)

    def test_audit_confirms_all_sources_and_route_boundaries(self):
        audit = self.catalog['audit']
        self.assertEqual(len(audit['xlsxSheets']), 15)
        self.assertEqual(audit['pdfPages'], 51)
        self.assertEqual(audit['htmlBuild'], '0.31.4-map-link-audit')
        self.assertEqual(audit['duplicateEntityIds'], 0)
        self.assertEqual(audit['duplicateCriterionIds'], 0)
        self.assertTrue(audit['hasColter'])
        self.assertTrue(audit['hasAmericanVenom'])
        self.assertEqual(audit['challengeCriteria'], 90)
        self.assertEqual(audit['pdfReferencedContentPages'], [p for p in range(2, 52) if p != 27])


if __name__ == '__main__':
    unittest.main()
