import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'supabase' / 'migrations' / '20260902_000005_performance_hardening.sql'

class PerformanceHardeningMigrationTests(unittest.TestCase):
    def test_adds_covering_indexes_for_user_state_and_map_foreign_keys(self):
        sql = MIGRATION.read_text() if MIGRATION.exists() else ''
        compact = ' '.join(sql.lower().split())
        for fragment in [
            'create index if not exists inventory_entity_idx on public.inventory(entity_id)',
            'create index if not exists progress_criterion_idx on public.progress(criterion_id)',
            'create index if not exists progress_task_idx on public.progress(milestone_task_id)',
            'create index if not exists map_markers_criterion_idx on public.map_markers(criterion_id)',
        ]:
            self.assertIn(fragment, compact)

    def test_recreates_canonical_rls_policies_with_initplan_friendly_auth_uid(self):
        sql = MIGRATION.read_text() if MIGRATION.exists() else ''
        compact = ' '.join(sql.lower().split())
        self.assertIn('using ((select auth.uid()) = user_id)', compact)
        self.assertIn('with check ((select auth.uid()) = user_id)', compact)
        for table in ['profiles', 'progress', 'inventory']:
            self.assertIn(f'drop policy if exists "{table} select own" on public.{table}', compact)

if __name__ == '__main__':
    unittest.main()
