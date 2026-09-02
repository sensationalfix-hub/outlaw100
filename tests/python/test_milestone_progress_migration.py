import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'supabase/migrations/20260902_000007_milestone_progress_rpc.sql'

class MilestoneProgressMigrationTests(unittest.TestCase):
    def test_bulk_milestone_rpc_is_authenticated_and_updates_both_target_types(self):
        self.assertTrue(MIGRATION.exists(), 'bulk milestone progress migration should exist')
        sql = MIGRATION.read_text().lower()
        self.assertIn('set_milestone_progress', sql)
        self.assertIn('security invoker', sql)
        self.assertIn('auth.uid()', sql)
        self.assertIn('from public.milestone_tasks', sql)
        self.assertIn('criterion_id is not null', sql)
        self.assertIn('criterion_id is null', sql)
        self.assertIn('on conflict (user_id, criterion_id)', sql)
        self.assertIn('on conflict (user_id, milestone_task_id)', sql)
        self.assertIn('to authenticated', sql)

if __name__ == '__main__':
    unittest.main()
