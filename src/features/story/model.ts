import type { CanonicalCatalog, CatalogCriterion, CatalogEntity } from '../../lib/catalog/types.ts';

export type StoryMissionModel = {
  entity: CatalogEntity;
  criteria: CatalogCriterion[];
  goldCriteria: CatalogCriterion[];
  hasGold: boolean;
  goldEarned: boolean;
  goldCompleted: number;
  goldTotal: number;
  completed: boolean;
  completedCriteria: number;
  totalCriteria: number;
  order: number;
};

export type StoryChapterGroup = {
  label: string;
  order: number;
  missions: StoryMissionModel[];
};

function numericMetadata(entity: CatalogEntity, key: string, fallback = 0): number {
  const value = Number(entity.metadata?.[key] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function canonicalChapterOrder(label: string, legacyOrder: number): number {
  const normalized = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const chapter = normalized.match(/\bcapitulo\s+(\d+)\b/);
  if (chapter) {
    const number = Number(chapter[1]);
    if (number >= 1 && number <= 6) return number;
  }

  const epilogue = normalized.match(/\bepilogo\s+(ii|i)\b/);
  if (epilogue?.[1] === 'i') return 7;
  if (epilogue?.[1] === 'ii') return 8;

  return 1000 + legacyOrder;
}

export function buildStoryGroups(
  catalog: CanonicalCatalog,
  criterionProgress: Record<string, string>,
): StoryChapterGroup[] {
  const story = catalog.entities.filter((entity) => entity.category === 'story_mission_legacy');
  const criteriaByEntity = new Map<string, CatalogCriterion[]>();
  for (const criterion of catalog.criteria) {
    const rows = criteriaByEntity.get(criterion.entityId) ?? [];
    rows.push(criterion);
    criteriaByEntity.set(criterion.entityId, rows);
  }

  const grouped = new Map<string, StoryChapterGroup>();
  for (const entity of story) {
    const label = String(entity.metadata?.chapterLabel ?? 'Historia');
    const legacyGroupOrder = numericMetadata(entity, 'groupIndex', Number.MAX_SAFE_INTEGER);
    const groupOrder = canonicalChapterOrder(label, legacyGroupOrder);
    const missionOrder = numericMetadata(entity, 'missionIndex', Number.MAX_SAFE_INTEGER);
    const criteria = criteriaByEntity.get(entity.id) ?? [];
    const goldCriteria = criteria
      .filter((criterion) => criterion.key.startsWith('gold-'))
      .sort((a, b) => Number(a.key.slice(5)) - Number(b.key.slice(5)));
    const goldCompleted = goldCriteria.filter((criterion) => criterionProgress[criterion.id] === 'completed').length;
    const completionCriterion = criteria.find((criterion) => criterion.key === 'complete');
    const mission: StoryMissionModel = {
      entity,
      criteria,
      goldCriteria,
      hasGold: goldCriteria.length > 0,
      goldEarned: goldCriteria.length > 0 && goldCompleted === goldCriteria.length,
      goldCompleted,
      goldTotal: goldCriteria.length,
      completed: completionCriterion ? criterionProgress[completionCriterion.id] === 'completed' : false,
      completedCriteria: criteria.filter((criterion) => criterionProgress[criterion.id] === 'completed').length,
      totalCriteria: criteria.length,
      order: missionOrder,
    };
    const current = grouped.get(label);
    if (current) current.missions.push(mission);
    else grouped.set(label, { label, order: groupOrder, missions: [mission] });
  }

  return [...grouped.values()]
    .map((group) => ({ ...group, missions: [...group.missions].sort((a, b) => a.order - b.order || a.entity.name.localeCompare(b.entity.name, 'es')) }))
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label, 'es'));
}
