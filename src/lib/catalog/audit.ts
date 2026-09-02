type AuditReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: Record<string, number>;
};

function countDuplicates(values: string[]) {
  return values.length - new Set(values).size;
}

function pdfReferencePages(sourceReferences: any[]): Set<number> {
  const pages = new Set<number>();
  for (const ref of sourceReferences) {
    if (ref?.sourceKind !== 'pdf') continue;
    const locator = String(ref?.locator ?? '');
    for (const match of locator.matchAll(/PDF pp?\.(\d+)(?:-(\d+))?/g)) {
      const start = Number(match[1]);
      const end = Number(match[2] ?? match[1]);
      for (let page = start; page <= end; page += 1) pages.add(page);
    }
  }
  return pages;
}

export function auditCatalog(catalog: any): AuditReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const entities = catalog?.entities ?? [];
  const criteria = catalog?.criteria ?? [];
  const relations = catalog?.relations ?? [];
  const milestones = catalog?.milestones ?? [];
  const tasks = catalog?.milestoneTasks ?? [];
  const recipes = catalog?.recipes ?? [];
  const sourceReferences = catalog?.sourceReferences ?? [];
  const mediaAssets = catalog?.mediaAssets ?? [];

  const entityIds = new Set(entities.map((row: any) => row.id));
  const criterionIds = new Set(criteria.map((row: any) => row.id));
  const milestoneIds = new Set(milestones.map((row: any) => row.id));
  const taskIds = new Set(tasks.map((row: any) => row.id));
  const mediaAssetIds = new Set(mediaAssets.map((row: any) => row.id));

  const duplicateEntities = countDuplicates(entities.map((row: any) => row.id));
  const duplicateCriteria = countDuplicates(criteria.map((row: any) => row.id));
  const duplicateMilestones = countDuplicates(milestones.map((row: any) => row.id));
  const duplicateTasks = countDuplicates(tasks.map((row: any) => row.id));
  const orphanCriteria = criteria.filter((row: any) => !entityIds.has(row.entityId)).length;
  const orphanRelations = relations.filter((row: any) => !entityIds.has(row.fromId) || !entityIds.has(row.toId)).length;
  const orphanTasks = tasks.filter((row: any) => !milestoneIds.has(row.milestoneId) || (row.entityId && !entityIds.has(row.entityId)) || (row.criterionId && !criterionIds.has(row.criterionId))).length;
  const invalidRecipes = recipes.filter((row: any) => !entityIds.has(row.entityId) || (row.requirements ?? []).some((req: any) => req.materialId && !entityIds.has(req.materialId))).length;

  const validTargets: Record<string, Set<any>> = {
    entity: entityIds,
    criterion: criterionIds,
    milestone: milestoneIds,
    task: taskIds,
    media_asset: mediaAssetIds,
  };
  const invalidSourceReferences = sourceReferences.filter((row: any) => {
    const targets = validTargets[row.targetType];
    return !targets || !targets.has(row.targetId) || !row.sourceKind || !row.locator;
  }).length;

  if (duplicateEntities) errors.push(`Hay ${duplicateEntities} IDs de entidad duplicados.`);
  if (duplicateCriteria) errors.push(`Hay ${duplicateCriteria} IDs de criterio duplicados.`);
  if (duplicateMilestones) errors.push(`Hay ${duplicateMilestones} IDs de hito duplicados.`);
  if (duplicateTasks) errors.push(`Hay ${duplicateTasks} IDs de tarea duplicados.`);
  if (orphanCriteria) errors.push(`Hay ${orphanCriteria} criterios huérfanos.`);
  if (orphanRelations) errors.push(`Hay ${orphanRelations} relaciones huérfanas.`);
  if (orphanTasks) errors.push(`Hay ${orphanTasks} tareas huérfanas o con enlaces inválidos.`);
  if (invalidRecipes) errors.push(`Hay ${invalidRecipes} recetas con entidades o materiales inválidos.`);
  if (invalidSourceReferences) errors.push(`Hay ${invalidSourceReferences} referencias de fuente inválidas.`);

  const xlsxSheets = catalog?.audit?.xlsxSheets ?? [];
  const pdfPages = Number(catalog?.audit?.pdfPages ?? 0);
  if (xlsxSheets.length !== 15) errors.push(`El catálogo declara ${xlsxSheets.length}/15 hojas del Excel.`);
  if (pdfPages !== 51) errors.push(`El catálogo declara ${pdfPages}/51 páginas del PDF.`);
  if (!catalog?.audit?.hasColter) errors.push('La ruta no confirma el inicio en Colter.');
  if (!catalog?.audit?.hasAmericanVenom) errors.push('La ruta no confirma American Venom.');

  const referencedPages = pdfReferencePages(sourceReferences);
  const expectedContentPages = Array.from({ length: 50 }, (_, index) => index + 2).filter((page) => page !== 27);
  const missingPdfContentPages = expectedContentPages.filter((page) => !referencedPages.has(page));
  if (missingPdfContentPages.length) errors.push(`Páginas de contenido del PDF sin referencia estructurada: ${missingPdfContentPages.join(', ')}.`);

  const tasksWithoutSource = tasks.filter((row: any) => !row.sourceReference).length;
  if (tasksWithoutSource) errors.push(`Hay ${tasksWithoutSource} tareas sin fuente.`);

  const rdo = (catalog?.mapSources?.markers ?? []).filter((url: string) => /red.?dead.?online|rdo/i.test(url));
  if (rdo.length) errors.push('El mapa contiene fuentes de Red Dead Online.');

  if ((catalog?.mapMarkers ?? []).length < 10) warnings.push('El seed estático tiene pocos marcadores; producción depende de la fuente completa de marcadores del mapa.');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      entities: entities.length,
      criteria: criteria.length,
      relations: relations.length,
      milestones: milestones.length,
      milestoneTasks: tasks.length,
      recipes: recipes.length,
      sourceReferences: sourceReferences.length,
      xlsxSheets: xlsxSheets.length,
      pdfPages,
      pdfReferencedContentPages: expectedContentPages.filter((page) => referencedPages.has(page)).length,
      orphanCriteria,
      orphanRelations,
      orphanTasks,
      invalidSourceReferences,
    },
  };
}
