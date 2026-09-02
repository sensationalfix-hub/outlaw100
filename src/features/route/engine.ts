import type { CanonicalCatalog, CatalogMilestone, CatalogMilestoneTask } from '../../lib/catalog/types.ts';
import type { ProgressSnapshot, ProgressStatus } from '../progress/types.ts';

export function tasksForMilestone(
  milestone: Pick<CatalogMilestone, 'id'>,
  tasks: CatalogMilestoneTask[],
): CatalogMilestoneTask[] {
  return tasks.filter((task) => task.milestoneId === milestone.id);
}

type TaskProgressInput = ProgressSnapshot | Record<string, ProgressStatus>;

function isSnapshot(progress: TaskProgressInput): progress is ProgressSnapshot {
  return 'criteria' in progress && 'tasks' in progress && 'inventory' in progress;
}

export function getMilestoneTaskStatus(
  task: CatalogMilestoneTask,
  progress: TaskProgressInput,
): ProgressStatus {
  if (isSnapshot(progress)) {
    if (task.criterionId) return progress.criteria[task.criterionId] ?? 'not_started';
    return progress.tasks[task.id] ?? 'not_started';
  }
  return progress[task.id] ?? 'not_started';
}

export function isMilestoneTaskCompleted(
  task: CatalogMilestoneTask,
  progress: TaskProgressInput,
): boolean {
  return getMilestoneTaskStatus(task, progress) === 'completed';
}

export function isMilestoneActionable(
  milestone: Pick<CatalogMilestone, 'id'>,
  tasks: CatalogMilestoneTask[],
  progress: TaskProgressInput,
): boolean {
  const milestoneTasks = tasksForMilestone(milestone, tasks);
  if (milestoneTasks.length === 0) return true;
  return milestoneTasks.some((task) => {
    const status = getMilestoneTaskStatus(task, progress);
    return status !== 'completed' && status !== 'blocked';
  });
}

export function isMilestoneCompleted(
  milestone: Pick<CatalogMilestone, 'id'>,
  tasks: CatalogMilestoneTask[],
  progress: TaskProgressInput,
): boolean {
  const milestoneTasks = tasksForMilestone(milestone, tasks);
  if (milestoneTasks.length === 0) return false;
  return milestoneTasks.every((task) => isMilestoneTaskCompleted(task, progress));
}

export function getRecommendedMilestone(
  catalog: Pick<CanonicalCatalog, 'milestones' | 'milestoneTasks'>,
  progress: ProgressSnapshot,
): CatalogMilestone | null {
  const ordered = [...catalog.milestones].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.missableRisk !== b.missableRisk) return a.missableRisk ? -1 : 1;
    return a.title.localeCompare(b.title, 'es');
  });

  return ordered.find((milestone) =>
    !isMilestoneCompleted(milestone, catalog.milestoneTasks, progress)
    && isMilestoneActionable(milestone, catalog.milestoneTasks, progress)
  ) ?? null;
}

export function getMilestoneProgress(
  milestone: Pick<CatalogMilestone, 'id'>,
  tasks: CatalogMilestoneTask[],
  progress: TaskProgressInput,
) {
  const milestoneTasks = tasksForMilestone(milestone, tasks);
  const completed = milestoneTasks.filter((task) => isMilestoneTaskCompleted(task, progress)).length;
  return {
    completed,
    total: milestoneTasks.length,
    ratio: milestoneTasks.length ? completed / milestoneTasks.length : 0,
  };
}

export function getChapterProgress(
  chapter: string,
  catalog: Pick<CanonicalCatalog, 'milestones' | 'milestoneTasks'>,
  progress: ProgressSnapshot,
) {
  const milestones = catalog.milestones.filter((milestone) => String(milestone.metadata?.editorialChapter ?? milestone.chapter) === chapter);
  const completed = milestones.filter((milestone) => isMilestoneCompleted(milestone, catalog.milestoneTasks, progress)).length;
  return { completed, total: milestones.length, ratio: milestones.length ? completed / milestones.length : 0 };
}
