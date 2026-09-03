import type { CanonicalCatalog, CatalogEntity } from '../../lib/catalog/types.ts';

export type EntityScope = {
  categories: string[];
  legendary?: boolean;
};

export type SearchHit = {
  id: string;
  kind: 'entity' | 'milestone';
  title: string;
  subtitle: string;
  score: number;
  entityId?: string;
  milestoneId?: string;
};

const SOURCE_SUMMARY_ENTITY_NAMES = new Set([
  'COMPLETE',
  'INCOMPLETE',
  'TOTAL',
  'WEAPONS',
  'REINFORCED EQUIPMENT',
]);

export function normalizeSearch(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function isSourceSummaryEntity(entity: CatalogEntity): boolean {
  return SOURCE_SUMMARY_ENTITY_NAMES.has(entity.name.trim().toUpperCase());
}

export function matchesEntityScope(entity: CatalogEntity, scope: EntityScope): boolean {
  if (isSourceSummaryEntity(entity)) return false;
  if (!scope.categories.includes(entity.category)) return false;
  if (scope.legendary === undefined) return true;
  return Boolean(entity.metadata?.legendary) === scope.legendary;
}

function searchableMetadata(metadata?: Record<string, unknown>): string {
  if (!metadata) return '';
  return Object.values(metadata)
    .filter((value) => ['string', 'number', 'boolean'].includes(typeof value))
    .map(String)
    .join(' ');
}

function matchScore(query: string, primary: string, haystack: string): number {
  if (!query || !haystack.includes(query)) return -1;
  if (primary === query) return 100;
  if (primary.startsWith(query)) return 80;
  const wordStart = haystack.split(' ').some((word) => word.startsWith(query));
  if (wordStart) return 60;
  return 40;
}

export function searchCatalog(catalog: CanonicalCatalog, rawQuery: string, limit = 24): SearchHit[] {
  const query = normalizeSearch(rawQuery);
  if (!query) return [];

  const reverseAliases = new Map<string, string[]>();
  for (const [alias, canonical] of Object.entries(catalog.mapCanonicalAliases ?? {})) {
    const key = normalizeSearch(canonical);
    reverseAliases.set(key, [...(reverseAliases.get(key) ?? []), alias]);
  }

  const hits: SearchHit[] = [];
  for (const entity of catalog.entities) {
    if (isSourceSummaryEntity(entity)) continue;
    const translated = catalog.translations?.[entity.name] ?? '';
    const aliases = reverseAliases.get(normalizeSearch(entity.name)) ?? [];
    const primary = normalizeSearch(entity.name);
    const haystack = normalizeSearch([
      entity.name,
      translated,
      entity.type,
      entity.category,
      searchableMetadata(entity.metadata),
      ...aliases,
    ].join(' '));
    const score = matchScore(query, primary, haystack);
    if (score < 0) continue;
    hits.push({
      id: entity.id,
      kind: 'entity',
      title: translated || entity.name,
      subtitle: translated ? entity.name : entity.category.replaceAll('_', ' '),
      score,
      entityId: entity.id,
    });
  }

  for (const milestone of catalog.milestones) {
    const primary = normalizeSearch(milestone.title);
    const haystack = normalizeSearch([
      milestone.title,
      milestone.chapter,
      milestone.kind,
      milestone.details ?? '',
      milestone.sourceReference ?? '',
    ].join(' '));
    const score = matchScore(query, primary, haystack);
    if (score < 0) continue;
    hits.push({
      id: milestone.id,
      kind: 'milestone',
      title: milestone.title,
      subtitle: `${milestone.kind.replaceAll('_', ' ')} · ${milestone.chapter}`,
      score,
      milestoneId: milestone.id,
    });
  }

  return hits
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'es'))
    .slice(0, limit);
}
