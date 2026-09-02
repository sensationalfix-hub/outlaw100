import type { CanonicalCatalog } from './types.ts';

export async function loadCatalogWithFallback({
  loadSupabase,
  loadStatic,
}: {
  loadSupabase: () => Promise<CanonicalCatalog>;
  loadStatic: () => Promise<CanonicalCatalog>;
}): Promise<{ catalog: CanonicalCatalog; source: 'supabase' | 'static' }> {
  try {
    return { catalog: await loadSupabase(), source: 'supabase' };
  } catch {
    return { catalog: await loadStatic(), source: 'static' };
  }
}
