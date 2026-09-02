import type { CanonicalCatalog } from '../../lib/catalog/types.ts';
import type { RuntimeMapItem } from './model.ts';

export type NearbyMapItem = RuntimeMapItem & { distance: number };

export type MilestoneMapContext = {
  anchor: RuntimeMapItem | null;
  linked: RuntimeMapItem[];
  nearby: NearbyMapItem[];
};

export function simpleMapDistance(
  a: Pick<RuntimeMapItem, 'lat' | 'lng'>,
  b: Pick<RuntimeMapItem, 'lat' | 'lng'>,
): number {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng);
}

export function getMilestoneMapContext(
  items: RuntimeMapItem[],
  catalog: Pick<CanonicalCatalog, 'milestoneTasks'>,
  milestoneId: string,
  limit = 6,
): MilestoneMapContext {
  const linkedEntityIds = new Set(
    catalog.milestoneTasks
      .filter((task) => task.milestoneId === milestoneId && task.entityId)
      .map((task) => task.entityId as string),
  );

  const linked = items.filter((item) => item.entityId && linkedEntityIds.has(item.entityId));
  const anchor = linked[0] ?? null;
  if (!anchor) return { anchor: null, linked: [], nearby: [] };

  const linkedIds = new Set(linked.map((item) => item.id));
  const nearby = items
    .filter((item) => !linkedIds.has(item.id))
    .map((item) => ({
      ...item,
      distance: Math.min(...linked.map((linkedItem) => simpleMapDistance(item, linkedItem))),
    }))
    .sort((a, b) => a.distance - b.distance || a.name.localeCompare(b.name, 'es'))
    .slice(0, Math.max(0, limit));

  return { anchor, linked, nearby };
}
