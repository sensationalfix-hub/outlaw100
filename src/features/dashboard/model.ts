import type { CanonicalCatalog, CatalogCriterion, CatalogEntity, CatalogMilestone } from '../../lib/catalog/types.ts';
import type { ProgressSnapshot } from '../progress/types.ts';
import { buildRecipeState } from '../crafting/model.ts';
import { isMilestoneCompleted, isMilestoneTaskCompleted } from '../route/engine.ts';

const SOURCE_ALIGNED_CHAPTERS: Record<string, string> = {
  'chapter-1': 'Capítulo 1 · Colter',
  'chapter-5': 'Capítulo 5 · Guarma',
  'epilogue-1': 'Epílogo I · Pronghorn Ranch',
  'epilogue-2': 'Epílogo II · Beecher’s Hope',
};

export type DashboardGoldObjective = CatalogCriterion & { done: boolean };

export type DashboardReadyCraftable = {
  entity: CatalogEntity;
  recipeId: string;
};

export type DashboardModel = {
  milestone: CatalogMilestone;
  displayTitle: string;
  legacyMission: CatalogEntity | null;
  goldObjectives: DashboardGoldObjective[];
  tasks: CanonicalCatalog['milestoneTasks'];
  completedTaskCount: number;
  pendingEarlierMilestones: CatalogMilestone[];
  availableRequests: CatalogMilestone[];
  nextMilestones: CatalogMilestone[];
  readyCraftables: DashboardReadyCraftable[];
  heroImageUrl: string | null;
};

function storyOrdinal(catalog: CanonicalCatalog, milestone: CatalogMilestone): number {
  const story = catalog.milestones
    .filter((row) => row.kind === 'story' && row.chapter === milestone.chapter)
    .sort((a, b) => a.order - b.order);
  return story.findIndex((row) => row.id === milestone.id);
}

function sourceStoryRows(catalog: CanonicalCatalog, chapterLabel: string): CatalogEntity[] {
  return catalog.entities
    .filter((entity) => entity.category === 'story_mission_legacy' && entity.metadata?.chapterLabel === chapterLabel)
    .sort((a, b) => {
      const ag = Number(a.metadata?.groupIndex ?? 0);
      const bg = Number(b.metadata?.groupIndex ?? 0);
      if (ag !== bg) return ag - bg;
      return Number(a.metadata?.missionIndex ?? 0) - Number(b.metadata?.missionIndex ?? 0);
    });
}

export function findSourceAlignedLegacyMission(
  catalog: CanonicalCatalog,
  milestone: CatalogMilestone,
): CatalogEntity | null {
  if (milestone.kind !== 'story') return null;
  const chapterLabel = SOURCE_ALIGNED_CHAPTERS[milestone.chapter];
  if (!chapterLabel) return null;
  const ordinal = storyOrdinal(catalog, milestone);
  if (ordinal < 0) return null;
  return sourceStoryRows(catalog, chapterLabel)[ordinal] ?? null;
}


function getMilestoneHeroImage(catalog: CanonicalCatalog, milestone: CatalogMilestone, tasks: CanonicalCatalog['milestoneTasks'], legacyMission: CatalogEntity | null): string | null {
  const criterionEntity = new Map(catalog.criteria.map((criterion) => [criterion.id, criterion.entityId]));
  const linkedEntityIds = new Set<string>();
  for (const task of tasks) {
    if (task.entityId) linkedEntityIds.add(task.entityId);
    if (task.criterionId) {
      const entityId = criterionEntity.get(task.criterionId);
      if (entityId) linkedEntityIds.add(entityId);
    }
  }
  if (legacyMission) linkedEntityIds.add(legacyMission.id);

  const linked = catalog.mediaAssets.find((asset) => asset.kind === 'image' && asset.entityId && linkedEntityIds.has(asset.entityId));
  if (linked) return linked.publicPath;

  const entityImagePaths = new Set(
    catalog.mediaAssets
      .filter((asset) => asset.kind === 'image' && asset.entityId)
      .map((asset) => asset.publicPath),
  );
  const generic = catalog.mediaAssets.filter(
    (asset) => asset.kind === 'image' && !asset.entityId && !entityImagePaths.has(asset.publicPath),
  );
  if (!generic.length) return null;
  const seed = String(milestone.metadata?.editorialChapter ?? milestone.chapter)
    .split('')
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  return generic[seed % generic.length]?.publicPath ?? generic[0]?.publicPath ?? null;
}

export function buildDashboardModel(
  catalog: CanonicalCatalog,
  milestone: CatalogMilestone,
  progress: ProgressSnapshot,
): DashboardModel {
  const legacyMission = findSourceAlignedLegacyMission(catalog, milestone);
  const goldObjectives = legacyMission
    ? catalog.criteria
        .filter((criterion) => criterion.entityId === legacyMission.id && criterion.key.startsWith('gold-'))
        .sort((a, b) => Number(a.key.slice(5)) - Number(b.key.slice(5)))
        .map((criterion) => ({ ...criterion, done: progress.criteria[criterion.id] === 'completed' }))
    : [];
  const tasks = catalog.milestoneTasks
    .filter((task) => task.milestoneId === milestone.id)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const editorialChapter = String(milestone.metadata?.editorialChapter ?? milestone.chapter);
  const sameChapter = catalog.milestones
    .filter((item) => String(item.metadata?.editorialChapter ?? item.chapter) === editorialChapter)
    .sort((a, b) => a.order - b.order);
  const pendingEarlierMilestones = sameChapter
    .filter((item) => item.order < milestone.order && !isMilestoneCompleted(item, catalog.milestoneTasks, progress))
    .slice(-4);
  const availableRequests = sameChapter
    .filter((item) => item.kind === 'item_request' && item.order <= milestone.order && !isMilestoneCompleted(item, catalog.milestoneTasks, progress))
    .slice(0, 5);
  const nextMilestones = sameChapter.filter((item) => item.order > milestone.order).slice(0, 4);
  const entityById = new Map(catalog.entities.map((entity) => [entity.id, entity]));
  const readyCraftables = catalog.recipes.flatMap((recipe) => {
    const entity = entityById.get(recipe.entityId);
    if (!entity) return [];
    const entityCriteria = catalog.criteria.filter((criterion) => criterion.entityId === entity.id);
    const recipeState = buildRecipeState(recipe, entityCriteria, progress);
    if (!recipeState.materialsReady || recipeState.crafted) return [];
    return [{ entity, recipeId: recipe.id }];
  }).slice(0, 5);

  const heroImageUrl = getMilestoneHeroImage(catalog, milestone, tasks, legacyMission);

  return {
    milestone,
    displayTitle: legacyMission?.name ?? milestone.title,
    legacyMission,
    goldObjectives,
    tasks,
    completedTaskCount: tasks.filter((task) => isMilestoneTaskCompleted(task, progress)).length,
    pendingEarlierMilestones,
    availableRequests,
    nextMilestones,
    readyCraftables,
    heroImageUrl,
  };
}
