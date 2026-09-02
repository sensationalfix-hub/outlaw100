import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'supabase/migrations/20260902_000003_progress_rpc.sql'

class ProgressRpcMigrationTests(unittest.TestCase):
    def test_authenticated_progress_rpcs_use_auth_uid_and_never_service_role(self):
        self.assertTrue(MIGRATION.exists(), 'progress RPC migration should exist')
        sql = MIGRATION.read_text().lower()
        self.assertIn('set_criterion_progress', sql)
        self.assertIn('set_milestone_task_progress', sql)
        self.assertIn('auth.uid()', sql)
        self.assertIn("grant execute on function public.set_criterion_progress", sql)
        self.assertIn("to authenticated", sql)
        self.assertNotIn('service_role key', sql)

    def test_rpc_validates_status_and_updates_or_inserts_one_canonical_target(self):
        self.assertTrue(MIGRATION.exists(), 'progress RPC migration should exist')
        sql = MIGRATION.read_text().lower()
        for status in ('not_started','available','in_progress','prepared','completable','completed','blocked'):
            self.assertIn(status, sql)
        self.assertIn('criterion_id = p_criterion_id', sql)
        self.assertIn('milestone_task_id = p_task_id', sql)
        self.assertIn('if not found then', sql)

if __name__ == '__main__':
    unittest.main()
