'use client';

import { buildDashboardModel } from '@/features/dashboard/model';
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

export function DashboardView({ catalog, milestone, onOpenRoute, onOpenEntity, onOpenMap }: { catalog: CanonicalCatalog; milestone: CatalogMilestone; onOpenRoute(): void; onOpenEntity?(entityId: string): void; onOpenMap?(): void }) {
  const progress = useProgress();
  const model = buildDashboardModel(catalog, milestone, progress.snapshot);
  const editorialChapter = String(milestone.metadata?.editorialChapter ?? milestone.chapter);
  const chapter = getChapterProgress(editorialChapter, catalog, progress.snapshot);
  const relatedMarkers = catalog.mapMarkers.filter((marker) => marker.entityId && model.tasks.some((task) => task.entityId === marker.entityId)).slice(0, 5);
  const image = model.heroImageUrl ?? '/media/legacy-01-3cc8717378ec.jpg';
  const milestoneDone = isMilestoneCompleted(milestone, catalog.milestoneTasks, progress.snapshot);
  const intel = milestone.metadata?.intel as { summary?: string } | undefined;
  const whyNow = String(milestone.metadata?.whyNow ?? intel?.summary ?? '');
  const availability = milestone.availability && typeof milestone.availability === 'object' ? milestone.availability as Record<string, unknown> : undefined;
  const inferred = Boolean(milestone.metadata?.editorialInference ?? availability?.editorialInference);

  async function setTask(task: CatalogMilestoneTask, completed: boolean) {
    const status = completed ? 'completed' : 'not_started';
    if (task.criterionId) await progress.setCriterionStatus(task.criterionId, status);
    else await progress.setTaskStatus(task.id, status);
  }

  async function setWholeMilestone(completed: boolean) {
    const status = completed ? 'completed' : 'not_started';
    const criterionIds = model.tasks.flatMap((task) => task.criterionId ? [task.criterionId] : []);
    const taskIds = model.tasks.flatMap((task) => task.criterionId ? [] : [task.id]);
    await progress.setMilestoneStatus(milestone.id, criterionIds, taskIds, status);
  }

  return <section className="dashboard-view">
    <div className="dashboard-stage">
      <img className="dashboard-bg" src={image} alt="" />
      <div className="dashboard-vignette" />
      <div className="dashboard-meta"><span className="chip red">{KIND_LABEL[milestone.kind] ?? milestone.kind}</span><span className="chip">{editorialChapter}</span><span className="chip">{milestone.sourcePage ? `PDF p.${milestone.sourcePage}` : 'HTML · ruta editorial'}</span>{inferred && <span className="chip">ORDEN EDITORIAL</span>}</div>
      <article className="dashboard-hero">
        <small>HITO ACTUAL · RUTA CANÓNICA</small>
        <h1>{model.displayTitle}</h1>
        {model.legacyMission && model.displayTitle !== milestone.title && <p className="original-title">{milestone.title}</p>}
        <p>{milestone.details || model.legacyMission?.metadata?.hint as string || 'Sigue este hito antes de avanzar al siguiente nodo editorial de la ruta.'}</p>
        <div className="hero-stats">
          <span>{model.completedTaskCount}/{model.tasks.length} checks</span>
          <span>{Math.round(chapter.ratio * 100)}% capítulo</span>
          <span className={milestone.missableRisk ? 'danger' : ''}>{milestone.missableRisk ? 'PERDIBLE' : 'ventana estable'}</span>
        </div>
        <div className="hero-actions">
          {model.tasks[0] && <button className={`primary-check ${milestoneDone ? 'done' : ''}`} onClick={() => setWholeMilestone(!milestoneDone)}><span>{milestoneDone ? '✓' : ''}</span>{milestoneDone ? 'Hito completado' : 'Marcar hito completado'}</button>}
          <button className="secondary-action" onClick={onOpenRoute}>Ver ruta completa</button>
        </div>
      </article>

      <section className="dashboard-card guide-card">
        <header><small>GUÍA OPERATIVA</small><h2>Ten en cuenta</h2></header>
        <div className="dashboard-scroll">
          {whyNow && <div className="guide-row why-now"><span>→</span><div><b>Por qué hacerlo ahora</b><p>{whyNow}</p></div></div>}
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
          <header><small>MEDALLA DE ORO</small><h2>{model.goldObjectives.length ? `${model.goldObjectives.filter((item) => item.done).length}/${model.goldObjectives.length} objetivos` : 'Sin enlace inequívoco'}</h2></header>
          <div className="dashboard-scroll gold-list">
            {model.goldObjectives.map((objective) => <button key={objective.id} className={objective.done ? 'done' : ''} onClick={() => progress.setCriterionStatus(objective.id, objective.done ? 'not_started' : 'completed')}><span>{objective.done ? '✓' : ''}</span><b>{objective.label}</b></button>)}
            {!model.goldObjectives.length && <p className="empty-copy">No se asigna un objetivo de oro por aproximación. En los capítulos donde el HTML agrupa misiones de forma distinta al PDF, el enlace se mantendrá vacío hasta tener una correspondencia fuente-a-fuente segura.</p>}
          </div>
        </section>
        <section className="dashboard-card context-card">
          <header><small>ANTES, ALREDEDOR Y DESPUÉS</small><h2>Contexto operativo</h2></header>
          <div className="dashboard-scroll operational-context">
            {model.pendingEarlierMilestones.length > 0 && <div className="context-block danger-block"><small>PENDIENTE ANTES DE ESTE HITO</small>{model.pendingEarlierMilestones.map((item) => <button key={item.id} onClick={onOpenRoute}><b>{item.title}</b><span>{item.kind.replaceAll('_', ' ')}</span></button>)}</div>}
            {model.availableRequests.length > 0 && <div className="context-block"><small>ENCARGOS DISPONIBLES</small>{model.availableRequests.map((item) => <button key={item.id} onClick={onOpenRoute}><b>{item.title}</b><span>{item.missableRisk ? 'Perdible' : 'Disponible'}</span></button>)}</div>}
            {model.readyCraftables.length > 0 && <div className="context-block ready-block"><small>CRAFTING LISTO POR MATERIALES</small>{model.readyCraftables.map((item) => <button key={item.recipeId} onClick={() => onOpenEntity?.(item.entity.id)}><b>{item.entity.name}</b><span>Materiales completos · falta fabricar</span></button>)}</div>}
            {relatedMarkers.length > 0 && <div className="context-block"><small>MAPA Y SATÉLITES</small>{relatedMarkers.map((marker) => <button key={marker.id} onClick={onOpenMap}><b>{marker.name}</b><span>{marker.category}</span></button>)}</div>}
            {model.nextMilestones.length > 0 && <div className="context-block"><small>DESPUÉS</small>{model.nextMilestones.map((item) => <button key={item.id} onClick={onOpenRoute}><b>{item.title}</b><span>{item.kind.replaceAll('_', ' ')}</span></button>)}</div>}
            {!model.pendingEarlierMilestones.length && !model.availableRequests.length && !model.readyCraftables.length && !relatedMarkers.length && !model.nextMilestones.length && <p className="empty-copy">No hay contexto adicional inequívoco para este hito.</p>}
          </div>
        </section>
      </aside>
    </div>
    <div className="dashboard-timeline">
      <div><small>CAPÍTULO</small><b>{chapter.completed}/{chapter.total} hitos</b></div>
      <div className="timeline-rail">{catalog.milestones.filter((item) => String(item.metadata?.editorialChapter ?? item.chapter) === editorialChapter).slice(0, 28).map((item) => <i key={item.id} className={`${item.id === milestone.id ? 'current' : ''} ${isMilestoneCompleted(item, catalog.milestoneTasks, progress.snapshot) ? 'done' : ''}`} title={item.title} />)}</div>
    </div>
  </section>;
}
