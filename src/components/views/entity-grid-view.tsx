'use client';

import { useMemo, useState } from 'react';
import { matchesEntityScope, normalizeSearch } from '@/features/search/model';
import { buildEntityDetail } from '@/features/entities/detail-model';
import { resolveEntityMedia } from '@/features/media/entity-media';
import type { EntityMedia } from '@/features/media/types';
import { useProgress } from '@/features/progress/progress-context';
import { ProgressStatusSelect } from '@/features/progress/status-control';
import type { CanonicalCatalog, CatalogEntity } from '@/lib/catalog/types';

function ResolvedMediaImage({ media, className, alt }: { media: EntityMedia; className: string; alt: string }) {
  if (!media.url) return null;
  return <img
    className={className}
    src={media.url}
    alt={alt}
    loading="lazy"
    decoding="async"
    referrerPolicy="no-referrer"
    style={media.objectPosition ? { objectPosition: media.objectPosition } : undefined}
    onError={(event) => {
      if (media.fallbackUrl && event.currentTarget.dataset.fallbackUsed !== 'true') {
        event.currentTarget.dataset.fallbackUsed = 'true';
        event.currentTarget.src = media.fallbackUrl;
        return;
      }
      event.currentTarget.hidden = true;
    }}
  />;
}

export function EntityGridView({
  catalog,
  title,
  kicker,
  description,
  categories,
  legendary,
  selectedEntityId,
  onOpenMap,
  onOpenEntity,
}: {
  catalog: CanonicalCatalog;
  title: string;
  kicker: string;
  description: string;
  categories: string[];
  legendary?: boolean;
  selectedEntityId?: string | null;
  onOpenMap?(entityId: string): void;
  onOpenEntity?(entityId: string): void;
}) {
  const progress = useProgress();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogEntity | null>(null);
  const items = useMemo(() => {
    const q = normalizeSearch(query);
    return catalog.entities.filter((entity) => {
      if (!matchesEntityScope(entity, { categories, legendary })) return false;
      if (!q) return true;
      const translated = catalog.translations?.[entity.name] ?? '';
      return normalizeSearch(`${entity.name} ${translated} ${entity.type} ${JSON.stringify(entity.metadata ?? {})}`).includes(q);
    });
  }, [catalog, categories, legendary, query]);
  const requested = selectedEntityId ? items.find((item) => item.id === selectedEntityId) ?? null : null;
  const active = requested ?? (selected && items.some((item) => item.id === selected.id) ? selected : items[0] ?? null);
  const activeCriteria = active ? catalog.criteria.filter((criterion) => criterion.entityId === active.id) : [];
  const detail = active ? buildEntityDetail(catalog, active) : null;
  const activeMedia = active ? resolveEntityMedia(active, catalog.mediaAssets) : null;

  return <section className="content-view"><header className="view-heading"><div><small>{kicker}</small><h1>{title}</h1><p>{description}</p></div><span className="big-count">{items.length}</span></header>
    <div className="split-browser">
      <div className="browser-panel"><div className="browser-toolbar"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar…" /><span>{items.length} registros</span></div><div className="entity-grid">{items.map((entity) => {
        const criteria = catalog.criteria.filter((criterion) => criterion.entityId === entity.id);
        const done = criteria.length > 0 && criteria.every((criterion) => progress.snapshot.criteria[criterion.id] === 'completed');
        const translated = catalog.translations?.[entity.name];
        const media = resolveEntityMedia(entity, catalog.mediaAssets);
        return <button key={entity.id} className={`entity-card ${active?.id === entity.id ? 'selected' : ''} ${done ? 'done' : ''} ${media.url ? 'has-media' : ''} media-${media.orientation}`} onClick={() => setSelected(entity)}>{media.url && <ResolvedMediaImage media={media} className={`entity-card-media media-${media.orientation} fit-${media.fit}`} alt="" />}<div className="entity-card-copy"><small>{entity.category}</small><h3>{translated || entity.name}</h3>{translated && <small>{entity.name}</small>}</div><span>{done ? '✓' : `${criteria.filter((c) => progress.snapshot.criteria[c.id] === 'completed').length}/${criteria.length}`}</span></button>;
      })}</div></div>
      <aside className="detail-panel">{active ? <>{activeMedia?.url && <ResolvedMediaImage media={activeMedia} className={`detail-hero-image media-${activeMedia.orientation} fit-${activeMedia.fit}`} alt={catalog.translations?.[active.name] ?? active.name} />}<small className="detail-kicker">{active.category}</small><h2>{catalog.translations?.[active.name] ?? active.name}</h2>{catalog.translations?.[active.name] && <p className="original-title">{active.name}</p>}<p>{String(active.metadata?.description ?? active.metadata?.location ?? active.metadata?.hint ?? 'Ficha canónica compartida por todas las vistas.')}</p><div className="detail-meta"><div><small>TIPO</small><b>{active.type}</b></div><div><small>CRITERIOS</small><b>{activeCriteria.length}</b></div>{detail?.metadata.map((item) => <div key={`${item.label}:${item.value}`}><small>{item.label}</small><b>{item.value}</b></div>)}</div><div className="detail-actions"><button onClick={() => onOpenMap?.(active.id)}>⌖ VER EN MAPA{detail?.mapMarkerCount ? ` · ${detail.mapMarkerCount}` : ''}</button></div>{detail?.relations.length ? <><h4>Relaciones</h4><div className="relation-list">{detail.relations.map((relation) => <button key={relation.id} onClick={() => onOpenEntity?.(relation.entityId)}><small>{relation.type}</small><b>{relation.name}</b></button>)}</div></> : null}<h4>Checklist</h4><div className="criteria-list">{activeCriteria.map((criterion) => {
        const status = progress.snapshot.criteria[criterion.id] ?? 'not_started';
        const done = status === 'completed';
        return <div key={criterion.id} className={`criterion-row status-${status}`}><button className={done ? 'done' : ''} onClick={() => progress.setCriterionStatus(criterion.id, done ? 'not_started' : 'completed')}><span>{done ? '✓' : ''}</span><div><b>{criterion.label}</b><small>{criterion.key}</small></div></button><ProgressStatusSelect value={status} onChange={(next) => progress.setCriterionStatus(criterion.id, next)} label={`Estado: ${criterion.label}`} /></div>;
      })}{!activeCriteria.length && <p className="empty-copy">Sin criterios independientes en la fuente.</p>}</div></> : <p className="empty-copy">No hay registros para este filtro.</p>}</aside>
    </div>
  </section>;
}
