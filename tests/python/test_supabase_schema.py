import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCHEMA = ROOT / 'supabase/migrations/20260902_000001_outlaw100_canonical_schema.sql'


class SupabaseSchemaTests(unittest.TestCase):
    def setUp(self):
        self.sql = SCHEMA.read_text() if SCHEMA.exists() else ''

    def test_defines_required_canonical_tables(self):
        required = [
            'profiles','entities','criteria','relations','milestones','milestone_tasks',
            'progress','inventory','source_references','map_markers','media_assets','audit_records',
            'craft_recipes','craft_requirements','archive_entries'
        ]
        for table in required:
            self.assertRegex(self.sql, rf'create table if not exists public\.{table}\b')

    def test_user_state_tables_are_owned_by_auth_user_and_catalog_is_read_only(self):
        for table in ['profiles','progress','inventory']:
            self.assertIn(f'alter table public.{table} enable row level security;', self.sql)
        self.assertIn("using (auth.uid() = user_id)", self.sql)
        self.assertIn("with check (auth.uid() = user_id)", self.sql)
        for table in ['entities','criteria','relations','milestones','milestone_tasks','source_references','map_markers','media_assets','craft_recipes','craft_requirements','archive_entries']:
            self.assertIn(f'alter table public.{table} enable row level security;', self.sql)
            self.assertRegex(self.sql, rf'create policy "{table} read"[\s\S]*?on public\.{table}[\s\S]*?for select')

    def test_progress_targets_exactly_one_criterion_or_milestone_task(self):
        compact = re.sub(r'\s+', ' ', self.sql.lower())
        self.assertIn('check (num_nonnulls(criterion_id, milestone_task_id) = 1)', compact)
        for status in ['not_started','available','in_progress','prepared','completable','completed','blocked']:
            self.assertIn(status, compact)

    def test_auth_user_trigger_creates_profile(self):
        self.assertIn('create or replace function public.handle_new_user()', self.sql)
        self.assertIn('after insert on auth.users', self.sql)
        self.assertIn('execute function public.handle_new_user()', self.sql)


if __name__ == '__main__':
    unittest.main()
