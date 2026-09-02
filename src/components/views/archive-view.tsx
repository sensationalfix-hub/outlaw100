'use client';

import { useMemo, useState } from 'react';
import { buildEntityDetail } from '@/features/entities/detail-model';
import { useProgress } from '@/features/progress/progress-context';
import { ProgressStatusSelect } from '@/features/progress/status-control';
import { normalizeSearch } from '@/features/search/model';
import type { CanonicalCatalog } from '@/lib/catalog/types';

export function ArchiveView({
  catalog,
  selectedEntityId,
  onOpenMap,
  onOpenEntity,
}: {
  catalog: CanonicalCatalog;
  selectedEntityId?: string | null;
  onOpenMap?(entityId: string): void;
  onOpenEntity?(entityId: string): void;
}) {
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sections = [...new Set(catalog.archiveEntries.map((entry) => entry.section))].sort((a,b) => a.localeCompare(b,'es'));
  const imageByEntity = useMemo(() => new Map(
    catalog.mediaAssets.filter((asset) => asset.entityId && asset.kind === 'image').map((asset) => [asset.entityId!, asset.publicPath]),
  ), [catalog.mediaAssets]);
  const rows = useMemo(() => {
    const q = normalizeSearch(query);
    return catalog.archiveEntries.filter((entry) => (section === 'ALL' || entry.section === section) && (!q || normalizeSearch(`${entry.name} ${entry.group} ${entry.subgroup}`).includes(q)));
  }, [catalog, query, section]);
  const requested = selectedEntityId ? rows.find((row) => row.entityId === selectedEntityId) : undefined;
  const selected = requested ?? rows.find((row) => row.id === selectedId) ?? rows[0];
  const entity = selected ? catalog.entities.find((item) => item.id === selected.entityId) : null;
  const criteria = entity ? catalog.criteria.filter((item) => item.entityId === entity.id) : [];
  const detail = entity ? buildEntityDetail(catalog, entity) : null;

  return <section className="content-view"><header className="view-heading"><div><small>BASE DE DATOS EXHAUSTIVA</small><h1>Archivo</h1><p>Las fichas del HTML sobreviven como catálogo canónico, con sus checks, relaciones, mapa e imágenes cuando la fuente las aporta.</p></div><span className="big-count">{catalog.archiveEntries.length}</span></header>
    <div className="split-browser"><div className="browser-panel"><div className="browser-toolbar archive-tools"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en 1.543 fichas…" /><select value={section} onChange={(e) => setSection(e.target.value)}><option value="ALL">Todas las categorías</option>{sections.map((item) => <option key={item}>{item}</option>)}</select></div><div className="entity-grid archive-grid">{rows.map((row) => {
      const entityCriteria = catalog.criteria.filter((item) => item.entityId === row.entityId);
      const done = entityCriteria.length > 0 && entityCriteria.every((item) => progress.snapshot.criteria[item.id] === 'completed');
      const imageUrl = imageByEntity.get(row.entityId);
      return <button key={row.id} className={`entity-card ${selected?.id === row.id ? 'selected' : ''} ${done ? 'done' : ''} ${imageUrl ? 'has-media' : ''}`} onClick={() => setSelectedId(row.id)}>{imageUrl && <img className="entity-card-media" src={imageUrl} alt="" loading="lazy" />}<div className="entity-card-copy"><small>{row.section}{row.group ? ` · ${row.group}` : ''}</small><h3>{row.name}</h3>{row.missable && <em>PERDIBLE</em>}</div><span>{done ? '✓' : '›'}</span></button>;
    })}</div></div><aside className="detail-panel">{entity && selected ? <>{detail?.imageUrl && <img className="detail-hero-image" src={detail.imageUrl} alt={selected.name} />}<small className="detail-kicker">{selected.section}</small><h2>{selected.name}</h2><p>{String(entity.metadata?.description ?? entity.metadata?.location ?? 'Registro canónico migrado del Archivo de OUTLAW100.')}</p><div className="detail-meta"><div><small>GRUPO</small><b>{selected.group || 'General'}</b></div><div><small>SUBGRUPO</small><b>{selected.subgroup || '—'}</b></div><div><small>FUENTE</small><b>HTML · {selected.id}</b></div><div><small>RIESGO</small><b>{selected.missable ? 'Perdible' : 'Normal'}</b></div>{detail?.metadata.map((item) => <div key={`${item.label}:${item.value}`}><small>{item.label}</small><b>{item.value}</b></div>)}</div><div className="detail-actions"><button onClick={() => onOpenMap?.(entity.id)}>⌖ VER EN MAPA{detail?.mapMarkerCount ? ` · ${detail.mapMarkerCount}` : ''}</button></div>{detail?.relations.length ? <><h4>Relaciones</h4><div className="relation-list">{detail.relations.map((relation) => <button key={relation.id} onClick={() => onOpenEntity?.(relation.entityId)}><small>{relation.type}</small><b>{relation.name}</b></button>)}</div></> : null}<h4>Checks específicos</h4><div className="criteria-list">{criteria.map((criterion) => { const status = progress.snapshot.criteria[criterion.id] ?? 'not_started'; const done = status === 'completed'; return <div key={criterion.id} className={`criterion-row status-${status}`}><button className={done ? 'done' : ''} onClick={() => progress.setCriterionStatus(criterion.id, done ? 'not_started' : 'completed')}><span>{done ? '✓' : ''}</span><div><b>{criterion.label}</b><small>{criterion.key}</small></div></button><ProgressStatusSelect value={status} onChange={(next) => progress.setCriterionStatus(criterion.id, next)} label={`Estado: ${criterion.label}`} /></div>; })}{!criteria.length && <p className="empty-copy">Sin criterios independientes en la fuente.</p>}</div></> : null}</aside></div>
  </section>;
}
