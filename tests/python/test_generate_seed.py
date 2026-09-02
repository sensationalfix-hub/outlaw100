import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GENERATOR = ROOT / 'scripts/generate_seed.py'
CATALOG = ROOT / 'data/generated/catalog.json'


class SeedGeneratorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.seed = Path(cls.temp.name) / 'seed.sql'
        cls.chunks = Path(cls.temp.name) / 'seed-chunks.json'
        proc = subprocess.run([
            'python3', str(GENERATOR), '--catalog', str(CATALOG),
            '--output', str(cls.seed), '--chunks-output', str(cls.chunks), '--batch-size', '400'
        ], cwd=ROOT, text=True, capture_output=True)
        if proc.returncode != 0:
            raise AssertionError(proc.stderr)
        cls.sql = cls.seed.read_text()
        cls.chunk_data = json.loads(cls.chunks.read_text())
        cls.catalog = json.loads(CATALOG.read_text())

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_seed_covers_every_canonical_collection(self):
        expected = {
            'entities': len(self.catalog['entities']),
            'criteria': len(self.catalog['criteria']),
            'relations': len(self.catalog['relations']),
            'milestones': len(self.catalog['milestones']),
            'milestone_tasks': len(self.catalog['milestoneTasks']),
            'craft_recipes': len(self.catalog['recipes']),
            'archive_entries': len(self.catalog['archiveEntries']),
            'source_references': len(self.catalog['sourceReferences']),
            'map_markers': len(self.catalog['mapMarkers']),
            'media_assets': len(self.catalog['mediaAssets']),
        }
        self.assertEqual(self.chunk_data['counts'], expected)
        for table in expected:
            self.assertIn(f'insert into public.{table}', self.sql.lower())
        self.assertIn('insert into public.craft_requirements', self.sql.lower())
        self.assertIn('insert into public.audit_records', self.sql.lower())

    def test_seed_never_contains_user_progress_or_service_role_material(self):
        lower = self.sql.lower()
        self.assertNotIn('insert into public.progress', lower)
        self.assertNotIn('insert into public.inventory', lower)
        self.assertNotIn('outlaw_progress', lower)
        self.assertNotIn('service_role', lower)
        self.assertNotIn('rdomap', lower)

    def test_chunk_queries_are_ordered_for_foreign_keys_and_bounded(self):
        chunks = self.chunk_data['chunks']
        first_tables = [c['table'] for c in chunks[:3]]
        self.assertEqual(first_tables[0], 'entities')
        order = [c['table'] for c in chunks]
        self.assertLess(order.index('entities'), order.index('criteria'))
        self.assertLess(order.index('entities'), order.index('milestones'))
        self.assertLess(order.index('milestones'), order.index('milestone_tasks'))
        self.assertTrue(all(len(c['sql'].encode()) < 900_000 for c in chunks))


if __name__ == '__main__':
    unittest.main()
