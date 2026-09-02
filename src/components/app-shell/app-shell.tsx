'use client';

import { useMemo, useRef, useState } from 'react';
import { NAV_ITEMS, type AppView } from './nav';
import { searchCatalog, type SearchHit } from '@/features/search/model';
import { useProgress } from '@/features/progress/progress-context';
import type { CanonicalCatalog } from '@/lib/catalog/types';

export function AppShell({
  view,
  onViewChange,
  onSearchHit,
  catalog,
  chapterLabel,
  progressPercent,
  children,
}: {
  view: AppView;
  onViewChange(view: AppView): void;
  onSearchHit(hit: SearchHit): void;
  catalog: CanonicalCatalog;
  chapterLabel: string;
  progressPercent: number;
  children: React.ReactNode;
}) {
  const progress = useProgress();
  const importRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const hits = useMemo(() => searchCatalog(catalog, search, 12), [catalog, search]);

  function downloadProgress() {
    const blob = new Blob([progress.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'outlaw100-progress.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importProgress(file?: File) {
    if (!file) return;
    try { await progress.importJson(await file.text()); }
    catch (error) { window.alert(error instanceof Error ? error.message : 'JSON de progreso no válido'); }
    finally { if (importRef.current) importRef.current.value = ''; }
  }

  function selectHit(hit: SearchHit) {
    onSearchHit(hit);
    setSearch('');
  }

  return (
    <div className="outlaw-shell">
      <header className="outlaw-topbar">
        <button className="outlaw-brand" onClick={() => onViewChange('dashboard')} title="OUTLAW 100 · Dashboard" aria-label="OUTLAW 100 · Dashboard">
          <span className="outlaw-mark">O</span><span><small>RDR2 ULTRA COMPLETIONIST</small><b>OUTLAW <em>100</em></b></span>
        </button>
        <div className="outlaw-top-center">
          <div className="outlaw-chips"><span><i /> PARTIDA CANÓNICA</span><span>{chapterLabel}</span></div>
          <div className="global-search">
            <span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar misión, animal, objeto, criterio…" />
            {search && <div className="global-search-results">{hits.map((hit) => <button key={`${hit.kind}:${hit.id}`} onClick={() => selectHit(hit)}><span>{hit.kind === 'milestone' ? 'RUTA' : 'FICHA'}</span><div><b>{hit.title}</b><small>{hit.subtitle}</small></div></button>)}{!hits.length && <p>Sin resultados canónicos.</p>}</div>}
          </div>
        </div>
        <div className="outlaw-actions">
          <button onClick={downloadProgress} title="Exportar progreso">⇩</button>
          <button onClick={() => importRef.current?.click()} title="Importar progreso">⇧</button>
          <form action="/auth/signout" method="post"><button title="Cerrar sesión">↪</button></form>
          <input ref={importRef} hidden type="file" accept="application/json" onChange={(event) => importProgress(event.target.files?.[0])} />
        </div>
      </header>
      <aside className="outlaw-sidebar">
        <nav aria-label="Navegación principal">
          {NAV_ITEMS.map(([id, icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => onViewChange(id)} title={label} aria-label={label}><span aria-hidden="true">{icon}</span><b>{label}</b></button>)}
        </nav>
        <div className="sidebar-progress" title={`${Math.round(progressPercent)}% de progreso global`}><strong>{Math.round(progressPercent)}%</strong><span>PROGRESO GLOBAL</span><div><i style={{ width: `${progressPercent}%` }} /></div></div>
      </aside>
      <main className="outlaw-main">{children}</main>
      {progress.error && <div className="outlaw-toast">{progress.error}</div>}
    </div>
  );
}
