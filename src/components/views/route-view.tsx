'use client';

import { useProgress } from '@/features/progress/progress-context';
import { getMilestoneProgress, getMilestoneTaskStatus } from '@/features/route/engine';
import type { CanonicalCatalog, CatalogMilestone } from '@/lib/catalog/types';

const CHAPTER_LABEL: Record<string, string> = {
  'chapter-1': 'Capítulo 1 · Colter', 'chapter-2': 'Capítulo 2 · Horseshoe Overlook', 'chapter-3': 'Capítulo 3 · Clemens Point', 'chapter-4': 'Capítulo 4 · Saint Denis', 'chapter-5': 'Capítulo 5 · Guarma', 'chapter-6': 'Capítulo 6 · Beaver Hollow', 'epilogue-1': 'Epílogo I · Pronghorn Ranch', 'epilogue-2': 'Epílogo II · Beecher’s Hope', 'chapters-2-3-4': 'Capítulos 2–4 · Campamento', 'epilogue': 'Epílogo · Encargos',
};

export function RouteView({ catalog, current, onSelect }: { catalog: CanonicalCatalog; current: CatalogMilestone; onSelect(milestone: CatalogMilestone): void }) {
  const progress = useProgress();
  const editorialChapter = (m: CatalogMilestone) => String(m.metadata?.editorialChapter ?? m.chapter);
  const chapterKeys = [...new Set(catalog.milestones.map(editorialChapter))];

  return <section className="content-view route-view">
    <header className="view-heading"><div><small>HOJA DE RUTA COMPLETISTA</small><h1>Colter → American Venom</h1><p>{catalog.milestones.length} hitos operativos: historia, campamento, encargos, caza, compendio, colecciones, desafíos, exploración y crafteo en una sola ruta.</p></div><span className="big-count">{catalog.milestones.length}</span></header>
    <div className="route-chapters">
      {chapterKeys.map((chapter) => {
        const rows = catalog.milestones.filter((m) => editorialChapter(m) === chapter).sort((a, b) => a.order - b.order);
        if (!rows.length) return null;
        return <section className="route-chapter" key={chapter}><header><small>{CHAPTER_LABEL[chapter] ?? chapter}</small><b>{rows.length} hitos</b></header><div className="route-list">
          {rows.map((milestone) => {
            const mp = getMilestoneProgress(milestone, catalog.milestoneTasks, progress.snapshot);
            const tasks = catalog.milestoneTasks.filter((task) => task.milestoneId === milestone.id);
            const statuses = tasks.map((task) => getMilestoneTaskStatus(task, progress.snapshot));
            const blocked = statuses.length > 0 && statuses.some((status) => status === 'blocked') && statuses.every((status) => status === 'completed' || status === 'blocked');
            return <article key={milestone.id} className={`route-row ${milestone.id === current.id ? 'current' : ''} ${mp.ratio === 1 ? 'done' : ''} ${blocked ? 'blocked' : ''}`} onClick={() => onSelect(milestone)}>
              <button className="route-check" onClick={(event) => { event.stopPropagation(); const status = mp.ratio === 1 ? 'not_started' : 'completed'; const criterionIds = tasks.flatMap((task) => task.criterionId ? [task.criterionId] : []); const taskIds = tasks.flatMap((task) => task.criterionId ? [] : [task.id]); void progress.setMilestoneStatus(milestone.id, criterionIds, taskIds, status); }}>{mp.ratio === 1 ? '✓' : blocked ? '×' : ''}</button>
              <div><small>{milestone.kind.replaceAll('_', ' ')} · {milestone.sourceReference}</small><h3>{milestone.title}</h3>{milestone.missableRisk && <span className="risk-pill">PERDIBLE</span>}{blocked && <span className="blocked-pill">BLOQUEADO</span>}{Boolean(milestone.metadata?.editorialInference) && <span className="editorial-pill">ORDEN EDITORIAL</span>}</div>
              <strong>{mp.completed}/{mp.total}</strong>
            </article>;
          })}
        </div></section>;
      })}
    </div>
  </section>;
}
