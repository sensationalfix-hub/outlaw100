import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IMPORTER = ROOT / 'scripts' / 'importers' / 'html_importer.py'
SOURCE = ROOT / 'data' / 'source' / 'outlaw100-legacy.html'
FONT = ROOT / 'data' / 'source' / 'chinese-rocks.otf'


class HtmlImporterTests(unittest.TestCase):
    def run_import(self):
        temp = tempfile.TemporaryDirectory()
        out = Path(temp.name) / 'html-metadata.json'
        public = Path(temp.name) / 'public'
        proc = subprocess.run(
            ['python3', str(IMPORTER), '--html', str(SOURCE), '--font', str(FONT), '--output', str(out), '--public-dir', str(public)],
            cwd=ROOT,
            text=True,
            capture_output=True,
        )
        self.assertEqual(proc.returncode, 0, proc.stderr)
        payload = json.loads(out.read_text())
        return temp, payload, public

    def test_preserves_large_archive_and_spanish_translation_dictionary(self):
        temp, payload, _ = self.run_import()
        self.addCleanup(temp.cleanup)
        self.assertEqual(len(payload['sourceArchive']), 1543)
        self.assertEqual(payload['sourceArchive'][-1]['id'], 'src-1640')
        self.assertEqual(payload['translations']['Lasso'], 'Lazo')
        sections = {row['section'] for row in payload['sourceArchive']}
        self.assertIn('100% Completion Checklist', sections)
        self.assertIn('Valuables', sections)

    def test_extracts_story_map_hotspots_secrets_and_challenges(self):
        temp, payload, _ = self.run_import()
        self.addCleanup(temp.cleanup)
        self.assertIn('Capítulo 1 · Colter', payload['story'])
        flattened = [mission for group in payload['story']['Capítulo 1 · Colter'] for mission in group]
        self.assertIn('Forajidos del Oeste', flattened)
        self.assertEqual(len(payload['mapHotspots']), 10)
        self.assertGreater(len(payload['secretChains']), 0)
        challenge_steps = sum(len(v) for v in payload['auditedChallenges'].values())
        self.assertEqual(challenge_steps, 90)

    def test_extracts_source_backed_chapter_intel_for_editorial_route(self):
        temp, payload, _ = self.run_import()
        self.addCleanup(temp.cleanup)
        intel = payload['chapterIntel']
        self.assertEqual(intel['Capítulo 1 · Colter']['title'], 'limpia lo mínimo crítico')
        self.assertEqual(intel['Capítulo 2 · Mirador de la Herradura']['region'], 'Valentine · The Heartlands')
        self.assertIn('Las ovejas y las cabras', intel['Capítulo 2 · Mirador de la Herradura']['watch'][0][0])
        self.assertEqual(intel['Capítulo 5 · Guarma']['title'], 'modo no te olvides nada')

    def test_extracts_real_gold_medal_objectives_from_legacy_dashboard(self):
        temp, payload, _ = self.run_import()
        self.addCleanup(temp.cleanup)
        gold = payload['missionGoldObjectives']
        self.assertEqual(len(gold), 103)
        self.assertEqual(
            gold['Forajidos del Oeste'],
            [
                'No recibas daño durante el tiroteo',
                'Saquea 6 objetos o más del rancho Adler',
                'Termina con al menos un 80% de precisión',
            ],
        )
        self.assertIn('Veneno americano', gold)
        self.assertGreaterEqual(len(gold['Veneno americano']), 3)

    def test_keeps_rdr2_marker_and_tile_sources_but_excludes_rdo_plant_sources(self):
        temp, payload, _ = self.run_import()
        self.addCleanup(temp.cleanup)
        self.assertIn('red-dead-redemption-2-map', payload['mapSources']['markers'][0])
        self.assertIn('{z}/{x}_{y}.jpg', payload['mapSources']['tiles'])
        self.assertEqual(payload['mapSources']['plants'], [])
        self.assertTrue(any('RDOMap' in item['url'] for item in payload['excludedLegacySources']))
        self.assertTrue(all('RDOMap' not in url for url in payload['activeExternalSources']))

    def test_extracts_real_compendium_image_map_and_localizes_embedded_entries(self):
        temp, payload, public = self.run_import()
        self.addCleanup(temp.cleanup)
        images = payload['compendiumImages']
        self.assertEqual(len(images), 15)
        self.assertEqual(
            images['american alligator'],
            'https://www.gtabase.com/igallery/2501-2600/RDR2_Wildlife_American_Alligator-2548-108.jpg',
        )
        self.assertTrue(images['indian tobacco'].startswith('/media/'))
        self.assertEqual(images['tabaco indio'], images['indian tobacco'])
        self.assertTrue((public / images['indian tobacco'].lstrip('/')).exists())
        self.assertEqual(payload['audit']['compendiumImageAliasCount'], 15)

    def test_extracts_embedded_media_and_installs_font_without_progress_state(self):
        temp, payload, public = self.run_import()
        self.addCleanup(temp.cleanup)
        self.assertEqual(len(payload['mediaAssets']), 5)
        self.assertEqual(payload['audit']['embeddedMediaReferenceCount'], 8)
        self.assertTrue((public / 'fonts' / 'chinese-rocks.otf').exists())
        for asset in payload['mediaAssets']:
            self.assertTrue((public / asset['publicPath'].lstrip('/')).exists())
        serialized = json.dumps(payload).lower()
        self.assertNotIn('syncsecret', serialized)
        self.assertNotIn('outlaw_progress', serialized)

    def test_audit_reports_expected_legacy_build_and_counts(self):
        temp, payload, _ = self.run_import()
        self.addCleanup(temp.cleanup)
        self.assertEqual(payload['audit']['sourceBuild'], '0.31.4-map-link-audit')
        self.assertEqual(payload['audit']['archiveCount'], 1543)
        self.assertEqual(payload['audit']['archiveLastId'], 'src-1640')
        self.assertEqual(payload['audit']['challengeStepCount'], 90)
        self.assertEqual(payload['audit']['embeddedMediaCount'], len(payload['mediaAssets']))


if __name__ == '__main__':
    unittest.main()
