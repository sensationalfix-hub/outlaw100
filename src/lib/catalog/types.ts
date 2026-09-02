export type CatalogEntity = {
  id: string;
  type: string;
  name: string;
  category: string;
  metadata?: Record<string, unknown>;
  source?: Record<string, unknown>;
};

export type CatalogCriterion = {
  id: string;
  entityId: string;
  key: string;
  label: string;
  criterionType: string;
  metadata?: Record<string, unknown>;
  source?: Record<string, unknown>;
};

export type CatalogRelation = {
  id: string;
  fromId: string;
  toId: string;
  type: string;
};

export type CatalogRecipeRequirement = {
  materialId?: string;
  materialName?: string;
  quantity: number;
  tier?: string | null;
};

export type CatalogRecipe = {
  id: string;
  entityId: string;
  requirements: CatalogRecipeRequirement[];
  source?: Record<string, unknown>;
};

export type CatalogMilestone = {
  id: string;
  kind: string;
  chapter: string;
  title: string;
  order: number;
  sourcePage: number;
  sourceReference: string;
  missableRisk: boolean;
  availability?: unknown;
  details?: string;
  checklist?: unknown[];
  metadata?: Record<string, unknown>;
};

export type CatalogMilestoneTask = {
  id: string;
  milestoneId: string;
  taskType?: string;
  label?: string;
  order?: number;
  sourceReference?: string;
  sourcePage?: number;
  entityId?: string | null;
  criterionId?: string | null;
  metadata?: Record<string, unknown>;
};

export type CatalogArchiveEntry = {
  id: string;
  entityId: string;
  section: string;
  group?: string;
  subgroup?: string;
  name: string;
  missable?: boolean;
};

export type CatalogMapMarker = {
  id: string;
  entityId?: string | null;
  criterionId?: string | null;
  name: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  legacyX?: number | null;
  legacyY?: number | null;
  coordinateSystem?: string;
  metadata?: Record<string, unknown>;
  source?: Record<string, unknown>;
};


export type CatalogSourceReference = {
  id: string;
  targetType: string;
  targetId: string;
  sourceKind: string;
  locator: string;
  metadata?: Record<string, unknown>;
};

export type CatalogMediaAsset = {
  id: string;
  kind: string;
  source: string;
  publicPath: string;
  entityId?: string | null;
};

export type CanonicalCatalog = {
  version: number | string;
  entities: CatalogEntity[];
  criteria: CatalogCriterion[];
  relations: CatalogRelation[];
  recipes: CatalogRecipe[];
  milestones: CatalogMilestone[];
  milestoneTasks: CatalogMilestoneTask[];
  archiveEntries: CatalogArchiveEntry[];
  mapMarkers: CatalogMapMarker[];
  mediaAssets: CatalogMediaAsset[];
  sourceReferences?: CatalogSourceReference[];
  translations?: Record<string, string>;
  mapCanonicalAliases?: Record<string, string>;
  mapSources?: { markers?: string[]; tiles?: string; plants?: string[] };
  designTokens?: Record<string, unknown>;
  fontAsset?: string;
  audit?: Record<string, unknown>;
};
