import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'supabase/migrations/20260902_000002_catalog_import_function.sql'

class CatalogImportMigrationTests(unittest.TestCase):
    def setUp(self):
        self.sql = MIGRATION.read_text() if MIGRATION.exists() else ''
        self.compact = re.sub(r'\s+', ' ', self.sql.lower())

    def test_uses_http_extension_and_parameterized_catalog_url(self):
        self.assertIn('create extension if not exists http with schema extensions;', self.sql.lower())
        self.assertIn('private.import_outlaw_catalog(catalog_url text)', self.sql)
        self.assertIn('extensions.http_get(catalog_url)', self.sql)
        self.assertNotIn('vercel.app/catalog.json', self.sql.lower())

    def test_imports_all_catalog_tables_but_never_user_state(self):
        for table in ['entities','criteria','relations','milestones','milestone_tasks','craft_recipes','craft_requirements','archive_entries','source_references','map_markers','media_assets','audit_records']:
            self.assertIn(f'insert into public.{table}', self.sql.lower())
        self.assertNotIn('insert into public.progress', self.sql.lower())
        self.assertNotIn('insert into public.inventory', self.sql.lower())
        self.assertNotIn('outlaw_progress', self.sql.lower())

    def test_import_function_is_not_executable_by_browser_roles(self):
        self.assertIn('security definer', self.compact)
        self.assertIn('revoke all on function private.import_outlaw_catalog(text) from public;', self.sql.lower())
        self.assertIn('revoke all on function private.import_outlaw_catalog(text) from anon;', self.sql.lower())
        self.assertIn('revoke all on function private.import_outlaw_catalog(text) from authenticated;', self.sql.lower())

if __name__ == '__main__':
    unittest.main()
