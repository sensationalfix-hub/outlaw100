import type { CanonicalCatalog } from '../../lib/catalog/types.ts';

export type RemoteMapMarker = {
  data?: { markerType?: string; markerSubType?: string; markerDescription?: string; uid?: string | number };
  lat: number;
  lng: number;
};

export type RuntimeMapItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  entityId: string | null;
  criterionId: string | null;
};

export function normalizeMapName(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isOnlineMarker(marker: RemoteMapMarker): boolean {
  const text = `${marker.data?.markerType ?? ''} ${marker.data?.markerSubType ?? ''} ${marker.data?.markerDescription ?? ''}`;
  return /\bred dead online\b|\brdo\b|collector role|madam nazar/i.test(text);
}

function primaryCriterion(catalog: CanonicalCatalog, entityId: string): string | null {
  const rows = catalog.criteria.filter((criterion) => criterion.entityId === entityId);
  if (rows.length === 1) return rows[0].id;
  const preferred = ['owned', 'complete', 'crafted', 'caught', 'picked'];
  for (const key of preferred) {
    const row = rows.find((criterion) => criterion.key === key);
    if (row) return row.id;
  }
  return null;
}

export function buildCanonicalMapItems(catalog: CanonicalCatalog): RuntimeMapItem[] {
  return catalog.mapMarkers
    .filter((marker) => marker.coordinateSystem === 'rdr2-map' && Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude))
    .map((marker) => ({
      id: `canonical:${marker.id}`,
      name: marker.name,
      category: marker.category,
      description: String(marker.metadata?.description ?? ''),
      lat: marker.latitude as number,
      lng: marker.longitude as number,
      entityId: marker.entityId ?? null,
      criterionId: marker.criterionId ?? (marker.entityId ? primaryCriterion(catalog, marker.entityId) : null),
    }));
}

export function buildRuntimeMapItems(markers: RemoteMapMarker[], catalog: CanonicalCatalog): RuntimeMapItem[] {
  const exact = new Map<string, string>();
  for (const entity of catalog.entities) exact.set(normalizeMapName(entity.name), entity.id);
  for (const [alias, canonical] of Object.entries(catalog.mapCanonicalAliases ?? {})) {
    const entity = catalog.entities.find((item) => normalizeMapName(item.name) === normalizeMapName(canonical));
    if (entity) exact.set(normalizeMapName(alias), entity.id);
  }

  return markers.filter((marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng) && !isOnlineMarker(marker)).map((marker, index) => {
    const name = marker.data?.markerSubType?.trim() || marker.data?.markerType?.trim() || `Punto ${index + 1}`;
    const entityId = exact.get(normalizeMapName(name)) ?? null;
    return {
      id: `remote:${String(marker.data?.uid ?? index)}`,
      name,
      category: marker.data?.markerType?.trim() || 'Mapa',
      description: marker.data?.markerDescription?.trim() || '',
      lat: marker.lat,
      lng: marker.lng,
      entityId,
      criterionId: entityId ? primaryCriterion(catalog, entityId) : null,
    };
  });
}
