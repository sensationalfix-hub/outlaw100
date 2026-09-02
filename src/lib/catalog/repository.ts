import type {
  CanonicalCatalog,
  CatalogArchiveEntry,
  CatalogCriterion,
  CatalogEntity,
  CatalogMapMarker,
  CatalogMediaAsset,
  CatalogMilestone,
  CatalogMilestoneTask,
  CatalogRecipe,
  CatalogRelation,
  CatalogSourceReference,
} from './types.ts';

type QueryError = { message?: string } | null;
type QueryResult<T> = { data: T; error: QueryError };
type RangeQuery = {
  order(column: string): RangeQuery;
  range(from: number, to: number): Promise<QueryResult<any[] | null>>;
};
type SupabaseCatalogClient = {
  from(table: string): { select(columns?: string): RangeQuery };
};

function assertNoError(error: QueryError, table: string) {
  if (error) throw new Error(error.message || `No se pudo cargar ${table}`);
}

const ORDER_COLUMN: Record<string, string> = {
  entities: 'id',
  criteria: 'id',
  relations: 'id',
  milestones: 'sort_order',
  milestone_tasks: 'id',
  craft_recipes: 'id',
  craft_requirements: 'recipe_id',
  archive_entries: 'id',
  map_markers: 'id',
  media_assets: 'id',
  source_references: 'id',
};

async function readTable(client: SupabaseCatalogClient, table: string): Promise<any[]> {
  const rows: any[] = [];
  const batchSize = 1000;
  for (let from = 0; ; from += batchSize) {
    const query = client.from(table).select('*').order(ORDER_COLUMN[table] ?? 'id');
    const { data, error } = await query.range(from, from + batchSize - 1);
    assertNoError(error, table);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < batchSize) break;
  }
  return rows;
}

export async function loadCatalogFromSupabase(
  client: SupabaseCatalogClient,
  staticMeta: Pick<CanonicalCatalog, 'version'> & Partial<CanonicalCatalog>,
): Promise<CanonicalCatalog> {
  const [
    entityRows,
    criterionRows,
    relationRows,
    milestoneRows,
    taskRows,
    recipeRows,
    requirementRows,
    archiveRows,
    markerRows,
    mediaRows,
    sourceReferenceRows,
  ] = await Promise.all([
    readTable(client, 'entities'),
    readTable(client, 'criteria'),
    readTable(client, 'relations'),
    readTable(client, 'milestones'),
    readTable(client, 'milestone_tasks'),
    readTable(client, 'craft_recipes'),
    readTable(client, 'craft_requirements'),
    readTable(client, 'archive_entries'),
    readTable(client, 'map_markers'),
    readTable(client, 'media_assets'),
    readTable(client, 'source_references'),
  ]);

  if (!entityRows.length || !milestoneRows.length) {
    throw new Error('El catálogo canónico está vacío en Supabase');
  }

  const entities: CatalogEntity[] = entityRows.map((row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    category: row.category,
    metadata: row.metadata ?? {},
    source: row.source ?? {},
  }));

  const criteria: CatalogCriterion[] = criterionRows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    key: row.key,
    label: row.label,
    criterionType: row.criterion_type,
    metadata: row.metadata ?? {},
    source: row.source ?? {},
  }));

  const relations: CatalogRelation[] = relationRows.map((row) => ({
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    type: row.type,
  }));

  const milestones: CatalogMilestone[] = milestoneRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    chapter: row.chapter,
    title: row.title,
    order: Number(row.sort_order ?? 0),
    sourcePage: Number(row.source_page ?? 0),
    sourceReference: row.source_reference ?? '',
    missableRisk: Boolean(row.missable_risk),
    availability: row.availability ?? {},
    details: row.details ?? '',
    checklist: row.checklist ?? [],
    metadata: row.metadata ?? {},
  }));

  const milestoneTasks: CatalogMilestoneTask[] = taskRows.map((row) => ({
    id: row.id,
    milestoneId: row.milestone_id,
    taskType: row.task_type,
    label: row.label,
    order: Number(row.sort_order ?? 0),
    sourceReference: row.source_reference ?? '',
    sourcePage: Number(row.source_page ?? 0),
    entityId: row.entity_id ?? null,
    criterionId: row.criterion_id ?? null,
    metadata: row.metadata ?? {},
  }));

  const requirementsByRecipe = new Map<string, CatalogRecipe['requirements']>();
  for (const row of requirementRows) {
    const list = requirementsByRecipe.get(row.recipe_id) ?? [];
    list.push({
      materialId: row.material_id,
      materialName: row.material_name,
      quantity: Number(row.quantity),
      tier: row.material_tier ?? null,
    });
    requirementsByRecipe.set(row.recipe_id, list);
  }

  const recipes: CatalogRecipe[] = recipeRows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    requirements: requirementsByRecipe.get(row.id) ?? [],
    source: row.source ?? {},
  }));

  const archiveEntries: CatalogArchiveEntry[] = archiveRows.map((row) => ({
    id: row.id,
    entityId: row.entity_id,
    section: row.section,
    group: row.group ?? '',
    subgroup: row.subgroup ?? '',
    name: row.name,
    missable: Boolean(row.missable),
  }));

  const mapMarkers: CatalogMapMarker[] = markerRows.map((row) => ({
    id: row.id,
    entityId: row.entity_id ?? null,
    criterionId: row.criterion_id ?? null,
    name: row.name,
    category: row.category,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    legacyX: row.legacy_x ?? null,
    legacyY: row.legacy_y ?? null,
    coordinateSystem: row.coordinate_system ?? 'rdr2-map',
    metadata: row.metadata ?? {},
    source: row.source ?? {},
  }));

  const mediaAssets: CatalogMediaAsset[] = mediaRows.map((row) => ({
    id: row.id,
    entityId: row.entity_id ?? null,
    kind: row.kind,
    publicPath: row.public_path,
    source: row.source,
  }));

  const sourceReferences: CatalogSourceReference[] = sourceReferenceRows.map((row) => ({
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    sourceKind: row.source_kind,
    locator: row.locator,
    metadata: row.metadata ?? {},
  }));

  return {
    ...staticMeta,
    version: staticMeta.version ?? 1,
    entities,
    criteria,
    relations,
    recipes,
    milestones,
    milestoneTasks,
    archiveEntries,
    mapMarkers,
    mediaAssets,
    sourceReferences,
  } as CanonicalCatalog;
}
