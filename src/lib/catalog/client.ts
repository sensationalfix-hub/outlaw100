'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { loadCatalogFromSupabase } from './repository';
import { loadCatalogWithFallback } from './load';
import type { CanonicalCatalog } from './types';

export function useCanonicalCatalog() {
  const [catalog, setCatalog] = useState<CanonicalCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'supabase' | 'static' | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const metaResponse = await fetch('/data/catalog-meta.json', { signal: controller.signal, cache: 'force-cache' });
        const staticMeta = metaResponse.ok ? await metaResponse.json() as CanonicalCatalog : ({ version: 1 } as CanonicalCatalog);
        if (controller.signal.aborted) return;

        const result = await loadCatalogWithFallback({
          loadSupabase: () => loadCatalogFromSupabase(createSupabaseBrowserClient() as any, staticMeta),
          loadStatic: async () => {
            const response = await fetch('/data/catalog.json', { signal: controller.signal, cache: 'force-cache' });
            if (!response.ok) throw new Error(`Catálogo HTTP ${response.status}`);
            return await response.json() as CanonicalCatalog;
          },
        });
        if (controller.signal.aborted) return;
        setCatalog(result.catalog);
        setSource(result.source);
        setError(null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setError(cause instanceof Error ? cause.message : 'No se pudo cargar el catálogo');
      }
    }

    void load();
    return () => controller.abort();
  }, []);

  return { catalog, error, source };
}
