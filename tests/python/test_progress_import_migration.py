import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'supabase/migrations/20260902_000006_progress_import_rpc.sql'

class ProgressImportMigrationTests(unittest.TestCase):
    def test_atomic_import_rpc_is_authenticated_and_rls_bound(self):
        self.assertTrue(MIGRATION.exists(), 'atomic progress import migration should exist')
        sql = MIGRATION.read_text().lower()
        self.assertIn('replace_user_progress', sql)
        self.assertIn('security invoker', sql)
        self.assertIn('auth.uid()', sql)
        self.assertIn('delete from public.progress', sql)
        self.assertIn('delete from public.inventory', sql)
        self.assertIn('jsonb_each_text', sql)
        self.assertIn('grant execute on function public.replace_user_progress', sql)
        self.assertIn('to authenticated', sql)
        self.assertNotIn('service_role', sql)

    def test_atomic_import_validates_version_statuses_and_nonnegative_inventory(self):
        self.assertTrue(MIGRATION.exists())
        sql = MIGRATION.read_text().lower()
        self.assertIn("p_snapshot->>'version'", sql)
        for status in ('not_started','available','in_progress','prepared','completable','completed','blocked'):
            self.assertIn(status, sql)
        self.assertIn('quantity < 0', sql)

if __name__ == '__main__':
    unittest.main()
