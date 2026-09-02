import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / 'supabase' / 'migrations' / '20260902_000004_security_hardening.sql'

class SecurityHardeningMigrationTests(unittest.TestCase):
    def test_trigger_function_is_not_browser_executable(self):
        sql = MIGRATION.read_text() if MIGRATION.exists() else ''
        compact = ' '.join(sql.lower().split())
        self.assertIn('revoke execute on function public.handle_new_user() from public, anon, authenticated', compact)

if __name__ == '__main__':
    unittest.main()
