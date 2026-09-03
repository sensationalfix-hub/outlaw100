import type { CanonicalCatalog, CatalogCriterion, CatalogEntity, CatalogMilestone } from '../../lib/catalog/types.ts';
import type { ProgressSnapshot } from '../progress/types.ts';
import { buildRecipeState } from '../crafting/model.ts';
import { isMilestoneCompleted, isMilestoneTaskCompleted } from '../route/engine.ts';
import { getCuratedDashboardHero } from './hero-images.ts';

const STORY_CHAPTER_LABELS: Record<string, string> = {
  'chapter-1': 'Capítulo 1 · Colter',
  'chapter-2': 'Capítulo 2 · Mirador de la Herradura',
  'chapter-3': 'Capítulo 3 · Clemens Point',
  'chapter-4': 'Capítulo 4 · Shady Belle',
  'chapter-5': 'Capítulo 5 · Guarma',
  'chapter-6': 'Capítulo 6 · Beaver Hollow',
  'epilogue-1': 'Epílogo I · Pronghorn Ranch',
  'epilogue-2': 'Epílogo II · Beecher’s Hope',
};

const ORDINAL_ALIGNED_CHAPTERS = new Set(['chapter-1', 'chapter-5', 'epilogue-1', 'epilogue-2']);

function normalizeMissionTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const LEGACY_TITLE_BY_ROUTE_TITLE = new Map<string, string>([
  // Chapter 2. The PDF splits several mission chains that the legacy HTML groups.
  ['Polite Society, Valentine Style', 'Sociedad educada, estilo Valentine'],
  ['Americans at Rest', 'Americanos descansando'],
  ['Who is Not Without Sin?', 'El que esté libre de pecado...'],
  ['Exit Pursued by a Bruised Ego', 'Sale, perseguido por un orgullo herido'],
  ['The First Shall Be Last', 'Los primeros serán los últimos'],
  ['Paying a Social Call', 'Una visita de compromiso'],
  ['A Quiet Time', 'Tiempos de desasosiego'],
  ['Blessed Are the Meek?', '¿Bienaventurados los mansos?'],
  ['Good, Honest, Snake Oil', 'Aceite de serpiente bueno y auténtico'],
  ['We Loved Once and True I', 'Amor único y verdadero I-III'],
  ['We Loved Once and True II', 'Amor único y verdadero I-III'],
  ['We Loved Once and True III', 'Amor único y verdadero I-III'],
  ['Money Lending and Other Sins I', 'Prestar dinero y otros pecados I-II'],
  ['Money Lending and Other Sins II', 'Prestar dinero y otros pecados I-II'],
  ['The Spines of America', 'Las columnas de América'],
  ['Pouring Forth Oil I', 'Derramando petróleo I-II'],
  ['Pouring Forth Oil II', 'Derramando petróleo I-II'],
  ['Pouring Forth Oil III', 'Derramando petróleo III-IV'],
  ['Pouring Forth Oil IV', 'Derramando petróleo III-IV'],
  ['A Fisher of Men', 'Pescador de hombres'],
  ['An American Pastoral Scene', 'Una escena pastoral americana'],
  ['The Sheep and the Goats', 'Las ovejas y las cabras'],
  ['A Strange Kindness', 'Una amabilidad inusitada'],

  // Chapter 3.
  ['The New South', 'El nuevo Sur'],
  ['Further Questions of Female Suffrage', 'Más cuestiones del sufragio femenino'],
  ['Money Lending and Other Sins IV', 'Prestar dinero y otros pecados IV'],
  ['American Distillation', 'Destilación americana'],
  ['The Course of True Love I', 'El camino del amor verdadero I-II'],
  ['The Course of True Love II', 'El camino del amor verdadero I-II'],
  ['The Course of True Love III', 'El camino del amor verdadero III'],
  ['Advertising, the New American Art', 'Publicidad: el nuevo arte americano I-II'],
  ['Horse Flesh for Dinner', 'Carne de caballo para cenar'],
  ['The Fine Joys of Tobacco', 'Los placeres del tabaco'],
  ['Magicians for Sport', 'A la caza del mago'],
  ['Friends in Very Low Places', 'Amigos en los bajos fondos'],
  ['An Honest Mistake', 'Un error sin mala intención'],
  ['Preaching Forgiveness as He Went', 'Predicando el perdón a su paso'],
  ['Sodom? Back to Gomorrah', '¿Sodoma? De vuelta a Gomorra'],
  ['Blessed Are the Peacemakers', 'Bienaventurados los pacificadores'],
  ['A Short Walk in Pretty Town', 'Breve paso en una bonita ciudad'],
  ['Blood Feuds, Ancient and Modern', 'Disputas familiares pasadas y presentes'],
  ['The Battle of Shady Belle', 'La batalla de Shady Belle'],

  // Chapter 4. Optional legacy missions without a route story node remain intentionally unlinked.
  ['The Joys of Civilization', 'Los placeres de la civilización'],
  ['Angelo Bronte, A Man of Honor', 'Angelo Bronte, un hombre de honor'],
  ['Money Lending and Other Sins V', 'Prestar dinero y otros pecados V'],
  ['Fatherhood and Other Dreams I', 'La paternidad y otros sueños I-II'],
  ['Fatherhood and Other Dreams II', 'La paternidad y otros sueños I-II'],
  ['No, No and Thrice No', 'No, no y mil veces no'],
  ['The Gilded Cage', 'Jaula de oro'],
  ['A Fine Night of Debauchery', 'Una agradable noche de desenfreno'],
  ['American Fathers I', 'Padres americanos I-II'],
  ['American Fathers II', 'Padres americanos I-II'],
  ['Horsemen, Apocalypses', 'Jinetes y apocalipsis'],
  ['Urban Pleasures', 'Placeres urbanos'],
  ['Country Pursuits', 'Cacerías campestres'],
  ['Revenge is a Dish Best Eaten', 'La venganza es un plato que se come'],
  ['Banking, the Old American Art', 'Los bancos: el viejo arte americano'],

  // Chapter 6.
  ['Icarus and Friends', 'Ícaro y sus amigos'],
  ['Visiting Hours', 'Horario de visita'],
  ['Just a Social Call', 'Una simple visita de cortesía'],
  ['Do Not Seek Absolution I', 'No busques redención I-II'],
  ['Do Not Seek Absolution II', 'No busques redención I-II'],
  ['The Course of True Love IV', 'El camino del amor verdadero IV-V'],
  ['The Course of True Love V', 'El camino del amor verdadero IV-V'],
  ['Money Lending and Other Sins VI', 'Prestar dinero y otros pecados VI-VII'],
  ['Money Lending and Other Sins VII', 'Prestar dinero y otros pecados VI-VII'],
  ['The Delights of Van Horn', 'Las delicias de Van Horn'],
  ['The Bridge to Nowhere', 'El puente hacia ninguna parte'],
  ['A Rage Unleashed', 'Furia desatada'],
  ['Archeology for Beginners', 'Arqueología para principiantes'],
  ['Honor, Amongst Thieves', 'Honor entre ladrones'],
  ['The Fine Art of Conversation', 'El bello arte de la conversación'],
  ['Goodbye, Dear Friend', 'Adiós, querido amigo'],
  ['Mrs. Sadie Adler, Widow I', 'Sadie Adler, viuda I-II'],
  ['Mrs. Sadie Adler, Widow II', 'Sadie Adler, viuda I-II'],
  ['Favored Sons', 'Hijos preferidos'],
  ['The King’s Son', 'El hijo del rey'],
  ['My Last Boy', 'Mi último hijo'],
  ['Our Best Selves', 'Nuestra mejor versión'],
  ['Red Dead Redemption', 'Red Dead Redemption'],
].map(([routeTitle, legacyTitle]) => [normalizeMissionTitle(routeTitle), legacyTitle]));

export type DashboardGoldObjective = CatalogCriterion & { done: boolean };

export type DashboardMissionCompletion = {
  criterion: CatalogCriterion;
  done: boolean;
};

export type DashboardReadyCraftable = {
  entity: CatalogEntity;
  recipeId: string;
};

export type DashboardModel = {
  milestone: CatalogMilestone;
  displayTitle: string;
  legacyMission: CatalogEntity | null;
  missionCompletion: DashboardMissionCompletion | null;
  goldObjectives: DashboardGoldObjective[];
  tasks: CanonicalCatalog['milestoneTasks'];
  completedTaskCount: number;
  pendingEarlierMilestones: CatalogMilestone[];
  availableRequests: CatalogMilestone[];
  nextMilestones: CatalogMilestone[];
  readyCraftables: DashboardReadyCraftable[];
  heroImageUrl: string | null;
  curatedHeroImageUrl: string;
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
  const chapterLabel = STORY_CHAPTER_LABELS[milestone.chapter];
  if (!chapterLabel) return null;

  const rows = sourceStoryRows(catalog, chapterLabel);
  const translatedTitle = catalog.translations?.[milestone.title];
  const aliasedTitle = LEGACY_TITLE_BY_ROUTE_TITLE.get(normalizeMissionTitle(milestone.title));
  const candidateTitles = [translatedTitle, aliasedTitle, milestone.title].filter((value): value is string => Boolean(value));
  for (const candidate of candidateTitles) {
    const normalized = normalizeMissionTitle(candidate);
    const exact = rows.find((entity) => normalizeMissionTitle(entity.name) === normalized);
    if (exact) return exact;
  }

  if (!ORDINAL_ALIGNED_CHAPTERS.has(milestone.chapter)) return null;
  const ordinal = storyOrdinal(catalog, milestone);
  if (ordinal < 0) return null;
  return rows[ordinal] ?? null;
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
  const missionCriteria = legacyMission
    ? catalog.criteria.filter((criterion) => criterion.entityId === legacyMission.id)
    : [];
  const completionCriterion = missionCriteria.find((criterion) => criterion.key === 'complete');
  const missionCompletion = completionCriterion
    ? { criterion: completionCriterion, done: progress.criteria[completionCriterion.id] === 'completed' }
    : null;
  const goldObjectives = missionCriteria
    .filter((criterion) => criterion.key.startsWith('gold-'))
    .sort((a, b) => Number(a.key.slice(5)) - Number(b.key.slice(5)))
    .map((criterion) => ({ ...criterion, done: progress.criteria[criterion.id] === 'completed' }));
  const tasks = catalog.milestoneTasks
    .filter((task) => task.milestoneId === milestone.id)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const editorialChapter = String(milestone.metadata?.editorialChapter ?? milestone.chapter);
  const sameChapter = catalog.milestones
    .filter((item) => String(item.metadata?.editorialChapter ?? item.chapter) === editorialChapter)
    .sort((a, b) => a.order - b.order);
  const chapterIndex = Math.max(0, sameChapter.findIndex((item) => item.id === milestone.id));
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
  const curatedHeroImageUrl = getCuratedDashboardHero(milestone.chapter, chapterIndex);

  return {
    milestone,
    displayTitle: legacyMission?.name ?? milestone.title,
    legacyMission,
    missionCompletion,
    goldObjectives,
    tasks,
    completedTaskCount: tasks.filter((task) => isMilestoneTaskCompleted(task, progress)).length,
    pendingEarlierMilestones,
    availableRequests,
    nextMilestones,
    readyCraftables,
    heroImageUrl,
    curatedHeroImageUrl,
  };
}
