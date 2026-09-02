'use client';

import { useMemo, useState } from 'react';
import { buildEntityDetail } from '@/features/entities/detail-model';
import { useProgress } from '@/features/progress/progress-context';
import { ProgressStatusSelect } from '@/features/progress/status-control';
import { normalizeSearch } from '@/features/search/model';
import { buildStoryGroups } from '@/features/story/model';
import type { CanonicalCatalog, CatalogCriterion } from '@/lib/catalog/types';

export function StoryView({
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const groups = useMemo(() => buildStoryGroups(catalog, progress.snapshot.criteria), [catalog, progress.snapshot.criteria]);
  const allMissions = useMemo(() => groups.flatMap((group) => group.missions), [groups]);
  const filteredGroups = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        missions: group.missions.filter((mission) => normalizeSearch(`${mission.entity.name} ${catalog.translations?.[mission.entity.name] ?? ''} ${group.label}`).includes(q)),
      }))
      .filter((group) => group.missions.length > 0);
  }, [groups, query, catalog.translations]);
  const requested = selectedEntityId ? allMissions.find((mission) => mission.entity.id === selectedEntityId) : undefined;
  const active = requested ?? allMissions.find((mission) => mission.entity.id === selectedId) ?? filteredGroups[0]?.missions[0] ?? allMissions[0] ?? null;
  const detail = active ? buildEntityDetail(catalog, active.entity) : null;
  const nonGoldCriteria = active?.criteria.filter((criterion) => !criterion.key.startsWith('gold-')) ?? [];

  function chapterId(index: number) {
    return `story-chapter-${index}`;
  }

  function jumpToChapter(index: number) {
    document.getElementById(chapterId(index))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderCriterion(criterion: CatalogCriterion, gold = false) {
    const status = progress.snapshot.criteria[criterion.id] ?? 'not_started';
    const done = status === 'completed';
    return <div key={criterion.id} className={`criterion-row status-${status} ${gold ? 'story-gold-criterion' : ''}`}>
      <button className={done ? 'done' : ''} onClick={() => progress.setCriterionStatus(criterion.id, done ? 'not_started' : 'completed')}>
        <span>{done ? '✓' : ''}</span><div><b>{criterion.label}</b><small>{criterion.key}</small></div>
      </button>
      <ProgressStatusSelect value={status} onChange={(next) => progress.setCriterionStatus(criterion.id, next)} label={`Estado: ${criterion.label}`} />
    </div>;
  }

  return <section className="content-view story-view">
    <header className="view-heading story-heading">
      <div><small>MISIONES</small><h1>Historia</h1><p>La campaña completa en orden narrativo, separada por capítulos. Las misiones con retos de medalla se identifican en oro.</p></div>
      <span className="big-count">{allMissions.length}</span>
    </header>

    <div className="story-shell">
      <div className="story-browser">
        <div className="story-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar misión…" />
          <span>{filteredGroups.reduce((total, group) => total + group.missions.length, 0)} misiones</span>
        </div>
        <nav className="story-chapter-nav" aria-label="Capítulos de historia">
          {groups.map((group, index) => <button key={group.label} onClick={() => jumpToChapter(index)}><b>{group.label}</b><small>{group.missions.length}</small></button>)}
        </nav>
        <div className="story-scroll">
          {filteredGroups.map((group) => {
            const originalIndex = groups.findIndex((candidate) => candidate.label === group.label);
            return <section key={group.label} id={chapterId(originalIndex)} className="story-chapter-section">
              <header><div><small>CAPÍTULO</small><h2>{group.label}</h2></div><span>{group.missions.length} misiones</span></header>
              <div className="story-mission-grid">
                {group.missions.map((mission, missionIndex) => {
                  const isActive = active?.entity.id === mission.entity.id;
                  const allDone = mission.totalCriteria > 0 && mission.completedCriteria === mission.totalCriteria;
                  return <button key={mission.entity.id} className={`story-mission-card ${mission.hasGold ? 'gold-mission' : ''} ${isActive ? 'selected' : ''} ${allDone ? 'done' : ''}`} onClick={() => setSelectedId(mission.entity.id)}>
                    <div className="story-mission-top"><span>{String(missionIndex + 1).padStart(2, '0')}</span><small>{mission.completedCriteria}/{mission.totalCriteria}</small></div>
                    <h3>{catalog.translations?.[mission.entity.name] ?? mission.entity.name}</h3>
                    {catalog.translations?.[mission.entity.name] && <p>{mission.entity.name}</p>}
                    <footer>{mission.hasGold ? <span className="story-gold-badge">★ MEDALLA DE ORO · {mission.goldCompleted}/{mission.goldTotal}</span> : <span>{allDone ? 'COMPLETADA' : 'MISIÓN DE HISTORIA'}</span>}</footer>
                  </button>;
                })}
              </div>
            </section>;
          })}
          {!filteredGroups.length && <p className="empty-copy">No hay misiones que coincidan con esa búsqueda.</p>}
        </div>
      </div>

      <aside className={`detail-panel story-detail ${active?.hasGold ? 'has-gold' : ''}`}>
        {active ? <>
          {detail?.imageUrl && <img className="detail-hero-image" src={detail.imageUrl} alt={catalog.translations?.[active.entity.name] ?? active.entity.name} />}
          <small className="detail-kicker">{String(active.entity.metadata?.chapterLabel ?? 'Historia')}</small>
          <h2>{catalog.translations?.[active.entity.name] ?? active.entity.name}</h2>
          {catalog.translations?.[active.entity.name] && <p className="original-title">{active.entity.name}</p>}
          <p>{String(active.entity.metadata?.description ?? active.entity.metadata?.hint ?? 'Misión de historia preservada del catálogo canónico de OUTLAW100.')}</p>
          <div className="detail-meta">
            <div><small>TIPO</small><b>{active.entity.type}</b></div>
            <div><small>ORDEN</small><b>{active.order}</b></div>
            <div><small>CHECKS</small><b>{active.completedCriteria}/{active.totalCriteria}</b></div>
            {active.hasGold && <div className="story-gold-meta"><small>MEDALLA</small><b>{active.goldCompleted}/{active.goldTotal}</b></div>}
            {detail?.metadata.map((item) => <div key={`${item.label}:${item.value}`}><small>{item.label}</small><b>{item.value}</b></div>)}
          </div>
          <div className="detail-actions"><button onClick={() => onOpenMap?.(active.entity.id)}>⌖ VER EN MAPA{detail?.mapMarkerCount ? ` · ${detail.mapMarkerCount}` : ''}</button></div>
          {detail?.relations.length ? <><h4>Relaciones</h4><div className="relation-list">{detail.relations.map((relation) => <button key={relation.id} onClick={() => onOpenEntity?.(relation.entityId)}><small>{relation.type}</small><b>{relation.name}</b></button>)}</div></> : null}
          {active.hasGold && <><h4 className="story-gold-title">★ Medalla de oro <span>{active.goldCompleted}/{active.goldTotal}</span></h4><div className="criteria-list story-gold-list">{active.goldCriteria.map((criterion) => renderCriterion(criterion, true))}</div></>}
          <h4>{active.hasGold ? 'Otros checks' : 'Checklist'}</h4>
          <div className="criteria-list">{nonGoldCriteria.map((criterion) => renderCriterion(criterion))}{!nonGoldCriteria.length && !active.hasGold && <p className="empty-copy">Sin criterios independientes en la fuente.</p>}</div>
        </> : <p className="empty-copy">No hay misiones de historia.</p>}
      </aside>
    </div>
  </section>;
}
