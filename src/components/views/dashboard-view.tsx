'use client';

import { useEffect, useState } from 'react';
import { buildDashboardModel } from '@/features/dashboard/model';
import { buildChapterGroups, chapterKey } from '@/features/dashboard/navigation';
import { getChapterProgress, isMilestoneCompleted, isMilestoneTaskCompleted } from '@/features/route/engine';
import { useProgress } from '@/features/progress/progress-context';
import type { CanonicalCatalog, CatalogMilestone, CatalogMilestoneTask } from '@/lib/catalog/types';

const KIND_LABEL: Record<string, string> = {
  story: 'Misión principal',
  stranger: 'Misión de forastero',
  companion_activity: 'Actividad de campamento',
  item_request: 'Encargo de compañero',
  chapter_sweep: 'Preparación / cierre',
  preparation: 'Preparación',
  hunting: 'Expedición de caza',
  compendium: 'Bloque de compendio',
  collectibles: 'Ruta de coleccionables',
  crafting: 'Sesión de crafteo',
  challenge: 'Desafío',
  exploration: 'Exploración',
  camp_activity: 'Campamento',
  stranger_sweep: 'Barrido de forasteros',
  completion: 'Cierre completista',
};

const KIND_SHORT: Record<string, string> = {
  story: 'Historia',
  stranger: 'Forastero',
  companion_activity: 'Campamento',
  item_request: 'Encargo',
  chapter_sweep: 'Cierre',
  preparation: 'Preparación',
  hunting: 'Caza',
  compendium: 'Compendio',
  collectibles: 'Colección',
  crafting: 'Crafteo',
  challenge: 'Desafío',
  exploration: 'Exploración',
  camp_activity: 'Campamento',
  stranger_sweep: 'Forasteros',
  completion: 'Completismo',
};

type NearbyTab = 'route' | 'camp' | 'strangers' | 'secrets' | 'fauna';
type NearbyEntry = {
  id: string;
  category: string;
  title: string;
  description: string;
  done?: boolean;
  action(): void;
};

export function DashboardView({
  catalog,
  milestone,
  onOpenRoute,
  onOpenEntity,
  onOpenMap,
  onSelectMilestone,
}: {
  catalog: CanonicalCatalog;
  milestone: CatalogMilestone;
  onOpenRoute(): void;
  onOpenEntity?(entityId: string): void;
  onOpenMap?(): void;
  onSelectMilestone?(milestone: CatalogMilestone): void;
}) {
  const progress = useProgress();
  const [nearbyTab, setNearbyTab] = useState<NearbyTab>('route');
  const model = buildDashboardModel(catalog, milestone, progress.snapshot);
  const editorialChapter = chapterKey(milestone);
  const chapter = getChapterProgress(editorialChapter, catalog, progress.snapshot);
  const chapterGroups = buildChapterGroups(catalog.milestones, milestone);
  const chapterMilestones = catalog.milestones
    .filter((item) => chapterKey(item) === editorialChapter)
    .sort((a, b) => a.order - b.order);
  const currentIndex = Math.max(0, chapterMilestones.findIndex((item) => item.id === milestone.id));
  const relatedMarkers = catalog.mapMarkers
    .filter((marker) => marker.entityId && model.tasks.some((task) => task.entityId === marker.entityId))
    .slice(0, 10);
  const fallbackImage = editorialChapter === 'chapter-1' ? '/media/outlaw-arthur.jpg' : '/media/outlaw-sunset.jpg';
  const image = model.heroImageUrl ?? fallbackImage;
  const milestoneDone = isMilestoneCompleted(milestone, catalog.milestoneTasks, progress.snapshot);
  const intel = milestone.metadata?.intel as { summary?: string } | undefined;
  const whyNow = String(milestone.metadata?.whyNow ?? intel?.summary ?? '');
  const availability = milestone.availability && typeof milestone.availability === 'object' ? milestone.availability as Record<string, unknown> : undefined;
  const inferred = Boolean(milestone.metadata?.editorialInference ?? availability?.editorialInference);

  useEffect(() => {
    document.querySelector('.chapter-pill.active')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    document.querySelector('.milestone-node.current')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [milestone.id]);

  async function setTask(task: CatalogMilestoneTask, completed: boolean) {
    const status = completed ? 'completed' : 'not_started';
    if (task.criterionId) await progress.setCriterionStatus(task.criterionId, status);
    else await progress.setTaskStatus(task.id, status);
  }

  async function setMissionCompleted(completed: boolean) {
    if (!model.missionCompletion) return;
    await progress.setCriterionStatus(model.missionCompletion.criterion.id, completed ? 'completed' : 'not_started');
  }

  async function setWholeMilestone(completed: boolean) {
    const status = completed ? 'completed' : 'not_started';
    const criterionIds = model.tasks.flatMap((task) => task.criterionId ? [task.criterionId] : []);
    const taskIds = model.tasks.flatMap((task) => task.criterionId ? [] : [task.id]);
    await progress.setMilestoneStatus(milestone.id, criterionIds, taskIds, status);
  }

  function selectMilestone(item: CatalogMilestone) {
    if (onSelectMilestone) onSelectMilestone(item);
    else onOpenRoute();
  }

  function selectChapter(group: ReturnType<typeof buildChapterGroups<CatalogMilestone>>[number]) {
    const target = group.milestones.find((item) => !isMilestoneCompleted(item, catalog.milestoneTasks, progress.snapshot))
      ?? group.milestones.at(-1);
    if (target) selectMilestone(target);
  }

  const sameChapter = chapterMilestones.filter((item) => item.id !== milestone.id);
  const routeEntries: NearbyEntry[] = [...model.pendingEarlierMilestones, ...model.nextMilestones]
    .filter((item, index, rows) => rows.findIndex((row) => row.id === item.id) === index)
    .slice(0, 7)
    .map((item) => ({
      id: item.id,
      category: item.order < milestone.order ? 'Pendiente antes' : KIND_SHORT[item.kind] ?? 'Ruta',
      title: item.title,
      description: item.details || (item.missableRisk ? 'Contenido sensible a la progresión.' : 'Hito editorial de la ruta canónica.'),
      done: isMilestoneCompleted(item, catalog.milestoneTasks, progress.snapshot),
      action: () => selectMilestone(item),
    }));
  const campEntries: NearbyEntry[] = sameChapter
    .filter((item) => ['companion_activity', 'camp_activity', 'item_request', 'crafting'].includes(item.kind))
    .sort((a, b) => Math.abs(a.order - milestone.order) - Math.abs(b.order - milestone.order))
    .slice(0, 7)
    .map((item) => ({
      id: item.id,
      category: KIND_SHORT[item.kind] ?? 'Campamento',
      title: item.title,
      description: item.details || (item.missableRisk ? 'Conviene resolverlo antes de avanzar.' : 'Disponible alrededor de este tramo.'),
      done: isMilestoneCompleted(item, catalog.milestoneTasks, progress.snapshot),
      action: () => selectMilestone(item),
    }));
  for (const item of model.readyCraftables) {
    if (campEntries.length >= 7) break;
    campEntries.push({
      id: item.recipeId,
      category: 'Crafteo listo',
      title: item.entity.name,
      description: 'Materiales completos · falta fabricar.',
      action: () => onOpenEntity?.(item.entity.id),
    });
  }
  const strangerEntries: NearbyEntry[] = sameChapter
    .filter((item) => ['stranger', 'stranger_sweep'].includes(item.kind))
    .sort((a, b) => Math.abs(a.order - milestone.order) - Math.abs(b.order - milestone.order))
    .slice(0, 7)
    .map((item) => ({
      id: item.id,
      category: 'Forasteros',
      title: item.title,
      description: item.details || 'Actividad secundaria disponible en este tramo de la ruta.',
      done: isMilestoneCompleted(item, catalog.milestoneTasks, progress.snapshot),
      action: () => selectMilestone(item),
    }));
  const markerEntry = (categoryPattern: RegExp): NearbyEntry[] => catalog.mapMarkers
    .filter((marker) => categoryPattern.test(`${marker.category} ${marker.name}`))
    .slice(0, 7)
    .map((marker) => ({
      id: marker.id,
      category: marker.category || 'Mapa',
      title: marker.name,
      description: relatedMarkers.some((related) => related.id === marker.id) ? 'Relacionado directamente con el hito actual.' : 'Marcador canónico disponible en el mapa.',
      action: () => onOpenMap?.(),
    }));
  const secretEntries = markerEntry(/secret|secreto|interest|interés|unique|único|document|point/i);
  const faunaEntries = markerEntry(/animal|fauna|legend|pez|fish|plant|planta|horse|caballo/i);
  const nearbyByTab: Record<NearbyTab, NearbyEntry[]> = {
    route: routeEntries,
    camp: campEntries,
    strangers: strangerEntries,
    secrets: secretEntries,
    fauna: faunaEntries,
  };
  const nearbyEntries = nearbyByTab[nearbyTab];

  return <section className="dashboard-view golden-dashboard">
    <nav className="dashboard-chapters" aria-label="Capítulos de la ruta">
      {chapterGroups.map((group) => {
        const groupProgress = getChapterProgress(group.key, catalog, progress.snapshot);
        return <button key={group.key} className={`chapter-pill ${group.current ? 'active' : ''}`} onClick={() => selectChapter(group)} title={`${group.label}: ${groupProgress.completed}/${groupProgress.total} hitos`}>
          <strong>{group.label}</strong><small>{groupProgress.completed}/{groupProgress.total}</small>
        </button>;
      })}
    </nav>

    <div className="dashboard-stage">
      <img className="dashboard-bg" src={image} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackImage; }} />
      <div className="dashboard-vignette" />
      <div className="dashboard-meta">
        <span className="chip red">{KIND_LABEL[milestone.kind] ?? milestone.kind}</span>
        <span className="chip">{currentIndex + 1}/{chapterMilestones.length}</span>
        <span className="chip">{Math.round(chapter.ratio * 100)}% capítulo</span>
      </div>

      <article className="dashboard-hero">
        <small>HITO ACTUAL · RUTA CANÓNICA</small>
        <h1>{model.displayTitle}</h1>
        {model.legacyMission && model.displayTitle !== milestone.title && <p className="original-title">{milestone.title}</p>}
        <p>{milestone.details || model.legacyMission?.metadata?.hint as string || 'Sigue este hito antes de avanzar al siguiente nodo editorial de la ruta.'}</p>
        <div className="hero-stats">
          <span>{model.completedTaskCount}/{model.tasks.length} checks</span>
          <span>{KIND_SHORT[milestone.kind] ?? milestone.kind}</span>
          <span className={milestone.missableRisk ? 'danger' : ''}>{milestone.missableRisk ? 'PERDIBLE' : 'ventana estable'}</span>
        </div>
        <div className="hero-actions">
          {model.missionCompletion && <button className={`primary-check mission-check ${model.missionCompletion.done ? 'done' : ''}`} onClick={() => setMissionCompleted(!model.missionCompletion!.done)}><span>{model.missionCompletion.done ? '✓' : ''}</span>{model.missionCompletion.done ? 'Misión completada' : 'Marcar misión completada'}</button>}
          {model.tasks[0] && <button className={`primary-check milestone-check ${milestoneDone ? 'done' : ''}`} onClick={() => setWholeMilestone(!milestoneDone)}><span>{milestoneDone ? '✓' : ''}</span>{milestoneDone ? 'Hito completado' : 'Marcar hito completado'}</button>}
          <button className="secondary-action" onClick={onOpenRoute}>Ver ruta completa</button>
        </div>
      </article>

      <section className="dashboard-card guide-card">
        <header><small>GUÍA DURANTE EL HITO</small><h2>Ten en cuenta</h2></header>
        <div className="dashboard-scroll">
          {whyNow && <div className="guide-row why-now"><span>1</span><div><b>Por qué hacerlo ahora</b><p>{whyNow}</p></div></div>}
          {milestone.missableRisk && <div className="guide-row critical"><span>!</span><div><b>Riesgo de pérdida</b><p>Este contenido está marcado por la fuente como sensible a la progresión. Hazlo antes de empujar la historia.</p></div></div>}
          {inferred && <div className="guide-row"><span>i</span><div><b>Orden editorial</b><p>La fuente aporta el contenido, pero no fija esta posición exacta. OUTLAW100 la coloca aquí para repartir el completismo durante la partida.</p></div></div>}
          {model.tasks.map((task, index) => {
            const done = isMilestoneTaskCompleted(task, progress.snapshot);
            return <button key={task.id} className={`guide-row ${done ? 'done' : ''}`} onClick={() => setTask(task, !done)}><span>{done ? '✓' : index + 1}</span><div><b>{task.label}</b><p>{task.criterionId ? 'Criterio canónico · sincronizado con Archivo/Compendio' : task.sourceReference || milestone.sourceReference}</p></div></button>;
          })}
          {!model.tasks.length && <div className="empty-copy">Este hito aún no tiene checks operativos adicionales.</div>}
        </div>
      </section>

      <aside className="dashboard-tools">
        <section className="dashboard-card gold-card">
          <header><small>MEDALLA DE ORO</small><h2>RETOS {model.goldObjectives.length ? `${model.goldObjectives.filter((item) => item.done).length}/${model.goldObjectives.length}` : '—'}</h2></header>
          <div className="dashboard-scroll gold-list">
            {model.goldObjectives.map((objective) => <button key={objective.id} className={objective.done ? 'done' : ''} onClick={() => progress.setCriterionStatus(objective.id, objective.done ? 'not_started' : 'completed')}><span>{objective.done ? '✓' : ''}</span><b>{objective.label}</b></button>)}
            {!model.goldObjectives.length && <p className="empty-copy">Sin objetivo de oro enlazado de forma inequívoca para este hito.</p>}
          </div>
        </section>

        <section className="dashboard-card nearby-card">
          <header><small>SATÉLITES DE MISIÓN</small><h2>Cerca de tu ruta</h2></header>
          <div className="nearby-tabs" role="tablist" aria-label="Cerca de tu ruta">
            {([
              ['route', 'Ruta'],
              ['camp', 'Campamento'],
              ['strangers', 'Forasteros'],
              ['secrets', 'Secretos'],
              ['fauna', 'Fauna'],
            ] as [NearbyTab, string][]).map(([id, label]) => <button key={id} role="tab" aria-selected={nearbyTab === id} className={nearbyTab === id ? 'active' : ''} onClick={() => setNearbyTab(id)}>{label}</button>)}
          </div>
          <div className="nearby-list">
            {nearbyEntries.map((entry) => <button key={entry.id} className="nearby-item" onClick={entry.action}>
              <span className="nearby-status">{entry.done ? '✓' : ''}</span>
              <span className="nearby-copy"><small>{entry.category}</small><b>{entry.title}</b><p>{entry.description}</p></span>
              <span className="nearby-open">Abrir</span>
            </button>)}
            {!nearbyEntries.length && <p className="empty-copy">No hay elementos canónicos de esta categoría alrededor de este hito.</p>}
          </div>
        </section>
      </aside>
    </div>

    <div className="dashboard-storyline">
      <div className="storyline-heading">
        <small>LÍNEA NARRATIVA</small>
        <strong>{currentIndex + 1}/{chapterMilestones.length} · {chapterGroups.find((group) => group.current)?.label ?? editorialChapter}</strong>
        <span>desliza para recorrer los hitos del capítulo</span>
      </div>
      <div className="storyline-rail" aria-label="Hitos del capítulo">
        {chapterMilestones.map((item, index) => {
          const done = isMilestoneCompleted(item, catalog.milestoneTasks, progress.snapshot);
          return <button key={item.id} className={`milestone-node ${item.id === milestone.id ? 'current' : ''} ${done ? 'done' : ''}`} onClick={() => selectMilestone(item)} title={item.title}>
            <span className="milestone-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="milestone-copy"><small>{KIND_SHORT[item.kind] ?? item.kind}</small><b>{item.title}</b></span>
          </button>;
        })}
      </div>
    </div>
  </section>;
}
