import type { CanonicalCatalog, CatalogEntity } from '../../lib/catalog/types.ts';

type DetailMeta = { label: string; value: string };
type DetailRelation = { id: string; type: string; entityId: string; name: string };

const META_FIELDS: Array<[string, string]> = [
  ['chapterLabel', 'CAPÍTULO'],
  ['bait', 'CEBO'],
  ['location', 'LOCALIZACIÓN'],
  ['locationOrIngredients', 'LOCALIZACIÓN / MATERIALES'],
  ['state', 'REGIÓN'],
  ['group', 'GRUPO'],
  ['subgroup', 'SUBGRUPO'],
  ['weather', 'CLIMA'],
  ['time', 'HORARIO'],
  ['schedule', 'HORARIO'],
  ['recommendedWeapon', 'ARMA RECOMENDADA'],
  ['weapon', 'ARMA RECOMENDADA'],
  ['giver', 'PERSONAJE'],
  ['quest', 'MISIÓN / CONDICIÓN'],
  ['stable', 'ESTABLO'],
  ['wild', 'SALVAJE'],
  ['steal', 'OTRA OBTENCIÓN'],
  ['set', 'SET'],
  ['number', 'NÚMERO'],
  ['effects', 'EFECTO'],
];

function readable(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value) && value.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) return value.join(' · ');
  return null;
}

export function buildEntityDetail(catalog: CanonicalCatalog, entity: CatalogEntity): {
  metadata: DetailMeta[];
  relations: DetailRelation[];
  mapMarkerCount: number;
  imageUrl: string | null;
} {
  const metadata: DetailMeta[] = [];
  for (const [key, label] of META_FIELDS) {
    const value = readable(entity.metadata?.[key]);
    if (value) metadata.push({ label, value });
  }

  const relations: DetailRelation[] = [];
  for (const relation of catalog.relations) {
    if (relation.fromId !== entity.id && relation.toId !== entity.id) continue;
    const otherId = relation.fromId === entity.id ? relation.toId : relation.fromId;
    const other = catalog.entities.find((candidate) => candidate.id === otherId);
    if (!other) continue;
    relations.push({ id: relation.id, type: relation.type, entityId: other.id, name: catalog.translations?.[other.name] ?? other.name });
  }

  const mapMarkerCount = catalog.mapMarkers.filter((marker) => marker.entityId === entity.id).length;
  const imageUrl = catalog.mediaAssets.find((asset) => asset.entityId === entity.id && asset.kind === 'image')?.publicPath ?? null;
  return { metadata, relations, mapMarkerCount, imageUrl };
}
